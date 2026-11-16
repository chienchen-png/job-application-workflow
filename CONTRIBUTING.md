# 参与开发

感谢参与 Job Application Workflow。项目通过公开 Pull Request 接受功能、网站适配、字段模板和文档改进。

## 协作流程

1. 先创建 Issue，说明使用场景、现状和预期结果。
2. Fork 仓库，从 `main` 创建 `feat/<topic>` 或 `fix/<topic>` 分支。
3. 保持一个 PR 解决一个目标，提交到 `main`。
4. 按 PR 模板填写改动和验证结果。
5. 等待 `@chienchen-png` 审核；通过后以 Squash Merge 合并。

外部贡献者通过 Fork 提交，不需要仓库写权限。

## 架构

插件由一个工作流和四个 Skill 组成：

| Skill | 负责范围 |
|---|---|
| `job-setup` | 工作区、Edge Control、MCP 与浏览器验证 |
| `job-profile` | 事实源、求职意向与附件索引 |
| `job-research` | 官方岗位、资格与投递限制 |
| `job-apply` | 表单填写、解析清洗、回读与状态 |

功能优先进入对应的现有 Skill、模板或脚本。新增 Skill 的标准是：它代表一个独立阶段，拥有独立输入输出，并且不能合理放入现有四个 Skill。

浏览器功能保持以下链路：

```text
job-* Skill → edge-browser-ops → edge-control MCP → bridge → Edge 扩展
```

Edge Control 的升级、替代或新工具需要同时更新环境配置 Skill、README 和安装脚本。

## 代码要求

- 个人事实只来自用户工作区的 `个人资料.md`。
- 仓库不提交个人简历、附件、联系方式、Cookie、Token 或真实申请记录。
- Skill 使用直接、可执行的步骤；共享规则保留在《工作约定》模板。
- 新字段应同时更新模板、检查脚本和测试。
- 修改安装流程时同步更新 `配置Edge控制.ps1` 与 `Edge配置.md`。
- 修改插件元数据时更新 `plugin.json` 版本，版本发布由维护者执行。

## 验证

所有提交运行：

```powershell
node --test ".\脚本\检查资料.test.mjs"
powershell -ExecutionPolicy Bypass -File ".\脚本\配置Edge控制.ps1" -ValidateOnly
```

涉及资料字段时，再对空白模板运行：

```powershell
node ".\脚本\检查资料.mjs" "<临时工作区>"
```

涉及浏览器交互时，记录 Edge Control 版本、验证的标签页操作，以及读取、填写、回读和附件注入结果。

## 许可

提交内容按 [MIT License](LICENSE) 授权。
