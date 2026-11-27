# 📖 AGY Market 申请收录插件完整教程

欢迎将你的 Google Antigravity 插件提交到 **[AGY Market Catalog](https://github.com/azwosile/agy-market-catalog)**！

无论你写的是 **纯 Markdown 技能与规则（`skills/` / `rules/` / `agents/`）**、**Sidebar 侧边栏可视化插件（`sidecars/`）**、**Python / Rust / Go / Node MCP 服务**，还是 **CDP 毛玻璃皮肤 / `app.asar` 宿主界面增强插件**，都可以免费收录到 AGY Market，让全球及中国大陆的 Antigravity 用户一键搜索、浏览中文文档并安全安装。

> **为什么收录极其省心？**
> - **完全语言无关，无需发布到 npm**：不需要 `package.json`，也不需要 `npm publish`。
> - **只需提交 1 次单文件 YAML PR**：通过全自动门禁（或维护者 `/merge` 一键合入）后，**此后每次发新版都无需再提 PR**，系统每 30 分钟自动同步新 SemVer 版本并即时部署至 GitHub Pages（与 `gh-pages` Raw 回退通道）。
> - **明确欢迎宿主界面增强**：使用 CDP 调试桥或 `app.asar` 工作台增强的插件**完全允许进入 Track 1**，绝不封禁或降权，仅透明标注温和的 `💡 宿主界面增强` 提示徽章。
> - **零 PR 快速通道**：除了 Track 1 官方目录，还支持 **Track 2 多源自动发现** 与 **Tier-0 社区提名 Issue**。

[English Guide (`docs/SUBMISSION_GUIDE.en.md`)](./SUBMISSION_GUIDE.en.md) · [简体中文 README](../README.md) · [English README](../README.en.md) · [架构规范 (`AGENTS.md`)](../AGENTS.md)

---

## 🧭 三种收录 / 发现通道速览

| 对比维度 | Track 1 官方认证目录（推荐） | Track 2 实验源多源自动发现 | Tier-0 社区提名直达 Track 2 |
| :--- | :--- | :--- | :--- |
| **申请方式** | 提交 **1 个 YAML 文件 PR**（仅一次） | **免 PR**，加 Topic `antigravity-plugin`（或支持 4 种结构指纹） | 填写 [提名 Issue 表单](../.github/ISSUE_TEMPLATE/nominate-plugin.yml)（`community-discovery` 标签） |
| **后续更新** | **0 PR**，每 30 分钟自动同步新 SemVer Release / Tag | 每 6 小时多源自动抓取（Release → Tag → 默认分支 Commit SHA） | 触发后立即静态校验写入 Track 2，后续由 Track 2 持续同步 |
| **用户可见性** | 所有 AGY Market 用户**默认直接可见** | 用户在「源与设置」开启「实验性 Track 2」后可见 | 同 Track 2（即时发布到 `unverified-index.json`） |
| **插件安装命名** | 保留作者原生简洁短名（`<dir> === plugin.json.name`） | 强制双连字符隔离安装（`<owner>--<slug>`），杜绝同名冲突 | 强制双连字符隔离安装（`<owner>--<slug>`） |
| **支持 Monorepo 子目录** | 支持（`pluginRoot` + `--<subpath>.yml`） | 支持全部 **4 种目录布局**（含 `.antigravity-plugin/`、`.agents/plugins/*`、`plugins/*`） | 支持指定可选 `plugin_root` 子目录 |
| **适用场景** | 正式发布、希望获得官方防仿冒账本保护与默认展示的插件 | 早期内测、多目录集合仓库、想快速进入实验源的插件 | 社区用户或作者零命令行把任意公开插件仓库一键送入 Track 2 |

---

## 🚀 方式一（推荐）：Track 1 官方认证目录

整个流程只需 4 步，提交 1 个小巧的 YAML 文件即可完成上架。

---

### Step 1：准备你的插件仓库与 `plugin.json`

一个规范的 Antigravity 插件仓库通常包含以下文件（按需保留你用到的目录即可，清单放在 `plugin.json` 或 `.antigravity-plugin/plugin.json` 均可）：

```text
my-agy-plugin/
├── plugin.json                        # 【必填】Antigravity 严格 10 字段原生清单（亦支持 .antigravity-plugin/plugin.json）
├── assets/
│   └── logo.svg                       # 【推荐】插件图标（须为包内相对路径，<= 2 MB）
├── README.md                          # 【推荐】主说明文档
├── README.zh-CN.md                    # 【推荐】若主 README 为英文，附此文件可在市场直接展示中文详情
├── agy-market.json                    # 【可选】市场伴随扩展配置（多分类、标签、preservePaths 等）
├── skills/<skill-name>/SKILL.md       # 【按需】声明式技能
├── rules/*.md                         # 【按需】全局规则（单文件 <= 24,000 字节）
├── agents/*.md                        # 【按需】自定义 Subagent
├── sidecars/<id>/sidecar.json         # 【按需】Sidebar 侧边栏可视化面板
├── mcp_config.json                    # 【按需】本地 Stdio 或远程 HTTPS MCP 服务
└── hooks.json                         # 【按需】生命周期钩子
```

#### 1.1 编写 `plugin.json`（严格 10 字段白名单）

Antigravity 宿主会静默剥离白名单之外的顶层字段，目录门禁也会严格校验 **`plugin.json`（或 `.antigravity-plugin/plugin.json`）只能包含官方 v1 Schema 规定的以下 15 个顶层键（含 `$schema`、`skills`、`license`、`keywords`、`extensions`）**（出现任何额外字段都会触发 `ERR_PLUGIN_JSON_UNKNOWN_KEY`）：

| 字段名 | 是否必填 | 类型 / 格式要求 | 说明 |
| :--- | :---: | :--- | :--- |
| `name` | **必填** | 字符串，`^[a-z0-9]+(-[a-z0-9]+)*$` | 全小写单连字符 kebab-case（**严禁使用 `--`**，`--` 为隔离安装保留符；不可与内置插件或已收录插件重名） |
| `description` | **必填** | 字符串（1–400 字符） | 简洁的一两句话功能概括，会被搜索索引 |
| `displayName` | 推荐 | 字符串（1–80 字符） | 展示给用户看的人类友好名称（支持中文、空格与大小写） |
| `version` | 推荐 | SemVer 字符串（如 `1.0.0`） | 插件语义化版本号（若省略则回退读取 Release Tag） |
| `logo` | 推荐 | 包内相对路径（`.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`） | **严禁使用 `https://` URL、`/` 绝对路径或 `..`**；单文件上限 **`2 MB`**（超限报 `ERR_ICON_TOO_LARGE`），校验真实图片魔数（`ERR_ICON_MAGIC_MISMATCH`），SVG 中的 `<script>` / `on*=` 会自动清洗 |
| `author` | 可选 | 字符串，或 `{ "name": "...", "url": "https://..." }` | 作者署名与主页链接 |
| `homepage` | 可选 | `https://...` | 插件主页或文档地址 |
| `repository` | 可选 | `https://...` 或 `{ "type": "git", "url": "https://..." }` | 源码仓库地址 |
| `suggestedPrompts` | 可选 | 字符串数组（**最多 3 条**非空字符串） | Antigravity 展示的快捷对话提示词 |
| `disabled` | 可选 | 布尔值（通常省略或 `false`） | Antigravity 原生开关字段 |

**可直接复制的 `plugin.json` 模板：**

```json
{
  "name": "my-agy-plugin",
  "displayName": "My AGY Plugin · 我的反重力插件",
  "description": "一句话说明你的插件能帮用户解决什么问题。",
  "version": "1.0.0",
  "logo": "assets/logo.svg",
  "author": {
    "name": "your-github-name",
    "url": "https://github.com/your-github-name"
  },
  "homepage": "https://github.com/your-github-name/my-agy-plugin",
  "repository": "https://github.com/your-github-name/my-agy-plugin",
  "suggestedPrompts": [
    "打开 My AGY Plugin 侧边栏",
    "用 My AGY Plugin 检查当前工作区"
  ]
}
```

#### 1.2 附带中文详情文档（可选但强烈推荐：`README.zh-CN.md`）

用户在 AGY Market 侧边栏点击你的插件卡片时，详情抽屉会自动按需拉取 `dist/readmes/<id>.json`（同时编译 `dist/readmes-verified.json` 与向后兼容的 `dist/readmes.json`）并优先展示简体中文文档。目录索引器支持以下自动探测优先级（不区分大小写，单文件截断上限 `64,000` 字符）：

1. **简体中文文档（`entriesZh`）**：依次探测 `README.zh-CN.md` / `README_zh-CN.md` → `README.zh.md` / `README_zh.md` → `docs/README.zh-CN.md` / `docs/README.zh.md` → 若均不存在且主 `README.md` 包含中文字符，则自动使用 `README.md`。
2. **英文文档（`entriesEn`）**：依次探测 `README.en.md` / `README.en-US.md` / `README_en.md` / `docs/README.en.md` → 若主 `README.md` 为英文则自动采用。

> **最佳实践**：如果你的仓库默认 `README.md` 是英文，在同目录放一份 **`README.zh-CN.md`**；如果默认 `README.md` 本身就是简体中文，可附带一份 `README.en.md`，市场就能完美支持中英双语切换！

#### 1.3 可选扩展配置：`agy-market.json`

因为 `plugin.json` 有严格 10 字段限制，如需声明**多分类、搜索标签、更新保留路径（`preservePaths`）、支持平台或指定 Release 资产名**，可以在插件根目录（或仓库根目录）放一个可选的 `agy-market.json`。该文件**不会被 Antigravity 宿主读取**，仅由目录索引器与 AGY Market 安装器使用：

```json
{
  "schemaVersion": 1,
  "pluginRoot": ".",
  "categories": ["productivity", "developer-tools"],
  "tags": ["sidebar", "workflow", "theme"],
  "screenshots": ["docs/screenshots/preview.png"],
  "minAntigravityVersion": "2.0.0",
  "platforms": ["win32", "darwin", "linux"],
  "releaseAsset": "my-agy-plugin.tar.gz",
  "preservePaths": [
    "user-config.json",
    "custom-themes/**"
  ]
}
```

| 字段名 | 说明 |
| :--- | :--- |
| `schemaVersion` | 固定填 `1` |
| `pluginRoot` | 插件根目录相对路径，默认为 `"."` |
| `categories` | 多分类数组（必须属于下方 15 个合法分类枚举，优先于 YAML 里的单分类） |
| `tags` | 自定义搜索关键词数组 |
| `screenshots` | 预览截图相对路径数组 |
| `minAntigravityVersion` | 最低兼容的 Antigravity 版本号 |
| `platforms` | 支持平台子集，仅允许 `"win32"`、`"darwin"`、`"linux"` |
| `releaseAsset` | 指定 GitHub Release 中要下载的 `.tar.gz` / `.tgz` 文件名 |
| `preservePaths` | **非常实用！**用户在 AGY Market 中点击「更新」时，保留不被覆盖的本地用户配置或素材相对路径/glob（禁止 `..` 或绝对路径）；客户端会自动合并已有收据与新目录声明的 `preservePaths` |

#### 1.4 `app.asar` 补丁插件与用户配置保留最佳实践

如果你的插件属于 `host-enhancement`（`app-asar`）类型（即需要向 Antigravity 客户端 `resources/app.asar` 注入挂件或样式）：
1. **在 `README.md` / `README.zh-CN.md` 醒目处写明补丁步骤**：明确告知用户**首次安装以及每次通过 AGY Market 更新插件后**，需进入插件目录执行你的自带补丁脚本（例如 `node setup.cjs`）并重启 Antigravity 使最新宿主补丁生效（AGY Market 客户端也会在安装/更新完成弹窗与顶部横幅中提示用户查看你的补丁文档）。
2. **保护用户本地配置与自定义素材**：若你的插件在自身目录内持久化用户设置（如 `prefs.json`、`hud_prefs.json`）或自定义图片/壁纸资源（如 `assets/custom/**`），请务必在 `agy-market.json` 中配置 `preservePaths`（例如 `["hud_prefs.json", "assets/custom/**"]`），避免更新同步覆盖用户数据。

---

### Step 2：打 SemVer 标签或发布预构建 `.tar.gz` GitHub Release

AGY Market 的安装器直接从 GitHub Release 流式下载并校验 `sha256`，**完全不需要把插件发布到 npm，也不要求项目包含 `package.json`**。

#### 2.1 三类插件如何准备自包含产物

1. **纯 Markdown 插件（`skills/` / `rules/` / `agents/`）**：
   - 天然零构建，直接打包文件或直接打 SemVer Git Tag 即可！
   - 注意两点：
     - `skills/<dir>/SKILL.md` 顶部 YAML frontmatter 的 `name:` 必须与文件夹名 `<dir>` 完全一致（否则触发 `ERR_SKILL_NAME_MISMATCH`），且不可与 Antigravity 内置 Skill 重名。
     - `rules/*.md` 单文件不能超过 **`24,000` 字节**，正文中严禁使用 `@[label](../../...)`、`~/`、绝对路径或环境变量读取插件目录外的本地文件（文档代码块/反引号里的示例写法会被自动豁免）。
2. **Sidebar 侧边栏插件（`sidecars/<id>/sidecar.json`）**：
   - **必须先在本地或 CI 完成前端构建**，确保 `sidecar.json` 中 `ui_config.views[].path` 指向的静态页面（例如 `sidecars/<id>/index.html`）已真实存在于发布包中，否则自包含校验会报 `ERR_UNBUILT_SOURCE_ARCHIVE`。
   - 如果后端启动脚本只依赖 Node.js `>= 22` 原生 API，直接打包即可；如果使用了第三方 npm 运行时依赖，请先用 esbuild/rollup 等打成单文件，或将精简后的运行时产物一起打入 `.tar.gz`（安装时客户端**不会**执行 `npm install`）。
3. **MCP 服务插件（`mcp_config.json` — Python / Rust / Go / Node / 远程 HTTPS）**：
   - **本地 Stdio MCP**：将可直接运行的脚本或预编译产物一并打入 `.tar.gz` 资产即可（支持任意语言，无需 npm）。
   - **远程 HTTPS MCP**：在 `mcp_config.json` 中填写 `serverUrl` / `url` / `httpUrl`（`https://...`），目录会自动透明展示目标域名。
   - **MCP 键名避坑**：Antigravity 会把服务注册为 `<plugin>_<server>`，但为防止冲突，目录门禁禁止使用以下 **12 个裸通用服务键名**：
     `search`、`db`、`database`、`filesystem`、`fs`、`fetch`、`http`、`git`、`shell`、`default`、`server`、`mcp`。请改用更有辨识度的键名（例如 `fast`、`context`、`myplugin_core`）。

#### 2.2 打包与发布命令示例

- **推荐方式：上传预构建 `.tar.gz` 到正式 GitHub Release**（支持单层顶层目录，索引器会自动剥离类似 `my-agy-plugin-1.0.0/` 的外层包裹目录）：

```bash
# macOS / Linux：打包干净的自包含归档（排除 .git 与 node_modules，切勿包含符号链接！）
tar --exclude='.git' --exclude='node_modules' --exclude='.DS_Store' \
  -czf my-agy-plugin.tar.gz \
  plugin.json README.md README.zh-CN.md assets skills sidecars
```

```powershell
# Windows PowerShell（使用系统内置 tar）：
tar --exclude=".git" --exclude="node_modules" `
  -czf my-agy-plugin.tar.gz `
  plugin.json README.md README.zh-CN.md assets skills sidecars
```

然后打一个正式 SemVer 标签（例如 `v1.0.0`，**不要勾选 Draft 或 Pre-release**），在 GitHub Releases 页面新建 Release 并上传 `my-agy-plugin.tar.gz`：

```bash
git tag v1.0.0
git push origin v1.0.0
# 随后在 GitHub 网页或使用 gh CLI 发布 Release：
gh release create v1.0.0 my-agy-plugin.tar.gz --title "v1.0.0" --notes "Initial release"
```

- **零构建直出方式（纯 Markdown 或已提交预构建产物的仓库）**：如果未上传 `.tar.gz` 资产（或只推了正式 SemVer Tag `v1.0.0`），目录门禁与同步器也会自动回退使用 GitHub Tag 源码归档，并自动启用自包含检查（确认归档内无未构建的 Sidebar 入口与未打包的 npm `dependencies`）。

> **⚠️ 打包红线与大包流式说明**：
> 1. **无人工 100 MB 包体积上限**：`MAX_TARBALL_BYTES = 0`，目录 CI 采用 `inspectTarGzStream` O(MB) 流式解包（`60s` 传输停滞超时 `TARBALL_FETCH_TIMEOUT_MS = 60_000`），允许含模型或原生二进制的大体积插件。
> 2. **严禁包含符号链接（symlink）、硬链接（hardlink）、绝对路径或 `..` 路径穿越**：Track 1 归档内任何软硬链接均会触发 `ERR_TAR_SYMLINK_FORBIDDEN`（Windows 下 Antigravity 也会直接跳过符号链接插件）。
> 3. **已发布的 SemVer Tag 不可变**：被目录锁定后，**切勿**对旧 Tag 执行 `git push --force` 或删除后重传不同内容的同名资产，否则会触发供应链完整性保护 **`TAG_MUTATION_BLOCKED`**。需要修复问题时，直接发一个新版本号（如 `v1.0.1`）即可！

---

### Step 3：Fork 目录仓库，新建 1 个 YAML 文件并提交 PR

1. 打开 [`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog)，点击右上角 **Fork**。
2. 在你的 Fork 中进入 `data/plugins/` 目录，新建 **唯一一个** `.yml` 文件（扩展名必须是 `.yml`，不能用 `.yaml`）：
   - **常规单插件仓库**：`data/plugins/<owner>__<repo>.yml`
   - **Monorepo 多子插件仓库**：`data/plugins/<owner>__<repo>--<subpath>.yml`（此时 YAML 中的 `pluginRoot` 不能为 `.`）
   - **命名规则**：全部小写，用 **双下划线 `__`** 分隔 GitHub 用户名（`<owner>`）与仓库名（`<repo>`），且必须与 `url` 完全一致。

#### 可直接复制的 YAML 模板

**模板 A：标准单插件仓库（如 `data/plugins/alice__my-agy-plugin.yml`）**

```yaml
url: https://github.com/alice/my-agy-plugin
pluginRoot: .
category: productivity
description:
  zh: 插件的简体中文功能简介（2-240 字，直接展示在 AGY Market 中文卡片上）。
  en: Concise English summary of what the plugin provides (2-300 chars).
```

**模板 B：Monorepo 子目录插件 + 指定 Release 资产（如 `data/plugins/alice__agy-tools--prism.yml`）**

```yaml
url: https://github.com/alice/agy-tools
pluginRoot: plugins/prism
category: ui-themes
releaseAsset: prism-plugin.tar.gz
description:
  zh: 位于 Monorepo 子目录的界面美化插件简介。
  en: UI theme plugin housed inside a monorepo subdirectory.
```

> **YAML 书写注意事项**：
> - 缩进严格使用 **2 个空格**，**禁止使用 Tab 制表符**。
> - **禁止手写机算字段**：不要写 `sha256`、`npm`、`npmMirrorPkg`、`repositoryId`、`ownerId`（全部由 CI 自动计算并锁定，手写会报错 `ERR_FORBIDDEN_HANDWRITTEN_KEY`）。
> - 每个 PR 最多新增/修改 **`3`** 个插件条目（`MAX_ENTRIES_PER_PR = 3`），最多删除 **`2`** 个条目（`MAX_DELETED_ENTRIES_PER_PR = 2`），且 **只能修改 `data/plugins/*.yml`**，不要修改 `README.md` 或任何脚本文件（否则 `ERR_PR_PATH_FORBIDDEN` 会拦截）。

#### 允许的 15 个分类枚举表（`category`）

| `category` 枚举值 | AGY Market 中文分类 | English Label | 典型插件类型 |
| :--- | :--- | :--- | :--- |
| `monitoring-quota` | 状态与用量监控 | Telemetry & Quota | Token / 额度监控、上下文 HUD 胶囊、网络探针、生成速度观察台 |
| `context-cache` | 上下文与缓存加速 | Context & Cache Boost | KV-Cache 保护、上下文守卫、历史裁剪压缩、配额节省加速 |
| `ui-themes` | 界面美化与汉化 | UI, Themes & i18n | 毛玻璃皮肤、壁纸工坊、桌面挂件、简体中文 UI 语言包与本地化 |
| `agents-reasoning` | 多代理与思考控制 | Agents & Reasoning | 多代理蜂群协同、Subagent 路由调度、模型思考语言与推理控制 |
| `developer-tools` | 开发与版本工具 | Git & DevTools | Git 分支图与 Diff、代码检索、调试构建与工程诊断工具 |
| `mcp-integrations` | 浏览器与系统 MCP | Browser & System MCP | 浏览器控制、硬件温控、数据库、API 与第三方服务 MCP 连接器 |
| `skills-workflows` | 技能包与工程方法 | Skills & Frameworks | 纯声明式 `SKILL.md` 技能集、产品工程方法论与多步开发工作流 |
| `productivity` | 效率与插件管理 | Workspace & Market | 插件市场与管理器、工具目录导航、工作台效率助手与快捷操作 |
| `data-science` | 数据与科学计算 | Data & Science | 数据分析、可视化、科研检索与建模辅助 |
| `cloud-devops` | 云原生与部署 | Cloud & DevOps | 云部署、Docker/K8s、CI/CD 与基础设施工具 |
| `creative-media` | 设计与多媒体 | Creative & Media | 音视频、图像生成、设计系统与创意媒体工具 |
| `writing-knowledge` | 写作与知识库 | Writing & Knowledge | 笔记、知识图谱、长文与学术写作辅助 |
| `automation` | 定时与守护任务 | Automation | 定时巡检、后台守卫、自动化脚本触发 |
| `security` | 安全与审计 | Security | 秘钥扫描、权限审查、合规与安全检测 |
| `other` | 其他扩展 | Other | 暂不归属于上述分类的通用扩展 |

#### 提交 Pull Request（网页端零命令行，或 Git CLI 均可）

- **最省事（GitHub 网页端）**：在你的 Fork 页面打开 `data/plugins/` → 点击 **Add file → Create new file** → 输入 `<owner>__<repo>.yml` 并粘贴内容 → 点击 **Commit changes** → 点击 **Contribute → Open pull request** 提交到 `azwosile/agy-market-catalog` 的 `main` 分支即可！
- **命令行方式**：

```bash
git clone https://github.com/<你的用户名>/agy-market-catalog.git
cd agy-market-catalog
git checkout -b feat/add-my-agy-plugin
# 新建 data/plugins/<owner>__<repo>.yml 后：
npm run validate
git add data/plugins/<owner>__<repo>.yml
git commit -m "feat(catalog): add <owner>/<repo>"
git push -u origin feat/add-my-agy-plugin
```

---

### Step 4：Fork 安全门禁审核、维护者一键合并与后续 0-PR 同步

提交 PR 后，两层 Fork 安全 GitHub Actions 流水线会接管校验：

1. **Tier 1 即时语法校验（`pr-check.yml`，零 Secret）**：
   - 基于 `git merge-base` 校验 PR 是否只改动了 `data/plugins/*.yml`（`<= 3` 新增/修改，`<= 2` 删除，完整校验重命名 `R*` 源与目标路径）、文件名与 `url` 是否一致、分类枚举与中英简介是否合规，并运行目录单元测试。
   - **首次 Fork 贡献者的 GitHub `action_required` 说明**：GitHub Actions 默认安全策略会让**首次向本仓库提交 Fork PR 的作者**的 `pull_request` 工作流处于 `action_required` 待审批状态，在维护者批准或通过一键合并 Action 执行之前，`pr-gate.yml` 不会自动启动——这是 GitHub 平台的正常防滥用机制，你无需重复关闭或重开 PR！
2. **Tier 2 自动门禁（`pr-gate.yml`）与维护者一键合并工作流（`merge-pr.yml`）**：
   - **维护者如何一键放行并安全合并 Fork PR（`.github/workflows/merge-pr.yml`）**：
     - **方式 A — 在 PR 下评论指令**：仓库 `OWNER` / `MEMBER` / `COLLABORATOR` 直接在 PR 页面评论 `/merge`（或 `/admit`）即可触发（回复 🚀 确认）。支持 `/merge --dry-run`（仅跑完校验并回复双语诊断表格，不修改状态或合并）与 `/merge --skip-age-check`（维护者显式覆盖 24h 冷启动限制）。
     - **方式 B — GitHub Actions `workflow_dispatch` 一键调度**：在仓库 **Actions → Maintainer One-Click Plugin PR Merge (Fork-Safe) → Run workflow** 中填写 `pr_number`（可填单个 PR 号如 `2`、逗号列表如 `2,3,4` 或 `all` 批量处理全部开放插件 PR），可选勾选 `dry_run` 或 `skip_age_check`。
   - **100% Fork 安全原子流程**：无论是 `pr-gate.yml` 还是 `merge-pr.yml`，都只检出受信任的 `main` 分支，**永不检出或执行 PR 代码**，仅通过 `git archive` 提取 `data/plugins/*.yml`，执行 `validate-entries.mjs`、`node --test` 与流式包扫描（检查 10 字段清单、图标、`>= 3` 不同树哈希非空提交 `MIN_NON_EMPTY_COMMITS = 3`、`>= 1` 天冷启动门槛 `MIN_AGE_DAYS = 1`、防碰撞账本与 4 层安全扫描）；全部通过后先用 `--match-head-commit` 执行 Squash Merge，再基于最新 `origin/main` 原子写入 `state/ledger.json` 与 `state/versions-lock.json`、同步刷新 README 表格、在 PR 下发表双语收录报告，并直接部署 `gh-pages`。
   - **刚建的新仓库未满 24 小时？无需重新提 PR！** 只要其他全部校验通过，CI 会自动给 PR 贴上 **`pending: repo-age`** 标签并评论告知精确的 **UTC 解锁时间**。**`regate.yml`（每 6 小时自动巡检一次）** 会在满 24 小时后自动复审、移除标签、合并、锁状态并发布 `gh-pages`。
3. **关于 CDP 与 `app.asar` 宿主界面增强插件的友好政策**：
   - 只要没有触发真实供应链/窃密红线，使用 **Chrome DevTools Protocol（CDP）** 或 **`resources/app.asar` 补丁**的插件**100% 欢迎收录进 Track 1 与 Track 2 / Tier-0 社区提名**，仅自动标注温和的 `💡 宿主界面增强`（`host-enhancement`）提示徽章；即使不含 `skills/` 或 `sidecars/` 的纯宿主增强插件，只要提供合法 `plugin.json` 并满足 Antigravity 生态亲和度校验也可正常收录。
   - **仅 5 类真实安全红线会被硬拦截**：压缩包 `..` 路径穿越或软/硬链接；已锁定 Tag 篡改；`rules/*.md` 越界 `@[...](..)` 读取插件外本地文件或单文件超过 `24,000` 字节；Markdown 中的不可见 Unicode Tag / Bidi 隐藏注入字符；超过 `2 MB` / 魔数不符 / 含 `<!ENTITY>` XXE 或残余主动脚本的图标。
4. **合并后永久 0-PR 自动同步与权限升级护栏**：
   - PR 合并后，**`sync-catalog.yml` 每 30 分钟**自动轮询你的仓库：每当你发布新的正式 SemVer Release 或 Tag，系统自动校验、提取新版多语言 README 与图标、刷新 `README.md` / `README.en.md` 表格并部署至 **GitHub Pages**（及 `gh-pages` Raw 回退通道；若维护者配置 `NPM_PUBLISH_ENABLED=true` 亦同步发布 `@agy-market/catalog` npm 镜像包）。
   - **常驻权限升级护栏（`PRIVILEGE_REVIEW`）**：每次同步新版时，系统会**无条件**对比新旧版本能力差异。若出现高危权限扩张（如新增远程 MCP 域名、Patch 补丁版新增 `lifecycle-hooks`/`mcp-stdio`/`app-asar`、`rulesEstimatedTokens` 翻倍且增量 `> 1500`、高风险 Shell 管道或所有权转移伴随权限扩张），新版会被挂起至 `PRIVILEGE_REVIEW` / `OWNERSHIP_TRANSFER_REVIEW` 等待复核，绝不静默下发给用户。

---

## 🔍 方式二 & 三：Track 2 多源自动发现与 Tier-0 社区提名

### Tier-0：填写 Issue 表单一键提名收录（零代码 / 零 PR）
任何用户都可以在仓库 **Issues → New issue → [Nominate Community Antigravity Plugin](../.github/ISSUE_TEMPLATE/nominate-plugin.yml)** 提交公开 GitHub 仓库（`owner/repo` 或 `https://github.com/owner/repo`）和可选 `plugin_root`（带 `community-discovery` 标签；新开或后续贴标均自动触发，每账户 24 小时限 5 次）。`ingest-nomination.yml` 校验通过后立即将其编译进 Track 2 `unverified-index.json` 并发布至 `gh-pages`。

### Track 2：免 PR 多源自动发现（已索引 `848+` 插件）
1. 为你的公开 GitHub 插件仓库添加 Topic 标签 **`antigravity-plugin`**（或支持 `.antigravity-plugin/plugin.json`、`.agents/plugins/*`、`plugins/*` 布局或登记于社区聚合列表中）。
2. 确保插件目录包含合法的 `plugin.json`（或 `.antigravity-plugin/plugin.json`）与有效 Antigravity 组件（`skills/`、`sidecars/`、`mcp_config.json`、`rules/` 或有效 `hooks.json`）。优先发布正式 SemVer Release / Tag，无 Release 时也会自动回退抓取默认分支最新 Commit（生成 `<base>-git.<ts>.<sha7>`）。
3. **`crawl-topics.yml`（每 6 小时）** 自动跳过已在 Track 1 注册的仓库，对双宿主仓库位于 `pluginRoot` 之外的符号链接在 Track 2 安全跳过（`minClientVersion: "1.6.0"`，而 `pluginRoot` 内部软链仍严格禁止），并强制开启 **`"forceScopedInstall": true`**（安装为 `<owner>--<slug>`）。等插件稳定后，随时按「方式一」提交 1 个 YAML PR 即可升级进入 Track 1 并保留简洁原生短名！

---

## 🧰 常见问题（FAQ）与本地自检命令

### 1. 常见门禁报错 / 状态码速查表

| 错误码 / 状态 / 标签 | 原因 | 解决方法 |
| :--- | :--- | :--- |
| `ERR_ENTRY_FILENAME` / `ERR_EXTENSION_MUST_BE_YML` | 文件名不规范或用了 `.yaml` 后缀 | 改为全小写 `data/plugins/<owner>__<repo>.yml`（注意中间是双下划线 `__`） |
| `ERR_SLUG_URL_MISMATCH` | YAML 文件名与 `url` 指向的仓库不一致 | 核对文件名中的 `<owner>`、`<repo>` 与 `url` 是否一致（文件名必须全小写） |
| `ERR_PR_PATH_FORBIDDEN` / `ERR_PR_SYMLINK_FORBIDDEN` / `ERR_PR_TOO_MANY_ENTRIES` | PR 修改了 `data/plugins/*.yml` 之外的文件、提交了符号链接文件或超过 3 个条目 | 撤销无关文件修改，确保 `data/plugins/*.yml` 为普通文件（非软链）且单个 PR 仅保留 `<= 3` 个条目 |
| `ERR_FORBIDDEN_HANDWRITTEN_KEY` | 手写了 `sha256`、`npm`、`npmMirrorPkg`、`repositoryId`、`ownerId` | 删除这些机算字段，由 CI 自动生成 |
| `ERR_PLUGIN_JSON_UNKNOWN_KEY` | `plugin.json` 含官方 v1 15 字段白名单外的未知顶层键 | 移除自定义键，把扩展配置迁入 `agy-market.json`；若发生在已收录插件的新 Release 同步阶段，同步器会隔离跳过该不合规版本并保留原合规版本（输出 `RELEASE_VALIDATION_FAILED` 告警） |
| `ERR_PLUGIN_JSON_LOGO_PATH` / `ERR_MISSING_LOGO_FILE` | `logo` 填了 `https://` 链接、`..` / `/` 路径，或包内缺该文件 | 将图标文件放进仓库（如 `assets/logo.svg`）并填包内相对路径 |
| `ERR_ICON_TOO_LARGE` / `ERR_ICON_MAGIC_MISMATCH` | 图标超过 `2 MB` 或扩展名与真实文件头魔数不符（或 SVG 含 XXE/XSS） | 压缩图标至 `<= 2 MB` 并确保 `.png`/`.jpg`/`.webp`/`.svg` 内容真实合法 |
| `ERR_NOT_ANTIGRAVITY_PLUGIN` / `ERR_FOREIGN_HOST_HOOKS` | 缺少有效 Antigravity 组件（含 `skills/`、`agents/`、`rules/`、`sidecars/`、`mcp_config.json`、`hooks.json` 或 `cdp`/`app.asar` 宿主增强脚本）、钩子事件非 Antigravity 生命周期事件或宿主亲和度不足 | 确保包含有效 `plugin.json`（或 `.antigravity-plugin/plugin.json`）、至少一项合法组件或宿主增强脚本及清晰的 Antigravity 文档说明 |
| `ERR_UNBUILT_SOURCE_ARCHIVE` / `ERR_UNBUNDLED_NPM_DEPS` | 未上传预构建 `.tar.gz`，且源码归档缺少已构建的 Sidebar HTML 或含未打包的 `dependencies` | 构建后打包自包含 `.tar.gz` 上传为 GitHub Release 资产 |
| `ERR_TAR_SYMLINK_FORBIDDEN` / `ERR_TAR_PATH_TRAVERSAL` | 压缩包内包含符号/硬链接、`..` 路径穿越或绝对路径 | 移除符号链接或打包时拷贝真实文件（Windows 下 Antigravity 也会跳过符号链接） |
| `ERR_SKILL_NAME_MISMATCH` / `ERR_RESERVED_SKILL_NAME` | `skills/<dir>/SKILL.md` frontmatter `name` 与目录名不一致或与内置技能重名 | 修改 frontmatter 中的 `name:` 使其与 `<dir>` 完全一致并避开内置名称 |
| `ERR_GENERIC_MCP_NAME` | `mcp_config.json` 使用了 `search`、`db`、`fetch` 等 12 个裸通用键名 | 改用带插件辨识度的服务键名（如 `myplugin_search`） |
| `ERR_NAME_COLLISION` / `ERR_RESERVED_NAME` | `plugin.json.name` 已被其他插件占用或属于内置/官方保留名 | 更换独特的 `name`（展示标题可继续写在 `displayName` 中） |
| `ERR_INSUFFICIENT_COMMITS` | 仓库实际内容提交不足 3 次（空提交不算） | 补充至少 3 次有不同树哈希的内容 Commit 并推送到默认分支 |
| `pending: repo-age` (`PENDING_REPO_AGE`) | 全部校验已通过，但仓库创建时间未满 24 小时 | **无需操作！** 等满 24 小时后 `regate.yml` 会自动复审合并（或维护者运行 `/merge`） |
| `ERR_TAG_MUTATION_BLOCKED` / `ERR_REPOJACKING_BLOCKED` | 强推覆盖了已锁定历史 SemVer Tag，或同 slug 对应的 `repositoryId` 变更 | 恢复原 Tag 并递增新版本号发布；勿删号重建冒充已有条目 |
| `PRIVILEGE_REVIEW` / `OWNERSHIP_TRANSFER_REVIEW` | 更新版本触发高危能力扩张（新增远程 MCP 域名、Patch 版新增高危能力、规则 Token 激增、高风险 Shell 或所有权转移） | 同步器自动挂起待维护者审计确认；确认安全后再解除挂起状态 |
| Fork PR 停留在 `action_required` | GitHub 对首次 Fork 贡献者默认挂起工作流 | 等待维护者在 PR 下评论 `/merge` 或通过 `merge-pr.yml` 一键触发校验合入 |

### 2. 本地一键自检命令（推荐在提 PR 前跑一遍）

> 运行环境要求：**Node.js >= 22.0.0**（零第三方 npm 依赖，无需 `npm install`）。

```bash
# ① 安装 AGY Market 客户端本地测试你的插件安装效果（零 npm 发布依赖）
npx --yes github:azwosile/agy-market add https://github.com/<你的用户名>/<插件仓库>

# ② 在 Fork 的 agy-market-catalog 目录中校验所有 data/plugins/*.yml 语法与分类
npm run validate

# ③ 检查 README 表格同步状态并运行全量单元测试
node scripts/sync-readme-tables.mjs --check
npm test

# ④ 在线模拟完整 Tier-2 门禁（不带 --write-state 为纯只读演练，不会改动本地 state/）
node scripts/check-submission.mjs data/plugins/<owner>__<repo>.yml
```

#### 离线预检你本地刚打包好的 `.tar.gz` 压缩包

甚至在发布 GitHub Release 之前，就可以直接调用目录的校验脚本离线校验你的本地归档（检查 10 字段 `plugin.json`、图标、能力徽章、自包含状态以及中英文 README 是否成功命中）：

```bash
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  import { validatePluginTarball } from './scripts/validate-plugin-tarball.mjs';
  const buf = readFileSync('/path/to/my-agy-plugin.tar.gz');
  const res = validatePluginTarball(buf, { pluginRoot: '.', requireSelfContained: true });
  console.log(JSON.stringify({
    name: res.manifest.name,
    version: res.version,
    sha256: res.sha256,
    icon: res.iconArtifact?.ext || null,
    badges: res.capabilities.badges,
    hostEnhancementKind: res.capabilities.hostEnhancementKind,
    hasReadmeZh: Boolean(res.readmeZhMarkdown),
    hasReadmeEn: Boolean(res.readmeEnMarkdown),
  }, null, 2));
"
```

---

## 🔗 相关链接

- **目录仓库主页**：[`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog)（[简体中文 README](../README.md) · [English README](../README.en.md)）
- **English Submission Guide**：[`docs/SUBMISSION_GUIDE.en.md`](./SUBMISSION_GUIDE.en.md)
- **AGY Market 客户端**：[`azwosile/agy-market`](https://github.com/azwosile/agy-market)
- **架构与安全流水线规范**：[`AGENTS.md`](../AGENTS.md)
