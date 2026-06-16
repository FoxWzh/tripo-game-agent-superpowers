import fs from 'node:fs';
import path from 'node:path';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function fileExists(filePath) {
  return Boolean(filePath) && fs.existsSync(path.resolve(filePath));
}

function detectViews(args) {
  const views = {};
  for (const view of ['front', 'back', 'left', 'right']) {
    const value = args[view];
    if (value) {
      views[view] = {
        path: value,
        exists: fileExists(value),
        extension: path.extname(value).toLowerCase()
      };
    }
  }
  return views;
}

function imageAssessment({ args, brief, inventory }) {
  const input = args.input || args['input-url'] || '';
  const inputExt = path.extname(input).toLowerCase();
  const inputExists = args['input-url'] ? true : fileExists(input);
  const views = detectViews(args);
  const inventoryViews = inventory?.views || {};
  const inventoryViewCount = Object.values(inventoryViews).filter((view) => view.exists && view.supported !== false).length;
  const viewCount = Math.max(Object.values(views).filter((view) => view.exists).length, inventoryViewCount);
  const issues = [];
  const improvements = [];

  if (!input && !viewCount) {
    issues.push({
      severity: 'blocker',
      item: '缺少参考图或多视图输入',
      impact: '无法调用 Tripo image_to_model；纯 text-to-3D 不在当前真实执行闭环内。',
      how_to_fix: '提供 --input assets/<reference>.png，或提供 front/back/left/right 多视图。'
    });
  }

  if (input && !inputExists) {
    issues.push({
      severity: 'blocker',
      item: '参考图路径不存在',
      impact: '生成任务会在上传阶段失败，不应创建付费任务。',
      how_to_fix: `确认文件存在：${input}`
    });
  }

  if (input && !args['input-url'] && !IMAGE_EXTENSIONS.has(inputExt)) {
    issues.push({
      severity: 'blocker',
      item: '参考图格式不适合上传',
      impact: '当前真实执行路径只接受 png/jpg/jpeg/webp。',
      how_to_fix: '转换为 PNG 或 JPG 后再运行。'
    });
  }

  if (brief.asset_type === 'character' && viewCount < 2) {
    improvements.push({
      priority: 'high',
      item: '补充角色多视图',
      why: '角色的背面、侧面、四肢遮挡会直接影响拓扑、骨骼和材质可用性。',
      suggested_input: '--front assets/char_front.png --back assets/char_back.png --left assets/char_left.png --right assets/char_right.png'
    });
  }

  if (brief.asset_type === 'weapon' || brief.asset_type === 'prop') {
    improvements.push({
      priority: 'medium',
      item: '补充尺度和使用位置',
      why: '武器/道具最容易在引擎里出现 pivot、scale、握持方向错误。',
      suggested_input: '--scale-note "human hand sized" --pivot grip|center|bottom'
    });
  }

  if (brief.asset_type === 'modular_part') {
    improvements.push({
      priority: 'high',
      item: '提供 base asset',
      why: 'modular 装备的核心风险不是生成失败，而是与已有角色不贴合。',
      suggested_input: '--base-asset outputs/<asset_id>/downloads/model.glb'
    });
  }

  return {
    input,
    input_exists: inputExists,
    views: Object.keys(views).length ? views : inventoryViews,
    view_count: viewCount,
    input_mode: inventory?.input_mode || null,
    view_strategy: inventory?.view_strategy || null,
    issues,
    improvements
  };
}

function engineAssessment({ args, brief }) {
  const issues = [];
  const improvements = [];
  const engine = brief.engine || args.engine || 'unknown';

  if (!engine || engine === 'unknown') {
    issues.push({
      severity: 'blocker',
      item: '缺少目标游戏引擎',
      impact: 'Unity、Unreal、Roblox、Godot 的格式、单位、骨骼和预算默认值不同。',
      how_to_fix: '添加 --engine Unity|Unreal|Roblox|Godot。'
    });
  }

  if (brief.asset_type === 'character' && !args['rig-preset']) {
    improvements.push({
      priority: 'high',
      item: '确认骨骼目标',
      why: '角色是否需要 Unity Humanoid、UE Manny 或仅静态展示，会显著改变成本和验收标准。',
      suggested_input: '--rig-preset unity-humanoid|ue-manny|none'
    });
  }

  if (!args['poly-budget'] && !brief.poly_budget) {
    improvements.push({
      priority: 'medium',
      item: '确认面数预算',
      why: '面数预算决定 smart_low_poly、face_limit 和是否值得做 quad。',
      suggested_input: '--poly-budget 8000|15000|30000'
    });
  }

  if (!args.tier) {
    improvements.push({
      priority: 'medium',
      item: '选择执行档位',
      why: 'Draft 适合看形体，Standard 适合游戏导入，Full 才应该承诺 rig/LOD/更强验收。',
      suggested_input: '--tier Draft|Standard|Full'
    });
  }

  return { engine, issues, improvements };
}

function costAssessment({ brief, plan, image, engine }) {
  const blockers = [...image.issues, ...engine.issues].filter((item) => item.severity === 'blocker');
  const improvements = [...image.improvements, ...engine.improvements];
  let recommendation = 'proceed';
  if (blockers.length) recommendation = 'block';
  else if (improvements.some((item) => item.priority === 'high')) recommendation = 'ask_user';

  const creditRisk = [];
  if (brief.asset_type === 'character' && image.view_count < 2) {
    creditRisk.push('单图角色生成容易在背面、手指、遮挡处出问题；建议补多视图后再花 credit。');
  }
  if (brief.rig_required && !plan?.parameters?.rig_required) {
    creditRisk.push('需求提到角色，但 plan 未明确 rig_required，生成前需要纠正。');
  }
  if (brief.asset_type === 'modular_part') {
    creditRisk.push('没有 base asset 时，modular 结果只能保证风格提示，不能保证穿戴贴合。');
  }

  return {
    recommendation,
    estimated_credits: plan.estimated_credits || 'unknown',
    estimated_time: plan.estimated_time || 'unknown',
    credit_risks: creditRisk,
    should_confirm_before_generation: true
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Preflight Report: ${report.asset_id}`,
    '',
    `Recommendation: ${report.recommendation}`,
    `Estimated credits: ${report.cost.estimated_credits}`,
    `Estimated time: ${report.cost.estimated_time}`,
    `Model route: ${report.model_route?.model_family || 'unknown'} / ${report.model_route?.task_type || 'unknown'}`,
    `View strategy: ${report.image.view_strategy?.strategy || 'unknown'}`,
    '',
    '## Missing Or Blocking',
    ...(report.blockers.length
      ? report.blockers.map((item) => `- ${item.item}: ${item.how_to_fix}`)
      : ['- None']),
    '',
    '## Improve Before Spending Credits',
    ...(report.improvements.length
      ? report.improvements.map((item) => `- [${item.priority}] ${item.item}: ${item.why} (${item.suggested_input})`)
      : ['- None']),
    '',
    '## Credit Risks',
    ...(report.cost.credit_risks.length
      ? report.cost.credit_risks.map((item) => `- ${item}`)
      : ['- None'])
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const brief = readJson(args.brief || path.join(workspaceDir, 'asset_brief.json'));
  const plan = readJson(args.plan || path.join(workspaceDir, 'production_plan.json'));
  const inventoryPath = args.inventory || path.join(workspaceDir, 'input_inventory.json');
  const inventory = fs.existsSync(inventoryPath) ? readJson(inventoryPath) : (plan.input_inventory || null);
  const image = imageAssessment({ args, brief, inventory });
  const engine = engineAssessment({ args, brief });
  const cost = costAssessment({ brief, plan, image, engine });
  const blockers = [...image.issues, ...engine.issues].filter((item) => item.severity === 'blocker');
  const improvements = [...image.improvements, ...engine.improvements];
  const report = {
    asset_id: brief.asset_id || plan.asset_id,
    recommendation: cost.recommendation,
    blockers,
    improvements,
    image,
    engine,
    input_inventory: inventory,
    model_route: plan.model_route || null,
    cost,
    next_action: cost.recommendation === 'block'
      ? '补齐 blocker 后重新运行 preflight。'
      : cost.recommendation === 'ask_user'
        ? '建议先让用户决定是否补充高价值输入，或明确接受风险后再生成。'
        : '可以在用户确认后进入 Tripo 生成。'
  };

  const outPath = args.out || path.join(workspaceDir, 'preflight_report.json');
  writeJson(outPath, report);
  fs.writeFileSync(path.join(workspaceDir, 'preflight_report.md'), renderMarkdown(report));
  console.log(`Preflight recommendation: ${report.recommendation}`);
  console.log(`Report: ${outPath}`);
  if (blockers.length && !args['allow-blockers']) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`Preflight failed: ${error.message}`);
  process.exit(1);
});
