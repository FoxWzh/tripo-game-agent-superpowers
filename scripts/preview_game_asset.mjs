import fs from 'node:fs';
import path from 'node:path';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';
import { inferBrief, planForBrief } from './plan_game_asset.mjs';
import { PRICING_SOURCE_URL } from './pricing.mjs';

function detectIntentGaps(brief, args) {
  const gaps = [];
  const prompt = args.prompt || '';
  if (!args.engine && !/\b(Unity|Unreal|Roblox|Godot|UE)\b/i.test(prompt)) {
    gaps.push('target game engine');
  }
  if (!args.input && !args.front && !args.back && !args['base-asset']) {
    gaps.push('reference image, multiview images, or existing asset');
  }
  if (brief.asset_type === 'character' && !args['rig-preset']) {
    gaps.push('rig target: Unity Humanoid, UE Manny, custom, or none');
  }
  if (!args['poly-budget']) {
    gaps.push('runtime poly budget');
  }
  return gaps;
}

function highValueInputs(brief, args) {
  const items = [];
  if (!args.input && !args.front) {
    items.push('Upload at least one clean front/reference image under assets/.');
  }
  if (brief.asset_type === 'character' && !(args.front && args.back)) {
    items.push('For characters, front/back/side views reduce hidden-side and rigging risk.');
  }
  if (brief.asset_type === 'weapon' || brief.asset_type === 'prop') {
    items.push('Provide pivot and scale notes, especially grip/center/bottom pivot.');
  }
  if (brief.asset_type === 'modular_part') {
    items.push('Provide the base character/model path so fit can be evaluated.');
  }
  return items;
}

function renderMarkdown({ prompt, brief, plan, gaps, inputs }) {
  const estimate = plan.credit_estimate;
  const blockers = gaps.filter((gap) => gap.includes('reference'));
  const lines = [
    '# Tripo Game Agent Preview',
    '',
    `User goal: ${prompt}`,
    '',
    '## Interpreted Asset Brief',
    '',
    `- Asset type: ${brief.asset_type}`,
    `- Engine: ${brief.engine}`,
    `- Runtime format: ${brief.format}`,
    `- Poly budget: ${brief.poly_budget}`,
    `- Rig required: ${brief.rig_required ? 'yes' : 'no'}`,
    '',
    '## Missing Or Worth Confirming',
    ...(gaps.length ? gaps.map((gap) => `- ${gap}`) : ['- Nothing blocking at preview level.']),
    '',
    '## Highest-Value Input Before Spending Credits',
    ...(inputs.length ? inputs.map((item) => `- ${item}`) : ['- Current inputs are enough for preflight.']),
    '',
    '## Recommended Route',
    '',
    `- Model route: ${plan.model_route.model_family} / ${plan.model_route.task_type}`,
    `- Export route: ${plan.export_route.preferred_format} (fallback ${plan.export_route.fallback_format})`,
    `- Rig route: ${plan.rig_route.required ? `${plan.rig_route.preset} with pre-rig check` : 'not required'}`,
    '',
    '## Credit Preview',
    '',
    `Estimated credits before optional retries: ${estimate.total}`,
    ...estimate.items.map((item) => `- ${item.label}: ${item.credits}`),
    '',
    `Pricing source: ${PRICING_SOURCE_URL}`,
    '',
    '## Main Risks',
    ...plan.risk_points.slice(0, 5).map((risk) => `- ${risk}`),
    '',
    '## Next Step',
    blockers.length
      ? '- Add a reference image, multiview images, or an existing model before running preflight.'
      : `- Run: ./bin/tripo-agent preflight --input assets/<reference>.png --engine ${brief.engine}`,
    ''
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2), {
    requireValuesFor: ['prompt', 'engine', 'input', 'front', 'back', 'left', 'right', 'poly-budget', 'rig-preset', 'asset-type', 'model-family']
  });
  const prompt = args.prompt || args._.join(' ');
  if (!prompt || !String(prompt).trim()) {
    throw new Error('Missing game asset goal. Usage: ./bin/tripo-agent ask "<goal>"');
  }

  const brief = inferBrief({
    prompt,
    engine: args.engine,
    assetType: args['asset-type'],
    polyBudget: args['poly-budget']
  });
  const inventoryPath = args.inventory || path.join(workspaceDir, 'input_inventory.json');
  const inventory = fs.existsSync(inventoryPath) ? readJson(inventoryPath, null) : null;
  const plan = planForBrief(brief, {
    inventory,
    tier: args.tier || 'Standard',
    model: args.model || args['model-family'],
    args
  });
  const gaps = detectIntentGaps(brief, { ...args, prompt });
  const inputs = highValueInputs(brief, args);
  const markdown = renderMarkdown({ prompt, brief, plan, gaps, inputs });
  const preview = {
    prompt,
    asset_id: brief.asset_id,
    brief,
    plan_summary: {
      model_route: plan.model_route,
      export_route: plan.export_route,
      rig_route: plan.rig_route,
      estimated_credits: plan.estimated_credits,
      estimated_time: plan.estimated_time,
      credit_estimate: plan.credit_estimate
    },
    missing_or_worth_confirming: gaps,
    high_value_inputs: inputs,
    risk_points: plan.risk_points,
    next_action: gaps.some((gap) => gap.includes('reference'))
      ? 'Ask user for reference image, multiview images, or existing model before preflight.'
      : `Run preflight before generation: ./bin/tripo-agent preflight --input assets/<reference>.png --engine ${brief.engine}`
  };

  const outPath = args.out || path.join(workspaceDir, 'preview_report.json');
  writeJson(outPath, preview);
  fs.writeFileSync(path.join(workspaceDir, 'preview_report.md'), markdown);
  process.stdout.write(markdown);
  console.log(`Preview JSON: ${outPath}`);
}

main().catch((error) => {
  console.error(`Preview failed: ${error.message}`);
  process.exit(error.message.startsWith('Missing ') ? 2 : 1);
});
