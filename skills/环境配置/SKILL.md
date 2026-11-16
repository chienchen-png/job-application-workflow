---
name: job-setup
description: 初始化中文求职工作区，安装并验证 Edge Control MCP、edge-browser-ops 与 Edge 扩展。用于首次配置、环境检查或浏览器链路修复。
---

# 环境配置

## 工作区

1. 确定插件目录与用户私有工作区。新工作区把 [工作约定](../../模板/工作约定.md) 复制为 `AGENTS.md`。
2. 创建 `00_基础资料/`、`01_附件库/`、`02_公司/`、`_AI内部/` 与 `90_投递总览.md`；只补缺失项。
3. 读取工作区当前约定，完成初始化后交接 `$job-profile`。

## Edge Control

浏览器入口固定为 `edge-control` MCP + `edge-browser-ops` Skill + Edge 扩展。完整来源、MCP 配置、工具清单和故障处理见 [Edge配置](references/Edge配置.md)。

1. 检查 `node --version`、`codex --version` 和 `codex mcp list`。
2. 依赖缺失时运行：

```powershell
powershell -ExecutionPolicy Bypass -File "<插件目录>\脚本\配置Edge控制.ps1"
```

3. 脚本输出扩展目录。让用户在 `edge://extensions` 开启开发人员模式并加载该目录。
4. 重载 Codex MCP 配置或新建会话，确认工具中出现 `edge_bridge_status`。
5. 依次调用 `edge_bridge_status`、`edge_list_tabs`，再打开插件的 `脚本/测试表单.html`，验证 DOM 读取、填写、回读和附件注入。

已有组件时直接检查版本、状态和工具，不重复安装。

## 页面操作

- 先用 `edge_list_tabs` 取真实 `tabId`，后续工具传入该 ID。
- 公开页面跳转使用 `edge_navigate`，后台执行时设置 `active: false`。
- 内容读取用 `edge_query`、`edge_get_dom` 或 `edge_crawl_snapshot`。
- 交互用 `edge_wait_for`、`edge_click`、`edge_type`、`edge_press_key`。
- 页面脚本用 `edge_eval`；底层能力用 `edge_send_cdp`。
- 批量链接和岗位页使用 `edge_crawl_*` 工具。

## 验收

输出四项结果：

- Node、Codex、Edge Control 版本。
- MCP 注册命令与 `edge_bridge_status` 状态。
- 已连接的 Edge 标签页。
- 读取、填写、回读、附件注入的验证结果。

未完成的用户操作写明准确入口，完成读取资料准备。
