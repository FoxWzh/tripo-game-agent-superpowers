import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { TripoClient, collectDownloadUrls } from './tripo_client.mjs';
import { ensureDirs, outputsDir, workspaceDir, readJson, writeJson, parseArgs, slugify, openFile, shouldOpenArtifacts } from './config.mjs';

function inferExt(url, fallback = '.bin') {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

function normalizeUploadToken(uploadResult) {
  return uploadResult.image_token || uploadResult.file_token || uploadResult.token || uploadResult.id;
}

function fileTypeForPath(filePath) {
  const ext = path.extname(filePath || '').replace('.', '').toLowerCase();
  return ext === 'jpg' ? 'jpeg' : ext || 'png';
}

async function uploadImage(client, filePath) {
  const result = await client.uploadFile(path.resolve(filePath));
  const token = normalizeUploadToken(result);
  if (!token) {
    throw new Error(`Upload result did not include a file/image token: ${JSON.stringify(result)}`);
  }
  return {
    result,
    token,
    file: {
      type: fileTypeForPath(filePath),
      file_token: token
    }
  };
}

function mapPlanToTripoPayload({ plan, uploadToken, inputUrl, multiviewFiles }) {
  const params = plan.tripo_params || {};
  const modelRoute = plan.model_route || {};
  const taskType = modelRoute.task_type || 'image_to_model';
  const payload = {
    type: taskType,
    model_version: params.model_version || 'v3.1-20260211',
    texture: params.texture ?? true,
    pbr: params.pbr ?? true,
    texture_quality: params.texture_quality || 'standard',
    smart_low_poly: params.smart_low_poly ?? false,
    quad: params.quad ?? true,
    face_limit: params.face_limit || 15000,
    auto_size: params.auto_size ?? true,
    orientation: params.orientation || 'align_image',
    export_uv: params.export_uv ?? true,
    geometry_quality: params.geometry_quality || 'standard'
  };

  if (taskType === 'text_to_model') {
    payload.prompt = plan.prompt || plan.input_inventory?.prompt || '';
    if (!payload.prompt) throw new Error('Text-to-model requires prompt in plan.');
    return payload;
  }

  if (taskType === 'multiview_to_model') {
    const files = {};
    for (const view of ['front', 'left', 'back', 'right']) {
      if (multiviewFiles?.[view]) files[view] = multiviewFiles[view];
    }
    if (!files.front || Object.keys(files).length < 2) {
      throw new Error('Multiview-to-model requires at least front plus one other view.');
    }
    payload.files = files;
    return payload;
  }

  if (uploadToken) {
    payload.file = {
      type: params.file_type || 'png',
      file_token: uploadToken
    };
  } else if (inputUrl) {
    payload.file = {
      type: params.file_type || 'png',
      url: inputUrl
    };
  } else {
    throw new Error('Image-to-model requires --input image path or --input-url.');
  }

  return payload;
}

async function download(url, filePath) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath));
}

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const briefPath = args.brief || path.join(workspaceDir, 'asset_brief.json');
  const planPath = args.plan || path.join(workspaceDir, 'production_plan.json');
  const inputPath = args.input;
  const inputUrl = args['input-url'];
  const brief = readJson(briefPath, {});
  const plan = readJson(planPath, {});

  const assetId = args.out
    ? path.basename(args.out)
    : slugify(plan.asset_id || brief.asset_id || `${brief.engine || 'game'}-${brief.asset_type || 'asset'}-${Date.now()}`);
  const outDir = args.out ? path.resolve(args.out) : path.join(outputsDir, assetId);
  fs.mkdirSync(outDir, { recursive: true });

  const client = new TripoClient();
  let uploadToken = null;
  let uploadResult = null;
  let multiviewFiles = null;
  const modelRoute = plan.model_route || {};
  const taskType = modelRoute.task_type || 'image_to_model';
  if (inputPath) {
    const uploaded = await uploadImage(client, inputPath);
    uploadResult = uploaded.result;
    uploadToken = uploaded.token;
  }

  if (taskType === 'multiview_to_model') {
    multiviewFiles = {};
    const uploadResults = {};
    const inventoryViews = plan.input_inventory?.views || {};
    for (const view of ['front', 'left', 'back', 'right']) {
      const filePath = args[view] || inventoryViews[view]?.path;
      if (!filePath) continue;
      const uploaded = await uploadImage(client, filePath);
      multiviewFiles[view] = uploaded.file;
      uploadResults[view] = uploaded.result;
    }
    uploadResult = { single_image: uploadResult, multiview: uploadResults };
  }

  const request = mapPlanToTripoPayload({ plan, uploadToken, inputUrl, multiviewFiles });
  writeJson(path.join(outDir, 'generation_request.json'), request);
  writeJson(path.join(workspaceDir, 'generation_request.json'), request);

  console.log(`Creating Tripo ${request.type} task...`);
  const created = await client.createTask(request);
  const taskId = created.task_id || created.id;
  if (!taskId) {
    throw new Error(`Task creation did not return task_id: ${JSON.stringify(created)}`);
  }
  writeJson(path.join(outDir, 'task_created.json'), created);
  console.log(`Task created: ${taskId}`);

  const task = await client.pollTask(taskId, {
    intervalMs: Number(args['poll-interval-ms'] || 5000),
    timeoutMs: Number(args['timeout-ms'] || 30 * 60 * 1000)
  });
  writeJson(path.join(outDir, 'task_result.json'), task);
  writeJson(path.join(workspaceDir, 'generation_result.json'), task);

  const urls = collectDownloadUrls(task);
  const downloads = [];
  for (const item of urls) {
    const ext = inferExt(item.url);
    const safeName = slugify(item.name);
    const filePath = path.join(outDir, 'downloads', `${safeName}${ext}`);
    await download(item.url, filePath);
    downloads.push({ name: item.name, url: item.url, path: filePath });
  }

  const result = {
    asset_id: assetId,
    output_dir: outDir,
    task_id: taskId,
    consumed_credit: task.consumed_credit ?? task.consumed_credits ?? null,
    upload: uploadResult,
    downloads,
    task
  };
  writeJson(path.join(outDir, 'production_result.json'), result);
  writeJson(path.join(workspaceDir, 'production_result.json'), result);

  console.log(`Generation complete: ${outDir}`);
  console.log(`Downloaded files: ${downloads.length}`);
  if (result.consumed_credit !== null) {
    console.log(`Consumed credits: ${result.consumed_credit}`);
  }

  if (shouldOpenArtifacts(args)) {
    const preview = downloads.find((item) => /\.(png|jpe?g|webp)$/i.test(item.path));
    const model = downloads.find((item) => /\.(glb|gltf|fbx|obj)$/i.test(item.path));
    if (preview) {
      console.log(`Opening preview for confirmation: ${preview.path}`);
      openFile(preview.path);
    }
    if (model) {
      console.log(`Opening model for confirmation: ${model.path}`);
      openFile(model.path);
    }
  }
}

main().catch((error) => {
  console.error(`Generation failed: ${error.message}`);
  process.exit(1);
});
