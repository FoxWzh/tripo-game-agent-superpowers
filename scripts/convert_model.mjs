import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { TripoClient, collectDownloadUrls } from './tripo_client.mjs';
import { ensureDirs, workspaceDir, readJson, writeJson, parseArgs, slugify, openFile, shouldOpenArtifacts } from './config.mjs';

function normalizeFormat(format) {
  return String(format || 'FBX').toUpperCase();
}

function inferExt(url, fallback) {
  try {
    const ext = path.extname(new URL(url).pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

async function download(url, filePath) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath));
}

function buildPayload({ args, production, plan }) {
  const format = normalizeFormat(args.format || plan.parameters?.format || 'FBX');
  const originalTaskId = args['task-id'] || production.task_id;
  if (!originalTaskId) {
    throw new Error('Missing original Tripo task id. Pass --task-id or run generation first.');
  }

  const payload = {
    type: 'convert_model',
    original_model_task_id: originalTaskId,
    format
  };

  const faceLimit = args['face-limit'] || args['poly-budget'] || plan.tripo_params?.face_limit || plan.parameters?.poly_budget;
  if (faceLimit) payload.face_limit = Number(faceLimit);
  if (args.quad || plan.tripo_params?.quad) payload.quad = Boolean(args.quad || plan.tripo_params?.quad);
  if (args['pivot-to-center-bottom'] || plan.parameters?.engine === 'Unity') payload.pivot_to_center_bottom = true;
  if (args['texture-format']) payload.texture_format = args['texture-format'];
  if (args['fbx-preset']) payload.fbx_preset = args['fbx-preset'];

  return payload;
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const production = readJson(args.production || path.join(workspaceDir, 'production_result.json'));
  const plan = readJson(args.plan || path.join(workspaceDir, 'production_plan.json'), {});
  const outDir = path.resolve(args.out || production.output_dir);
  fs.mkdirSync(outDir, { recursive: true });

  const payload = buildPayload({ args, production, plan });
  writeJson(path.join(outDir, 'conversion_request.json'), payload);
  writeJson(path.join(workspaceDir, 'conversion_request.json'), payload);

  const client = new TripoClient();
  console.log(`Creating Tripo conversion task: ${payload.format}`);
  const created = await client.createTask(payload);
  const taskId = created.task_id || created.id;
  if (!taskId) {
    throw new Error(`Conversion did not return task_id: ${JSON.stringify(created)}`);
  }
  writeJson(path.join(outDir, 'conversion_task_created.json'), created);
  console.log(`Conversion task created: ${taskId}`);

  const task = await client.pollTask(taskId, {
    intervalMs: Number(args['poll-interval-ms'] || 5000),
    timeoutMs: Number(args['timeout-ms'] || 30 * 60 * 1000)
  });
  writeJson(path.join(outDir, 'conversion_task_result.json'), task);
  writeJson(path.join(workspaceDir, 'conversion_result.json'), task);

  const urls = collectDownloadUrls(task);
  const downloads = [];
  for (const item of urls) {
    const fallback = `.${payload.format.toLowerCase()}`;
    const ext = inferExt(item.url, fallback);
    const filePath = path.join(outDir, 'converted', `${slugify(`${item.name}-${payload.format}`)}${ext}`);
    await download(item.url, filePath);
    downloads.push({ name: item.name, url: item.url, path: filePath });
  }

  const result = {
    asset_id: production.asset_id,
    output_dir: outDir,
    source_task_id: production.task_id,
    conversion_task_id: taskId,
    format: payload.format,
    downloads,
    task
  };
  writeJson(path.join(outDir, 'conversion_result.json'), result);
  writeJson(path.join(workspaceDir, 'conversion_result.json'), result);

  console.log(`Conversion complete: ${payload.format}`);
  console.log(`Downloaded converted files: ${downloads.length}`);

  if (shouldOpenArtifacts(args)) {
    const converted = downloads.find((item) => new RegExp(`\\.${payload.format.toLowerCase()}$`, 'i').test(item.path)) || downloads[0];
    if (converted) {
      console.log(`Opening converted asset for confirmation: ${converted.path}`);
      openFile(converted.path);
    }
  }
}

main().catch((error) => {
  console.error(`Conversion failed: ${error.message}`);
  process.exit(1);
});
