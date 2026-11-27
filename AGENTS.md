# AGY Market Catalog — GitOps Auto-Collection & Anti-Collision Specification (`agy-market-catalog/AGENTS.md`)

> **Repository**: `agy-market-catalog` (Zero-backend GitOps plugin registry, fork-safe PR admission & one-click maintainer merge Action, batched GraphQL release crawler, Tier-0 nomination ingestion, Track-2 multi-source discovery crawler, and optional `@agy-market/catalog` npm mirror data package)  
> **Cross-Repo Contracts**: Read [`../AGENTS.md`](../AGENTS.md) for canonical JSON schemas (`index.json`, `unverified-index.json`, `ledger.json`, `versions-lock.json`, `agy-market.json`).  
> **Security Invariant**: CI workflows in this repository MUST NEVER execute untrusted plugin code, `npm install` scripts, or PR branch code with repository secrets. All tarball inspection and capability profiling are strictly streaming/static.

---

## 1. Repository Layout

```text
agy-market-catalog/
├── AGENTS.md                        # Catalog pipeline, anti-collision & CI security rules (this file)
├── README.md                        # Simplified Chinese overview (Track-1 table auto-synced via markers)
├── README.en.md                     # English overview (Track-1 table auto-synced via markers)
├── LICENSE                          # MIT License
├── package.json                     # ESM scripts ("@agy-market/catalog" data publishing, sync:readme & node --test)
├── docs/
│   ├── SUBMISSION_GUIDE.md          # Complete Simplified Chinese author & maintainer submission guide
│   └── SUBMISSION_GUIDE.en.md       # Complete English parity submission guide
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── nominate-plugin.yml      # Tier-0 zero-PR community nomination form (`community-discovery`)
│   └── workflows/
│       ├── pr-check.yml             # Tier-1 PR lint (pull_request, 0 secrets, merge-base parse-diff)
│       ├── pr-gate.yml              # Tier-2 PR admission & auto-merge (workflow_run + git archive + gh-pages)
│       ├── merge-pr.yml             # Maintainer one-click PR merge (workflow_dispatch + /merge|/admit comment)
│       ├── regate.yml               # Every 6h: re-evaluates `pending: repo-age` PRs, merges & deploys gh-pages
│       ├── sync-catalog.yml         # Every 30m: GraphQL release sync, README sync, gh-pages & opt-in npm publish
│       ├── crawl-topics.yml         # Every 6h: Track-2 multi-source & aggregator crawler -> unverified-index.json
│       └── ingest-nomination.yml    # Tier-0: issue [opened, labeled] (`community-discovery`) -> Track-2 ingest
├── data/
│   ├── aggregators.json             # Declarative Track-2 Channel-B awesome-lists, JSON indexes & monorepos
│   └── plugins/                     # 1 flat YAML file per Track-1 plugin: <owner>__<repo>[--<subpath>].yml
├── schemas/
│   ├── submission-entry.schema.json # Track-1 YAML schema (category enum enforced by validate-entries.mjs)
│   ├── plugin-manifest.schema.json  # Official v1 15-field Antigravity native plugin.json JSON Schema
│   └── agy-market.schema.json       # Optional agy-market.json companion manifest schema v1
├── scripts/
│   ├── validate-entries.mjs         # Validates YAML syntax, slug format, 15 ALLOWED_CATEGORIES & PR diff limits
│   ├── check-submission.mjs         # Verifies repo age/commits, numeric IDs, release tarball, ledger & --json-summary
│   ├── admit-pr-helper.mjs          # Pure helper CLI: parse-diff (R*/C*), authorize-comment & bilingual format-comment
│   ├── sync-readme-tables.mjs       # Deterministic Track-1 table generator (`<!-- CATALOG-TABLE:START/END -->`)
│   ├── parse-nomination.mjs         # Pure parser & CLI for Tier-0 `community-discovery` nomination issues
│   ├── validate-plugin-tarball.mjs  # Validates plugin.json / .antigravity-plugin/plugin.json, companion, READMEs & safety
│   ├── scan-capabilities.mjs        # 4-layer static capability & safety scanner (permissive CDP/asar policy)
│   ├── sanitize-icon.mjs            # Enforces 2 MB icon cap, PNG/JPEG/WebP magic bytes & strips SVG XSS/XXE
│   ├── sync-releases.mjs            # Batched GraphQL release poller + always-on PRIVILEGE_REVIEW + versions-lock.json
│   ├── crawl-topics.mjs             # Multi-source + adaptive Track-2 crawler -> unverified-cache.json & lazy readmes
│   ├── probe-npm.mjs                # Optional bidirectional npm mirror verification (anti-squatting)
│   ├── build-catalog.mjs            # Compiles dist/{index,unverified-index,readmes,readmes-verified}.json, readmes/<id>.json & icons/*
│   ├── publish-catalog-npm.mjs      # Opt-in OIDC publisher for @agy-market/catalog (`NPM_PUBLISH_ENABLED=true`)
│   └── lib/
│       ├── constants.mjs            # Limits, allowlists, reserved denylists, SemVer, JSONC & strict YAML parser
│       ├── tar-stream.mjs           # Zero-dep streaming tar.gz/PAX parser (0 size limit, >4 MB non-text RAM omit)
│       ├── discovery-sources.mjs    # 11 Channel-A base queries, Channel-B aggregators, 4-layout & 3-tier resolvers
│       ├── adaptive-discovery.mjs   # AdaptiveRangeSlicer, DiscountedUcb1Cost, 14 Code Search fingerprints, P1 snowballs
│       ├── graphql-batch.mjs        # Stage 2A-Heartbeat/Novel, Stage 2B-Inspect, Author snowball & Track-1 GraphQL
│       ├── authenticity-scorer.mjs  # Log-odds P(AGY | x) classifier & foreign-host / template-stub vetoes
│       ├── dedup-engine.mjs         # 3-layer functional content hash, fork divergence & 32-int MinHash dedup
│       ├── quality-ranker.mjs       # Calibrated [0, 100] Q(p) score, monorepo slot dampening & computeCapabilityDiff
│       └── taxonomy-classifier.mjs  # Curated taxonomy overrides + v2 classifier + bilingual README summary extractor
├── state/
│   ├── ledger.json                  # Authoritative canonicalName + repositoryId/ownerId claim ledger
│   ├── versions-lock.json           # Append-only release tag + 40-hex commitSha + tarball sha256 lockfile
│   ├── unverified-cache.json        # Persisted Track-2 plugin index cache
│   ├── crawl-negative-cache.json    # Activity-aware negative backoff cache for Track-2 candidates
│   └── icons/                       # Sanitized Track-1 & Track-2 icon artifacts copied into dist/icons/
└── test/
    ├── catalog.test.mjs             # Core admission, RepoJacking, tar/PAX safety, multilingual README & scanner tests
    ├── graphql-discovery.test.mjs   # GraphQL batching, adaptive discovery, 4-layout & nomination parser tests
    ├── merge-pr-workflow.test.mjs   # All 7 workflows LF/BOM/YAML/fork-safety, admit-pr-helper, sync-readme & CLI tests
    ├── pipeline-wiring.test.mjs     # End-to-end build, lazy readmes/<id>.json, PRIVILEGE_REVIEW & eviction tests
    └── scoring-dedup-ranking.test.mjs # Authenticity, 3-layer dedup, ranking & taxonomy v2 unit tests
```

---

## 2. Conflict-Free Submission Schema (Track 1)

1. **One Flat YAML Per Plugin**:
   - Path: `data/plugins/<owner>__<repo>.yml` (or `data/plugins/<owner>__<repo>--<subpath-with-dashes>.yml` when a monorepo houses multiple Antigravity plugins).
   - Why `__` (double underscore): GitHub usernames cannot contain `_`, so splitting on the first `__` recovers `<owner>` and `<repo>` unambiguously.
   - `README.md` and `README.en.md` Track-1 tables are regenerated **only post-merge on `main`** by `scripts/sync-readme-tables.mjs` (between `<!-- CATALOG-TABLE:START -->` and `<!-- CATALOG-TABLE:END -->`), guaranteeing **zero merge conflicts** across concurrent PRs.
2. **PR Size Cap & Allowed Keys**:
   - **`MAX_ENTRIES_PER_PR = 3`** added/modified; **`MAX_DELETED_ENTRIES_PER_PR = 2`** deleted.
   - Allowed YAML keys: `url` (required `https://github.com/<owner>/<repo>`), `pluginRoot` (optional relative path, default `"."`), `category` (required; validated against the 15 `ALLOWED_CATEGORIES` in `validate-entries.mjs` — note `schemas/submission-entry.schema.json` declares `category` as `type: string`), `description` (`{ zh, en }`), `releaseAsset` (optional `.tar.gz`/`.tgz` filename override).
   - **No Handwritten Machine Keys**: `sha256`, `npm`, `npmMirrorPkg`, `repositoryId`, and `ownerId` are rejected with `ERR_FORBIDDEN_HANDWRITTEN_KEY`.

---

## 3. Fork-Safe Admission, One-Click Merge & Tier-0 Nomination Workflows

All state-mutating workflows (`pr-gate.yml`, `merge-pr.yml`, `regate.yml`, `sync-catalog.yml`, `crawl-topics.yml`, `ingest-nomination.yml`) share **`concurrency: { group: catalog-state-publish, cancel-in-progress: false }`**, never use `pull_request_target`, and enforce pure LF (`\n`) with zero UTF-8 BOM.

### 3.1 Tier 1 — `pr-check.yml` (`on: pull_request`, Zero Secrets)
Runs on PRs touching `data/plugins/**`, `scripts/**`, `schemas/**`, or `test/**` with `permissions: contents: read` (`timeout-minutes: 10`):
- Computes `git merge-base "$BASE_SHA" "$HEAD_SHA"` diff and passes it to `node scripts/admit-pr-helper.mjs parse-diff` (handling `R*` rename old/new paths and `C*` copy paths before calling `validatePrDiffLimits`).
- Runs `node scripts/validate-entries.mjs` and `node --test test/*.test.mjs`.
- **GitHub `action_required` Limitation**: First-time fork contributors' `pull_request` runs stall in `action_required` awaiting maintainer approval in the GitHub UI, preventing `pr-gate.yml` (`workflow_run`) from firing automatically.

### 3.2 Tier 2 — `pr-gate.yml` (`on: workflow_run` of Tier 1, Trusted `main`)
1. Checks out trusted `main` only; verifies PR is `OPEN`, targets `main`, and matches live `headRefOid`.
2. Computes `git merge-base` diff (`admit-pr-helper.mjs parse-diff`) and extracts **only** `data/plugins/*.yml` via `git archive "$PR_HEAD_SHA"`, verifying `[ -L ... ] || [ ! -f ... ]` (`ERR_PR_SYMLINK_FORBIDDEN` blocks symlinks/non-regular entries) before `cp -P`.
3. Runs `validate-entries.mjs`, `node --test test/*.test.mjs`, and `node scripts/check-submission.mjs --json-summary ...` (read-only evaluation):
   - **Repository Liveness & Origin**: Exists (`200 OK`), `archived === false`, `disabled === false`, and not a direct fork of `FIRST_PARTY_REPO_OWNERS`.
   - **Cold-Start Anti-Spam Gate (`MIN_AGE_DAYS = 1` + `MIN_NON_EMPTY_COMMITS = 3`)**: Requires `>= 3` commits with distinct root `commit.tree.sha` hashes and `created_at` age `>= 86_400_000 ms`. If all checks pass except `MIN_AGE_DAYS`, applies `pending: repo-age`, posts bilingual UTC unlock comment (`admit-pr-helper.mjs format-comment --mode pending-age`), and exits `0`.
   - **Manifest & Tarball Streaming Check**: Supports both `<pluginRoot>/plugin.json` and `<pluginRoot>/.antigravity-plugin/plugin.json` (official v1 15-field allowlist incl. `$schema`, `skills`, `license`, `keywords`, `extensions`; `logo` relative path `<= 2 MB`), optional `agy-market.json`, zero artificial archive size cap (`MAX_TARBALL_BYTES = 0`, `> 4 MB` non-text binary assets omitted from RAM in `inspectTarGzStream`, `60s` stall timeout `TARBALL_FETCH_TIMEOUT_MS = 60_000`).
4. **Conflict-Safe Lock & Publish Ordering**: Never snapshots `state/` before merging! Runs `gh pr merge "$PR_NUM" --squash --match-head-commit "$PR_HEAD_SHA"`, then in a 3-attempt `git fetch origin main && git reset --hard origin/main` loop runs `check-submission.mjs --write-state` + `sync-readme-tables.mjs --write`, commits `state/` + `README.md` + `README.en.md`, pushes `main`, posts bilingual admission comment (`--mode approved`), and deploys `dist/*` directly to `gh-pages` in-job (bypassing `GITHUB_TOKEN` push-trigger suppression).

### 3.3 Maintainer One-Click Merge — `merge-pr.yml` (`workflow_dispatch` + `issue_comment`)
Designed specifically to unblock first-time fork PRs without ever running untrusted PR code:
- **Triggers**:
  1. `workflow_dispatch`: `pr_number` (single number e.g. `2`, comma-separated e.g. `2,3,4`, or `all` for every open PR touching `data/plugins/*.yml`), `dry_run` (boolean), `skip_age_check` (boolean maintainer override passing `--allow-pending-age` to `check-submission.mjs`).
  2. `issue_comment` (`types: [created]`): Strictly gated by `github.event.issue.pull_request != null`, `author_association` in `["OWNER", "MEMBER", "COLLABORATOR"]`, and `admit-pr-helper.mjs authorize-comment` matching `^\/(?:merge|admit)(?:\s+(--dry-run|--skip-age-check))*$`. Adds a 🚀 reaction on authorized commands.
- Executes the identical trusted `main` checkout, `git merge-base` `parse-diff`, `git archive` extraction of `data/plugins/*.yml` with `ERR_PR_SYMLINK_FORBIDDEN` regular-file check (`cp -P`), Tier-1 + Tier-2 validation (`--json-summary`), `--match-head-commit` squash-merge, 3-attempt reset + `--write-state` + `sync-readme-tables.mjs --write` lock loop, bilingual PR comment, and in-job `gh-pages` deployment.

### 3.4 Scheduled Re-Gate — `regate.yml` (`15 */6 * * *` + `workflow_dispatch`)
Lists open PRs labeled `pending: repo-age` (`mapfile -t PR_NUMS`, no pipe subshell), re-evaluates each PR safely via `git archive` + `check-submission.mjs --json-summary`, squash-merges matured PRs with `--match-head-commit`, atomically writes state + README tables, removes `pending: repo-age`, posts bilingual outcome comments, and deploys `gh-pages`.

### 3.5 Tier-0 Community Nomination — `ingest-nomination.yml` (`issues: [opened, labeled]`)
- Triggered when an open issue carries the `community-discovery` label (via `.github/ISSUE_TEMPLATE/nominate-plugin.yml` or manual labeling).
- Enforces a 5 nominations / 24h per-author rate limit.
- Runs `scripts/parse-nomination.mjs` (`parseSafeGitHubCandidateUrl` + optional `plugin_root`), executes `node scripts/crawl-topics.mjs --repos="$TARGET_ARG" --no-neg-cache --seed-readmes-dir=... --out-readmes-dir=dist/readmes` + `build-catalog.mjs`, commits `state/`, deploys `gh-pages`, comments outcome, and closes the issue.

---

## 4. Authoritative Anti-Collision & Anti-RepoJacking Ledger (`state/ledger.json`)

1. **Global `canonicalName` Uniqueness**:
   - In Track 1, `canonicalName` MUST equal `plugin.json.name` (`^[a-z0-9]+(-[a-z0-9]+)*$`, single hyphens only; `--` is reserved for Layer-2 scoped installs).
2. **Reserved System & Official Denylist + Typosquatting Guard (`scripts/lib/constants.mjs`)**:
   - `BUILTIN_PLUGINS`: **`swarm`**, **`agy-market`**, **`agy-market-catalog`** (`agy-market` is exempted only when `fullRepoLower === 'azwosile/agy-market'`).
   - `BUILTIN_AGENTS`: `self`, `browser`, `research`, `deepagent`, `review-agent`, `image-generator`.
   - `BUILTIN_SKILLS`: `plugin`, `agy-customizations`, `antigravity-guide`, `automation`, `generative_ui`, `mcp-app-development`, `migrate-agent-settings`, `migrate-workflows`, `run-workflow`, `swarm_monitor`, `swarm_pane`, `ui-plugin-navigation`.
   - `OFFICIAL_MARKETPLACE_SLUGS`: 23 reserved official Agent Marketplace slugs (`gdocs`, `gsheets`, `gslides`, `gdrive`, `gcal`, `gmail`, `gemini-api`, `chrome-devtools-plugin`, `android-cli-plugin`, `canva`, `figma`, `science-overview`, `genomics`, `atlassian-twg-cli`, `clickup`, `cloudflare`, `netlify`, `arize-skills`, `auth0`, `zoho-bigin`, `databricks`, `looker`, `n8n-skills`).
   - `FIRST_PARTY_REPO_OWNERS`: `google`, `google-deepmind`, `antigravity-plugins-official`, `google-labs-code`, `googlecloudplatform` (direct forks rejected with `ERR_FIRST_PARTY_FORK`).
   - Flags Levenshtein distance `== 1` against existing active canonical names (`WARN_TYPOSQUAT_SUSPECT`).
3. **Sub-Component Collision Checks**:
   - `skills/<skill>/SKILL.md` frontmatter `name` must equal `<skill>` and not collide with `BUILTIN_SKILLS` or other Track-1 `claimedSkills`.
   - `agents/<agent>.md` must not collide with `BUILTIN_AGENTS` or other Track-1 `claimedAgents`.
   - `mcp_config.json` server keys must avoid `GENERIC_MCP_SERVER_NAMES` (`search`, `db`, `database`, `filesystem`, `fs`, `fetch`, `http`, `git`, `shell`, `default`, `server`, `mcp`).
4. **Immutable Numeric GitHub ID Binding & Always-On `PRIVILEGE_REVIEW`**:
   - **Case A (`repositoryId` changed at old `owner/repo` URL)**: Hard-block **`REPOJACKING_BLOCKED`**, freeze last safe version.
   - **Case B (`repositoryId` unchanged, `repo.full_name` renamed under same `ownerId`)**: Seamlessly migrate `repoFullName` (e.g., `zou172866/agy-dart` -> `zou172866/Antigravity-agy-dart`).
   - **Case C (`repositoryId` unchanged, `ownerId` changed with capability expansion)**: Hold in **`OWNERSHIP_TRANSFER_REVIEW`** and attach `lastEscalation`.
   - **Always-On Capability Escalation Guard (`sync-releases.mjs` + `computeCapabilityDiff`)**: Runs unconditionally on **every** release update (even when `ownerId` has not changed). `CRITICAL` expansions (new `mcpRemoteDomains`, patch bump adding `lifecycle-hooks`/`mcp-stdio`/`app-asar`, `rulesEstimatedTokens` delta `> 1500` & ratio `> 2.0`, or high-risk shell pipes) transition status to **`PRIVILEGE_REVIEW`** and halt version publication; `MODERATE` expansions (`ESCALATION_MODAL`) allow release sync while attaching `lastEscalation` metadata to both ledger and lockfile entries.

---

## 5. Multi-Track Crawlers, Artifact Split & Delivery Status

### 5.1 Track-1 Zero-PR Release Sync (`sync-catalog.yml`, Every 30 Minutes)
- Batch-queries registered `repositoryId`s via **GitHub GraphQL API** (`nodes(ids: [...])` + REST fallback), enforces `TAG_MUTATION_BLOCKED` on locked tags, isolates per-release validation errors (`RELEASE_VALIDATION_FAILED:<canonicalName>@<tagName>:<reason>`, preserving the last locked compliant version) and per-plugin unexpected sync errors (`PLUGIN_SYNC_FAILED:<entrySlug>:<canonicalName>:<reason>`) so one broken upstream release never blocks remaining plugins, streams new release tarballs (`60s` stall timeout, 0 artificial size cap), executes `computeCapabilityDiff` (`PRIVILEGE_REVIEW` / `ESCALATION_MODAL`), prunes historical README blobs from non-latest lock entries (`stripHistoricalLockReadmes`), runs `build-catalog.mjs --seed-readmes-dir=... --gc-icons`, runs `sync-readme-tables.mjs --write`, pushes `state/` + `README.md` + `README.en.md` with 3x rebase retry, and deploys `gh-pages`.

### 5.2 Track-2 Multi-Source Discovery Crawler (`crawl-topics.yml`, Every 6 Hours)
- **Channel A (Search & Adaptive Scheduling)**: 11 `CHANNEL_A_ADAPTIVE_BASE_QUERIES` Repo Search arms scheduled via `AdaptiveRangeSlicer` + `DiscountedUcb1Cost` and 14 `VALIDATED_CODE_SEARCH_QUERIES` fingerprints (Tier S1/S2) paced by `CodeSearchPacer` with `<= 250`-char `-repo:` exclusions.
- **Channel B (Aggregators & Monorepos)**: Configured sources in `data/aggregators.json` plus auto-promoted `state/discovered-aggregators.json`.
- **P1 Snowballs & Two-Stage GraphQL**: 1-hop README frontier, Author-centric GraphQL snowball, npm search bridge, Topic co-occurrence miner, and batched GraphQL `Stage 2A-Heartbeat` (`B=50`), `Stage 2A-Novel` (`B=20`), and `Stage 2B-Inspect` (`B=20`).
- **3-Tier Snapshot & 4-Layout Support**: Resolves Release → SemVer Tag → default-branch commit SHA (`<base>-git.<ts>.<sha7>`); detects root `plugin.json`, `.antigravity-plugin/plugin.json`, `.agents/plugins/*` (`.agent/plugins/*`), and `plugins/*` / subdirs (depth `1..4`).
- **Filtering, Ranking & Track-2 Symlink Policy**: Applies `authenticity-scorer.mjs`, `dedup-engine.mjs`, `taxonomy-classifier.mjs` v2, and `quality-ranker.mjs`, excludes Track-1 `repositoryId`s, enforces `"forceScopedInstall": true` (`<owner>--<slug>`), and allows skipping strictly *external* symlinks outside `pluginRoot` (`minClientVersion: "1.6.0"`).

### 5.3 Static Artifacts & Delivery Channels (`build-catalog.mjs` + `publish-catalog-npm.mjs`)
- **`build-catalog.mjs` Outputs**:
  - `dist/index.json` (Track-1 verified plugins w/ calibrated `ranking`)
  - `dist/unverified-index.json` (Track-2 experimental plugins w/ calibrated `ranking`)
  - `dist/readmes/<id>.json` (lazy per-plugin `{ id, default, zh, en }`)
  - `dist/readmes-verified.json` (compact Track-1 README bundle)
  - `dist/readmes.json` (backward-compatible full `entries`, `entriesZh`, `entriesEn` bundle)
  - `dist/icons/*` (sanitized icons, with `--gc-icons` orphan cleanup)
- **Active Delivery (`GitHub Pages` + `gh-pages` Raw)**: `merge-pr.yml`, `pr-gate.yml`, `regate.yml`, `sync-catalog.yml`, `crawl-topics.yml`, and `ingest-nomination.yml` all deploy `dist/*` directly to the `gh-pages` branch.
- **Opt-In npm Mirror (`NPM_PUBLISH_ENABLED`)**: `sync-catalog.yml` runs `scripts/publish-catalog-npm.mjs` (`--provenance`, using `state/last-npm-hash.txt`) **only when `env.NPM_PUBLISH_ENABLED == 'true'`** (currently disabled by default; do not document `@agy-market/catalog` on npm/npmmirror/Tencent Cloud as active unless enabled).
- **Optional `probe-npm.mjs` Anti-Squatting Check**: Only when a plugin bundle includes `package.json` on npm AND `registry.npmjs.org/<pkg>.latest.repository` points back to the verified `owner/repo`, populates `distribution.npmMirrorPkg`.

---

## 6. Four-Layer Static Capability & Safety Scanner (`scripts/scan-capabilities.mjs`)

### 6.1 Hard-Block Redlines (Genuine Supply-Chain / Exfiltration Attacks Only)
1. **Archive Traversal / Symlink Poisoning**: Tarball contains `..` path segments, absolute paths, or symlink/hardlink entries (`typeflag` `'1'` or `'2'`; Track 2 skips only links strictly outside `pluginRoot`). Zero artificial archive size limit (`MAX_TARBALL_BYTES = 0`).
2. **Tag / Digest Mutation (`TAG_MUTATION_BLOCKED`)**: Mutating `commitSha` or `sha256` on an already-locked `gitTag`.
3. **Rules Local-File Exfiltration & Size Cap**: Blocks `@[label](path)` in `rules/*.md` referencing `..`, `~/`, env vars, or absolute paths outside `<pluginRoot>`, and enforces `MAX_RULE_FILE_BYTES = 24_000`.
4. **Invisible Prompt-Injection Smuggling**: Blocks Unicode Tag (`U+E0000..U+E007F`) and bidi override characters in `rules/*.md`, `skills/**/SKILL.md`, and `agents/*.md`.
5. **Icon Size Cap, Magic Bytes & Active SVG XSS/XXE**: `sanitize-icon.mjs` enforces `<= 2 MB` (`ERR_ICON_TOO_LARGE`), PNG/JPEG/WebP magic-byte checks (`ERR_ICON_MAGIC_MISMATCH`), rejects SVG `<!ENTITY>` (`ERR_ICON_SVG_XXE`), and strips `<script>`, `foreignObject`, `javascript:`, and `on*=`.

### 6.2 Permissive Capability Profiling (Including `CDP` & `app.asar`)
Legitimate Antigravity extensions — including **CDP bridges** and **`resources/app.asar` modifications** — are **permitted** and profiled transparently into `capabilities`:
- **`declarative-only`**: Only `skills/` and/or `agents/`, zero `rules/`, `sidecars/`, `mcp_config.json`, or `hooks.json`.
- **`global-rules`**: Contains `rules/*.md`; computes `rulesEstimatedTokens` (`Math.ceil(utf8Bytes / 4)`) and enforces `<= 24,000` bytes/file.
- **`sidecar-ui`**: Contains `sidecars/*/sidecar.json` (or `sidecars.json`).
- **`mcp-stdio` / `mcp-remote`**: Parsed from `mcp_config.json` (records remote `https://` hostnames in `mcpRemoteDomains[]`).
- **`lifecycle-hooks`**: Contains `<pluginRoot>/hooks.json` (records valid Antigravity hook events in `hookEvents[]`; rejects foreign hook events via `ERR_FOREIGN_HOST_HOOKS`).
- **`host-enhancement`**: Triggered by CDP signatures (`--remote-debugging-port`, `webSocketDebuggerUrl`, `DevToolsActivePort`, `Runtime.evaluate`, `Page.addScriptToEvaluateOnNewDocument`) or `app.asar` signatures (`app.asar`, `asar.extractAll`, `asar.createPackage`). Never blocked or penalized; records `hostEnhancementKind: ["cdp" | "app-asar"]` for a gentle `💡 宿主界面增强` badge. Standalone `host-enhancement` plugins (without `skills/` or `sidecars/`, e.g. `elviscjn-cjn/antigravity-context-viewer`) count as valid Antigravity components (`hasHostEnhancement` / `hasAnyComponent`) in both Track 1 and Track 2 / Tier-0 nominations, while still requiring Antigravity ecosystem affinity and passing `scoreAntigravityAuthenticity` so generic Electron apps stay excluded.
