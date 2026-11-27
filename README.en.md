<div align="center">

# AGY Market Catalog (`agy-market-catalog`)

**Zero-Backend GitOps Plugin Registry & Automated Indexing Engine for Google Antigravity**

1-YAML Conflict-Free Submissions · Fork-Safe One-Click Maintainer `/merge` · Zero-PR Release Sync · Two-Layer Anti-Collision & Anti-RepoJacking · Always-On `PRIVILEGE_REVIEW` Guard · Lazy Per-Plugin READMEs (`dist/readmes/<id>.json`) · Tier-0 Nomination + Track-2 Multi-Source Discovery · 4-Layer Permissive Scanner

[简体中文](./README.md) · **English** · **[📖 Plugin Submission Guide](./docs/SUBMISSION_GUIDE.en.md)** · [简体中文收录教程](./docs/SUBMISSION_GUIDE.md) · [AGY Market Client](https://github.com/azwosile/agy-market) · [Architecture & CI Spec](./AGENTS.md)

</div>

---

> **🚀 Quick Start for Plugin Authors & Community**
>
> 👉 Read the complete step-by-step **[📖 Plugin Submission Guide (`docs/SUBMISSION_GUIDE.en.md`)](./docs/SUBMISSION_GUIDE.en.md)** (copy-pasteable `plugin.json`, `agy-market.json`, YAML templates, all 15 categories, packaging commands, and error code FAQ).
>
> - **Track 1 (Recommended — Curated Catalog)**: Submit **1 flat YAML PR** once → fork-safe CI validation (with **one-click Actions dispatch** or PR comment `/merge`) → **future SemVer releases sync automatically every 30m with 0 PRs**.
> - **Track 2 (Experimental — Zero-PR Multi-Source Discovery, `848+` plugins indexed)**: Add GitHub Topic `antigravity-plugin` (or ship `.antigravity-plugin/plugin.json`, `.agents/plugins/*`, etc.) → indexed every 6h with automatic `<owner>--<slug>` collision-safe isolation.
> - **Tier-0 Community Nomination (Zero-PR to Track 2)**: Submit the [Community Nomination Issue Form](./.github/ISSUE_TEMPLATE/nominate-plugin.yml) (`community-discovery` label) to immediately validate and index any public plugin repo into Track 2.
> - **Language-Agnostic & Host Enhancements Welcome**: Pure Markdown (`skills/` / `rules/` / `agents/`), Sidecar UI panels, and Python / Rust / Go / Node MCP servers require **zero npm publishing**; CDP and `app.asar` host UI enhancements are **100% welcome**.

> This repository ([`azwosile/agy-market-catalog`](https://github.com/azwosile/agy-market-catalog)) powers the zero-backend plugin registry for **[AGY Market](https://github.com/azwosile/agy-market)**.
>
> - **Active Delivery Channels**: **GitHub Pages** ([`index.json`](https://azwosile.github.io/agy-market-catalog/index.json) · [`unverified-index.json`](https://azwosile.github.io/agy-market-catalog/unverified-index.json)) and **`gh-pages` Raw fallback** ([`raw index.json`](https://raw.githubusercontent.com/azwosile/agy-market-catalog/gh-pages/index.json)).
> - **Optional Opt-In npm Mirror**: `sync-catalog.yml` includes an opt-in step (`NPM_PUBLISH_ENABLED=true` + `NPM_TOKEN`) to publish `@agy-market/catalog` as a pure-JSON transport package for npm mirrors (`registry.npmmirror.com` / Tencent Cloud). **It is currently disabled by default**; clients use GitHub Pages and `gh-pages` Raw directly.

---

## 💻 Install AGY Market Client

> Requires **Node.js >= 22.0.0** for `npx`, or use the standalone zero-npm OS installers below.

```bash
# Recommended: bootstrap directly from GitHub (no npm registry dependency)
npx --yes github:azwosile/agy-market
```

```powershell
# Windows PowerShell (no npm required, SHA-256 verified)
irm https://raw.githubusercontent.com/azwosile/agy-market/main/scripts/install.ps1 | iex
```

```sh
# macOS / Linux Shell (no npm required, SHA-256 verified)
curl -fsSL https://raw.githubusercontent.com/azwosile/agy-market/main/scripts/install.sh | sh
```

---

## 📦 Verified Catalog Entries (Track 1)

> This table is generated automatically by `scripts/sync-readme-tables.mjs` from `state/ledger.json`, `state/versions-lock.json`, and `data/plugins/*.yml`.

<!-- CATALOG-TABLE:START -->
| Catalog ID | Canonical Name | Version | GitHub Repository | Capability Badges | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a16nights__antigravity-azure-compass` | `agent-presets` | `1.4.5` | [`A16Nights/antigravity-azure-compass`](https://github.com/A16Nights/antigravity-azure-compass) | `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | Azure Compass: Agent preset hub, live global AGENTS.md editor with snapshot rollback, and context-window monitor with auto /compact dispatch and external model anti-drift guards. |
| `a16nights__antigravity-azure-corridor` | `azure-corridor` | `1.2.2` | [`A16Nights/antigravity-azure-corridor`](https://github.com/A16Nights/antigravity-azure-corridor) | `sidecar-ui`, `mcp-stdio` | Azure Corridor: 100% native Antigravity 2.35+ ConversationService and workspace manager with FTS5 full-text search, two-way groups/tags/archive sync, and cross-workspace session transfer. |
| `a16nights__antigravity-azure-orbit` | `azure-orbit` | `1.1.8` | [`A16Nights/antigravity-azure-orbit`](https://github.com/A16Nights/antigravity-azure-orbit) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`app-asar`, `cdp`) | Azure Orbit: mount external LLM APIs (DeepSeek, OpenAI, Anthropic, OpenRouter, Ollama) directly into Antigravity native model selector with hot-reload and 2.32+ to 2.35+ patch tools. |
| `a16nights__antigravity-azure-prism` | `azure-prism` | `1.3.2` | [`A16Nights/antigravity-azure-prism`](https://github.com/A16Nights/antigravity-azure-prism) | `mcp-stdio` | Azure Prism: native MCP App Chain-of-Thought viewer with native session titles, infinite history pagination, quote-to-chat interactions, and keyless zero-token or external LLM translation. |
| `a16nights__antigravity-azure-wand` | `azure-wand` | `1.3.2` | [`A16Nights/antigravity-azure-wand`](https://github.com/A16Nights/antigravity-azure-wand) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`cdp`) | Azure Wand: low-intrusion Windows desktop and web automation plugin with 26 UIA/OCR/CDP tools, a 15-state non-intrusive dynamic AI cursor, glass thought HUDs, and instant hotkeys. |
| `a16nights__antigravity-external-orchestrator` | `external-orchestrator` | `1.4.6` | [`A16Nights/antigravity-external-orchestrator`](https://github.com/A16Nights/antigravity-external-orchestrator) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | External Orchestrator: zero-dependency multi-provider LLM task router for Antigravity with custom worker profiles, fallback chains, circuit breakers, and a live sidecar console. |
| `a16nights__antigravity-lanxi-memory` | `lanxi-memory` | `1.5.3` | [`A16Nights/antigravity-lanxi-memory`](https://github.com/A16Nights/antigravity-lanxi-memory) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | Lanxi Memory: local-first 5-layer Markdown cognitive graph with SQLite CJK FTS5 search, tidal forgetting curves, hard-protection guards, and the Tidal Starfield visual workbench. |
| `a16nights__antigravity-soul-md` | `soul-md` | `2.3.8` | [`A16Nights/antigravity-soul-md`](https://github.com/A16Nights/antigravity-soul-md) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | Soul.md Studio: multi-persona card switcher, per-workspace persona binding, PreInvocation anti-drift identity anchors, and layered per-persona Markdown memory (core.md + topics/*.md). |
| `a16nights__antigravity-think-zh` | `think-zh` | `1.2.0` | [`A16Nights/antigravity-think-zh`](https://github.com/A16Nights/antigravity-think-zh) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | Think-ZH: toggle model internal reasoning language between Simplified Chinese and default English with dual-channel static rules, smart PreInvocation hooks, and live directive preview. |
| `asthestarsfalll__answer-card` | `answer-card` | `1.0.0` | [`Asthestarsfalll/answer-card`](https://github.com/Asthestarsfalll/answer-card) | `global-rules`, `mcp-stdio`, `lifecycle-hooks` | macOS always-on-top answer card for Antigravity, DSH and Zed: approve tool calls, answer agent questions and follow up on turn completion from a floating window. |
| `azwosile__agy-market` | `agy-market` | `1.7.1` | [`azwosile/agy-market`](https://github.com/azwosile/agy-market) | `sidecar-ui`, `host-enhancement` (`cdp`) | Community plugin marketplace Sidebar panel & CLI for Google Antigravity with SHA-256 archive verification, conflict checks, and one-click updates. |
| `azwosile__agy-wallpaper-prism` | `agy-wallpaper-prism` | `2.4.0` | [`azwosile/agy-wallpaper-prism`](https://github.com/azwosile/agy-wallpaper-prism) | `sidecar-ui`, `host-enhancement` (`cdp`) | Obsidian Prism glass skin and Wallpaper Engine studio for Antigravity with Floating Island layouts, dynamic accent tinting, and Ctrl+Alt+W controls. |
| `curelove__agy-anchor-wheel` | `agy-anchor-wheel` | `0.13.0` | [`Curelove/agy-anchor-wheel`](https://github.com/Curelove/agy-anchor-wheel) | `sidecar-ui`, `host-enhancement` (`cdp`) | Non-overwriting Antigravity side-pane enhancer with hold-release Bilateral Category Wheel, Tab vertical-ancestor tree, 0.25s fast previews, Obsidian backlinks, and auto-encoding repair. |
| `yuhuan-dev__antigravity-usage-monitor` | `usage-monitor` | `1.5.6` | [`yuhuan-dev/antigravity-usage-monitor`](https://github.com/yuhuan-dev/antigravity-usage-monitor) | `sidecar-ui`, `mcp-stdio`, `host-enhancement` (`cdp`) | Full-stack Antigravity monitor: live TPS/TTFT/cost, 10-category context, four-pool quota with lease reservation, subagent/Swarm isolation, trend heatmaps, project rankings, anomaly filters, xlsx export, session migration and per-model context limits. Desktop/IDE capsule, CLI statusLine and web. |
| `yukikaguraa__agy-archive-manager` | `archive-manager` | `2.3.1` | [`YukiKaguraA/agy-archive-manager`](https://github.com/YukiKaguraA/agy-archive-manager) | `sidecar-ui`, `host-enhancement` (`cdp`) | Native session & archive manager for Google Antigravity with full-text search, full-transcript preview, auto-collapse, instant archive/restore with undo, and Markdown export. |
| `yunjuanyunshu114-byte__antigravity-observer` | `gemini-neko-cockpit` | `1.4.0` | [`yunjuanyunshu114-byte/antigravity-observer`](https://github.com/yunjuanyunshu114-byte/antigravity-observer) | `sidecar-ui`, `host-enhancement` (`app-asar`) | In-app Gemini Neko companion widget and live context window, prompt-cache hit rate, and model quota observer cockpit for Antigravity 2.0. |
| `zou172866__agy-dart` | `agy-dart` | `1.9.3` | [`zou172866/Antigravity-agy-dart`](https://github.com/zou172866/Antigravity-agy-dart) | `global-rules`, `sidecar-ui`, `mcp-stdio`, `lifecycle-hooks` | All-in-one Antigravity latency accelerator, KV-cache protector, SQLite FTS5 context-window guard, and live Sidecar dashboard. |
<!-- CATALOG-TABLE:END -->

---

## 📝 Submitting a Plugin (Track-1 Single-YAML Pipeline)

> For full copy-paste templates, packaging recipes, and error code troubleshooting, see **[📖 `docs/SUBMISSION_GUIDE.en.md`](./docs/SUBMISSION_GUIDE.en.md)**.

Track 1 uses **one flat YAML file per plugin** for conflict-free concurrent Pull Requests and supports language-agnostic plugins (pure Markdown `skills/`/`rules/`/`agents/`, Sidecar panels, and Python/Rust/Go/Node MCP bundles) — **no `package.json` or npm publication required**.

### 1. Prepare Your Repository & Release
1. **Anti-Spam Cold-Start Threshold**: Repository must be **>= 1 day old (`MIN_AGE_DAYS = 1`)** with **>= 3 commits having distinct Git tree hashes (`MIN_NON_EMPTY_COMMITS = 3`)**.
2. **Native Manifest (2 Supported Paths)**: Place `plugin.json` or `.antigravity-plugin/plugin.json` at `pluginRoot` using only Antigravity's strict 10-field allowlist (`name`, `displayName`, `description`, `version`, `logo`, `author`, `homepage`, `repository`, `suggestedPrompts`, `disabled`). Any `logo` must be a relative path inside `pluginRoot` (`.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`, max **`2 MB`**, never `https://`).
3. **Release Archive & Zero Artificial Size Cap**: Publish a SemVer GitHub Release attaching a prebuilt `.tar.gz` or `.tgz` bundle (self-contained zero-build bundles may also use SemVer Git tag archives). **The 100 MB archive size gate has been removed** (`MAX_TARBALL_BYTES = 0`): CI streams archives via `inspectTarGzStream` in O(MB) RAM with a `60s` stall timeout (`TARBALL_FETCH_TIMEOUT_MS = 60_000`), supporting large self-contained bundles with local models or binaries.
4. **Optional `agy-market.json`**: Declare extra `categories`, `tags`, `screenshots`, `platforms`, custom `releaseAsset`, or `preservePaths`. For `app-asar` host-enhancement plugins, document re-running your patch script after install/update in `README.md` and list user config/custom asset globs in `preservePaths` so client updates merge and preserve them.

### 2. Add One YAML File Under `data/plugins/`
Create `data/plugins/<owner>__<repo>.yml` (or `data/plugins/<owner>__<repo>--<subpath>.yml` for monorepos; `__` unambiguously separates GitHub `owner` and `repo`):

```yaml
url: https://github.com/author/my-agy-plugin
pluginRoot: .
category: productivity
description:
  zh: 插件中文功能简介（2-240 字，直接展示在市场中文卡片中）。
  en: Concise English summary of what the plugin provides (2-300 chars).
```

> **Submission Guardrails**:
> - Max **`3`** added/modified entries per PR (`MAX_ENTRIES_PER_PR = 3`) and max **`2`** deleted entries (`MAX_DELETED_ENTRIES_PER_PR = 2`), touching only `data/plugins/*.yml`.
> - Machine-computed fields (`sha256`, `npm`, `npmMirrorPkg`, `repositoryId`, `ownerId`) are forbidden in YAML.
> - Optional `releaseAsset: my-plugin.tar.gz` overrides release asset selection.

#### Allowed Categories (15 Enum Values)

| Category ID | English Label | 中文分类名 |
| :--- | :--- | :--- |
| `monitoring-quota` | Telemetry & Quota | 状态与用量监控 |
| `context-cache` | Context & Cache Boost | 上下文与缓存加速 |
| `ui-themes` | UI, Themes & i18n | 界面美化与汉化 |
| `agents-reasoning` | Agents & Reasoning | 多代理与思考控制 |
| `developer-tools` | Git & DevTools | 开发与版本工具 |
| `mcp-integrations` | Browser & System MCP | 浏览器与系统 MCP |
| `skills-workflows` | Skills & Frameworks | 技能包与工程方法 |
| `productivity` | Workspace & Market | 效率与插件管理 |
| `data-science` | Data & Science | 数据与科学计算 |
| `cloud-devops` | Cloud & DevOps | 云原生与部署 |
| `creative-media` | Creative & Media | 设计与多媒体 |
| `writing-knowledge` | Writing & Knowledge | 写作与知识库 |
| `automation` | Automation | 定时与守护任务 |
| `security` | Security | 安全与审计 |
| `other` | Other | 其他扩展 |

### 3. Fork-Safe Admission, One-Click Maintainer Merge (`merge-pr.yml`) & Zero-PR Sync
1. **Tier 1 (`pr-check.yml`, Zero Secrets)**: Immediately validates merge-base diff limits, YAML schemas, and unit tests.
   - **First-Time Fork Contributor `action_required` Gate**: Under GitHub Actions' default security policy, `pull_request` workflows opened by first-time fork contributors stall in `action_required` awaiting UI approval, preventing `pr-gate.yml` (`workflow_run`) from firing automatically. To unblock maintainers cleanly, this repository ships **`.github/workflows/merge-pr.yml`**.
2. **Tier 2 (`pr-gate.yml`) & One-Click Maintainer Merge (`merge-pr.yml`)**:
   - **Two One-Click Entrypoints**:
     - **PR Comment Command**: Any repo `OWNER`, `MEMBER`, or `COLLABORATOR` may comment `/merge` (or `/admit`) on an open PR — with optional `--dry-run` (validate & post bilingual diagnostics without merging) or `--skip-age-check` (override the 24h `MIN_AGE_DAYS = 1` gate). Reacts with 🚀 to acknowledge.
     - **GitHub Actions `workflow_dispatch`**: Run `Maintainer One-Click Plugin PR Merge (Fork-Safe)` with `pr_number` (a single PR such as `2`, a comma-separated list such as `2,3,4`, or `all` for every open plugin PR), `dry_run`, and `skip_age_check`.
   - **100% Fork-Safe Atomic Pipeline**: Always checks out trusted `main` only (never `pull_request_target` or untrusted PR code), validates `git merge-base` diffs, extracts only `data/plugins/*.yml` via `git archive`, runs `validate-entries.mjs` + `node --test` + `check-submission.mjs`, squash-merges with `--match-head-commit`, atomically locks `state/ledger.json` + `state/versions-lock.json` on freshly rebased `origin/main` (guarded by `concurrency: catalog-state-publish` + 3-attempt retry), regenerates `README.md` / `README.en.md` tables, posts bilingual PR summaries, and deploys `gh-pages` immediately in-job.
   - Brand-new repos (`< 24h` old) that pass all static/tarball checks receive the `pending: repo-age` label with their exact UTC unlock timestamp and are auto-merged by **`regate.yml` (every 6h)**.
3. **Zero-PR Release Sync (Per-Plugin Failure Isolation)**: Once admitted, **`sync-catalog.yml` (every 30m)** polls new SemVer releases, runs always-on `PRIVILEGE_REVIEW` capability checks, isolates per-release/per-plugin validation failures (e.g., `ERR_PLUGIN_JSON_UNKNOWN_KEY`) by skipping the broken candidate and preserving the last compliant locked version (`RELEASE_VALIDATION_FAILED` / `PLUGIN_SYNC_FAILED`) so one non-compliant release never blocks other plugins, updates `dist/`, syncs README tables, and deploys `gh-pages` (plus opt-in `@agy-market/catalog` npm publishing when `NPM_PUBLISH_ENABLED=true`).

---

## 🌐 Multilingual README Extraction & Lazy Feeds

To render Simplified Chinese and English documentation out of the box inside AGY Market's Detail Drawer, `scripts/validate-plugin-tarball.mjs` and `scripts/build-catalog.mjs` extract localized READMEs alongside the default `README.md` (`64,000`-char ceiling per file):

- **Simplified Chinese (`readmeZhMarkdown`)**: Checks `pluginRoot` (then archive root) in priority order:
  1. `README.zh-CN.md` / `README_zh-CN.md` (case-insensitive)
  2. `README.zh.md` / `README_zh.md`
  3. `docs/README.zh-CN.md` / `docs/README.zh.md`
  4. Falls back to `README.md` if it contains Chinese CJK characters.
- **English (`readmeEnMarkdown`)**: Checks `README.en.md`, `README.en-US.md`, `README_en.md`, `docs/README.en.md`, or falls back to an English `README.md`.
- **Backward Compatibility (`readmeMarkdown`)**: Preserves default `README.md`.

`build-catalog.mjs` emits three complementary README artifacts:
1. **`dist/readmes/<id>.json` (Per-Plugin Lazy Feed)**: Compact `{ "id": "...", "default": "...", "zh": "...", "en": "..." }` fetched on demand by newer AGY Market clients.
2. **`dist/readmes-verified.json`**: Compact Track-1 verified README bundle.
3. **`dist/readmes.json`**: Backward-compatible full bundle (`entries`, `entriesZh`, `entriesEn`).

> **Tip for Plugin Authors**: If your default `README.md` is in English, ship **`README.zh-CN.md`** alongside it; if your default `README.md` is in Simplified Chinese, include **`README.en.md`** so the catalog indexes both languages automatically!

---

## 🔍 Track 2 Multi-Source Discovery & Tier-0 Community Nomination

### Tier-0 Community Nomination (`ingest-nomination.yml`)
Anyone can nominate a public GitHub repository for Track 2 via the **[Community Nomination Issue Form](./.github/ISSUE_TEMPLATE/nominate-plugin.yml)** (or by labeling a public issue `community-discovery`, triggered on both `opened` and `labeled`; rate-limited to 5 nominations per 24h per author, zero PII). `scripts/parse-nomination.mjs` parses `owner/repo` + optional `plugin_root` and triggers immediate static validation and `gh-pages` publication into Track 2.

### Track-2 Multi-Source Crawler (`crawl-topics.yml`, `848+` Plugins Indexed)
- **Multi-Source Discovery**: Combines **Channel A** (11 adaptive Repo Search arms + 14 `VALIDATED_CODE_SEARCH_QUERIES` code fingerprints managed by `AdaptiveRangeSlicer`, `DiscountedUcb1Cost`, and `CodeSearchPacer`), **Channel B** (5 configured aggregators/monorepos in `data/aggregators.json` + auto-promoted `state/discovered-aggregators.json`), **P1 Snowballs** (1-hop README frontier, Author GraphQL snowball, npm search bridge, topic co-occurrence miner), and **Two-Stage GraphQL** (`2A-Heartbeat`, `2A-Novel`, `2B-Inspect`).
- **3-Tier Resolution & 4 Plugin Layouts**: Resolves official Release → SemVer Tag → default-branch commit SHA (`<base>-git.<ts>.<sha7>`); scans root `plugin.json`, `.antigravity-plugin/plugin.json`, `.agents/plugins/*` (`.agent/plugins/*`), and `plugins/*` / nested subdirs (depth `1..4`).
- **Authenticity, Dedup & Scoped Symlinks**: Filters non-Antigravity repositories (`authenticity-scorer.mjs`), deduplicates forks/mirrors (`dedup-engine.mjs`), computes `ranking.score` (`quality-ranker.mjs`), excludes Track-1 `repositoryId`s, enforces **`"forceScopedInstall": true`** (`<owner>--<slug>`), and skips symlinks strictly *outside* `pluginRoot` in Track 2 (`minClientVersion: "1.6.0"`) while still hard-blocking symlinks inside or traversing `pluginRoot`.

---

## 🛡️ Two-Layer Anti-Collision, Anti-RepoJacking & Privilege Guard

Because Antigravity enforces a global flat namespace on `plugin.json.name` (silently dropping duplicate names), the catalog combines two layers of protection:

1. **Layer 1 — Central Ledger Reservation (`state/ledger.json`)**:
   - First-come-first-served preservation of clean authored short names (`<dir> === plugin.json.name`, single-hyphen kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`, `--` disallowed).
   - **Immutable Numeric ID Binding**: Locks GitHub's numeric `repositoryId` & `ownerId` to defeat RepoJacking (`REPOJACKING_BLOCKED` on slug recreation), handle same-owner renames seamlessly (e.g., `zou172866/agy-dart` → `zou172866/Antigravity-agy-dart`), and hold ownership transfers with capability expansion (`OWNERSHIP_TRANSFER_REVIEW`).
   - **Always-On Privilege Escalation Guard (`PRIVILEGE_REVIEW`)**: On every release sync (`scripts/sync-releases.mjs`), `computeCapabilityDiff` compares the new version's capabilities against the prior locked release *even without an ownership transfer*. Any `CRITICAL` expansion (new `mcpRemoteDomains`, patch bump adding `lifecycle-hooks`/`mcp-stdio`/`app-asar`, `>2x` and `+1500` `rulesEstimatedTokens` spike, or high-risk shell pipe patterns) holds the update in `PRIVILEGE_REVIEW`; `MODERATE` expansions attach `lastEscalation` metadata for client confirmation modals.
   - **Reserved Lists & Sub-Component Guards**: Blocks `BUILTIN_PLUGINS` (`swarm`, `agy-market`, `agy-market-catalog`), built-in subagents/skills, official marketplace slugs, and direct forks of `FIRST_PARTY_REPO_OWNERS` (`google`, `google-deepmind`, `antigravity-plugins-official`, `google-labs-code`, `googlecloudplatform`); emits `WARN_TYPOSQUAT_SUSPECT` on Levenshtein `== 1`, and enforces unique `claimedSkills`, `claimedAgents`, and non-generic `mcp_config.json` server keys.
2. **Layer 2 — Double-Hyphen Scoped Fallback (`<owner>--<slug>`)**:
   - GitHub usernames allow single hyphens but forbid consecutive `--`, making `<owner-lower>--<slug>` collision-free across all Track-2 installs and local client conflicts.

---

## 🔬 4-Layer Permissive Static Capability & Safety Scanner (`scripts/scan-capabilities.mjs`)

All checks run strictly via zero-execution in-memory streaming:

### Hard-Block Redlines (Genuine Supply-Chain & Exfiltration Threats Only)
1. **Tarball Traversal, Symlink Poisoning & Uncapped Streaming**: Rejects `..` path traversal, absolute paths, or symlink/hardlink entries (`typeflag` `'1'` / `'2'`). No artificial 100 MB archive size cap (`MAX_TARBALL_BYTES = 0`); `inspectTarGzStream` omits `> 4 MB` non-text binary assets from RAM with a `60s` stall timeout (`TARBALL_FETCH_TIMEOUT_MS = 60_000`).
2. **Tag / Digest Mutation (`TAG_MUTATION_BLOCKED`)**: Blocks mutating `commitSha` or `sha256` on an already-locked version in `state/versions-lock.json`.
3. **`rules/*.md` Local-File Exfiltration & Size Cap**: Blocks `@[label](path)` referencing `..`, `~/`, env vars, or absolute paths outside `<pluginRoot>`, and enforces Antigravity's `24,000`-byte per-rule ceiling (`MAX_RULE_FILE_BYTES = 24_000`).
4. **Invisible Prompt-Injection Smuggling**: Rejects Unicode Tag (`U+E0000..U+E007F`) and bidi override characters in `rules/*.md`, `skills/**/SKILL.md`, and `agents/*.md`.
5. **Icon Size Cap, Magic Bytes & Active SVG XSS/XXE**: `scripts/sanitize-icon.mjs` enforces the `2 MB` cap (`ERR_ICON_TOO_LARGE`), validates PNG/JPEG/WebP magic bytes (`ERR_ICON_MAGIC_MISMATCH`), rejects SVG `<!ENTITY>` XXE, and strips `<script>`, `foreignObject`, `javascript:`, and `on*=`.

### Permissive Capability Profiling (CDP & `app.asar` Welcomed)
Legitimate Antigravity host enhancements — including **CDP bridges** (e.g., glass/wallpaper skins) and **`resources/app.asar` patches** (e.g., in-app companion desktop widgets or standalone context/token viewers) — are **explicitly welcomed in both Track 1 and Track 2 / Tier-0 nominations** and never blocked or penalized. Standalone host-enhancement plugins without `skills/` or `sidecars/` are accepted as valid components as long as they ship a valid `plugin.json` and pass Antigravity ecosystem affinity & authenticity checks. They receive a gentle `host-enhancement` (`💡 Host UI Enhancement`) badge alongside `declarative-only`, `global-rules`, `sidecar-ui`, `mcp-stdio`, `mcp-remote`, and `lifecycle-hooks`. For `app-asar` plugins, document re-running your patch script after install/update and declare user config paths in `agy-market.json`'s `preservePaths`.

---

## 💻 Local Commands

> Requires **Node.js >= 22.0.0** (zero runtime dependencies).

```powershell
# Validate data/plugins/*.yml schemas & allowlists
npm run validate

# Check or sync Track-1 catalog tables in README.md & README.en.md
node scripts/sync-readme-tables.mjs --check
npm run sync:readme

# Build dist/{index,unverified-index,readmes,readmes-verified}.json, dist/readmes/*.json & dist/icons/*
npm run build

# Run anti-collision, RepoJacking, tar/PAX safety, workflow audit, multilingual README & scanner tests
npm test

# Manually evaluate a submission entry
node scripts/check-submission.mjs data/plugins/owner__repo.yml

# Dry-run release sync offline
node scripts/sync-releases.mjs --offline
```

---

## 📚 Guides & Architecture

- **[📖 Plugin Submission Guide (`docs/SUBMISSION_GUIDE.en.md`)](./docs/SUBMISSION_GUIDE.en.md)** · **[简体中文教程 (`docs/SUBMISSION_GUIDE.md`)](./docs/SUBMISSION_GUIDE.md)** — Full step-by-step author & maintainer tutorial, templates, and error code FAQ
- Read **[`AGENTS.md`](./AGENTS.md)** and **[`../AGENTS.md`](../AGENTS.md)** before modifying scripts, schemas, or GitHub Actions workflows.

## 📄 License

[MIT License](./LICENSE)
