#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const registryFile = fileURLToPath(new URL('../数据源/招聘来源.json', import.meta.url));
const accessKinds = new Set(['edge', 'edge-session', 'api']);

export async function loadRegistry(file = registryFile) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export function validateRegistry(registry) {
  if (registry?.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(registry.updatedAt || '')) throw new Error('注册表版本或日期无效');
  if (!Array.isArray(registry.sources) || !registry.sources.length) throw new Error('注册表没有来源');
  if (!Array.isArray(registry.atsAdapters) || !registry.atsAdapters.length) throw new Error('注册表没有 ATS 适配器');
  const ids = new Set();
  for (const source of registry.sources) {
    for (const key of ['id', 'group', 'company', 'kind', 'access', 'entry']) if (!source[key]) throw new Error(`来源缺少 ${key}`);
    if (ids.has(source.id)) throw new Error(`来源编号重复：${source.id}`);
    ids.add(source.id);
    if (!accessKinds.has(source.access)) throw new Error(`未知访问方式：${source.access}`);
    if (!/^https?:\/\//.test(source.entry)) throw new Error(`来源入口无效：${source.id}`);
    if (source.access === 'api') {
      const adapter = registry.atsAdapters.find(item => item.id === source.ats);
      if (!adapter || !source.board) throw new Error(`ATS 配置不完整：${source.id}`);
    }
  }
  const atsIds = new Set();
  for (const adapter of registry.atsAdapters) {
    for (const key of ['id', 'name', 'endpoint']) if (!adapter[key]) throw new Error(`ATS 缺少 ${key}`);
    if (atsIds.has(adapter.id)) throw new Error(`ATS 编号重复：${adapter.id}`);
    atsIds.add(adapter.id);
  }
  return registry;
}

export function fillTemplate(template, values = {}) {
  return template.replace(/\{([a-zA-Z][\w-]*)\}/g, (_, key) => encodeURIComponent(values[key] ?? ''));
}

export function sourceUrl(source, values = {}) {
  return fillTemplate(source.entry, values);
}

export function atsEndpoint(adapter, board) {
  return fillTemplate(adapter.endpoint, { board });
}

export function normalizeAts(kind, payload) {
  if (kind === 'greenhouse') {
    return (payload.jobs || []).map(job => ({
      id: String(job.id),
      company: job.company_name || '',
      title: job.title || '',
      location: job.location?.name || '',
      department: '',
      url: job.absolute_url || '',
      updatedAt: job.updated_at || ''
    }));
  }
  if (kind === 'lever') {
    return (Array.isArray(payload) ? payload : []).map(job => ({
      id: String(job.id || ''),
      company: '',
      title: job.text || '',
      location: job.categories?.location || '',
      department: job.categories?.team || job.categories?.department || '',
      url: job.hostedUrl || '',
      updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : ''
    }));
  }
  if (kind === 'ashby') {
    return (payload.jobs || []).map(job => ({
      id: String(job.id || ''),
      company: '',
      title: job.title || '',
      location: job.location || '',
      department: job.department || job.team || '',
      url: job.jobUrl || job.applyUrl || '',
      updatedAt: job.publishedAt || job.updatedAt || ''
    }));
  }
  if (kind === 'smartrecruiters') {
    return (payload.content || []).map(job => ({
      id: String(job.id || ''),
      company: job.company?.name || '',
      title: job.name || '',
      location: [job.location?.city, job.location?.country].filter(Boolean).join(', '),
      department: job.department?.label || '',
      url: job.ref || (job.id ? `https://jobs.smartrecruiters.com/${job.id}` : ''),
      updatedAt: job.releasedDate || ''
    }));
  }
  throw new Error(`未知 ATS：${kind}`);
}

export function filterJobs(jobs, { query = '', location = '', limit = 30 } = {}) {
  const need = [query, location].filter(Boolean).map(value => value.toLocaleLowerCase('zh-CN'));
  return jobs
    .filter(job => {
      const text = [job.title, job.location, job.department].join('\n').toLocaleLowerCase('zh-CN');
      return need.every(value => text.includes(value));
    })
    .slice(0, limit);
}

function options(args) {
  const values = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { positional.push(args[i]); continue; }
    const [key, inline] = args[i].slice(2).split('=', 2);
    if (inline !== undefined) values[key] = inline;
    else if (args[i + 1] && !args[i + 1].startsWith('--')) values[key] = args[++i];
    else values[key] = true;
  }
  return { values, positional };
}

function printRows(jobs) {
  console.log('公司\t岗位\t地点\t部门\t更新时间\t链接');
  for (const job of jobs) console.log([job.company, job.title, job.location, job.department, job.updatedAt, job.url].join('\t'));
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  const { values, positional } = options(args);
  if (command === 'help') {
    console.log('用法：node 招聘来源.mjs list [分组] | show <来源编号> | url <来源编号> [--query=词] [--city=城市] | ats <greenhouse|lever|ashby|smartrecruiters> <board> [--query=词] [--location=地点] [--limit=30] [--json] | validate');
    return;
  }
  const registry = validateRegistry(await loadRegistry());
  if (command === 'validate') {
    console.log(`有效：${registry.sources.length} 个来源，${registry.atsAdapters.length} 个 ATS 适配器。`);
    return;
  }
  if (command === 'list') {
    for (const source of registry.sources.filter(item => !positional[0] || item.group === positional[0])) console.log([source.id, source.group, source.company, source.access, source.entry].join('\t'));
    return;
  }
  if (command === 'show' || command === 'url') {
    const source = registry.sources.find(item => item.id === positional[0]);
    if (!source) throw new Error(`未找到来源：${positional[0] || ''}`);
    if (command === 'url') console.log(sourceUrl(source, values));
    else console.log(JSON.stringify(source, null, 2));
    return;
  }
  if (command === 'ats') {
    const [kind, board] = positional;
    const adapter = registry.atsAdapters.find(item => item.id === kind);
    if (!adapter || !board) throw new Error('ATS 名称和 board 必填');
    const response = await fetch(atsEndpoint(adapter, board), { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`ATS 请求失败：HTTP ${response.status}`);
    const limit = Number(values.limit ?? 30);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('limit 必须是正整数');
    const jobs = filterJobs(normalizeAts(kind, await response.json()), {
      query: values.query || '',
      location: values.location || '',
      limit
    });
    if (values.json === true) console.log(JSON.stringify(jobs, null, 2));
    else printRows(jobs);
    return;
  }
  throw new Error(`未知命令：${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
