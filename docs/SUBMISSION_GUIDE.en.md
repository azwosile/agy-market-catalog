# 📖 AGY Market Plugin Submission Guide

Welcome to **[AGY Market Catalog](https://github.com/azwosile/agy-market-catalog)**!

Whether you are building **pure Markdown skills & rules (`skills/` / `rules/` / `agents/`)**, **visual Sidebar panels (`sidecars/`)**, **Python / Rust / Go / Node MCP servers**, or **CDP glass skins / `app.asar` host UI enhancements**, you can publish your Google Antigravity plugin for free so global and mainland China users can discover, read localized docs, and install safely with SHA-256 verification.

> **Why Is Publishing Frictionless?**
> - **100% Language-Agnostic & Zero npm Required**: No `package.json` and no `npm publish` needed.
> - **Submit 1 Flat YAML PR Once**: After automated validation (or maintainer `/merge` one-click admission), **every future SemVer release syncs automatically every 30 minutes with 0 PRs** and deploys straight to GitHub Pages (plus `gh-pages` Raw fallback).
> - **Host UI Enhancements Explicitly Welcomed**: CDP bridges and `app.asar` workbench patches are **100% welcome in Track 1** — never blocked or penalized, only transparently labeled with a gentle `💡 Host UI Enhancement` badge.
> - **Zero-PR Discovery Tracks**: Ship straight to **Track 2** via **multi-source auto-discovery** or **Tier-0 Community Nomination Issues**.

[简体中文教程 (`docs/SUBMISSION_GUIDE.md`)](./SUBMISSION_GUIDE.md) · [简体中文 README](../README.md) · [English README](../README.en.md) · [Architecture Spec (`AGENTS.md`)](../AGENTS.md)

---

## 🧭 Three Ways to Enter the Catalog

| Dimension | Track 1: Curated Catalog (Recommended) | Track 2: Experimental Auto-Discovery | Tier-0: Community Nomination → Track 2 |
| :--- | :--- | :--- | :--- |
| **How to Submit** | Open **1 single-YAML PR** once | **Zero PRs** — add Topic `antigravity-plugin` (or match 4 plugin layouts) | Submit the [Nomination Issue Form](../.github/ISSUE_TEMPLATE/nominate-plugin.yml) (`community-discovery` label) |
| **Ongoing Updates** | **0 PRs** — auto-synced every 30m on new SemVer Releases / Tags | Auto-crawled every 6h (Release → SemVer Tag → default-branch Commit SHA) | Immediate static check into Track 2, then kept fresh by Track 2 crawler |
| **User Visibility** | **Visible by default** to all AGY Market users | Visible when user enables **"Experimental Track 2"** in Settings | Same as Track 2 (published immediately to `unverified-index.json`) |
| **Install Directory Name** | Preserves native short name (`<dir> === plugin.json.name`) | Enforces double-hyphen isolation (`<owner>--<slug>`) | Enforces double-hyphen isolation (`<owner>--<slug>`) |
| **Monorepo Subdirs** | Supported (`pluginRoot` + `--<subpath>.yml`) | All **4 layouts** supported (`.antigravity-plugin/`, `.agents/plugins/*`, `plugins/*`, root) | Supports optional `plugin_root` subpath |
| **Best For** | Stable releases wanting anti-squatting ledger protection & default visibility | Early experiments, multi-plugin repos, rapid iteration | Anyone wanting zero-CLI, zero-PR onboarding into Track 2 |

---

## 🚀 Track 1 (Recommended): Official Curated Catalog

Follow these 4 steps to submit one small YAML file and unlock lifetime zero-PR release syncing.

---

### Step 1: Prepare Your Plugin Repository & `plugin.json`

A standard Antigravity plugin repository uses the following layout (include only the directories your plugin needs; the manifest may live at `plugin.json` or `.antigravity-plugin/plugin.json`):

```text
my-agy-plugin/
├── plugin.json                        # [Required] Strict 10-field manifest (also supports .antigravity-plugin/plugin.json)
├── assets/
│   └── logo.svg                       # [Recommended] Plugin icon (relative path inside package, <= 2 MB)
├── README.md                          # [Recommended] Primary documentation
├── README.zh-CN.md                    # [Optional] Simplified Chinese README for bilingual users
├── agy-market.json                    # [Optional] Companion manifest (categories, tags, preservePaths, etc.)
├── skills/<skill-name>/SKILL.md       # [Optional] Declarative skills
├── rules/*.md                         # [Optional] Global rules (<= 24,000 bytes per file)
├── agents/*.md                        # [Optional] Custom subagents
├── sidecars/<id>/sidecar.json         # [Optional] Sidebar UI view
├── mcp_config.json                    # [Optional] Local Stdio or remote HTTPS MCP servers
└── hooks.json                         # [Optional] Lifecycle hooks
```

#### 1.1 Author `plugin.json` (Strict 10-Field Allowlist)

Antigravity silently strips unknown top-level keys, and the catalog gate strictly validates that **`plugin.json` (or `.antigravity-plugin/plugin.json`) contains ONLY the official v1 15 keys (including `$schema`, `skills`, `license`, `keywords`, `extensions`)** (any extra key triggers `ERR_PLUGIN_JSON_UNKNOWN_KEY`):

| Key | Required | Type / Constraints | Notes |
| :--- | :---: | :--- | :--- |
| `name` | **Yes** | String, `^[a-z0-9]+(-[a-z0-9]+)*$` | Lowercase single-hyphen kebab-case (**no `--`**, reserved for scoped installs; must not collide with built-in or existing Track-1 plugins) |
| `description` | **Yes** | String (1–400 chars) | Concise summary indexed by search |
| `displayName` | Recommended | String (1–80 chars) | Human-friendly UI title (supports Unicode, spaces, mixed case) |
| `version` | Recommended | SemVer string (e.g., `1.0.0`) | Semantic version (falls back to Release tag if omitted) |
| `logo` | Recommended | Relative path (`.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`) | **Never use `https://`, `/`, or `..`**; max **`2 MB`** (`ERR_ICON_TOO_LARGE`); magic-byte checked (`ERR_ICON_MAGIC_MISMATCH`); SVG scripts stripped |
| `author` | Optional | String or `{ "name": "...", "url": "https://..." }` | Author attribution |
| `homepage` | Optional | `https://...` | Project homepage or docs URL |
| `repository` | Optional | `https://...` or `{ "type": "git", "url": "https://..." }` | Source repository URL |
| `suggestedPrompts` | Optional | String array (**max 3** non-empty strings) | Quick-launch conversation prompts shown in Antigravity |
| `disabled` | Optional | Boolean (usually omitted or `false`) | Native Antigravity toggle flag |

**Copy-Pasteable `plugin.json` Template:**

```json
{
  "name": "my-agy-plugin",
  "displayName": "My AGY Plugin",
  "description": "One concise sentence describing what your plugin does for Antigravity users.",
  "version": "1.0.0",
  "logo": "assets/logo.svg",
  "author": {
    "name": "your-github-name",
    "url": "https://github.com/your-github-name"
  },
  "homepage": "https://github.com/your-github-name/my-agy-plugin",
  "repository": "https://github.com/your-github-name/my-agy-plugin",
  "suggestedPrompts": [
    "Open the My AGY Plugin sidebar panel",
    "Inspect workspace with My AGY Plugin"
  ]
}
```

#### 1.2 Localized Documentation (`README.en.md` / `README.zh-CN.md`)

When users open a plugin's Detail Drawer in AGY Market, the client fetches `dist/readmes/<id>.json` on demand (alongside `dist/readmes-verified.json` and legacy `dist/readmes.json`) and renders the preferred language (`64,000`-char ceiling per README):

1. **Simplified Chinese (`entriesZh`)**: Probes `README.zh-CN.md` / `README_zh-CN.md` → `README.zh.md` / `README_zh.md` → `docs/README.zh-CN.md` / `docs/README.zh.md` → falls back to `README.md` if it contains CJK characters.
2. **English (`entriesEn`)**: Probes `README.en.md` / `README.en-US.md` / `README_en.md` / `docs/README.en.md` → falls back to an English `README.md`.

> **Best Practice**: If your default `README.md` is in English, ship `README.zh-CN.md` beside it; if your default `README.md` is in Simplified Chinese, include `README.en.md` so both audiences get first-class documentation.

#### 1.3 Optional Companion Manifest: `agy-market.json`

Because `plugin.json` is locked to 10 keys, place an optional `agy-market.json` at `pluginRoot` (or archive root) to declare **multi-categories, search tags, `preservePaths`, supported platforms, or a custom release asset filename**. Antigravity never reads this file; only the catalog indexer and AGY Market installer consume it:

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

| Field | Description |
| :--- | :--- |
| `schemaVersion` | Must be `1` |
| `pluginRoot` | Relative plugin root inside archive (default `"."`) |
| `categories` | Multi-category array (values from the 15 allowed categories below; overrides YAML single `category`) |
| `tags` | Search keywords array |
| `screenshots` | Relative preview screenshot paths |
| `minAntigravityVersion` | Minimum compatible Antigravity version |
| `platforms` | Subset of `["win32", "darwin", "linux"]` |
| `releaseAsset` | Exact `.tar.gz` / `.tgz` filename to download from GitHub Releases |
| `preservePaths` | Safe relative paths/globs (no `..` or absolute paths) preserved across AGY Market updates — merged automatically with existing install receipts! |

#### 1.4 Best Practices for `app.asar` Patch Plugins & Preserving User Configs

If your plugin uses `app-asar` host enhancements (patching Antigravity's `resources/app.asar`):
1. **Document Patch Re-Execution Clearly in `README.md`**: Tell users explicitly to run your included patch script (e.g., `node setup.cjs`) and restart Antigravity **both after initial installation and after every AGY Market update** so new client code is re-injected cleanly. (AGY Market's post-install/update UI also surfaces a prompt with one-click folder copy and docs links.)
2. **Protect User Preferences & Custom Assets via `preservePaths`**: Whenever your plugin stores user settings (e.g., `hud_prefs.json`) or custom media (`assets/custom/**`) inside the plugin directory, declare them in `agy-market.json`'s `preservePaths` so client updates never overwrite user state.

---

### Step 2: Tag a SemVer Release & Upload Prebuilt `.tar.gz` Bundle

AGY Market downloads GitHub Release archives directly and verifies `sha256` digests — **never requiring npm or `package.json`**.

#### 2.1 Artifact Prep by Plugin Type

1. **Pure Markdown Plugins (`skills/` / `rules/` / `agents/`)**:
   - Zero build step needed; pack files directly or push a SemVer tag.
   - Check two rules:
     - `skills/<dir>/SKILL.md` frontmatter `name:` must match `<dir>` exactly (`ERR_SKILL_NAME_MISMATCH`) and must not collide with built-in Antigravity skills.
     - `rules/*.md` must not exceed **`24,000` bytes** per file, and body text outside code fences/backticks must not use `@[label](../../...)`, `~/`, absolute paths, or env vars to exfiltrate files outside `pluginRoot`.
2. **Sidebar UI Plugins (`sidecars/<id>/sidecar.json`)**:
   - **Pre-build frontend assets before packaging** so every HTML view path in `sidecar.json` (`ui_config.views[].path`, e.g., `sidecars/<id>/index.html`) exists inside the release tarball (`ERR_UNBUILT_SOURCE_ARCHIVE` otherwise).
   - If your backend relies only on Node.js `>= 22` built-in APIs, pack it directly; if it uses third-party npm runtime packages, bundle them (e.g., with esbuild/rollup) or include slim runtime artifacts in `.tar.gz` (clients **never** run `npm install`).
3. **MCP Server Plugins (`mcp_config.json` — Python / Rust / Go / Node / Remote HTTPS)**:
   - **Local Stdio MCP**: Bundle runnable scripts or precompiled binaries inside `.tar.gz` (any language supported, zero npm needed).
   - **Remote HTTPS MCP**: Specify `serverUrl` / `url` / `httpUrl` (`https://...`); the catalog surfaces target domains transparently.
   - **Avoid Generic MCP Keys**: Antigravity namespaces servers globally as `<plugin>_<server>`, and the gate blocks **12 bare generic server keys**:
     `search`, `db`, `database`, `filesystem`, `fs`, `fetch`, `http`, `git`, `shell`, `default`, `server`, `mcp`. Use distinct keys (e.g., `fast`, `context`, `myplugin_core`).

#### 2.2 Packaging & Publishing Commands

- **Recommended**: Upload a prebuilt `.tar.gz` to a stable (non-Draft, non-Pre-release) SemVer GitHub Release (single top-level wrapper folders like `my-agy-plugin-1.0.0/` are stripped automatically):

```bash
# macOS / Linux (exclude .git and node_modules, never include symlinks!)
tar --exclude='.git' --exclude='node_modules' --exclude='.DS_Store' \
  -czf my-agy-plugin.tar.gz \
  plugin.json README.md README.zh-CN.md assets skills sidecars
```

```powershell
# Windows PowerShell (built-in tar):
tar --exclude=".git" --exclude="node_modules" `
  -czf my-agy-plugin.tar.gz `
  plugin.json README.md README.zh-CN.md assets skills sidecars
```

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 my-agy-plugin.tar.gz --title "v1.0.0" --notes "Initial release"
```

- **Zero-Build Fallback**: If no `.tar.gz` asset is attached (or only a SemVer Git tag `v1.0.0` is pushed), the gate falls back to the GitHub tag archive and enforces self-contained verification (no unbuilt Sidecar HTML or unbundled `package.json` `dependencies`).

> **⚠️ Packaging Rules & Large-Bundle Streaming**:
> 1. **No Artificial 100 MB Archive Size Gate**: `MAX_TARBALL_BYTES = 0`. CI inspects tarballs via `inspectTarGzStream` in O(MB) RAM (omitting `> 4 MB` non-text binary assets from memory, with a `60s` stall timeout `TARBALL_FETCH_TIMEOUT_MS = 60_000`), supporting large bundles with local models or binaries.
> 2. **Zero Symlinks, Hardlinks, Absolute Paths, or `..` Traversal**: Any symlink/hardlink in Track 1 triggers `ERR_TAR_SYMLINK_FORBIDDEN` (Windows Antigravity silently skips symlinked plugins too).
> 3. **Immutable SemVer Tags**: Once locked in `state/versions-lock.json`, **never** force-push or re-upload modified assets to an existing tag (`TAG_MUTATION_BLOCKED`). Always bump to a new SemVer tag (e.g., `v1.0.1`).

---

### Step 3: Fork the Catalog Repo & Open a Single-YAML PR

1. Fork [`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog).
2. Add **one** `.yml` file under `data/plugins/` (`.yml` extension required, never `.yaml`):
   - **Single-plugin repo**: `data/plugins/<owner>__<repo>.yml`
   - **Monorepo sub-plugin**: `data/plugins/<owner>__<repo>--<subpath>.yml` (`pluginRoot` must not be `.`)
   - **Naming**: All lowercase; double underscore `__` separates GitHub `<owner>` and `<repo>` and must match `url`.

#### Copy-Pasteable YAML Templates

**Template A — Standard Root Plugin (`data/plugins/alice__my-agy-plugin.yml`)**

```yaml
url: https://github.com/alice/my-agy-plugin
pluginRoot: .
category: productivity
description:
  zh: 插件的简体中文功能简介（2-240 字，直接展示在 AGY Market 中文卡片上）。
  en: Concise English summary of what the plugin provides (2-300 chars).
```

**Template B — Monorepo Subdirectory + Custom Asset (`data/plugins/alice__agy-tools--prism.yml`)**

```yaml
url: https://github.com/alice/agy-tools
pluginRoot: plugins/prism
category: ui-themes
releaseAsset: prism-plugin.tar.gz
description:
  zh: 位于 Monorepo 子目录的界面美化插件简介。
  en: UI theme plugin housed inside a monorepo subdirectory.
```

> **YAML Formatting Rules**:
> - Indent strictly with **2 spaces** (**tabs forbidden**).
> - **Forbidden machine keys**: Never handwrite `sha256`, `npm`, `npmMirrorPkg`, `repositoryId`, or `ownerId` (`ERR_FORBIDDEN_HANDWRITTEN_KEY`).
> - Max **`3`** added/modified entries (`MAX_ENTRIES_PER_PR = 3`) and max **`2`** deleted entries (`MAX_DELETED_ENTRIES_PER_PR = 2`) per PR; touch **only `data/plugins/*.yml`** (`ERR_PR_PATH_FORBIDDEN`).

#### Allowed Categories (15 Enum Values)

| `category` ID | English Label | 中文分类名 | Typical Examples |
| :--- | :--- | :--- | :--- |
| `monitoring-quota` | Telemetry & Quota | 状态与用量监控 | Token/quota HUDs, context observers, latency monitors |
| `context-cache` | Context & Cache Boost | 上下文与缓存加速 | KV-cache guards, context pruning, quota savers |
| `ui-themes` | UI, Themes & i18n | 界面美化与汉化 | Glass skins, wallpaper studios, desktop widgets, UI i18n packs |
| `agents-reasoning` | Agents & Reasoning | 多代理与思考控制 | Multi-agent swarms, subagent routers, reasoning language controls |
| `developer-tools` | Git & DevTools | 开发与版本工具 | Git graphs, diffs, code search, build & diagnostic panels |
| `mcp-integrations` | Browser & System MCP | 浏览器与系统 MCP | Browser automation, hardware/DB/API MCP connectors |
| `skills-workflows` | Skills & Frameworks | 技能包与工程方法 | Declarative `SKILL.md` packs, engineering methodologies |
| `productivity` | Workspace & Market | 效率与插件管理 | Plugin managers, workspace helpers, quick launchers |
| `data-science` | Data & Science | 数据与科学计算 | Data analysis, visualization, scientific research helpers |
| `cloud-devops` | Cloud & DevOps | 云原生与部署 | Cloud deploy, Docker/K8s, CI/CD, infra tools |
| `creative-media` | Creative & Media | 设计与多媒体 | Audio/video, image generation, design systems |
| `writing-knowledge` | Writing & Knowledge | 写作与知识库 | Notes, knowledge graphs, long-form & academic writing |
| `automation` | Automation | 定时与守护任务 | Scheduled inspections, background guards, automation triggers |
| `security` | Security | 安全与审计 | Secret scanning, permission audits, compliance checks |
| `other` | Other | 其他扩展 | General-purpose extensions |

#### Open the Pull Request (GitHub Web UI or Git CLI)

- **Fastest (GitHub Web UI)**: In your fork under `data/plugins/`, click **Add file → Create new file**, name it `<owner>__<repo>.yml`, paste the YAML, commit, and click **Contribute → Open pull request** targeting `azwosile/agy-market-catalog` (`main`).
- **Git CLI**:

```bash
git clone https://github.com/<your-username>/agy-market-catalog.git
cd agy-market-catalog
git checkout -b feat/add-my-agy-plugin
# After creating data/plugins/<owner>__<repo>.yml:
npm run validate
git add data/plugins/<owner>__<repo>.yml
git commit -m "feat(catalog): add <owner>/<repo>"
git push -u origin feat/add-my-agy-plugin
```

---

### Step 4: Fork-Safe CI Gate, Maintainer One-Click Merge & 0-PR Sync

1. **Tier 1 Instant Lint (`pr-check.yml`, Zero Secrets)**:
   - Uses `git merge-base` + `admit-pr-helper.mjs parse-diff` (checking both old and new paths on `R*` renames) to verify only `data/plugins/*.yml` (`<= 3` added/modified, `<= 2` deleted) was modified, validates YAML schemas, and runs `node --test`.
   - **Why First-Time Fork PRs Pause at `action_required`**: By GitHub Actions security policy, `pull_request` workflows from first-time fork contributors pause in `action_required` awaiting maintainer approval, which prevents `pr-gate.yml` (`workflow_run`) from firing automatically. Contributors do **not** need to reopen their PR — maintainers unblock and admit them in one click via `merge-pr.yml`!
2. **Tier 2 Gate (`pr-gate.yml`) & One-Click Maintainer Merge (`merge-pr.yml`)**:
   - **Maintainer `/merge` Comment Command**: A repo `OWNER`, `MEMBER`, or `COLLABORATOR` comments `/merge` (or `/admit`) on the PR (receives 🚀 reaction). Supports `--dry-run` (validate & post bilingual diagnostics without merging) and `--skip-age-check` (explicitly override the 24h age gate).
   - **Maintainer Actions `workflow_dispatch`**: Under **Actions → Maintainer One-Click Plugin PR Merge (Fork-Safe) → Run workflow**, pass `pr_number` (single e.g. `2`, comma list e.g. `2,3,4`, or `all` for every open plugin PR) plus optional `dry_run` / `skip_age_check`.
   - **Fork-Safe Atomic Pipeline**: Checks out trusted `main` only (never `pull_request_target` or untrusted PR code), extracts only `data/plugins/*.yml` via `git archive`, checks `>= 3` distinct tree-hash commits (`MIN_NON_EMPTY_COMMITS = 3`), `>= 1` day age (`MIN_AGE_DAYS = 1`), 10-field manifest, `<= 2 MB` icon, 4-layer scanner, and ledger uniqueness; squash-merges with `--match-head-commit`, atomically commits `state/ledger.json` + `state/versions-lock.json` + synced `README.md` / `README.en.md` on freshly rebased `origin/main` (guarded by `concurrency: catalog-state-publish`), posts a bilingual summary comment, and deploys `gh-pages` directly in-job.
   - **Brand-New Repo (`< 24h`)?** If every check passes except `MIN_AGE_DAYS = 1`, CI applies **`pending: repo-age`** and comments the exact **UTC unlock timestamp**. **`regate.yml` (every 6h)** automatically re-verifies, merges, locks state, and publishes `gh-pages` once matured!
3. **Permissive Host-Enhancement Policy & 5 Hard Redlines**:
   - **CDP** and **`resources/app.asar`** enhancements are **100% allowed in both Track 1 and Track 2 / Tier-0 nominations** with a gentle `host-enhancement` badge. Standalone host-enhancement plugins without `skills/` or `sidecars/` are accepted as valid components as long as they provide a valid `plugin.json` and satisfy Antigravity ecosystem affinity checks.
   - Only genuine threats are blocked: archive `..` / absolute paths / symlinks; locked tag/digest mutation; `rules/*.md` out-of-root `@[...](..)` exfiltration or `> 24,000` bytes; invisible Unicode Tag/Bidi injection; `> 2 MB` / magic-mismatch / XXE or un-sanitizable active-script SVG icons.
4. **Post-Merge 0-PR Sync & Always-On `PRIVILEGE_REVIEW` Guard**:
   - **`sync-catalog.yml` (every 30m)** polls new SemVer releases, updates `dist/`, syncs README tables, and pushes `gh-pages` (plus opt-in `@agy-market/catalog` npm publishing only when `NPM_PUBLISH_ENABLED=true`).
   - **Always-On Capability Escalation Guard (`PRIVILEGE_REVIEW`)**: Every release update unconditionally runs `computeCapabilityDiff`. `CRITICAL` capability expansions (new `mcpRemoteDomains`, patch bump adding `lifecycle-hooks`/`mcp-stdio`/`app-asar`, `>2x` and `+1500` `rulesEstimatedTokens` spike, high-risk shell pipes, or ownership transfer + expansion) hold the update in `PRIVILEGE_REVIEW` / `OWNERSHIP_TRANSFER_REVIEW`; `MODERATE` expansions attach `lastEscalation` metadata for client confirmation modals.

---

## 🔍 Track 2 Auto-Discovery & Tier-0 Community Nomination

### Tier-0: Nominate via Issue Form (Zero CLI / Zero PR)
Anyone can nominate a public GitHub repo via **[Nominate Community Antigravity Plugin](../.github/ISSUE_TEMPLATE/nominate-plugin.yml)** (or add the `community-discovery` label to a public issue; triggers on `opened` and `labeled`, rate-limited to 5/24h per author, zero PII). `ingest-nomination.yml` validates statically and publishes straight to Track 2 `unverified-index.json` + `gh-pages`.

### Track 2: Zero-PR Multi-Source Discovery (`848+` Plugins)
1. Tag your public GitHub repo with Topic **`antigravity-plugin`** (or use `.antigravity-plugin/plugin.json`, `.agents/plugins/*`, `plugins/*`, or supported community aggregators in `data/aggregators.json`).
2. Ensure valid Antigravity components (`skills/`, `sidecars/`, `mcp_config.json`, `rules/`, or valid `hooks.json`). Official SemVer Releases and Tags are preferred, with automatic default-branch commit SHA fallback (`<base>-git.<ts>.<sha7>`).
3. **`crawl-topics.yml` (every 6h)** deduplicates against Track 1 `repositoryId`s, safely skips symlinks strictly *outside* `pluginRoot` in Track 2 (`minClientVersion: "1.6.0"`), and enforces **`"forceScopedInstall": true`** (`<owner>--<slug>`). Upgrade to Track 1 anytime by opening 1 YAML PR!

---

## 🧰 FAQ, Error Codes & Local Pre-Flight Checks

### 1. Common Error Codes & Labels

| Code / Label | Cause | Resolution |
| :--- | :--- | :--- |
| `ERR_ENTRY_FILENAME` / `ERR_EXTENSION_MUST_BE_YML` | Wrong filename pattern or `.yaml` suffix | Use lowercase `data/plugins/<owner>__<repo>.yml` (double underscore `__`) |
| `ERR_SLUG_URL_MISMATCH` | Filename `<owner>__<repo>` differs from `url` | Match `<owner>` and `<repo>` in filename (lowercase) to `url` |
| `ERR_PR_PATH_FORBIDDEN` / `ERR_PR_SYMLINK_FORBIDDEN` / `ERR_PR_TOO_MANY_ENTRIES` | PR modified files outside `data/plugins/*.yml`, committed a symlink entry, or touched > 3 entries | Revert unrelated edits, keep `data/plugins/*.yml` as regular files (never symlinks), and keep `<= 3` entries |
| `ERR_FORBIDDEN_HANDWRITTEN_KEY` | Handwrote `sha256`, `npm`, `npmMirrorPkg`, `repositoryId`, `ownerId` | Remove machine-computed keys |
| `ERR_PLUGIN_JSON_UNKNOWN_KEY` | `plugin.json` contains unknown keys outside the official v1 15-field allowlist | Move extra metadata into `agy-market.json`; during post-merge sync, non-compliant new releases are isolated and skipped (`RELEASE_VALIDATION_FAILED`) while keeping the previous compliant version live |
| `ERR_PLUGIN_JSON_LOGO_PATH` / `ERR_MISSING_LOGO_FILE` | `logo` uses `https://`, `/`, or `..`, or file missing in tarball | Place icon inside `pluginRoot` (e.g., `assets/logo.svg`) and use a relative path |
| `ERR_ICON_TOO_LARGE` / `ERR_ICON_MAGIC_MISMATCH` | Logo > `2 MB`, invalid PNG/JPEG/WebP header, or SVG XXE/XSS | Compress icon `<= 2 MB`, ensure valid image magic bytes / clean SVG |
| `ERR_NOT_ANTIGRAVITY_PLUGIN` / `ERR_FOREIGN_HOST_HOOKS` | Missing Antigravity components (`skills/`, `agents/`, `rules/`, `sidecars/`, `mcp_config.json`, `hooks.json`, or `cdp`/`app.asar` host-enhancement scripts), non-Antigravity `hooks.json` events, or low affinity | Include valid `plugin.json` (or `.antigravity-plugin/plugin.json`), at least one valid component or host-enhancement script, and clear Antigravity documentation |
| `ERR_UNBUILT_SOURCE_ARCHIVE` / `ERR_UNBUNDLED_NPM_DEPS` | Source archive lacks built Sidecar HTML or has unbundled `dependencies` | Build locally/in CI and upload a self-contained `.tar.gz` Release asset |
| `ERR_TAR_SYMLINK_FORBIDDEN` / `ERR_TAR_PATH_TRAVERSAL` | Archive contains symlinks, hardlinks, `..`, or absolute paths | Remove links and pack real files cleanly |
| `ERR_SKILL_NAME_MISMATCH` / `ERR_RESERVED_SKILL_NAME` | `skills/<dir>/SKILL.md` frontmatter `name` mismatches `<dir>` or collides with built-in | Match frontmatter `name:` to `<dir>` and avoid built-in skill names |
| `ERR_GENERIC_MCP_NAME` | `mcp_config.json` uses one of the 12 generic keys (`search`, `db`, `fetch`, etc.) | Prefix server key (e.g., `myplugin_search`) |
| `ERR_NAME_COLLISION` / `ERR_RESERVED_NAME` | `plugin.json.name` already claimed or reserved | Choose a unique kebab-case `name` (keep display title in `displayName`) |
| `ERR_INSUFFICIENT_COMMITS` | Fewer than 3 distinct Git tree-hash commits on default branch | Push >= 3 non-empty commits |
| `pending: repo-age` (`PENDING_REPO_AGE`) | All checks passed, repo younger than 24h | **Wait** — `regate.yml` auto-merges every 6h after unlock (or maintainer `/merge`) |
| `ERR_TAG_MUTATION_BLOCKED` / `ERR_REPOJACKING_BLOCKED` | Force-pushed locked tag/asset or `repositoryId` changed for same slug | Restore original tag and bump SemVer (e.g., `v1.0.1`) |
| `PRIVILEGE_REVIEW` / `OWNERSHIP_TRANSFER_REVIEW` | Critical capability escalation or owner transfer with expansion detected on update | Held automatically for maintainer review before publishing |
| PR stalled on `action_required` | GitHub first-time fork contributor workflow approval gate | Maintainer comments `/merge` or dispatches `merge-pr.yml` |

### 2. Local Pre-Flight Commands

> Requires **Node.js >= 22.0.0** (zero third-party npm dependencies; no `npm install` needed).

```bash
# 1. Test installing your plugin locally via AGY Market CLI (no npm registry required)
npx --yes github:azwosile/agy-market add https://github.com/<owner>/<repo>

# 2. In your forked agy-market-catalog directory, validate all data/plugins/*.yml files
npm run validate

# 3. Check README table sync and run the full unit test suite
node scripts/sync-readme-tables.mjs --check
npm test

# 4. Run a read-only Tier-2 check against your YAML (does not modify local state/)
node scripts/check-submission.mjs data/plugins/<owner>__<repo>.yml
```

#### Inspect a Local `.tar.gz` Bundle Offline Before Publishing

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

## 🔗 Related Links

- **Catalog Repository**: [`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog) ([English README](../README.en.md) · [简体中文 README](../README.md))
- **简体中文收录教程**: [`docs/SUBMISSION_GUIDE.md`](./SUBMISSION_GUIDE.md)
- **AGY Market Client**: [`azwosile/agy-market`](https://github.com/azwosile/agy-market)
- **Architecture & Security Spec**: [`AGENTS.md`](../AGENTS.md)
