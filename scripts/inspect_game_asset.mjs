import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ensureDirs, outputsDir, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';

function findModels(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(glb|gltf|fbx|obj)$/i.test(entry.name)) result.push(full);
    }
  };
  walk(dir);
  return result;
}

async function inspectGltf(filePath) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(filePath);
  const root = document.getRoot();
  const meshes = root.listMeshes();
  const materials = root.listMaterials();
  const textures = root.listTextures();
  const animations = root.listAnimations();
  const skins = root.listSkins();
  return {
    file: filePath,
    format: path.extname(filePath).slice(1).toLowerCase(),
    file_size_bytes: fs.statSync(filePath).size,
    mesh_count: meshes.length,
    primitive_count: meshes.reduce((sum, mesh) => sum + mesh.listPrimitives().length, 0),
    material_count: materials.length,
    texture_count: textures.length,
    animation_count: animations.length,
    skin_count: skins.length,
    warnings: []
  };
}

async function inspectGeneric(filePath) {
  return {
    file: filePath,
    format: path.extname(filePath).slice(1).toLowerCase(),
    file_size_bytes: fs.statSync(filePath).size,
    mesh_count: null,
    material_count: null,
    texture_count: null,
    animation_count: null,
    skin_count: null,
    warnings: ['Deep inspection for this format requires Blender or a format-specific parser.']
  };
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const production = readJson(args.production || path.join(workspaceDir, 'production_result.json'));
  const outDir = path.resolve(args.out || production.output_dir || path.join(outputsDir, production.asset_id));
  const models = findModels(outDir);
  if (!models.length) {
    throw new Error(`No model files found under ${outDir}`);
  }

  const checks = [];
  for (const model of models) {
    if (/\.(glb|gltf)$/i.test(model)) {
      try {
        checks.push(await inspectGltf(model));
      } catch (error) {
        checks.push({
          file: model,
          format: path.extname(model).slice(1).toLowerCase(),
          file_size_bytes: fs.statSync(model).size,
          status: 'inspect_error',
          warnings: [error.message]
        });
      }
    } else {
      checks.push(await inspectGeneric(model));
    }
  }

  const report = {
    asset_id: production.asset_id,
    output_dir: outDir,
    status: checks.some((check) => check.status === 'inspect_error') ? 'repair_required' : 'pass',
    checks,
    requirements: {
      real_files_exist: true,
      model_count: models.length
    }
  };

  const md = [
    `# Readiness Report: ${production.asset_id}`,
    '',
    `Status: ${report.status}`,
    '',
    '## Files',
    ...checks.map((check) => `- ${path.relative(outDir, check.file)} (${check.format}, ${check.file_size_bytes} bytes)`),
    '',
    '## Notes',
    ...checks.flatMap((check) => (check.warnings || []).map((warning) => `- ${warning}`))
  ].join('\n');

  writeJson(path.join(outDir, 'readiness_report.json'), report);
  writeJson(path.join(workspaceDir, 'readiness_report.json'), report);
  fs.writeFileSync(path.join(outDir, 'readiness_report.md'), `${md}\n`);
  console.log(`Readiness report: ${path.join(outDir, 'readiness_report.md')}`);
}

main().catch((error) => {
  console.error(`Inspection failed: ${error.message}`);
  process.exit(1);
});
