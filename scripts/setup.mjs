import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getApiKey, writeEnvLocal, ensureDirs } from './config.mjs';
import { runDoctor } from './doctor.mjs';

ensureDirs();

const existingKey = getApiKey({ required: false });
if (existingKey) {
  console.log('TRIPO_API_KEY detected.');
} else {
  const rl = readline.createInterface({ input, output });
  const key = (await rl.question('请输入 Tripo API Key: ')).trim();
  rl.close();
  if (!key) {
    console.error('No API key provided. Setup cannot continue.');
    process.exit(1);
  }
  writeEnvLocal({ TRIPO_API_KEY: key });
  process.env.TRIPO_API_KEY = key;
  console.log('Saved TRIPO_API_KEY to .env.local');
}

await runDoctor({ install: true });
