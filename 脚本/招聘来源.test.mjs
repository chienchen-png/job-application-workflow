import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, validateRegistry, sourceUrl, atsEndpoint, normalizeAts, filterJobs } from './招聘来源.mjs';

test('来源注册表完整且编号唯一', async () => {
  const registry = validateRegistry(await loadRegistry());
  for (const id of ['deloitte-cn', 'ey-cn', 'kpmg-cn', 'pwc-cn', 'swufe-careers', 'boss-zhipin', 'citics', 'csc', 'cicc', 'htsc', 'mckinsey', 'bcg', 'bain', 'microsoft', 'amazon', 'google', 'apple']) {
    assert.ok(registry.sources.some(source => source.id === id), id);
  }
});

test('查询词和城市按 URL 规则编码', async () => {
  const registry = await loadRegistry();
  const source = registry.sources.find(item => item.id === 'boss-zhipin');
  assert.equal(sourceUrl(source, { query: '审计', city: '北京' }), 'https://www.zhipin.com/web/geek/job?query=%E5%AE%A1%E8%AE%A1&city=%E5%8C%97%E4%BA%AC');
  assert.match(source.searchApi, /zpgeek\/search\/joblist\.json/);
  assert.equal(atsEndpoint({ endpoint: 'https://example.com/{board}/jobs' }, 'a b'), 'https://example.com/a%20b/jobs');
});

test('四种公开 ATS 字段统一为岗位模型', () => {
  assert.deepEqual(normalizeAts('greenhouse', { jobs: [{ id: 1, company_name: 'A', title: 'Analyst', location: { name: 'Shanghai' }, absolute_url: 'https://a/1' }] })[0], {
    id: '1', company: 'A', title: 'Analyst', location: 'Shanghai', department: '', url: 'https://a/1', updatedAt: ''
  });
  assert.equal(normalizeAts('lever', [{ id: '2', text: 'Intern', categories: { location: 'Beijing', team: 'Finance' }, hostedUrl: 'https://b/2' }])[0].department, 'Finance');
  assert.equal(normalizeAts('ashby', { jobs: [{ id: '3', title: 'Data', location: 'China', jobUrl: 'https://c/3' }] })[0].title, 'Data');
  assert.equal(normalizeAts('smartrecruiters', { content: [{ id: '4', name: 'Risk', company: { name: 'D' }, location: { city: 'Chengdu', country: 'CN' }, ref: 'https://d/4' }] })[0].location, 'Chengdu, CN');
});

test('岗位按标题、地点和部门过滤并限制数量', () => {
  const jobs = [
    { title: 'Audit Intern', location: 'Beijing', department: 'Assurance' },
    { title: 'Risk Intern', location: 'Shanghai', department: 'Consulting' },
    { title: 'Audit Analyst', location: 'Shanghai', department: 'Finance' }
  ];
  assert.deepEqual(filterJobs(jobs, { query: 'audit', location: 'beijing' }), [jobs[0]]);
  assert.equal(filterJobs(jobs, { query: 'intern', limit: 1 }).length, 1);
});
