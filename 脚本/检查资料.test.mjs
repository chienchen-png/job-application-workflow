import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile, modules } from './检查资料.mjs';

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'job-plugin-test-'));
  try {
    await mkdir(path.join(root, '00_基础资料'));
    await mkdir(path.join(root, '01_附件库'));
    // 故意使用非文本内容，检查器只应 stat，不应解析附件。
    await writeFile(path.join(root, '01_附件库', '虚构证明.pdf'), Buffer.from([0, 255, 1, 254]));
    await run(root, async body => writeFile(path.join(root, '00_基础资料', '个人资料.md'), modules.map(m => `## ${m}\n${body[m] || ''}`).join('\n')));
  } finally { await rm(root, { recursive: true, force: true }); }
}
const table = rows => '| 附件编号 | 名称 | 语言 | 用途 | 相对路径 |\n|---|---|---|---|---|\n' + rows;

test('虚构经历、中文相对路径、合法闰日可通过且文件不变', async () => fixture(async (root, put) => {
  await put({ '实习与工作经历': '### 实习\n- 记录编号：实习-001\n- 开始日期：2024-02-29\n- 结束日期：2024-03\n- 关联附件：附件-001', '附件登记': table('| 附件-001 | 虚构证明 | 中文 | 实习 | 01_附件库/虚构证明.pdf |') });
  const before = await readFile(path.join(root, '00_基础资料', '个人资料.md'));
  assert.deepEqual(await checkProfile(root), []);
  assert.deepEqual(await readFile(path.join(root, '00_基础资料', '个人资料.md')), before);
  assert.equal((await checkProfile(root, { maxBytes: 3 }))[0].code, '附件大小');
}));

test('空白不同于无；重复编号、未定义引用和非法日期被定位', async () => fixture(async (root, put) => {
  await put({ '基本信息': '- 姓名：\n- 英文名：无', '项目经历': '### 项目\n- 记录编号：记录-001\n- 开始日期：2023-02-29\n- 关联附件：附件-不存在\n### 项目\n- 记录编号：记录-001\n- 开始日期：2025-05\n- 结束日期：2025-04' });
  const result = await checkProfile(root);
  for (const code of ['未填', '重复编号', '附件引用', '日期格式', '日期顺序']) assert.ok(result.some(r => r.code === code), code);
  assert.equal(result.filter(r => r.code === '未填').length, 1);
  assert.ok(result.every(r => !r.message.includes('记录-001') && !r.message.includes('附件-不存在')));
}));

test('附件绝对路径、遍历、缺失及目录都不能作为有效文件', async () => fixture(async (root, put) => {
  await put({ '附件登记': table([
    '| 附件-1 | | | | C:/secret.pdf |',
    '| 附件-2 | | | | 01_附件库/../secret.pdf |',
    '| 附件-3 | | | | 01_附件库/不存在.pdf |',
    '| 附件-4 | | | | 01_附件库/目录 |',
  ].join('\n')) });
  await mkdir(path.join(root, '01_附件库', '目录'));
  const result = await checkProfile(root);
  assert.equal(result.filter(r => r.code === '附件路径').length, 2);
  assert.ok(result.some(r => r.code === '附件缺失'));
  assert.ok(result.some(r => r.code === '附件类型'));
}));

test('目录链接不能将附件引出工作区', async t => fixture(async (root, put) => {
  const outside = await mkdtemp(path.join(tmpdir(), 'job-plugin-external-'));
  try {
    await writeFile(path.join(outside, '虚构.txt'), 'dummy');
    try { await symlink(outside, path.join(root, '01_附件库', '外部'), 'junction'); }
    catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) { t.skip('当前环境不允许建立测试链接'); return; } throw e; }
    await put({ '附件登记': table('| 附件-1 | | | | 01_附件库/外部/虚构.txt |') });
    assert.ok((await checkProfile(root)).some(r => r.code === '附件路径'));
  } finally { await rm(outside, { recursive: true, force: true }); }
}));

test('声明必须带范围和确认日，多行答案不误报空白', async () => fixture(async (root, put) => {
  await put({ '通用表达': '- 中文自我介绍：\n  虚构的多行自我介绍。', '常见申请问题': '| 问题 | 答案 | 适用范围 | 确认日期 |\n|---|---|---|---|\n| 工作许可 | 无 | | 2025-02-30 |' });
  const result = await checkProfile(root);
  assert.ok(result.some(r => r.code === '声明范围'));
  assert.ok(result.some(r => r.code === '日期格式'));
  assert.ok(!result.some(r => r.code === '未填'));
}));

test('实际空白模板可检查，缺项不会被改写成默认答案', async () => fixture(async root => {
  const template = await readFile(new URL('../模板/个人资料.md', import.meta.url), 'utf8');
  const target = path.join(root, '00_基础资料', '个人资料.md');
  await writeFile(target, template);
  const result = await checkProfile(root);
  assert.ok(result.some(r => r.code === '未填'));
  assert.ok(!result.some(r => r.code !== '未填'), JSON.stringify(result));
  assert.equal(await readFile(target, 'utf8'), template);
}));
