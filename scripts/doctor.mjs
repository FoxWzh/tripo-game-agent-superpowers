import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { getApiKey, rootDir } from './config.mjs';

const execFileAsync = promisify(execFile);

async function commandOk(command, args = ['--version']) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 10000 });
    return { ok: true, text: (stdout || stderr).trim().split(/\r?\n/)[0] };
  } catch (error) {
    return { ok: false, text: error.message };
  }
}

async function blenderOk() {
  const override = process.env.BLENDER_BIN;
  if (override) return commandOk(override, ['--version']);

  const pathResult = await commandOk('blender', ['--version']);
  if (pathResult.ok) return { ...pathResult, command: 'blender' };

  if (process.platform === 'darwin') {
    const appBinary = '/Applications/Blender.app/Contents/MacOS/Blender';
    if (fs.existsSync(appBinary)) {
      const appResult = await commandOk(appBinary, ['--version']);
      return { ...appResult, command: appBinary };
    }
  }

  return pathResult;
}

async function confirm(message) {
  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question(`${message} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
    child.on('error', reject);
  });
}

export async function runDoctor({ install = false } = {}) {
  const checks = [];

  const apiKey = getApiKey({ required: false });
  checks.push({ name: 'TRIPO_API_KEY', ok: Boolean(apiKey), text: apiKey ? 'configured' : 'missing' });

  checks.push({ name: 'node', ...(await commandOk('node', ['--version'])) });
  checks.push({ name: 'npm', ...(await commandOk('npm', ['--version'])) });
  checks.push({ name: 'curl', ...(await commandOk('curl', ['--version'])) });
  checks.push({ name: 'zip', ...(await commandOk('zip', ['--version'])) });
  checks.push({ name: 'blender', ...(await blenderOk()) });

  const hasNodeModules = fs.existsSync(`${rootDir}/node_modules`);
  checks.push({ name: 'node_modules', ok: hasNodeModules, text: hasNodeModules ? 'installed' : 'missing' });

  console.log('\nDependency check:');
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'MISS'} ${check.name}: ${check.text}`);
  }

  if (!apiKey) {
    console.log('\nTRIPO_API_KEY is required for real generation. Run `./bin/tripo-agent setup`.');
  }

  if (!hasNodeModules) {
    const assumeYes = process.env.TRIPO_AGENT_YES === '1' || process.env.CI === 'true';
    const shouldInstall = install || assumeYes || await confirm('\nNode dependencies are missing. Install with npm install?');
    if (shouldInstall) {
      await run('npm', ['install'], { cwd: rootDir });
    }
  }

  const blender = checks.find((check) => check.name === 'blender');
  if (!blender.ok) {
    console.log('\nBlender is optional but recommended for deeper FBX/rig inspection.');
    console.log('Install manually or with Homebrew if you want full local inspection: brew install --cask blender');
  }

  const requiredOk = Boolean(apiKey) && checks.find((check) => check.name === 'node')?.ok && checks.find((check) => check.name === 'npm')?.ok;
  if (!requiredOk) {
    throw new Error('Required setup is incomplete.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDoctor({ install: process.argv.includes('--install') || process.argv.includes('--yes') || process.argv.includes('-y') }).catch((error) => {
    console.error(`Doctor failed: ${error.message}`);
    process.exit(1);
  });
}
