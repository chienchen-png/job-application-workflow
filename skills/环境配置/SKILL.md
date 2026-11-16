---
name: job-setup
description: 初始化求职工作区，配置并验证 Edge Control、edge-browser-ops 与现有 Edge。用于首次配置或浏览器链路修复。
---

# 环境配置

## 工作区

确定用户工作区后运行：

```powershell
powershell -ExecutionPolicy Bypass -File "<插件目录>\脚本\初始化工作区.ps1" -Workspace "<用户工作区>"
```

脚本只补缺失目录和模板。读取工作区 `AGENTS.md` 后交接 `$job-profile`。

## Edge Control

浏览器入口固定为 `edge-control` MCP + `edge-browser-ops` + Edge 扩展。已有 `edge_bridge_status` 且状态正常时直接验证；否则运行：

```powershell
powershell -ExecutionPolicy Bypass -File "<插件目录>\脚本\配置Edge控制.ps1"
```

扩展尚未加载时，让用户在 `edge://extensions` 开启开发人员模式并加载脚本输出的 `extension` 目录。重载 Codex MCP 或新建会话，直到出现 `edge_bridge_status`。

## 验收

当前任务只调用一次 `edge_bridge_status`，再调用一次 `edge_list_tabs`。首次配置或链路变更时，用 `edge_crawl_snapshot` 读取 `脚本/测试表单.html`，开启 `includeForms` 验证字段提取；填写、回读和附件注入按需用 `edge_eval` 与 `edge_send_cdp` 验证。

输出 Edge Control 版本、bridge 状态、已连接标签页和验证结果。安装失败、配置路径变化或修复链路时读取 [Edge配置](references/Edge配置.md)。
