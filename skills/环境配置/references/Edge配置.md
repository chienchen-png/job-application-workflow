# Edge Control 配置

## 来源

`edge-control` 来源为 [C4AL/codex-edge-control-bridge](https://github.com/C4AL/codex-edge-control-bridge) `v0.1.7`。

```text
Codex → edge-control MCP → 127.0.0.1:47173/bridge → Edge 扩展 → 现有标签页
```

发布包：`edge-control-v0.1.7-quick-deploy.zip`

SHA-256：`81d16ff1dfcafcdd54a449d271eaa65daf9d7f0a445881ea4158a0389ebf943d`

## 安装

```powershell
powershell -ExecutionPolicy Bypass -File "<插件目录>\脚本\配置Edge控制.ps1"
```

脚本检查 Node.js 与 Codex，下载并校验固定版本，部署 MCP、bridge、`edge-browser-ops` 和扩展文件。默认安装目录：

```text
%LOCALAPPDATA%\JobApplicationWorkflow\EdgeControl\edge-control-0.1.7
```

首次安装后，在 `edge://extensions` 开启开发人员模式，加载脚本输出的 `extension` 目录，然后重载 Codex MCP 或新建会话。

## 配置位置

Bridge：

```text
%APPDATA%\CodexEdgeControl\config.json
%APPDATA%\CodexEdgeControl\logs\
```

MCP：

```powershell
codex mcp get edge-control --json
codex mcp list
```

## 快速验证

1. `edge_bridge_status`
2. `edge_list_tabs`
3. 用 `edge_crawl_snapshot` 读取插件 `脚本/测试表单.html`，开启 `includeForms`
4. 需要时用 `edge_eval` 填写和回读，用 `edge_send_cdp` 验证附件注入

状态正常后，同一任务不重复调用 `edge_bridge_status`。

## 修复

Bridge 离线：

```powershell
& "$env:LOCALAPPDATA\JobApplicationWorkflow\EdgeControl\edge-control-0.1.7\scripts\start-host.ps1" -Background
```

扩展断连：调用 `edge_reload_extension`，随后检查一次 `edge_bridge_status`。

MCP 缺失：运行插件配置脚本，再执行 `codex mcp get edge-control --json`。配置存在但当前会话没有工具时，重载 Codex 或新建会话。

页面隔离环境拦截脚本时，用 `edge_eval` 的 `MAIN` world；标准 DOM 操作不足时再用 `edge_send_cdp`。

## 调用策略

- 单个公开页面用 `edge_crawl_snapshot`，一次完成打开、等待、DOM、链接、表单、表格和 JSON-LD 提取。
- 多个公开页面用 `edge_crawl_batch`，后台并行并关闭临时标签。
- 需要登录态或已打开页面时，用 `edge_list_tabs` 取真实 `tabId` 并复用现有标签。
- 表单稳定字段按页面批量写入；自定义控件和附件使用定向工具。
