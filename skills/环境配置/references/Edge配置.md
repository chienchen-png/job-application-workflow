# Edge Control 配置

## 来源与架构

`edge-control` 是一个独立的本地 MCP 服务，来源为 [C4AL/codex-edge-control-bridge](https://github.com/C4AL/codex-edge-control-bridge) `v0.1.7`。求职插件通过该服务操作用户现有 Microsoft Edge。

```text
Codex
  → stdio MCP: edge-control
  → WebSocket bridge: 127.0.0.1:47173/bridge
  → Edge 扩展
  → 现有标签页的 DOM / chrome.debugger / CDP
```

发布包：

- `edge-control-v0.1.7-quick-deploy.zip`
- SHA-256：`81d16ff1dfcafcdd54a449d271eaa65daf9d7f0a445881ea4158a0389ebf943d`

插件脚本按该哈希校验后安装，无需将第三方源码复制进本仓库。

安装后的实现入口：

```text
scripts/mcp-server.mjs         MCP 工具服务器
scripts/bridge-server.mjs      本地 WebSocket bridge
extension/manifest.json        Edge MV3 扩展清单
extension/service-worker.js    标签页与 CDP 执行
skills/edge-browser-ops/       上游浏览器操作 Skill
```

## MCP 配置

上游 `.mcp.json` 使用相对入口：

```json
{
  "mcpServers": {
    "edge-control": {
      "command": "node",
      "args": ["./scripts/mcp-server.mjs"]
    }
  }
}
```

本地市场安装后，全局 Codex MCP 使用绝对路径注册：

```powershell
codex mcp add edge-control `
  --env "EDGE_CONTROL_PLUGIN_ROOT=C:/Users/<用户>/AppData/Local/JobApplicationWorkflow/EdgeControl/edge-control-0.1.7" `
  -- node "C:/Users/<用户>/AppData/Local/JobApplicationWorkflow/EdgeControl/edge-control-0.1.7/scripts/mcp-server.mjs"
```

校验：

```powershell
codex mcp get edge-control --json
codex mcp list
```

`edge-control` 的 MCP server 名称固定为 `edge-control`，工具名以 `edge_` 开头。

## 运行时配置

bridge 配置：

```text
%APPDATA%\CodexEdgeControl\config.json
```

默认值：

```json
{
  "host": "127.0.0.1",
  "port": 47173,
  "authToken": "<安装时生成的随机值>",
  "bridgePath": "/bridge"
}
```

扩展配置由安装脚本写入安装目录下的 `extension/config.local.js`：

```js
globalThis.EDGE_CONTROL_CONFIG = {
  bridgeUrl: "ws://127.0.0.1:47173/bridge",
  authToken: "<与 config.json 一致>"
};
```

bridge 日志：

```text
%APPDATA%\CodexEdgeControl\logs\
```

## 工具

状态与底层：

- `edge_bridge_status`
- `edge_command`
- `edge_list_tabs`
- `edge_focus_tab`
- `edge_navigate`
- `edge_reload`
- `edge_reload_extension`

页面读取与交互：

- `edge_wait_for`
- `edge_query`
- `edge_get_dom`
- `edge_click`
- `edge_type`
- `edge_press_key`
- `edge_eval`
- `edge_send_cdp`

批量抓取：

- `edge_expand_queries`
- `edge_crawl_snapshot`
- `edge_crawl_discover_links`
- `edge_crawl_batch`
- `edge_crawl_search`
- `edge_plan_crawl_job`
- `edge_run_crawl_job`

`edge_eval` 用于页面 JavaScript；`edge_send_cdp` 用于直接发送 Chrome DevTools Protocol 命令。

## 安装

### 自动配置

从插件根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File ".\脚本\配置Edge控制.ps1"
```

脚本执行：

1. 检查 Node.js 与 Codex CLI。
2. 下载并校验 `v0.1.7` 快速部署包。
3. 解压到 `%LOCALAPPDATA%\JobApplicationWorkflow\EdgeControl\edge-control-0.1.7`。
4. 生成本地 token 和扩展配置。
5. 安装全局 `edge-browser-ops`。
6. 以隐藏窗口启动 bridge。
7. 注册 `edge-control` MCP。
8. 输出待加载的 `extension` 目录。

### 加载扩展

1. 打开 `edge://extensions`。
2. 开启“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择脚本输出的 `extension` 目录。
5. 确认扩展名称为 `Codex Edge Control Bridge`。

### 首次验证

新建 Codex 会话，依次执行：

```text
edge_bridge_status
edge_list_tabs
```

然后打开插件中的 `脚本/测试表单.html`，验证：

```text
edge_navigate → 读取 DOM → 填写 → 失焦回读 → 点击选项
```

全部成功后将环境交接到 `$job-profile`。

## 页面操作约定

- 从 `edge_list_tabs` 获取 `tabId`，避免依赖活动标签。
- 导航、抓取和批量任务默认使用后台标签页；`edge_navigate` 使用 `active: false`。
- 页面内容从真实 DOM 读取，交互通过 DOM 事件完成。
- 填写长文本后失焦并用 `edge_get_dom` 回读。
- 批量任务优先使用 `edge_crawl_batch` 或 `edge_run_crawl_job`。
- 文件上传使用 `edge_send_cdp` 的 `DOM.getDocument`、`DOM.querySelector` 与 `DOM.setFileInputFiles`，再用 `edge_get_dom` 回读文件名。
- 登录、验证码和隐私确认需要人工处理时，用 `edge_focus_tab` 将准确标签页交给用户。

## 修复

- bridge 离线：重新运行 `%LOCALAPPDATA%\JobApplicationWorkflow\EdgeControl\edge-control-0.1.7\scripts\start-host.ps1 -Background`。
- 扩展断连：调用 `edge_reload_extension`，随后重新检查 `edge_bridge_status`。
- MCP 未出现：运行 `codex mcp get edge-control --json`；缺失时重新运行插件配置脚本。
- 页面框架拦截普通脚本：改用 `edge_eval` 的 `MAIN` world 或 `edge_send_cdp`。
- 配置文件存在但工具不可调用：重新加载 Codex，使 MCP 配置生效。
