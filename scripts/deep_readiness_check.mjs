import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';

const execFileAsync = promisify(execFile);

function findCandidateModel(outDir, preferredFormat) {
  const matches = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(fbx|glb|gltf|obj)$/i.test(entry.name)) matches.push(full);
    }
  };
  walk(outDir);
  if (preferredFormat) {
    const preferred = matches.find((file) => path.extname(file).slice(1).toUpperCase() === preferredFormat.toUpperCase());
    if (preferred) return preferred;
  }
  return matches[0] || null;
}

async function commandExists(command) {
  try {
    await execFileAsync(command, ['--version'], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function unityChecklist({ plan, modelPath }) {
  const exportRoute = plan.export_route || {};
  const rigRoute = plan.rig_route || {};
  const checks = [
    { item: 'Target format', expected: exportRoute.preferred_format || plan.parameters?.format || 'unknown', evidence: modelPath || 'missing' },
    { item: 'Scale unit', expected: plan.parameters?.engine === 'Unreal' ? 'centimeter' : 'meter', evidence: 'manual/import-setting check required' },
    { item: 'Rig preset', expected: rigRoute.required ? rigRoute.preset : 'none', evidence: rigRoute.required ? 'requires rig_result + Blender/engine check' : 'not required' },
    { item: 'Material relink', expected: 'PBR textures available', evidence: 'verify in Unity inspector' },
    { item: 'Pivot/collider', expected: 'matches asset type', evidence: 'manual or Blender postprocess required' }
  ];
  return checks;
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const plan = readJson(args.plan || path.join(workspaceDir, 'production_plan.json'), {});
  const production = readJson(args.production || path.join(workspaceDir, 'production_result.json'), {});
  const outDir = path.resolve(args.out || production.output_dir || '.');
  const preferredFormat = args.format || plan.export_route?.preferred_format;
  const modelPath = args.model ? path.resolve(args.model) : findCandidateModel(outDir, preferredFormat);
  const report = {
    asset_id: production.asset_id || plan.asset_id,
    output_dir: outDir,
    model: modelPath,
    blender: null,
    engine_import: {
      engine: args.engine || plan.parameters?.engine || 'Unity',
      status: 'checklist',
      checks: unityChecklist({ plan, modelPath })
    }
  };

  if (!modelPath) {
    report.blender = { status: 'skipped', reason: 'No model file found.' };
  } else if (await commandExists('blender')) {
    const blenderReportPath = path.join(outDir, 'blender_readiness_report.json');
    const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'blender_inspect.py');
    await execFileAsync('blender', ['--background', '--python', scriptPath, '--', modelPath, blenderReportPath], { timeout: 120000 });
    report.blender = readJson(blenderReportPath);
  } else {
    report.blender = {
      status: 'skipped',
      reason: 'Blender is not installed. Install with `brew install --cask blender` for deep mesh/rig inspection.'
    };
  }

  writeJson(path.join(outDir, 'deep_readiness_report.json'), report);
  writeJson(path.join(workspaceDir, 'deep_readiness_report.json'), report);
  console.log(`Deep readiness: ${report.blender?.status || 'unknown'}`);
  console.log(`Report: ${path.join(outDir, 'deep_readiness_report.json')}`);
}

main().catch((error) => {
  console.error(`Deep readiness failed: ${error.message}`);
  process.exit(1);
});
