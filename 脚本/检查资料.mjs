#!/usr/bin/env node
// 仅读取 Markdown 与附件元数据，不读取附件内容。
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const modules = ['基本信息', '教育经历', '实习与工作经历', '项目经历', '科研经历', '校园与社会经历', '技能', '语言能力', '资格与奖项', '实习安排', '常见申请问题', '通用表达', '公司专属补充', '附件登记'];
const empty = value => !value || ['无', '不适用'].includes(value);
const clean = value => value.trim().replace(/^`(.*)`$/, '$1');
const inside = (base, target) => {
  const rel = path.relative(base, target);
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
};
const validDate = value => {
  if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1 || m < 1 || m > 12) return false;
  if (d === undefined) return true;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
};

export async function checkProfile(root, { maxBytes } = {}) {
  const issues = [];
  const add = (line, code, message) => issues.push({ line, code, message });
  const base = path.resolve(root);
  let text;
  try { text = await readFile(path.join(base, '00_基础资料', '个人资料.md'), 'utf8'); }
  catch { return [{ line: 0, code: '文件', message: '无法读取 00_基础资料/个人资料.md；不会自动改用其他事实源。' }]; }
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const headings = new Set(lines.filter(l => /^## /.test(l)).map(l => l.slice(3).trim()));
  for (const name of modules) if (!headings.has(name)) add(0, '结构', `缺少章节：${name}`);
  const ids = new Map(), attachments = new Map(), refs = [];
  let section = '', block = new Map(), tableHeader = null;
  const flush = () => {
    const start = block.get('开始日期'), end = block.get('结束日期');
    if (start && end && !empty(start.value) && !empty(end.value) && validDate(start.value) && validDate(end.value)) {
      const a = start.value.slice(0, 7), b = end.value.slice(0, 7);
      if (a > b || (a === b && start.value.length === 10 && end.value.length === 10 && start.value > end.value)) add(end.line, '日期顺序', '结束日期早于开始日期。');
    }
    block = new Map();
  };
  const register = (id, line) => {
    if (ids.has(id)) add(line, '重复编号', `编号重复，首次在第 ${ids.get(id)} 行。`);
    else ids.set(id, line);
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], n = i + 1;
    if (/^#{2,4} /.test(line)) {
      flush(); tableHeader = null;
      if (/^## /.test(line)) section = line.slice(3).trim();
    }
    const field = /^- ([^：]+)：\s*(.*)$/.exec(line);
    if (field) {
      const key = field[1], value = clean(field[2]);
      block.set(key, { value, line: n });
      const continued = /^\s{2,}\S/.test(lines[i + 1] || '');
      if (!value && !continued) add(n, '未填', `${section} → ${key} 尚未提供；是否必填由本次官网决定。`);
      if (key === '记录编号' && !empty(value)) register(value, n);
      if (key === '关联附件' && !empty(value)) for (const id of value.split(/[，,、;；]/).map(clean).filter(Boolean)) refs.push({ id, line: n });
      if ((key.includes('日期') || key === '可实习至' || key === '有效期至') && !empty(value) && !validDate(value)) add(n, '日期格式', `${key} 应为真实的 YYYY-MM-DD 或 YYYY-MM；预计、至今等情况放对应说明字段。`);
    }
    if (line.trim().startsWith('|')) {
      const cells = line.trim().split('|').slice(1, -1).map(clean);
      if (cells.every(c => /^:?-+:?$/.test(c))) continue;
      if (cells.includes('附件编号') && cells.includes('相对路径')) { tableHeader = cells; continue; }
      if (section === '附件登记' && tableHeader) {
        if (cells.every(c => !c)) continue;
        if (cells.length !== tableHeader.length) { add(n, '表格', '附件登记列数与表头不符。'); continue; }
        const record = Object.fromEntries(tableHeader.map((key, k) => [key, cells[k]]));
        const id = record['附件编号'];
        if (empty(id)) { add(n, '附件编号', '附件登记缺少有效编号。'); continue; }
        register(id, n);
        if (!attachments.has(id)) attachments.set(id, { ...record, line: n });
      } else if (section === '常见申请问题' && cells.length === 4 && cells[0] !== '问题' && cells[1]) {
        if (!cells[2] || !cells[3]) add(n, '声明范围', '已填写的声明须同时提供适用范围和确认日期。');
        if (cells[3] && !validDate(cells[3])) add(n, '日期格式', '声明确认日期格式或日期无效。');
      }
    }
  }
  flush();
  for (const ref of refs) if (!attachments.has(ref.id)) add(ref.line, '附件引用', '关联附件编号未在附件登记中定义。');
  const library = path.join(base, '01_附件库');
  const realBase = await realpath(base);
  let realLibrary;
  try { realLibrary = await realpath(library); } catch { /* 附件存在时再报错 */ }
  for (const record of attachments.values()) {
    const rel = record['相对路径'];
    if (empty(rel)) { add(record.line, '附件路径', '已登记附件缺少相对路径。'); continue; }
    const normalized = rel.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const absolute = path.isAbsolute(rel) || /^[A-Za-z]:/.test(rel) || normalized.startsWith('/');
    const target = path.resolve(base, ...parts);
    if (absolute || parts.includes('..') || parts[0] !== '01_附件库' || !inside(library, target)) {
      add(record.line, '附件路径', '附件须使用 01_附件库/ 下的相对路径，不得越界或使用绝对路径。'); continue;
    }
    try {
      const actual = await realpath(target);
      if (!realLibrary || !inside(realBase, realLibrary) || !inside(realLibrary, actual)) {
        add(record.line, '附件路径', '附件目录或文件链接指向允许目录之外。'); continue;
      }
      const info = await stat(actual);
      if (!info.isFile()) add(record.line, '附件类型', '附件路径不是文件。');
      else if (maxBytes !== undefined && info.size > maxBytes) add(record.line, '附件大小', `文件 ${info.size} 字节，超过本次指定的 ${maxBytes} 字节限制。`);
    } catch { add(record.line, '附件缺失', '登记的附件文件不存在或不可访问。'); }
  }
  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args[0].startsWith('--') || args.slice(1).some((a, i) => i !== 0 || !/^--最大字节=\d+$/.test(a))) {
    console.error('用法：node 检查资料.mjs <用户工作区> [--最大字节=官网限制]'); process.exitCode = 2; return;
  }
  const maxBytes = args[1] ? Number(args[1].split('=')[1]) : undefined;
  if (maxBytes !== undefined && (!Number.isSafeInteger(maxBytes) || maxBytes < 1)) { console.error('最大字节必须是正整数。'); process.exitCode = 2; return; }
  const issues = await checkProfile(args[0], { maxBytes });
  if (issues.length) console.log(issues.map(x => `${x.line ? `第${x.line}行` : '文件'} [${x.code}] ${x.message}`).join('\n'));
  else console.log('未发现结构、日期或附件引用问题；不代表个人事实完整或满足某次申请。');
  process.exitCode = issues.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('检查失败：请确认工作区可访问。'); process.exitCode = 2; });
