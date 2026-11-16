---
name: job-research
description: 从官方招聘站、公开 ATS、学校就业网、公众号和 BOSS直聘发现岗位，核验资格与投递限制并形成公司选岗结论。
---

# 岗位调研

读取工作区约定、`个人资料.md`、`求职意向.md` 和已有公司总览。来源以 [招聘来源.json](../../数据源/招聘来源.json) 为准；正常调研只用命令，编辑来源时才读取 JSON：

```powershell
node "<插件目录>/脚本/招聘来源.mjs" entries <行业分组> --query=<职位> --city=<城市>
node "<插件目录>/脚本/招聘来源.mjs" ats <adapter> <board> --query=<职位> --location=<地点>
```

官网确认岗位、资格和投递规则；学校就业网与“西财就业”补充批次和时效；BOSS直聘与 ATS 扩大候选。平台线索必须回到官网确认最终规则。

## 高效读取

每个任务调用一次 `edge_bridge_status`，正常后不再重复。

- 单个公开页面用一次 `edge_crawl_snapshot`，开启 `includeHeadings`、`includeMeta`、`includeJsonLd`、`includeForms` 和 `includeTables`。
- 多个岗位页用一次 `edge_crawl_batch`，后台并行，`concurrency` 取 3–5。
- 未确定公司时，用一次 `edge_crawl_search` 搜索，再批量读取入选链接。
- 需要保存登录态或已有页面时，只调用一次 `edge_list_tabs` 取得当前 `tabId`，复用该标签。
- BOSS 在 `zhipin.com` 标签内用 `edge_eval` 调用注册表的 `searchApi`，读取 `zpData.jobList`。

页面包含 `JobPosting` JSON-LD 时直接读取标题、编号、地点、发布日期、截止日、职责和资格。Moka、HotJob、智页、“西财就业”和 BOSS 都复用现有 Edge 会话。

## 调研

1. 用户已给公司时直接调研；未给时按行业、职位和城市提出少量候选。
2. 记录发现来源、岗位直链或编号、城市、部门、批次和查询日期。
3. 核验届别、专业、语言、实习时长、出勤、工作许可、人数、薪资和截止日期。
4. 核验投递次数、志愿顺序、跨项目并投、撤回与修改规则。
5. 公开人数、薪资和结果概率照录，未公开写“未公开”。
6. 去重后按硬性条件、经历匹配、城市和投递限制排序，写入 [公司总览](../../模板/公司总览.md)。

用户确认岗位和志愿后，用 [申请记录](../../模板/申请记录.md) 建立 APP，填入职位、官网链接、志愿顺序和投递限制，再交接 `$job-apply`。
