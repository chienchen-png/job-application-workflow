---
name: job-apply
description: 按确认岗位和中文事实源填写官网网申，处理附件与简历解析，全表回读并提交。用于填写、草稿核验和投递跟进。
---

# 网申执行

读取工作区约定、`个人资料.md`、公司总览和 APP，使用现有 Edge 会话。每个任务只调用一次 `edge_bridge_status`；已有申请页时只调用一次 `edge_list_tabs` 取得 `tabId`，后续复用。

## 读取表单

每次进入新页面或 iframe，用一次 `edge_crawl_snapshot`，开启 `includeForms`、`includeTables` 和 `includeText`，取得字段、表头、必填项、选项和字符限制。只有复杂交互需要时才补充 `edge_query`、`edge_click` 或 `edge_wait_for`。

先检查已有申请、岗位状态和投递限制。为每个字段记录源章节或记录编号，并只用资料中的事实。

## 填写

1. 上传官网要求的简历，等待解析结束，再逐字段清洗。
2. 普通 `input`、`textarea` 和可编辑字段按页面或 iframe 用一次 `edge_eval` 批量写入，通过原生 setter 触发 `input` 与 `change`。
3. 自定义下拉、单选、多选、联动控件和富文本用 `edge_click`、`edge_type` 或 `edge_press_key` 定向操作。
4. 文件输入用 `edge_send_cdp` 注入，并回读文件名。
5. 每页填写后用一次 `edge_eval` 或 `edge_get_dom` 读取全部值和错误，再修正差异。

字段准备完成后将 APP 置为“待提交”，列出岗位、志愿、附件、声明和未解决项，取得本次提交授权。

## 提交与收尾

获授权后提交。错误或超时先读取账号申请记录和页面回执，再继续。

成功回执记录提交时间、申请编号或回执位置、实际附件、志愿和关键答复。同步 APP、公司总览与 `90_投递总览.md`；测评写为未通知、已邀请、已完成或已出结果。提交后将 APP 收敛为结果记录并清理临时映射。
