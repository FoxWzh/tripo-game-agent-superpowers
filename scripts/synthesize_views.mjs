import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { TripoClient, collectDownloadUrls } from './tripo_client.mjs';
import { ensureDirs, outputsDir, workspaceDir, readJson, writeJson, parseArgs, slugify, openFile, shouldOpenArtifacts } from './config.mjs';

function normalizeUploadToken(uploadResult) {
  return uploadResult.image_token || uploadResult.file_token || uploadResult.token || uploadResult.id;
}

function inferExt(url, fallback = '.png') {
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

async function main() {
  ensureDirs();
  const args = parseArgs(process.argv.slice(2));
  const brief = readJson(args.brief || path.join(workspaceDir, 'asset_brief.json'), {});
  const assetId = args.asset_id || brief.asset_id || slugify(`views-${Date.now()}`);
  const outDir = path.resolve(args.out || path.join(outputsDir, assetId, 'views'));
  fs.mkdirSync(outDir, { recursive: true });

  const inputPath = args.input || args.front;
  if (!inputPath) {
    throw new Error('Missing --input or --front image for multiview image synthesis.');
  }

  const client = new TripoClient();
  const uploadResult = await client.uploadFile(path.resolve(inputPath));
  const fileToken = normalizeUploadToken(uploadResult);
  if (!fileToken) {
    throw new Error(`Upload result did not include a file/image token: ${JSON.stringify(uploadResult)}`);
  }

  const request = {
    type: 'generate_multiview_image',
    file: {
      type: path.extname(inputPath).replace('.', '').toLowerCase() || 'png',
      file_token: fileToken
    },
    prompt: args.prompt || brief.prompt || 'consistent orthographic multiview game asset reference, clean background'
  };
  writeJson(path.join(outDir, 'view_synthesis_request.json'), request);
  writeJson(path.join(workspaceDir, 'view_synthesis_request.json'), request);

  console.log('Creating Tripo generate_multiview_image task...');
  const created = await client.createTask(request);
  const taskId = created.task_id || created.id;
  if (!taskId) {
    throw new Error(`View synthesis did not return task_id: ${JSON.stringify(created)}`);
  }
  writeJson(path.join(outDir, 'view_synthesis_task_created.json'), created);
  console.log(`View synthesis task created: ${taskId}`);

  const task = await client.pollTask(taskId, {
    intervalMs: Number(args['poll-interval-ms'] || 5000),
    timeoutMs: Number(args['timeout-ms'] || 20 * 60 * 1000)
  });
  writeJson(path.join(outDir, 'view_synthesis_task_result.json'), task);
  writeJson(path.join(workspaceDir, 'view_synthesis_task_result.json'), task);

  const urls = collectDownloadUrls(task);
  const downloads = [];
  for (const item of urls) {
    const filePath = path.join(outDir, `${slugify(item.name)}${inferExt(item.url)}`);
    await download(item.url, filePath);
    downloads.push({ name: item.name, url: item.url, path: filePath });
  }

  const result = {
    asset_id: assetId,
    output_dir: outDir,
    task_id: taskId,
    source_image: inputPath,
    downloads,
    task
  };
  writeJson(path.join(outDir, 'view_synthesis_result.json'), result);
  writeJson(path.join(workspaceDir, 'view_synthesis_result.json'), result);

  console.log(`View synthesis complete: ${outDir}`);
  console.log(`Downloaded view files: ${downloads.length}`);

  if (shouldOpenArtifacts(args)) {
    for (const item of downloads.filter((downloaded) => /\.(png|jpe?g|webp)$/i.test(downloaded.path)).slice(0, 4)) {
      console.log(`Opening synthesized view for confirmation: ${item.path}`);
      openFile(item.path);
    }
  }
}

main().catch((error) => {
  console.error(`View synthesis failed: ${error.message}`);
  process.exit(1);
});
