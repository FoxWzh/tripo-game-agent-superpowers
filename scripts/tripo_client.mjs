import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime-types';
import { getApiKey } from './config.mjs';

const DEFAULT_BASE_URL = 'https://api.tripo3d.ai';
const DEFAULT_DOWNLOAD_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj', '.stl', '.png', '.jpg', '.jpeg', '.webp', '.zip']);

export class TripoClient {
  constructor({ apiKey = getApiKey(), baseUrl = process.env.TRIPO_API_BASE_URL || DEFAULT_BASE_URL } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async request(method, endpoint, { body, headers = {}, retry = 2 } = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
    });

    if (response.status === 429 && retry > 0) {
      const waitMs = Number(response.headers.get('retry-after') || 2) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request(method, endpoint, { body, headers, retry: retry - 1 });
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`Tripo API ${method} ${endpoint} failed ${response.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async uploadFile(filePath) {
    const form = new FormData();
    const bytes = fs.readFileSync(filePath);
    const blob = new Blob([bytes], { type: mime.lookup(filePath) || 'application/octet-stream' });
    form.append('file', blob, path.basename(filePath));

    const data = await this.request('POST', '/v2/openapi/upload', { body: form });
    return data.data || data;
  }

  async createTask(payload) {
    const data = await this.request('POST', '/v2/openapi/task', { body: payload });
    return data.data || data;
  }

  async getTask(taskId) {
    const data = await this.request('GET', `/v2/openapi/task/${taskId}`);
    return data.data || data;
  }

  async pollTask(taskId, { intervalMs = 5000, timeoutMs = 30 * 60 * 1000 } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const task = await this.getTask(taskId);
      const status = task.status || task.task_status;
      if (['success', 'succeeded', 'completed', 'finished'].includes(status)) {
        return task;
      }
      if (['failed', 'failure', 'cancelled', 'canceled'].includes(status)) {
        throw new Error(`Tripo task failed: ${JSON.stringify(task)}`);
      }
      console.log(`Task ${taskId} status: ${status || 'unknown'}; waiting ${Math.round(intervalMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Tripo task timed out after ${Math.round(timeoutMs / 1000)}s: ${taskId}`);
  }
}

export function collectDownloadUrls(task, { allowedExtensions = DEFAULT_DOWNLOAD_EXTENSIONS } = {}) {
  const urls = [];
  const visit = (value, keyPath = []) => {
    if (!value) return;
    if (typeof value === 'string' && /^https?:\/\//.test(value)) {
      let ext = '';
      try {
        ext = path.extname(new URL(value).pathname).toLowerCase();
      } catch {
        ext = '';
      }
      if (!ext || allowedExtensions.has(ext)) {
        urls.push({ name: keyPath.join('_') || 'asset', url: value });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...keyPath, String(index)]));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        visit(item, [...keyPath, key]);
      }
    }
  };
  visit(task.output || task.result || task);
  return urls;
}
