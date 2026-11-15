# Edge Control 依赖与配置

本项目的浏览器控制只使用 [C4AL/codex-edge-control-bridge](https://github.com/C4AL/codex-edge-control-bridge) 的 Edge Control：`edge-browser-ops` Skill + `edge-control` MCP + 本地 bridge + Edge unpacked 扩展。它是独立的第三方依赖，不是 Codex 自带的 Edge/Chrome 扩展或内置浏览器。

禁止以 Codex 内置浏览器、in-app browser、Computer Use、`cua_repl`、桌面截图鼠标或自建 Playwright 浏览器代替。公开资料的普通搜索可使用搜索工具；页面浏览、交互、抓取和网申执行必须走上述桥接。工具缺失就暂停浏览器阶段，仍可维护资料。

## 版本与前提

2026-11-16 核验：上游已归档；最新 Release 为 [v0.1.7](https://github.com/C4AL/codex-edge-control-bridge/releases/tag/v0.1.7)。本项目未包含或改写其源代码、依赖、扩展及认证配置。归档意味着没有后续维护保证，部署前核对上游状态，不自动改用其他来源或替代工具。

上游部署入口是 PowerShell 脚本，当前配置流程以 Windows、Microsoft Edge、Node.js、PowerShell、可注册 MCP 的 Codex 为前提。Node 版本按上游依赖要求检查，不能把资料检查脚本的 Node 18+ 当成桥接的兼容保证；其他系统未验证。不要求 Python。

## 首次配置

1. 先查当前会话是否有 `edge_bridge_status` 等真实可调用工具，以及已安装的 `edge-browser-ops`。不要仅因其他工具也能操作 Edge 就当作依赖满足。存在时读取该 Skill 全文和工具实际参数定义，调用状态检查，能用就不重复安装。
2. 缺失时先说明：第三方扩展将获得浏览器控制权限，会启动本地服务并注册 MCP。遵守当前授权要求，由用户处理扩展加载等权限操作。
3. 从上游 v0.1.7 Release 下载 `edge-control-v0.1.7-quick-deploy.zip` 和同版 `checksums-v0.1.7.txt`，核对校验和，解压到稳定的独立工具目录。先检查上游 README 和实际脚本，不使用一段未经审阅的远程命令直接安装。
4. 在解压根目录执行上游 `scripts/quick-deploy.ps1`。需要安装依赖时使用其 `-InstallDependencies` 参数。它会生成本地配置、启动 bridge、安装全局 `edge-browser-ops`，并在 `codex` 命令存在时注册 MCP。已有配置/同名 Skill 先备份核查；不要盲目覆盖用户修改。脚本可跳过 MCP 注册时，不得因此声称注册成功。
5. 引导用户在自己的 Edge 打开 `edge://extensions`，开启开发人员模式，加载解压目录的 `extension/`。不要创建新 profile 或自动化专用浏览器窗口；沿用用户现有主窗口和会话。
6. 按需重新加载 Codex，新会话确认 MCP 工具实际可调用。bridge 只应监听本机；不打印或提交 `extension/config.local.js`、token、浏览器凭据。不把上游安装脚本成功当成端到端成功。

## 每次使用与验收

- 读取 `edge-browser-ops`；先 `edge_bridge_status`，再 `edge_list_tabs`，用返回的 tab ID 选择用户实际窗口，不假设活动标签。
- 读取用 `edge_query` / `edge_get_dom`；交互用 `edge_navigate` / `edge_wait_for` / `edge_click` / `edge_type`。参数及真实工具前缀以当前会话定义为准，禁止虚构调用。
- 普通操作不足时，仅在同一 Edge Control 链路内按工具文档使用 `edge_cdp_evaluate` / `edge_send_cdp`；不得借此改框架内部状态、绕校验或验证。
- 用本地虚构表单分别验证读取、定位、文本/选项输入、解析清洗、失焦回读和附件选择。上传按实际工具支持的 CDP/文件输入能力验证；不行就报告阻塞，不能回退系统文件选择器鼠标操作。不能套用其他 ChatGPT 扩展的权限修复方法。
- 登录、验证码、隐私确认时立即告知用户准确标签页，并让用户在自己的浏览器完成；必要时显式聚焦用户需要接管的标签页。正常 DOM 操作不主动抢焦点，但不承诺所有网站和认证都完全不占焦点。
- 断线先查状态，按上游恢复流程处理。最终报告各项“通过 / 受阻 / 未验证”；只读资料不受浏览器阻塞影响。
