import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { TripoClient, collectDownloadUrls } from './tripo_client.mjs';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs, slugify, openFile, shouldOpenArtifacts } from './config.mjs';

function taskIdFromResult(result) {
  return result?.task_id || result?.conversion_task_id || result?.source_task_id;
}

function normalizeRigType(preset) {
  const value = String(preset || 'humanoid').toLowerCase();
  if (value.includes('ue')) return 'humanoid';
  if (value.includes('unity')) return 'humanoid';
  return value;
}

async function download(url, filePath) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath));
}

async function runTask({ client, payload, outDir, label, args }) {
  writeJson(path.join(outDir, `${label}_request.json`), payload);
  writeJson(path.join(workspaceDir, `${label}_request.json`), payload);
  console.log(`Creating Tripo ${payload.type} task...`);
  const created = await client.createTask(payload);
  const taskId = created.task_id || created.id;
  if (!taskId) throw new Error(`${payload.type} did not return task_id: ${JSON.stringify(created)}`);
  writeJson(path.join(outDir, `${label}_task_created.json`), created);
  console.log(`${payload.type} task created: ${taskId}`);
  const task = await client.pollTask(taskId, {
    intervalMs: Number(args['poll-interval-ms'] || 5000),
    timeoutMs: Number(args['timeout-ms'] || 30 * 60 * 1000)
  });
  writeJson(path.join(outDir, `${label}_task_result.json`), task);
  writeJson(path.join(workspaceDir, `${label}_result.json`), task);
  return { taskId, task };
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const production = readJson(args.production || path.join(workspaceDir, 'production_result.json'), {});
  const conversion = readJson(args.conversion || path.join(workspaceDir, 'conversion_result.json'), production);
  const plan = readJson(args.plan || path.join(workspaceDir, 'production_plan.json'), {});
  const outDir = path.resolve(args.out || production.output_dir || conversion.output_dir);
  fs.mkdirSync(outDir, { recursive: true });

  const sourceTaskId = args['task-id'] || taskIdFromResult(conversion) || taskIdFromResult(production);
  if (!sourceTaskId) {
    throw new Error('Missing model task id for rigging. Run generation/conversion first or pass --task-id.');
  }

  const rigRoute = plan.rig_route || {};
  const preset = args.preset || args['rig-preset'] || rigRoute.preset || 'unity-humanoid';
  const rigType = normalizeRigType(preset);
  const outFormat = String(args.format || rigRoute.output_format || 'FBX').toUpperCase();
  const client = new TripoClient();

  const precheckPayload = {
    type: 'animate_prerigcheck',
    original_model_task_id: sourceTaskId
  };
  const precheck = await runTask({ client, payload: precheckPayload, outDir, label: 'rig_precheck', args });

  const shouldApply = Boolean(args.apply || args['auto-rig']);
  if (!shouldApply) {
    const result = {
      asset_id: production.asset_id || plan.asset_id,
      output_dir: outDir,
      source_task_id: sourceTaskId,
      precheck_task_id: precheck.taskId,
      preset,
      rig_type: rigType,
      applied: false,
      next_action: 'Review pre-rig check. Re-run with --apply to spend rigging credits.'
    };
    writeJson(path.join(outDir, 'rig_result.json'), result);
    writeJson(path.join(workspaceDir, 'rig_result.json'), result);
    console.log('Rig precheck complete. Re-run with --apply to auto-rig.');
    return;
  }

  const rigPayload = {
    type: 'animate_rig',
    original_model_task_id: sourceTaskId,
    out_format: outFormat,
    rig_type: rigType,
    spec: preset
  };
  const rig = await runTask({ client, payload: rigPayload, outDir, label: 'rig', args });
  const urls = collectDownloadUrls(rig.task);
  const downloads = [];
  for (const item of urls) {
    const filePath = path.join(outDir, 'rigged', `${slugify(`${item.name}-${outFormat}`)}${path.extname(new URL(item.url).pathname) || `.${outFormat.toLowerCase()}`}`);
    await download(item.url, filePath);
    downloads.push({ name: item.name, url: item.url, path: filePath });
  }

  const result = {
    asset_id: production.asset_id || plan.asset_id,
    output_dir: outDir,
    source_task_id: sourceTaskId,
    precheck_task_id: precheck.taskId,
    rig_task_id: rig.taskId,
    preset,
    rig_type: rigType,
    format: outFormat,
    applied: true,
    downloads,
    task: rig.task
  };
  writeJson(path.join(outDir, 'rig_result.json'), result);
  writeJson(path.join(workspaceDir, 'rig_result.json'), result);
  console.log(`Rig complete: ${downloads.length} files`);

  if (shouldOpenArtifacts(args)) {
    const rigged = downloads.find((item) => /\.(fbx|glb|gltf)$/i.test(item.path)) || downloads[0];
    if (rigged) {
      console.log(`Opening rigged asset for confirmation: ${rigged.path}`);
      openFile(rigged.path);
    }
  }
}

main().catch((error) => {
  console.error(`Rig failed: ${error.message}`);
  process.exit(1);
});
