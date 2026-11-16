import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./初始化工作区.ps1', import.meta.url));

test('初始化工作区创建模板并保留已有文件', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'job-workspace-test-'));
  const workspace = path.join(root, 'workspace');
  try {
    const first = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Workspace', workspace], { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);

    const agreements = path.join(workspace, 'AGENTS.md');
    assert.match(await readFile(agreements, 'utf8'), /# 求职工作约定/);
    assert.match(await readFile(path.join(workspace, '00_基础资料', '个人资料.md'), 'utf8'), /## 基本信息/);
    assert.match(await readFile(path.join(workspace, '90_投递总览.md'), 'utf8'), /# 投递总览/);

    await writeFile(agreements, 'custom workspace rules\n', 'utf8');
    const second = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Workspace', workspace], { encoding: 'utf8' });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(await readFile(agreements, 'utf8'), 'custom workspace rules\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
