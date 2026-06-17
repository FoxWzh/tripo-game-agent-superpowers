import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';

export const memoryDir = path.join(workspaceDir, 'asset_memory');
export const memoryIndexPath = path.join(memoryDir, 'index.json');

function loadIndex() {
  return readJson(memoryIndexPath, { assets: [] });
}

function saveIndex(index) {
  writeJson(memoryIndexPath, index);
}

export function buildMemoryRecord({ manifest, production = {}, readiness = {}, plan = {}, brief = {}, packagePath = '' }) {
  const assetId = manifest.asset_id || production.asset_id || brief.asset_id;
  const seriesId = brief.series_id || plan.series_id || `${brief.engine || manifest.engine || 'game'}-${brief.asset_type || 'asset'}-series`;
  return {
    asset_id: assetId,
    series_id: seriesId,
    created_at: new Date().toISOString(),
    style_lock: {
      prompt: brief.prompt || production.prompt || '',
      asset_type: brief.asset_type || null,
      model_family: plan.model_route?.model_family || null,
      texture_workflow: brief.texture_workflow || plan.parameters?.texture_workflow || 'PBR metal-rough',
      texture_size: brief.texture_size || plan.parameters?.texture_size || '2K'
    },
    engine_constraints: {
      engine: brief.engine || manifest.engine,
      format: plan.export_route?.preferred_format || brief.format || null,
      poly_budget: brief.poly_budget || plan.parameters?.poly_budget || null,
      scale_unit: brief.scale_unit || null,
      pivot_rule: brief.pivot_rule || null
    },
    rig_policy: {
      required: Boolean(plan.rig_route?.required || brief.rig_required),
      preset: plan.rig_route?.preset || 'none',
      readiness_status: readiness.status || manifest.readiness_status || 'unknown'
    },
    files: {
      output_dir: production.output_dir || '',
      package_path: packagePath,
      manifest_path: production.output_dir ? path.join(production.output_dir, 'manifest.json') : ''
    },
    fallback_history: plan.fallback_policy || [],
    next_variant_prompt: brief.prompt
      ? `${brief.prompt}; keep same style, engine constraints, texture workflow, and runtime budget.`
      : ''
  };
}

export function saveMemoryRecord(record) {
  fs.mkdirSync(memoryDir, { recursive: true });
  const filePath = path.join(memoryDir, `${record.asset_id}.json`);
  writeJson(filePath, record);
  const index = loadIndex();
  index.assets = [
    { asset_id: record.asset_id, series_id: record.series_id, asset_type: record.style_lock.asset_type, engine: record.engine_constraints.engine, updated_at: record.created_at, file: filePath },
    ...index.assets.filter((item) => item.asset_id !== record.asset_id)
  ];
  saveIndex(index);
  return filePath;
}

function renderList(index) {
  if (!index.assets.length) {
    console.log('No asset memory records yet.');
    return;
  }
  for (const item of index.assets) {
    console.log(`${item.asset_id}\t${item.asset_type || 'asset'}\t${item.engine || 'engine?'}\t${item.series_id}`);
  }
}

async function main() {
  ensureDirs();
  fs.mkdirSync(memoryDir, { recursive: true });
  const [command = 'list', ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === 'list') {
    renderList(loadIndex());
    return;
  }
  if (command === 'show') {
    const assetId = args._[0] || args.asset;
    if (!assetId) throw new Error('Usage: ./bin/tripo-agent memory show <asset_id>');
    const recordPath = path.join(memoryDir, `${assetId}.json`);
    const record = readJson(recordPath);
    console.log(JSON.stringify(record, null, 2));
    return;
  }
  throw new Error(`Unknown memory command: ${command}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`Memory failed: ${error.message}`);
    process.exit(1);
  });
}
