import fs from 'node:fs';
import path from 'node:path';
import { ensureDirs, workspaceDir, writeJson, parseArgs } from './config.mjs';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj']);

function fileInfo(value, kind) {
  if (!value) return null;
  const isUrl = /^https?:\/\//i.test(value);
  const ext = isUrl ? path.extname(new URL(value).pathname).toLowerCase() : path.extname(value).toLowerCase();
  return {
    path: value,
    kind,
    exists: isUrl || fs.existsSync(path.resolve(value)),
    is_url: isUrl,
    extension: ext,
    supported: kind === 'image' ? IMAGE_EXTENSIONS.has(ext) || isUrl : MODEL_EXTENSIONS.has(ext) || isUrl
  };
}

function collectViews(args) {
  const views = {};
  for (const view of ['front', 'back', 'left', 'right']) {
    const info = fileInfo(args[view], 'image');
    if (info) views[view] = info;
  }
  return views;
}

function inferInputMode({ args, views, input, baseAsset }) {
  const viewNames = Object.keys(views).filter((view) => views[view].exists && views[view].supported);
  if (baseAsset?.exists) return 'existing_model';
  if (viewNames.length >= 2 && views.front?.exists) return 'user_multiview';
  if (input?.exists) return 'single_image';
  if (args.prompt) return 'text_only';
  return 'missing_input';
}

function decideViewStrategy({ inputMode, views, args }) {
  const availableViews = Object.keys(views).filter((view) => views[view].exists && views[view].supported);
  const missingViews = ['front', 'back', 'left', 'right'].filter((view) => !availableViews.includes(view));

  if (inputMode === 'user_multiview') {
    return {
      strategy: 'use_user_multiview',
      reason: 'User provided real multiview references. Prefer them over generated views.',
      requires_user_decision: false,
      available_views: availableViews,
      missing_views: missingViews
    };
  }

  if (inputMode === 'single_image') {
    return {
      strategy: 'ask_user_for_views_or_generate_multiview',
      reason: 'Single-image 3D is cheaper in setup but higher risk for backs, sides, hands, rigging, and complex props.',
      requires_user_decision: true,
      options: ['provide_real_multiview', 'generate_candidate_multiview', 'proceed_single_image_with_risk'],
      available_views: availableViews.length ? availableViews : ['front_assumed_from_input'],
      missing_views: missingViews
    };
  }

  if (inputMode === 'text_only') {
    return {
      strategy: 'text_to_model_or_generate_views_first',
      reason: 'No visual reference exists. For game assets, ask whether the user wants quick text-to-model or a concept/multiview preparation step.',
      requires_user_decision: true,
      options: ['text_to_model_draft', 'generate_candidate_multiview_then_3d']
    };
  }

  if (inputMode === 'existing_model') {
    return {
      strategy: 'reuse_or_revise_existing_model',
      reason: 'Existing model should route to memory, modular, revise, conversion, rigging, or readiness rather than new image-to-model.',
      requires_user_decision: false
    };
  }

  return {
    strategy: 'block_until_input_exists',
    reason: 'No supported input was found.',
    requires_user_decision: true
  };
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const input = fileInfo(args.input || args['input-url'], 'image');
  const baseAsset = fileInfo(args['base-asset'], 'model');
  const views = collectViews(args);
  const inputMode = inferInputMode({ args, views, input, baseAsset });
  const viewStrategy = decideViewStrategy({ inputMode, views, args });

  const blockers = [];
  for (const [label, info] of Object.entries({ input, base_asset: baseAsset, ...views })) {
    if (info && !info.exists) blockers.push(`${label} does not exist: ${info.path}`);
    if (info && !info.supported) blockers.push(`${label} has unsupported extension: ${info.extension}`);
  }
  if (inputMode === 'missing_input') {
    blockers.push('No prompt, image, multiview images, or existing model was provided.');
  }

  const report = {
    input_mode: inputMode,
    input,
    views,
    base_asset: baseAsset,
    view_strategy: viewStrategy,
    blockers,
    next_action: blockers.length
      ? 'Fix blockers before planning.'
      : viewStrategy.requires_user_decision
        ? 'Ask user to choose a view strategy before model routing.'
        : 'Proceed to model routing.'
  };

  writeJson(args.out || path.join(workspaceDir, 'input_inventory.json'), report);
  console.log(`Input mode: ${report.input_mode}`);
  console.log(`View strategy: ${report.view_strategy.strategy}`);
  if (blockers.length) {
    for (const blocker of blockers) console.log(`BLOCKER ${blocker}`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`Inventory failed: ${error.message}`);
  process.exit(1);
});
