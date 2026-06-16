import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs } from './config.mjs';

function addDirectory(zip, sourceDir, zipRoot, filter = () => true) {
  if (!fs.existsSync(sourceDir)) return;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (filter(full)) {
        zip.addLocalFile(full, path.join(zipRoot, path.relative(sourceDir, path.dirname(full))));
      }
    }
  };
  walk(sourceDir);
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const production = readJson(args.production || path.join(workspaceDir, 'production_result.json'));
  const readiness = readJson(args.readiness || path.join(workspaceDir, 'readiness_report.json'));
  const outDir = path.resolve(args.out || production.output_dir);
  const engine = args.engine || production.task?.engine || 'unity';
  const packageName = `${production.asset_id}_${engine}_package.zip`;
  const packagePath = path.join(outDir, packageName);

  const manifest = {
    asset_id: production.asset_id,
    engine,
    task_id: production.task_id,
    conversion: fs.existsSync(path.join(outDir, 'conversion_result.json'))
      ? readJson(path.join(outDir, 'conversion_result.json'), {})
      : null,
    rig: fs.existsSync(path.join(outDir, 'rig_result.json'))
      ? readJson(path.join(outDir, 'rig_result.json'), {})
      : null,
    deep_readiness: fs.existsSync(path.join(outDir, 'deep_readiness_report.json'))
      ? readJson(path.join(outDir, 'deep_readiness_report.json'), {})
      : null,
    packaged_at: new Date().toISOString(),
    readiness_status: readiness.status,
    files: production.downloads || []
  };
  writeJson(path.join(outDir, 'manifest.json'), manifest);

  const importGuide = [
    `# ${engine} Import Guide`,
    '',
    '1. Unzip this package into your project asset folder.',
    '2. Import the model from `models/` or `downloads/`.',
    '3. Reconnect textures if your engine does not auto-resolve them.',
    '4. Review `reports/readiness_report.md` before shipping the asset.',
    '',
    `Readiness status: ${readiness.status}`
  ].join('\n');
  fs.writeFileSync(path.join(outDir, `import_${engine}.md`), `${importGuide}\n`);

  const zip = new AdmZip();
  addDirectory(zip, path.join(outDir, 'downloads'), 'models');
  addDirectory(zip, path.join(outDir, 'converted'), 'models');
  addDirectory(zip, path.join(outDir, 'rigged'), 'models');
  for (const file of ['manifest.json', 'readiness_report.json', 'readiness_report.md', `import_${engine}.md`, 'task_result.json', 'production_result.json', 'conversion_result.json', 'conversion_task_result.json', 'rig_result.json', 'rig_precheck_task_result.json', 'rig_task_result.json', 'deep_readiness_report.json', 'blender_readiness_report.json']) {
    const full = path.join(outDir, file);
    if (fs.existsSync(full)) zip.addLocalFile(full, file.endsWith('.md') || file.includes('report') ? 'reports' : '');
  }
  zip.writeZip(packagePath);

  const packageResult = { asset_id: production.asset_id, engine, package_path: packagePath, manifest };
  writeJson(path.join(outDir, 'package_result.json'), packageResult);
  writeJson(path.join(workspaceDir, 'package_result.json'), packageResult);
  console.log(`Package created: ${packagePath}`);
}

main().catch((error) => {
  console.error(`Packaging failed: ${error.message}`);
  process.exit(1);
});
