import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const workspaceDir = path.join(rootDir, 'workspace');
export const outputsDir = path.join(rootDir, 'outputs');
export const assetsDir = path.join(rootDir, 'assets');
export const envLocalPath = path.join(rootDir, '.env.local');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: envLocalPath, override: false });

export function ensureDirs() {
  for (const dir of [workspaceDir, outputsDir, assetsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getApiKey({ required = true } = {}) {
  const key = process.env.TRIPO_API_KEY || '';
  if (!key && required) {
    throw new Error('TRIPO_API_KEY is missing. Run `./bin/tripo-agent setup` first.');
  }
  return key;
}

export function writeEnvLocal(updates) {
  const existing = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.trim() && !Object.keys(updates).some((key) => line.startsWith(`${key}=`)));
  for (const [key, value] of Object.entries(updates)) {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(envLocalPath, `${lines.join('\n')}\n`);
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== null) return fallback;
    throw new Error(`Missing JSON file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function slugify(value) {
  return String(value || 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'asset';
}

export function parseArgs(argv, { requireValuesFor = [] } = {}) {
  const result = { _: [] };
  const requireValues = new Set(requireValuesFor);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      if (requireValues.has(key)) {
        throw new Error(`Missing value for --${key}.`);
      }
      result[key] = true;
    } else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

export function openFile(filePath) {
  if (!filePath || process.env.TRIPO_AGENT_NO_OPEN === '1') return;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return;

  const opener = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', resolved]
    : [resolved];

  const child = spawn(opener, args, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

export function shouldOpenArtifacts(args = {}) {
  if (args['no-open']) return false;
  return process.env.TRIPO_AGENT_NO_OPEN !== '1';
}
