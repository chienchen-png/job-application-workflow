---
name: job-research
description: 从官方招聘站、公开 ATS、学校就业网、微信公众号和 BOSS直聘发现岗位，核验资格、城市与投递限制，形成简洁公司结论供用户选岗。
---

# 岗位调研

读取工作区约定、`个人资料.md`、`求职意向.md` 和已有公司总览。来源注册表为 [招聘来源.json](../../数据源/招聘来源.json)。

## 选择来源

先按行业和公司运行：

```powershell
node "<插件目录>/脚本/招聘来源.mjs" list <行业分组>
node "<插件目录>/脚本/招聘来源.mjs" url <来源编号> --query=<职位> --city=<城市>
```

来源顺序：

1. 公司官网或官方招聘域名的具体岗位页。
2. 学校就业网和“西财就业”公众号，用于校招批次、宣讲会、截止日和内推信息。
3. BOSS直聘与公开 ATS，用于扩大候选岗位、城市、薪资和技能关键词。
4. 平台线索找到公司或岗位后，进入官方页核验岗位、资格和投递规则。

公开 ATS 直接读取：

```powershell
node "<插件目录>/脚本/招聘来源.mjs" ats greenhouse <board> --query=<职位> --location=<地点>
node "<插件目录>/脚本/招聘来源.mjs" ats lever <board> --query=<职位>
node "<插件目录>/脚本/招聘来源.mjs" ats ashby <board> --query=<职位>
node "<插件目录>/脚本/招聘来源.mjs" ats smartrecruiters <board> --query=<职位>
```

`board` 从招聘域名或页面请求读取：`jobs.lever.co/<board>`、`jobs.ashbyhq.com/<board>`、`job-boards.greenhouse.io/<board>`、`careers.smartrecruiters.com/<board>`。

## 浏览器读取

浏览器链路固定使用 Edge Control：

1. `edge_bridge_status`
2. `edge_list_tabs`
3. `edge_navigate` 打开注册表入口，后台标签设置 `active: false`
4. `edge_wait_for`，再用 `edge_query`、`edge_get_dom`、`edge_crawl_snapshot` 提取岗位列表和详情
5. 页面含 `application/ld+json` 的 `JobPosting` 时直接读取标题、编号、地点、发布日期、截止日、职责和资格

“西财就业”文章、BOSS登录态结果和页面需要脚本渲染的 Moka、HotJob、智页平台都通过上述 Edge 会话读取。BOSS在 `zhipin.com` 标签页内用 `edge_eval` 调用注册表的 `searchApi`，从 `zpData.jobList` 读取结果；同时保留网页筛选器搜索。结果按公司、岗位、地点、薪资、更新时间和链接建表。

## 调研

1. 用户已给公司时直接调研；未给时按行业、职位和城市提出少量候选。
2. 记录发现来源、岗位直链或职位编号、公司、城市、部门、批次和查询日期。
3. 核验届别、专业、语言、实习时长、出勤、工作许可、招聘人数、薪资和截止日期。
4. 核验投递次数、志愿顺序、跨城市或跨项目并投、撤回与修改规则。
5. 页面明确公开的人数、薪资和结果概率照录；未公开写“未公开”。
6. 合并重复岗位，依据硬性条件、经历匹配、城市和投递限制排序。
7. 用 [公司总览](../../模板/公司总览.md) 保留候选、最终建议、必要依据和待核实项。

用户确认岗位和志愿后，用 [申请记录](../../模板/申请记录.md) 创建一份 APP，并带入职位、官网链接、志愿顺序和投递限制。交接 `$job-apply`。
