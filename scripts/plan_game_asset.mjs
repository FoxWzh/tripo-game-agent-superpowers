import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ensureDirs, workspaceDir, writeJson, readJson, parseArgs, slugify } from './config.mjs';
import { estimateCredits } from './pricing.mjs';

const MODEL_VERSIONS = {
  P1: 'p1-20260311',
  H3: 'v3.1-20260211',
  H2: 'v2.5-20250123',
  Turbo: 'turbo-v1.0-20250506',
  v14: 'v1.4-20240625'
};

function parsePolyBudgetFromText(text) {
  const compactMatch = text.match(/(\d+(?:\.\d+)?)\s*(k|千|万)\s*(faces?|面|tris?|triangles?|多边形|poly|polys)?/i);
  if (compactMatch) {
    const multiplier = compactMatch[2] === '万' ? 10000 : 1000;
    return Math.round(Number(compactMatch[1]) * multiplier);
  }
  const explicitMatch = text.match(/(\d+(?:\.\d+)?)\s*(faces?|面|tris?|triangles?|多边形|poly|polys)/i);
  return explicitMatch ? Math.round(Number(explicitMatch[1])) : null;
}

function inferBrief({ prompt, engine, assetType, polyBudget }) {
  const text = `${prompt || ''} ${engine || ''} ${assetType || ''}`.toLowerCase();
  const inferredPolyBudget = parsePolyBudgetFromText(text);
  const inferredEngine = engine
    || (text.includes('unreal') || text.includes(' ue ') ? 'Unreal' : null)
    || (text.includes('roblox') ? 'Roblox' : null)
    || (text.includes('godot') ? 'Godot' : null)
    || (text.includes('unity') ? 'Unity' : 'Unity');

  const inferredType = assetType
    || (/weapon|sword|gun|武器|剑|枪/.test(text) ? 'weapon' : null)
    || (/prop|道具|宝箱|pickup/.test(text) ? 'prop' : null)
    || (/environment|building|rock|terrain|场景|建筑|石头|地形/.test(text) ? 'environment' : null)
    || (/armor|outfit|modular|盔甲|披风|装备/.test(text) ? 'modular_part' : null)
    || 'character';

  const rigRequired = inferredType === 'character';
  const faceLimit = Number(polyBudget || inferredPolyBudget || (inferredType === 'character' ? 15000 : 10000));

  return {
    asset_id: slugify(`${inferredEngine}-${inferredType}-${Date.now()}`),
    prompt,
    asset_type: inferredType,
    engine: inferredEngine,
    usage: 'runtime',
    format: rigRequired ? 'FBX' : 'GLB',
    poly_budget: faceLimit,
    texture_workflow: 'PBR metal-rough',
    texture_size: '2K',
    rig_required: rigRequired,
    lod_required: inferredType === 'environment',
    collider_required: inferredType !== 'character',
    scale_unit: inferredEngine === 'Unreal' ? 'centimeter' : 'meter',
    pivot_rule: inferredType === 'weapon' ? 'grip' : inferredType === 'character' ? 'bottom' : 'center',
    missing_info: [],
    confidence: 0.82
  };
}

function routeModel({ brief, inventory, tier = 'Standard', model }) {
  const inputMode = inventory?.input_mode || 'single_image';
  const viewStrategy = inventory?.view_strategy?.strategy || 'unknown';
  const text = `${brief.prompt || ''} ${tier || ''} ${model || ''}`.toLowerCase();
  let modelFamily = model || null;

  if (!modelFamily) {
    if (/turbo|draft|草稿|快速/.test(text) || tier === 'Draft') modelFamily = 'Turbo';
    else if (/h3|hero|高保真|cinematic/.test(text)) modelFamily = 'H3';
    else if (/h2|stable|稳定|兼容/.test(text)) modelFamily = 'H2';
    else if (/v1\.4|legacy|旧/.test(text)) modelFamily = 'v14';
    else modelFamily = 'P1';
  }

  const taskType = inputMode === 'user_multiview' || inputMode === 'generated_multiview'
    ? 'multiview_to_model'
    : inputMode === 'text_only'
      ? 'text_to_model'
      : 'image_to_model';

  const reason = [];
  if (taskType === 'multiview_to_model') reason.push('user or generated multiview input is available');
  if (modelFamily === 'P1') reason.push('game runtime asset benefits from low-poly/topology-oriented route');
  if (modelFamily === 'H3') reason.push('high-fidelity route requested or inferred');
  if (modelFamily === 'Turbo') reason.push('draft/fast preview requested');
  if (viewStrategy === 'ask_user_for_views_or_generate_multiview') reason.push('single image can proceed, but multiview may reduce hidden-side risk');

  return {
    task_type: taskType,
    model_family: modelFamily,
    model_version: MODEL_VERSIONS[modelFamily] || modelFamily,
    input_mode: inputMode,
    view_strategy: viewStrategy,
    fallback_model_family: modelFamily === 'P1' ? 'H3' : 'P1',
    reason
  };
}

function tripoParamsForBrief(brief, modelRoute) {
  const wantsQuad = brief.asset_type === 'character' || brief.asset_type === 'modular_part';
  const faceLimit = Number(brief.poly_budget || 15000);
  const smartLowPoly = faceLimit <= 10000;
  return {
    model_version: modelRoute.model_version,
    texture: true,
    pbr: true,
    texture_quality: 'standard',
    smart_low_poly: smartLowPoly,
    quad: wantsQuad,
    face_limit: faceLimit,
    auto_size: true,
    orientation: 'align_image',
    export_uv: true,
    geometry_quality: modelRoute.model_family === 'H3' ? 'high' : 'standard'
  };
}

function workflowForBrief(brief, modelRoute) {
  const inputStep = modelRoute.task_type === 'multiview_to_model'
    ? 'MultiViewTo3D'
    : modelRoute.task_type === 'text_to_model'
      ? 'TextTo3D'
      : 'ImageTo3D';
  if (brief.asset_type === 'character') {
    return [
      `${inputStep}(model=${modelRoute.model_family})`,
      `Retopo(mode=quad,target=${brief.poly_budget})`,
      'UVUnwrap',
      'PBRTexture(workflow=metal-rough,size=2K)',
      `RigRoute(type=${brief.engine === 'Unreal' ? 'UE Manny compatible if requested' : 'Unity humanoid'})`,
      'ReadinessReview',
      `Convert(format=${brief.format})`
    ];
  }
  if (brief.asset_type === 'weapon') {
    return [`${inputStep}(model=${modelRoute.model_family})`, 'Retopo', 'UVUnwrap', 'PBRTexture', 'GripPivotCheck', 'ScaleCheck', 'ReadinessReview', `Export${brief.format}`];
  }
  if (brief.asset_type === 'environment') {
    return [`${inputStep}(model=${modelRoute.model_family})`, 'Segment', 'OptimizeMesh', 'GenerateLOD', 'PBRTexture', 'ColliderHint', 'ReadinessReview', `Export${brief.format}`];
  }
  if (brief.asset_type === 'modular_part') {
    return ['LoadBaseAsset', 'StyleLock', `${inputStep}(model=${modelRoute.model_family})`, 'FitToBaseMesh', 'TextureMatch', 'ReadinessReview', 'ExportPack'];
  }
  return [`${inputStep}(model=${modelRoute.model_family})`, 'Retopo', 'UVUnwrap', 'PBRTexture', 'PivotScaleCheck', 'ReadinessReview', `Export${brief.format}`];
}

function buildExportRoute(brief) {
  const engine = brief.engine;
  const assetType = brief.asset_type;
  let preferredFormat = brief.format || 'GLB';
  let fallbackFormat = 'GLB';
  const reasons = [];

  if (engine === 'Unity') {
    if (assetType === 'character' || assetType === 'weapon') {
      preferredFormat = 'FBX';
      reasons.push('Unity character/weapon pipelines commonly expect FBX for rig, sockets, and import settings.');
    } else {
      preferredFormat = 'GLB';
      fallbackFormat = 'FBX';
      reasons.push('Unity static props can use GLB for fast import; FBX remains fallback for older pipelines.');
    }
  } else if (engine === 'Unreal') {
    preferredFormat = 'FBX';
    reasons.push('Unreal skeletal/static mesh pipelines usually accept FBX as the safest interchange format.');
  } else if (engine === 'Godot') {
    preferredFormat = assetType === 'character' ? 'GLTF' : 'GLB';
    fallbackFormat = 'FBX';
    reasons.push('Godot favors GLTF/GLB for scene/material import.');
  } else if (engine === 'Roblox') {
    preferredFormat = 'FBX';
    fallbackFormat = 'GLB';
    reasons.push('Roblox/game prototype pipelines need low-poly interchange with strict budget checks.');
  }

  return {
    preferred_format: preferredFormat,
    fallback_format: fallbackFormat,
    needs_conversion: true,
    conversion_task_type: 'convert_model',
    texture_format: 'png',
    fbx_preset: 'blender',
    reason: reasons.length ? reasons : [`${engine} ${assetType} export route inferred from format ${preferredFormat}.`]
  };
}

function buildRigRoute(brief, args = {}) {
  const rigPreset = args['rig-preset'] || (brief.engine === 'Unreal' ? 'ue-manny' : 'unity-humanoid');
  if (!brief.rig_required || rigPreset === 'none') {
    return {
      required: false,
      preset: 'none',
      precheck_required: false,
      auto_rig_supported: false,
      reason: ['Asset does not require rigging for the selected workflow.']
    };
  }

  return {
    required: true,
    preset: rigPreset,
    precheck_required: true,
    auto_rig_supported: true,
    task_sequence: ['animate_prerigcheck', 'animate_rig', 'convert_model'],
    output_format: 'FBX',
    human_confirmation_required: true,
    reason: [
      'Character game-readiness depends on skeleton and skinning, not just mesh generation.',
      'Run pre-rig check before spending rigging credits.'
    ]
  };
}

function planForBrief(brief, { inventory = null, tier = 'Standard', model = null, args = {} } = {}) {
  const modelRoute = routeModel({ brief, inventory, tier, model });
  const exportRoute = buildExportRoute(brief);
  const rigRoute = buildRigRoute(brief, args);
  const includeGeneratedMultiview = inventory?.view_strategy?.strategy === 'ask_user_for_views_or_generate_multiview' && args['generate-views-first'];
  const creditEstimate = estimateCredits({
    taskType: modelRoute.task_type,
    modelFamily: modelRoute.model_family,
    textureQuality: 'standard',
    needsConversion: exportRoute.needs_conversion,
    conversionOptions: {
      quad: tripoParamsForBrief(brief, modelRoute).quad,
      face_limit: tripoParamsForBrief(brief, modelRoute).face_limit,
      smart_low_poly: tripoParamsForBrief(brief, modelRoute).smart_low_poly,
      texture_format: exportRoute.texture_format,
      pivot_to_center_bottom: brief.engine === 'Unity',
      fbx_preset: exportRoute.fbx_preset
    },
    rigRequired: rigRoute.required && tier === 'Full',
    includeGeneratedMultiview
  });
  const preflightQuestions = [];
  if (brief.asset_type === 'character') {
    preflightQuestions.push(
      'Can you provide front/back/side views before spending credits?',
      'Which rig target is required: Unity Humanoid, UE Manny, custom, or none?',
      'Is face fidelity, silhouette, or runtime topology the priority?'
    );
  }
  if (brief.asset_type === 'weapon' || brief.asset_type === 'prop') {
    preflightQuestions.push(
      'What pivot should the engine use: grip, center, or bottom?',
      'What approximate real-world scale should this asset have?'
    );
  }
  if (brief.asset_type === 'environment') {
    preflightQuestions.push(
      'Is this a single set piece or a modular kit?',
      'Do you need LOD and collider hints for runtime use?'
    );
  }
  if (brief.asset_type === 'modular_part') {
    preflightQuestions.push(
      'What base asset id or file path should this attach to?',
      'Does the result need visual fit, socket fit, or topology-compatible fit?'
    );
  }

  return {
    asset_id: brief.asset_id,
    workflow_name: brief.asset_type === 'character' ? 'GameReadyCharacter' : `GameReady${brief.asset_type}`,
    dag: workflowForBrief(brief, modelRoute),
    model_route: modelRoute,
    export_route: exportRoute,
    rig_route: rigRoute,
    input_inventory: inventory,
    parameters: {
      engine: brief.engine,
      format: brief.format,
      preferred_export_format: exportRoute.preferred_format,
      poly_budget: brief.poly_budget,
      texture_size: brief.texture_size,
      rig_required: brief.rig_required
    },
    tripo_params: tripoParamsForBrief(brief, modelRoute),
    execution_tiers: [
      { name: 'Draft', description: 'fast generation preview' },
      { name: 'Standard', description: 'optimized mesh + PBR + engine export' },
      { name: 'Full', description: 'Standard plus rig/readiness/package where supported' }
    ],
    estimated_credits: creditEstimate.total,
    credit_estimate: creditEstimate,
    estimated_time: brief.asset_type === 'character' ? '8-12 min' : '4-8 min',
    risk_points: [
      'Tripo generation task may fail or rate-limit; retry with backoff.',
      'Downloaded result URLs can expire; download immediately after task success.',
      'FBX export may require conversion if the Tripo task only returns GLB.',
      'Model route should be revisited if user provides more views or changes tier.',
      ...(brief.asset_type === 'character' ? [
        'Single-image characters may fail on unseen back/side details; multi-view input is preferred.',
        'Rig compatibility still requires engine-side validation.'
      ] : []),
      ...(brief.asset_type === 'prop' || brief.asset_type === 'weapon' ? [
        'Props and weapons often need explicit pivot, scale, and forward-axis checks before engine import.'
      ] : []),
      ...(rigRoute.required ? ['Rig route requires pre-rig check before auto-rigging credits are spent.'] : [])
    ],
    fallback_policy: [
      'If FBX is unavailable, package GLB and document limitation.',
      'If requested quad/face_limit is unsupported, adjust plan before task creation.',
      'If readiness inspection cannot parse FBX, require Blender for deeper inspection.',
      'If rigging cannot be validated locally, deliver a static package and mark rig as blocked or roadmap.'
    ],
    expected_package: ['downloads/', 'converted/', 'readiness_report.md', 'manifest.json', 'import guide'],
    preflight_questions: preflightQuestions
  };
}

export { inferBrief, routeModel, planForBrief };

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2), {
    requireValuesFor: ['prompt', 'engine', 'poly-budget', 'rig-preset', 'tier', 'model', 'model-family', 'asset-type', 'inventory', 'brief', 'plan']
  });
  if (!args.prompt || args.prompt === true || !String(args.prompt).trim()) {
    throw new Error('Missing --prompt.');
  }
  const brief = inferBrief({
    prompt: args.prompt,
    engine: args.engine,
    assetType: args['asset-type'],
    polyBudget: args['poly-budget']
  });
  const inventoryPath = args.inventory || path.join(workspaceDir, 'input_inventory.json');
  const inventory = fs.existsSync(inventoryPath) ? readJson(inventoryPath) : null;
  const plan = planForBrief(brief, {
    inventory,
    tier: args.tier || 'Standard',
    model: args.model || args['model-family'],
    args
  });
  const briefPath = args.brief || path.join(workspaceDir, 'asset_brief.json');
  const planPath = args.plan || path.join(workspaceDir, 'production_plan.json');
  writeJson(briefPath, brief);
  writeJson(planPath, plan);

  console.log(`Asset ID: ${brief.asset_id}`);
  console.log(`Asset type: ${brief.asset_type}`);
  console.log(`Engine: ${brief.engine}`);
  console.log(`Model route: ${plan.model_route.model_family} / ${plan.model_route.task_type}`);
  console.log(`Export route: ${plan.export_route.preferred_format} (fallback ${plan.export_route.fallback_format})`);
  console.log(`Estimated credits/time: ${plan.estimated_credits} credits / ${plan.estimated_time}`);
  console.log(`Wrote: ${briefPath}`);
  console.log(`Wrote: ${planPath}`);
  console.log('Next: ./bin/tripo-agent preflight --input assets/<reference>.png --engine ' + brief.engine);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`Planning failed: ${error.message}`);
    process.exit(error.message.startsWith('Missing --') || error.message.startsWith('Missing value for --') ? 2 : 1);
  });
}
