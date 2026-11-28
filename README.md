<div align="center">

# AGY Market Catalog · 反重力插件目录 (`agy-market-catalog`)

**Google Antigravity 零后端 GitOps 官方插件目录与自动化收录引擎**

单文件 YAML 零冲突提交 · 维护者一键安全合入 (`/merge`) · 后续发版 0 PR 自动同步 · 双层防碰撞与防 RepoJacking · 权限升级常驻护栏 (`PRIVILEGE_REVIEW`) · 多语言按需 README (`dist/readmes/<id>.json`) · Tier-0 社区提名 + Track 2 多源发现 · 4 层宽容静态扫描

**简体中文** · [English](./README.en.md) · **[📖 申请收录插件完整教程](./docs/SUBMISSION_GUIDE.md)** · [English Submission Guide](./docs/SUBMISSION_GUIDE.en.md) · [AGY Market 客户端](https://github.com/azwosile/agy-market) · [架构与 CI 规范](./AGENTS.md)

</div>

---

> **🚀 插件作者与社区快速入口**
>
> 👉 阅读完整图文指南：**[📖 申请收录插件完整教程 (`docs/SUBMISSION_GUIDE.md`)](./docs/SUBMISSION_GUIDE.md)**（含可直接复制的 `plugin.json`、`agy-market.json`、YAML 模板、15 大分类表、打包自检与错误码速查）。
>
> - **方式一（推荐 · Track 1 官方认证目录）**：提交 **1 个 YAML 文件 PR** → Fork 安全静态门禁校验（支持维护者 **GitHub Actions 一键合入**或 PR 评论 `/merge`）→ **后续每次发版 0 PR 每 30 分钟自动同步**。
> - **方式二（Track 2 实验源多源自动发现，当前已索引 `848+` 插件）**：为公开 GitHub 仓库添加 Topic `antigravity-plugin`（或支持 `.antigravity-plugin/plugin.json`、`.agents/plugins/*` 等 4 种目录布局）→ 每 6 小时多源自动发现，采用 `<owner>--<slug>` 安全隔离安装。
> - **方式三（Tier-0 社区提名直达 Track 2）**：无需写 YAML 或提 PR，直接提交 [社区提名 Issue 表单](./.github/ISSUE_TEMPLATE/nominate-plugin.yml)（带 `community-discovery` 标签），系统即刻静态校验并收录至 Track 2。
> - **语言无关 & 欢迎宿主增强**：纯 Markdown（`skills/` / `rules/` / `agents/`）、Sidebar 侧边栏、Python / Rust / Go / Node MCP 均**无需发布 npm**；CDP 与 `app.asar` 宿主界面增强插件**100% 欢迎收录**。

> 本仓库（[`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog)）是 **[AGY Market](https://github.com/azwosile/agy-market)** 的官方零后端目录注册表。
>
> - **线上主分发通道（已激活）**：**GitHub Pages**（[`index.json`](https://azwosile.github.io/agy-market-catalog/index.json) · [`unverified-index.json`](https://azwosile.github.io/agy-market-catalog/unverified-index.json)）及 **`gh-pages` Raw 回退通道**（[`raw index.json`](https://raw.githubusercontent.com/azwosile/agy-market-catalog/gh-pages/index.json)）。
> - **可选 npm 镜像传输通道（Opt-In）**：`sync-catalog.yml` 支持通过设置环境变量 `NPM_PUBLISH_ENABLED=true` 并配置 `NPM_TOKEN` 将纯 JSON 数据包 `@agy-market/catalog` 发布到 npm（以同步至 `registry.npmmirror.com` 等镜像）；**当前默认未开启**，客户端默认直接使用 GitHub Pages 与 `gh-pages` Raw 回退通道。

---

## 💻 安装 AGY Market 客户端

> 运行环境要求：**Node.js >= 22.0.0**（使用 `npx` 方式时），或直接运行系统原生免 npm 安装脚本。

```bash
# 推荐：直接从 GitHub 仓库引导安装（无需从 npm 拉取）
npx --yes github:azwosile/agy-market
```

```powershell
# Windows PowerShell（免 npm，内置 SHA-256 校验）
irm https://raw.githubusercontent.com/azwosile/agy-market/main/scripts/install.ps1 | iex
```

```sh
# macOS / Linux Shell（免 npm，内置 SHA-256 校验）
curl -fsSL https://raw.githubusercontent.com/azwosile/agy-market/main/scripts/install.sh | sh
```

---

## 📦 已验证收录插件（Track 1）

> 下方列表由 `scripts/sync-readme-tables.mjs` 根据 `state/ledger.json`、`state/versions-lock.json` 与 `data/plugins/*.yml` 自动同步生成。

<!-- CATALOG-TABLE:START -->
| 目录 ID | 规范名 (`canonicalName`) | 版本 | GitHub 仓库 | 能力徽章 | 简介 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a16nights__antigravity-azure-compass` | `agent-presets` | `1.4.8` | [`A16Nights/antigravity-azure-compass`](https://github.com/A16Nights/antigravity-azure-compass) | `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | 苍蓝罗盘：Agent 工作模式预设中心、全局 AGENTS.md 无损热同步编辑器与上下文水位监测插件，支持自动 /compact 压缩联动、外接模型防掉线强化与苍蓝侧栏总控。 |
| `a16nights__antigravity-azure-corridor` | `azure-corridor` (`TAG_MUTATION_BLOCKED`) | `1.2.3` | [`A16Nights/antigravity-azure-corridor`](https://github.com/A16Nights/antigravity-azure-corridor) | `sidecar-ui`, `mcp-stdio` | 苍蓝回廊：100% 直连 Antigravity 2.35+ 官方 ConversationService 与工作区配置，支持 FTS5 正文全文搜索、官方分组/标签/归档双向同步与跨工作区转移续聊。 |
| `a16nights__antigravity-azure-orbit` | `azure-orbit` | `1.1.8` | [`A16Nights/antigravity-azure-orbit`](https://github.com/A16Nights/antigravity-azure-orbit) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`app-asar`, `cdp`) | 苍蓝星轨：将外部大模型 API（DeepSeek / OpenAI / Anthropic / OpenRouter / Ollama 等）直接挂载进 Antigravity 左下角原生模型下拉菜单作为主脑使用，支持热读取与 2.35+ 补丁管理。 |
| `a16nights__antigravity-azure-prism` | `azure-prism` | `1.3.3` | [`A16Nights/antigravity-azure-prism`](https://github.com/A16Nights/antigravity-azure-prism) | `mcp-stdio` | 苍蓝棱镜：原生 MCP App 思维链实时观测与多通道中文翻译面板，支持原生标题与无限历史分页、引用思考到下条消息上下文，以及免密钥零 Token 机翻或外部模型译文。 |
| `a16nights__antigravity-azure-wand` | `azure-wand` | `1.3.3` | [`A16Nights/antigravity-azure-wand`](https://github.com/A16Nights/antigravity-azure-wand) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`cdp`) | 苍蓝魔杖：Windows 低打扰可视化桌面与网页操控插件，内置 26 项 UIA / OCR / 后台网页 CDP 工具、15 状态独立输入动态 AI 光标、苍蓝玻璃思考浮窗与快捷键急停。 |
| `a16nights__antigravity-external-orchestrator` | `external-orchestrator` | `1.4.7` | [`A16Nights/antigravity-external-orchestrator`](https://github.com/A16Nights/antigravity-external-orchestrator) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | 苍蓝协奏台：零依赖多渠道外部大模型协同调度插件，自动委派 DeepSeek / OpenAI / Anthropic / 本地网关等模型执行文件读写与终端任务，支持自定义角色、容灾链与断路器。 |
| `a16nights__antigravity-lanxi-memory` | `lanxi-memory` | `1.5.4` | [`A16Nights/antigravity-lanxi-memory`](https://github.com/A16Nights/antigravity-lanxi-memory) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | 蓝汐 · 潮汐认知图谱：纯本地五层 Markdown 认知记忆库与 SQLite FTS5 全文检索，结合幂律遗忘曲线、硬保护防失忆与「潮汐星海」交互星图工作台。 |
| `a16nights__antigravity-soul-md` | `soul-md` | `2.3.9` | [`A16Nights/antigravity-soul-md`](https://github.com/A16Nights/antigravity-soul-md) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | 苍蓝魂匣（Soul.md）：多人设卡热切换、工作区专属人设绑定与分层文件记忆（core.md + topics/*.md）插件，提供外接模型底层身份锚防掉线强化与可视化工作台。 |
| `a16nights__antigravity-think-zh` | `think-zh` | `1.2.1` | [`A16Nights/antigravity-think-zh`](https://github.com/A16Nights/antigravity-think-zh) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | 思语中文（Think-ZH）：将模型内部思考与推理语言一键锁定为简体中文（或切回默认英文），支持静态规则与外接模型智能 PreInvocation 双通道防漂移与实时预览。 |
| `apollyonin__billion-context-antigravity` | `billion-context` | `1.0.0` | [`Apollyonin/billion-context-antigravity`](https://github.com/Apollyonin/billion-context-antigravity) | `global-rules`, `mcp-stdio`, `lifecycle-hooks` | 基于 ranxianglei/billion-context 使用 AI 移植的 Antigravity 插件（官方零代理安全模式）：实时监控上下文占用与缓存，提供原生 /compact 复制助手及新增类 Fork 新会话交接功能。 |
| `apollyonin__trajectory-lens-antigravity` | `trajectory-lens` | `1.0.0` | [`Apollyonin/trajectory-lens-antigravity`](https://github.com/Apollyonin/trajectory-lens-antigravity) | `global-rules`, `mcp-stdio`, `lifecycle-hooks` | 使用 AI 基于 DSH 官方轨迹功能重开发的 Antigravity 插件（官方零代理安全模式）：提供轮次/步骤台账、并行执行 DAG、子代理瀑布流、Token 与缓存分析、双会话对比、白话导读及离线 HTML/MD 导出。 |
| `asthestarsfalll__answer-card` | `answer-card` | `1.0.0` | [`Asthestarsfalll/answer-card`](https://github.com/Asthestarsfalll/answer-card) | `global-rules`, `mcp-stdio`, `lifecycle-hooks` | macOS 置顶悬浮回答卡片：当 Antigravity、DSH 或 Zed 中的 Agent 需要你批准工具调用、回答问题或回合结束时，直接在悬浮窗里一键决策、输入追问，无需切换窗口。 |
| `azwosile__agy-market` | `agy-market` | `1.7.2` | [`azwosile/agy-market`](https://github.com/azwosile/agy-market) | `sidecar-ui`, `host-enhancement` (`cdp`) | Google Antigravity 社区插件市场侧边栏，支持镜像下载校验、本地冲突检查与一键安装更新。 |
| `azwosile__agy-wallpaper-prism` | `agy-wallpaper-prism` | `2.4.1` | [`azwosile/agy-wallpaper-prism`](https://github.com/azwosile/agy-wallpaper-prism) | `sidecar-ui`, `host-enhancement` (`cdp`) | Antigravity 黑曜棱镜毛玻璃皮肤与 Wallpaper Engine 工坊（支持浮岛/平铺布局、动态取色、本地视频与创意工坊壁纸）。 |
| `curelove__agy-anchor-wheel` | `agy-anchor-wheel` | `0.13.0` | [`Curelove/agy-anchor-wheel`](https://github.com/Curelove/agy-anchor-wheel) | `sidecar-ui`, `host-enhancement` (`cdp`) | Google Antigravity 零侵入右侧栏导航增强插件：中键双侧分类轮盘、Tab 竖向层级树、0.25s 悬停快览、双向反链与自动防乱码。 |
| `wain1911__agy-notify` | `agy-notify` | `1.0.0` | [`wain1911/agy-notify`](https://github.com/wain1911/agy-notify) | `mcp-stdio`, `lifecycle-hooks`, `host-enhancement` (`cdp`) | Antigravity 桌面消息提醒、原生提示音与 Discord/Bark/Gotify/Webhook 通知转发插件。 |
| `yuezhu114__agy-novel-forge` | `novel-forge` | `1.11.1` | [`yuezhu114/agy-novel-forge`](https://github.com/yuezhu114/agy-novel-forge) | `sidecar-ui`, `mcp-stdio` | Antigravity 中文长篇写作工程插件（移植自 dsh-novel-forge）：24 个 novel_* 硬门禁/账本/审计 MCP 工具 + Sidecar 侧栏工作台 + /novel 写作技能。 |
| `yuhuan-dev__antigravity-usage-monitor` | `usage-monitor` | `1.5.6` | [`yuhuan-dev/antigravity-usage-monitor`](https://github.com/yuhuan-dev/antigravity-usage-monitor) | `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`cdp`) | Antigravity 全客户端用量监控：实时 TPS/TTFT/费用、10 类上下文构成、四池额度追踪与租约预占、子代理/Swarm 隔离、历史趋势热力图与项目归因排行、调用明细异常筛选、xlsx 报表导出、跨端会话迁移、按模型上下文限制。覆盖 Desktop 顶栏胶囊与侧栏、IDE 胶囊、CLI statusLine 及独立 Web，不修改 app.asar，无 npm 依赖。 |
| `yukikaguraa__agy-archive-manager` | `archive-manager` | `2.3.1` | [`YukiKaguraA/agy-archive-manager`](https://github.com/YukiKaguraA/agy-archive-manager) | `sidecar-ui`, `host-enhancement` (`cdp`) | Google Antigravity 原生会话与归档管理插件：支持分类检索、完整记录免恢复预览、超长自动折叠、原地归档/恢复撤回与导出 Markdown。 |
| `yunjuanyunshu114-byte__antigravity-observer` | `gemini-neko-cockpit` (`TAG_MUTATION_BLOCKED`) | `1.4.0` | [`yunjuanyunshu114-byte/antigravity-observer`](https://github.com/yunjuanyunshu114-byte/antigravity-observer) | `sidecar-ui`, `host-enhancement` (`app-asar`) | Google Antigravity 2.0 应用内右下角 Gemini 猫娘桌面挂件与上下文 Token / 缓存命中率 / 模型额度实时观察台。 |
| `zou172866__agy-dart` | `agy-dart` | `1.10.0` | [`zou172866/Antigravity-agy-dart`](https://github.com/zou172866/Antigravity-agy-dart) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | Antigravity 全合一低延迟加速、KV-Cache 保护、上下文窗口守卫与 Sidecar 卡死看门狗面板插件。 |
<!-- CATALOG-TABLE:END -->

---

## 📝 提交你的插件（Track 1 单文件 YAML 流程）

> 完整模板、打包技巧与错误码排查请查阅 **[📖 `docs/SUBMISSION_GUIDE.md`](./docs/SUBMISSION_GUIDE.md)**。

Track 1 采用 **「一插件一 YAML 文件」** 的零冲突提交设计，支持纯 Markdown、Sidebar 侧边栏以及任意语言的 MCP 服务——**无需发布到 npm，也无需包含 `package.json`**。

### 第 1 步：准备插件仓库与 GitHub Release
1. **防垃圾冷启动门槛**：仓库创建时间 **>= 1 天（`MIN_AGE_DAYS = 1`）**，且默认分支包含 **>= 3 个不同 Git Tree 哈希的非空提交（`MIN_NON_EMPTY_COMMITS = 3`）**。
2. **原生清单（支持两种路径）**：在插件根目录（`pluginRoot`）放置 `plugin.json` 或 `.antigravity-plugin/plugin.json`，严格遵守 Antigravity 10 字段白名单（`name`、`displayName`、`description`、`version`、`logo`、`author`、`homepage`、`repository`、`suggestedPrompts`、`disabled`）。若设置了 `logo`，须为包内相对路径（`.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`，上限 **`2 MB`**，严禁 `https://` URL）。
3. **发布版本归档**：发布至少一个正式 SemVer GitHub Release 并附带预构建 `.tar.gz` / `.tgz` 归档（纯声明式或零构建自包含仓库也可直接使用 SemVer Tag 源码归档）。**已取消 100 MB 包体积限制**（`MAX_TARBALL_BYTES = 0`），CI 采用 `inspectTarGzStream` O(MB) 流式校验与 `60s` 传输停滞超时，支持含本地模型/二进制的大体积插件。
4. **可选伴随清单 `agy-market.json`**：可声明多分类（`categories`）、标签（`tags`）、截图（`screenshots`）、平台（`platforms`）、自定义资产名（`releaseAsset`）与更新保留路径（`preservePaths`）。若插件会修补 `app.asar`，请在 `README.md` 提示用户安装/更新后重跑补丁脚本，并用 `preservePaths` 保护插件目录内的用户配置与自定义素材。

### 第 2 步：新增单个 YAML 文件并提交 PR
在 `data/plugins/` 下新建 `data/plugins/<owner>__<repo>.yml`（Monorepo 子插件命名为 `data/plugins/<owner>__<repo>--<subpath>.yml`；双下划线 `__` 无歧义分隔 GitHub 用户名与仓库名）：

```yaml
url: https://github.com/author/my-agy-plugin
pluginRoot: .
category: productivity
description:
  zh: 插件简体中文功能简介（2-240 字，直接展示在市场中文卡片中）。
  en: Concise English summary of what the plugin provides (2-300 chars).
```

> **规则速览**：
> - 单个 PR 最多新增/修改 **`3`** 个条目（`MAX_ENTRIES_PER_PR = 3`），最多删除 **`2`** 个条目（`MAX_DELETED_ENTRIES_PER_PR = 2`），且仅可改动 `data/plugins/*.yml`。
> - 禁止手写 `sha256`、`npm`、`npmMirrorPkg`、`repositoryId`、`ownerId` 等机算字段。
> - 如需指定 Release 资产文件名，可添加可选字段 `releaseAsset: my-plugin.tar.gz`。

#### 分类枚举说明表（15 个合法枚举）

| 枚举值 (`category`) | 中文分类名 | English Label |
| :--- | :--- | :--- |
| `monitoring-quota` | 状态与用量监控 | Telemetry & Quota |
| `context-cache` | 上下文与缓存加速 | Context & Cache Boost |
| `ui-themes` | 界面美化与汉化 | UI, Themes & i18n |
| `agents-reasoning` | 多代理与思考控制 | Agents & Reasoning |
| `developer-tools` | 开发与版本工具 | Git & DevTools |
| `mcp-integrations` | 浏览器与系统 MCP | Browser & System MCP |
| `skills-workflows` | 技能包与工程方法 | Skills & Frameworks |
| `productivity` | 效率与插件管理 | Workspace & Market |
| `data-science` | 数据与科学计算 | Data & Science |
| `cloud-devops` | 云原生与部署 | Cloud & DevOps |
| `creative-media` | 设计与多媒体 | Creative & Media |
| `writing-knowledge` | 写作与知识库 | Writing & Knowledge |
| `automation` | 定时与守护任务 | Automation |
| `security` | 安全与审计 | Security |
| `other` | 其他扩展 | Other |

### 第 3 步：Fork 安全门禁、维护者一键合并（`merge-pr.yml`）与 0-PR 自动同步
1. **Tier 1（`pr-check.yml`，零 Secret）**：校验基于 `git merge-base` 的路径白名单、YAML 结构并运行单元测试。
   - **关于首次 Fork 贡献者的 GitHub `action_required` 阻塞**：GitHub Actions 默认策略会让首次提交 Fork PR 的 `pull_request` 工作流停留在 `action_required` 待审批状态，导致 Tier 2（`pr-gate.yml`）无法自动触发。为此仓库提供专门的维护者一键通道 **`merge-pr.yml`**，无需逐个在 Actions 界面点 Approve！
2. **Tier 2 自动门禁（`pr-gate.yml`）与维护者一键合入（`.github/workflows/merge-pr.yml`）**：
   - **两种一键触发方式**：
     - **PR 评论指令**：仓库 `OWNER` / `MEMBER` / `COLLABORATOR` 在任意开放 PR 下评论 `/merge`（或 `/admit`），支持 `/merge --dry-run`（仅静态预检并回复双语诊断表，不合入）与 `/merge --skip-age-check`（覆盖 24h 冷启动限制）。系统会立即回复 🚀 表情确认受理。
     - **GitHub Actions 手动调度（`workflow_dispatch`）**：在 Actions 页运行 `Maintainer One-Click Plugin PR Merge (Fork-Safe)`，输入 `pr_number`（单个 PR 如 `2`、逗号分隔批量如 `2,3,4` 或 `all` 处理全部开放插件 PR），可选勾选 `dry_run` 或 `skip_age_check`。
   - **100% Fork 安全原子流水线**：始终只检出受信任的 `main` 分支（绝不使用 `pull_request_target` 或执行 PR 代码），通过 `git archive` 仅提取 `data/plugins/*.yml`，执行 `validate-entries.mjs`、`node --test` 与 `check-submission.mjs`；使用 `--match-head-commit` Squash Merge 后再基于最新 `origin/main` 原子写入 `state/ledger.json` 与 `state/versions-lock.json`（共享 `catalog-state-publish` 并发锁，杜绝状态覆盖），同步刷新 README 收录表，发布双语 PR 评论，并在任务内直接部署 `gh-pages` 使线上目录即时生效。
   - 若新仓库未满 24 小时但其余校验全过，CI 会自动贴上 `pending: repo-age` 标签并告知解锁 UTC 时间，由 **`regate.yml`（每 6 小时）** 自动复审、合并、锁状态并部署 `gh-pages`。
3. **后续发版 0-PR 自动同步（单插件异常隔离）**：合并后 **`sync-catalog.yml`（每 30 分钟）** 自动轮询新 SemVer Release，执行能力增量审核（`PRIVILEGE_REVIEW`），并对单个插件或单个 Release 的校验失败（如 `ERR_PLUGIN_JSON_UNKNOWN_KEY`）做隔离跳过、保留原合规锁定版本且输出告警日志（`RELEASE_VALIDATION_FAILED` / `PLUGIN_SYNC_FAILED`），绝不阻断其余插件的同步与 `gh-pages` 发布（若启用 `NPM_PUBLISH_ENABLED=true` 亦同步发布 npm 数据包）。

---

## 🌐 多语言 README 提取与按需懒加载

为让用户在 **AGY Market** 侧边栏详情抽屉中开箱即阅双语文档，`scripts/validate-plugin-tarball.mjs` 与 `scripts/build-catalog.mjs` 会自动提取多语言 README（单文件截断上限 `64,000` 字符）：

### 自动探测优先级
- **简体中文文档（`readmeZhMarkdown`）**：按顺序探测 `pluginRoot`（及压缩包根目录兜底）中的：
  1. `README.zh-CN.md` / `README_zh-CN.md`（不区分大小写）
  2. `README.zh.md` / `README_zh.md`
  3. `docs/README.zh-CN.md` / `docs/README.zh.md`
  4. 若未提供独立中文文件且主 `README.md` 包含中文 CJK 字符，则自动采用 `README.md`。
- **英文文档（`readmeEnMarkdown`）**：按顺序探测 `README.en.md`、`README.en-US.md`、`README_en.md`、`docs/README.en.md`；若无独立英文文件且主 `README.md` 为英文文档，则自动采用 `README.md`。
- **向后兼容（`readmeMarkdown`）**：始终保留主 `README.md` 内容。

### 拆分按需产物与兼容输出
为避免全量大包阻塞前端加载，`build-catalog.mjs` 同时生成三类 README 静态产物：
1. **`dist/readmes/<id>.json`（按需懒加载单文件）**：每个插件独立 JSON（`{ "id": "...", "default": "...", "zh": "...", "en": "..." }`），供新版 AGY Market 客户端按需缓存拉取。
2. **`dist/readmes-verified.json`**：仅包含 Track 1 已验证插件的轻量合并包。
3. **`dist/readmes.json`**：保留向后兼容的全量多语言合集（`entries`、`entriesZh`、`entriesEn`）。

> **给插件作者的建议**：如果仓库默认 `README.md` 是英文，强烈建议同目录附带一份 **`README.zh-CN.md`**；若默认 `README.md` 是简体中文，则附带一份 **`README.en.md`**，目录构建器会自动同时索引双语文档！

---

## 🔍 Track 2 实验源多源发现与 Tier-0 社区提名

### Tier-0 社区一键提名（`ingest-nomination.yml`）
任何社区成员都可以通过提交 **[社区提名 Issue 表单](./.github/ISSUE_TEMPLATE/nominate-plugin.yml)**（或为公开 Issue 添加 `community-discovery` 标签，支持 `opened` 与 `labeled` 双事件触发，每账户每 24 小时限 5 次），仅提供公开 GitHub 仓库（`owner/repo` 或 URL）及可选 `plugin_root`（零 PII）。`scripts/parse-nomination.mjs` 解析后即刻触发静态校验与编译，通过后直接写入 Track 2 `unverified-index.json` 并部署 `gh-pages`。

### Track 2 多源自动化爬虫（`crawl-topics.yml`，当前已收录 `848+` 插件）
- **多源发现通道**：融合 **Channel A**（11 条自适应仓库搜索臂 + 14 条经过验证的 Code Search 指纹，配合 `AdaptiveRangeSlicer` 与 `DiscountedUcb1Cost` / `CodeSearchPacer`）、**Channel B**（`data/aggregators.json` 配置的 5 个社区聚合列表/Monorepo 及自动晋升的 `state/discovered-aggregators.json`）、**P1 滚雪球扩展**（1-hop README 链接前沿、作者 GraphQL 扩展、npm 搜索桥、Topic 共现挖掘）以及 **两阶段 GraphQL**（`2A-Heartbeat` / `2A-Novel` / `2B-Inspect`）。
- **三层版本解析与 4 种目录布局**：依次按正式 SemVer Release → SemVer Tag → 默认分支最新 Commit（生成 `<base>-git.<ts>.<sha7>`）解析；自动识别根 `plugin.json`、`.antigravity-plugin/plugin.json`、`.agents/plugins/*`（及 `.agent/plugins/*`）与 `plugins/*` / 深度 `1..4` 子目录。
- **真实性评分、三层去重与严格作用域隔离**：经 `authenticity-scorer.mjs` 过滤非 Antigravity 宿主仓库、`dedup-engine.mjs` 三层去重、`quality-ranker.mjs` 计算 `ranking.score`；自动跳过已在 Track 1 注册的 `repositoryId`，强制设置 **`"forceScopedInstall": true`**（`<owner>--<slug>`）；对于仓库中严格位于所选 `pluginRoot` 之外的双宿主软链（如外部 `.claude/` 链接），在 Track 2 自动安全跳过（要求 `minClientVersion: "1.6.0"`），而 `pluginRoot` 内部或穿越进入 `pluginRoot` 的符号链接仍硬性拦截。

---

## 🛡️ 双层防碰撞、防 RepoJacking 与权限升级护栏

Antigravity 对 `plugin.json.name` 采用全局扁平命名空间——若两款本地插件同名，后发现的插件会被宿主静默丢弃。本目录采用双层纵深防御：

1. **Layer 1：Track 1 中央账本保留原生短名（`state/ledger.json`）**
   - 先到先得保留作者原生简洁短名（`<dir> === plugin.json.name`，仅允许单连字符小写 kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`，禁用 `--`）。
   - **不可变数字 ID 绑定（防 RepoJacking）**：账本永久绑定 GitHub 数字 `repositoryId` 与 `ownerId`：
     - 旧 `owner/repo` 路径出现不同 `repositoryId`（删号重建冒充）→ 硬性熔断 **`REPOJACKING_BLOCKED`**。
     - 同一 `repositoryId` 同主人改名 → 无缝迁移 `repoFullName`（例如 `zou172866/agy-dart` 迁移至 `zou172866/Antigravity-agy-dart`）。
     - 同一 `repositoryId` 所有权转移且新版本权限扩张 → 挂起至 **`OWNERSHIP_TRANSFER_REVIEW`**。
   - **常驻权限升级护栏（`PRIVILEGE_REVIEW`）**：`scripts/sync-releases.mjs` 在每次版本更新时**无条件执行 `computeCapabilityDiff`**（即使未发生仓库所有权转移）。一旦检测到 `CRITICAL` 级权限扩张（新增 `mcpRemoteDomains`、Patch 补丁版本新增 `lifecycle-hooks`/`mcp-stdio`/`app-asar`、`rulesEstimatedTokens` 激增超过 `+1500` 且翻倍、或高风险 Shell 管道执行模式），立即将该插件挂起为 **`PRIVILEGE_REVIEW`** 冻结自动推送；对于 `MODERATE` 级能力增量，则在允许同步的同时写入 `lastEscalation` 元数据供客户端向用户展示确认弹窗。
   - **保留名黑名单与子组件防碰撞**：拦截内置插件（`BUILTIN_PLUGINS`：`swarm`、`agy-market`、`agy-market-catalog`）、内置 Subagent、内置 Skill、官方市场 slug 及官方仓库（`FIRST_PARTY_REPO_OWNERS`：`google`、`google-deepmind`、`antigravity-plugins-official`、`google-labs-code`、`googlecloudplatform`）的直接 Fork；对编辑距离 `Levenshtein == 1` 的近似名称发出 `WARN_TYPOSQUAT_SUSPECT`，并拦截 Track 1 之间的 Skill、Subagent 重名与 12 个裸通用 MCP 键名（`search`、`db`、`fetch` 等）。
2. **Layer 2：双连字符作用域隔离（`<owner>--<slug>`）**
   - GitHub 用户名允许单连字符但不允许连续双连字符 `--`，因此 `<owner-lower>--<slug>` 在数学上天然无碰撞，自动应用于所有 **Track 2 实验性插件** 以及客户端本地预检冲突。

---

## 🔬 4 层宽容静态能力与安全扫描器（`scripts/scan-capabilities.mjs`）

CI 全程仅在内存中流式只读分析，**绝不执行任何插件代码或 `npm install`**：

### 硬性拦截红线（仅拦截真实供应链与窃密攻击）
1. **压缩包路径穿越、符号链接投毒与流式大图校验**：拒绝包含 `..`、绝对路径或 symlink / hardlink（`typeflag` `'1'` / `'2'`）的 tar 条目；已移除人工 100 MB 包体积上限（`MAX_TARBALL_BYTES = 0`），通过 `inspectTarGzStream` 流式解包并在内存自动跳过 `> 4 MB` 非文本二进制资产（`60s` 传输停滞超时 `TARBALL_FETCH_TIMEOUT_MS = 60_000`）。
2. **已锁定 Tag 篡改（`TAG_MUTATION_BLOCKED`）**：`state/versions-lock.json` 中已记录版本的 `commitSha` 或 `sha256` 发生任何变化即硬性拦截。
3. **`rules/*.md` 本地文件外泄与超限**：拦截正文中 `@[label](path)` 引用 `..`、`~/`、环境变量或绝对路径的行为，并强制遵守单条规则 `<= 24,000` 字节上限（`MAX_RULE_FILE_BYTES = 24_000`）。
4. **不可见提示词注入走私**：拦截 `rules/*.md`、`skills/**/SKILL.md`、`agents/*.md` 中的 Unicode Tag 区段（`U+E0000..U+E007F`）与双向文本覆写字符。
5. **图标体积、魔数校验与 SVG XSS/XXE 清洗**：`scripts/sanitize-icon.mjs` 强制 `<= 2 MB` 上限（`ERR_ICON_TOO_LARGE`）、校验 PNG/JPEG/WebP 文件头魔数（`ERR_ICON_MAGIC_MISMATCH`），拒绝 `<!ENTITY>` XXE 并剥离 SVG 中的 `<script>`、`foreignObject`、`javascript:` 与 `on*=` 事件属性。

### 宽容能力画像（明确欢迎 CDP 与 `app.asar` 界面增强）
所有合法的 Antigravity 扩展形态——包括 **CDP 调试桥接**（如毛玻璃/动态壁纸皮肤）与 **`resources/app.asar` 补丁**（如应用内桌面挂件或独立上下文/Token 看板）——**完全允许进入 Track 1 与 Track 2 / Tier-0 社区提名，绝不封禁或降权**；即使不含 `skills/` 或 `sidecars/` 的纯宿主增强插件，只要具备合法 `plugin.json` 并满足 Antigravity 生态亲和度校验亦可正常收录，仅透明标注温和的 `host-enhancement`（`💡 宿主界面增强`）徽章，同时完整画像 `declarative-only`、`global-rules`、`sidecar-ui`、`mcp-stdio`、`mcp-remote` 与 `lifecycle-hooks`。对于 `app-asar` 插件，建议作者在 README 写明安装与更新后重新运行补丁脚本的步骤，并使用 `agy-market.json` 的 `preservePaths` 保留用户本地配置。

---

## 💻 本地校验、同步与构建命令

> 运行环境要求：**Node.js >= 22.0.0**（零外部 npm 运行时依赖）。

```powershell
# 校验 data/plugins/*.yml 格式、命名与白名单
npm run validate

# 检查或同步更新 README.md / README.en.md 的 Track-1 目录表
node scripts/sync-readme-tables.mjs --check
npm run sync:readme

# 编译生成 dist/{index.json, unverified-index.json, readmes.json, readmes-verified.json, readmes/*.json} 与 dist/icons/*
npm run build

# 运行防碰撞、RepoJacking、Tar/PAX 安全、Workflow 审计、多语言 README 与 4 层能力扫描单元测试
npm test

# （维护者 / 作者自检）模拟完整 Tier-2 门禁验证单个插件提交文件
node scripts/check-submission.mjs data/plugins/owner__repo.yml

# （维护者）离线演练同步脚本
node scripts/sync-releases.mjs --offline
```

---

## 📚 教程与架构规范

- **[📖 申请收录插件完整教程 (`docs/SUBMISSION_GUIDE.md`)](./docs/SUBMISSION_GUIDE.md)** · **[English Guide (`docs/SUBMISSION_GUIDE.en.md`)](./docs/SUBMISSION_GUIDE.en.md)** — 插件作者与维护者一步步收录指南、模板与错误码 FAQ
- **[`AGENTS.md`](./AGENTS.md)** 与 **[`../AGENTS.md`](../AGENTS.md)** — 修改脚本、Schema 或 GitHub Actions 工作流前必读

## 📄 许可证

[MIT License](./LICENSE)
