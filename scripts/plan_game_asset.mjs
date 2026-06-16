import path from 'node:path';
import { ensureDirs, workspaceDir, writeJson, parseArgs, slugify } from './config.mjs';

function inferBrief({ prompt, engine, assetType, polyBudget }) {
  const text = `${prompt || ''} ${engine || ''} ${assetType || ''}`.toLowerCase();
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
  const faceLimit = Number(polyBudget || (inferredType === 'character' ? 15000 : 10000));

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

function tripoParamsForBrief(brief) {
  const wantsQuad = brief.asset_type === 'character' || brief.asset_type === 'modular_part';
  const faceLimit = Number(brief.poly_budget || 15000);
  const smartLowPoly = faceLimit <= 10000;
  return {
    model_version: 'v3.1-20260211',
    texture: true,
    pbr: true,
    texture_quality: 'standard',
    smart_low_poly: smartLowPoly,
    quad: wantsQuad,
    face_limit: faceLimit,
    auto_size: true,
    orientation: 'align_image',
    export_uv: true,
    geometry_quality: 'standard'
  };
}

function workflowForBrief(brief) {
  if (brief.asset_type === 'character') {
    return [
      'ImageTo3D',
      `Retopo(mode=quad,target=${brief.poly_budget})`,
      'UVUnwrap',
      'PBRTexture(workflow=metal-rough,size=2K)',
      `Rig(type=${brief.engine === 'Unreal' ? 'UE Manny compatible if requested' : 'Unity humanoid'})`,
      'ReadinessReview',
      `Export${brief.format}`
    ];
  }
  if (brief.asset_type === 'weapon') {
    return ['ImageTo3D', 'Retopo', 'UVUnwrap', 'PBRTexture', 'GripPivotCheck', 'ScaleCheck', 'ReadinessReview', `Export${brief.format}`];
  }
  if (brief.asset_type === 'environment') {
    return ['ImageTo3D', 'Segment', 'OptimizeMesh', 'GenerateLOD', 'PBRTexture', 'ColliderHint', 'ReadinessReview', `Export${brief.format}`];
  }
  if (brief.asset_type === 'modular_part') {
    return ['LoadBaseAsset', 'StyleLock', 'ImageTo3D', 'FitToBaseMesh', 'TextureMatch', 'ReadinessReview', 'ExportPack'];
  }
  return ['ImageTo3D', 'Retopo', 'UVUnwrap', 'PBRTexture', 'PivotScaleCheck', 'ReadinessReview', `Export${brief.format}`];
}

function planForBrief(brief) {
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
    dag: workflowForBrief(brief),
    parameters: {
      engine: brief.engine,
      format: brief.format,
      poly_budget: brief.poly_budget,
      texture_size: brief.texture_size,
      rig_required: brief.rig_required
    },
    tripo_params: tripoParamsForBrief(brief),
    execution_tiers: [
      { name: 'Draft', description: 'fast generation preview' },
      { name: 'Standard', description: 'optimized mesh + PBR + engine export' },
      { name: 'Full', description: 'Standard plus rig/readiness/package where supported' }
    ],
    estimated_credits: brief.asset_type === 'character' ? '27-34' : '14-24',
    estimated_time: brief.asset_type === 'character' ? '8-12 min' : '4-8 min',
    risk_points: [
      'Tripo generation task may fail or rate-limit; retry with backoff.',
      'Rig compatibility still requires engine-side validation.',
      'Downloaded result URLs can expire; download immediately after task success.',
      'Single-image characters may fail on unseen back/side details; multi-view input is preferred.',
      'FBX export may require conversion if the Tripo task only returns GLB.'
    ],
    fallback_policy: [
      'If FBX is unavailable, package GLB and document limitation.',
      'If requested quad/face_limit is unsupported, adjust plan before task creation.',
      'If readiness inspection cannot parse FBX, require Blender for deeper inspection.',
      'If rigging cannot be validated locally, deliver a static package and mark rig as blocked or roadmap.'
    ],
    expected_package: ['downloads/', 'readiness_report.md', 'manifest.json', 'import guide'],
    preflight_questions: preflightQuestions
  };
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    throw new Error('Missing --prompt.');
  }
  const brief = inferBrief({
    prompt: args.prompt,
    engine: args.engine,
    assetType: args['asset-type'],
    polyBudget: args['poly-budget']
  });
  const plan = planForBrief(brief);
  writeJson(args.brief || path.join(workspaceDir, 'asset_brief.json'), brief);
  writeJson(args.plan || path.join(workspaceDir, 'production_plan.json'), plan);
  console.log(`Wrote Asset Brief and Production Plan for ${brief.asset_id}`);
}

main().catch((error) => {
  console.error(`Planning failed: ${error.message}`);
  process.exit(1);
});
