import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { buildCatalogToDisk, compileCatalogArtifacts } from '../scripts/build-catalog.mjs';
import {
  buildTrack2PluginRecordsForArchive,
  crawlExperimentalTopics,
} from '../scripts/crawl-topics.mjs';
import { CURRENT_VALIDATOR_VERSION } from '../scripts/lib/adaptive-discovery.mjs';
import { FIRST_PARTY_REPO_OWNERS } from '../scripts/lib/constants.mjs';
import { discoverPluginRootsInArchive, parseSafeGitHubCandidateUrl } from '../scripts/lib/discovery-sources.mjs';
import { createTarGzBuffer, inspectTarGzBuffer } from '../scripts/lib/tar-stream.mjs';
import { parseNominationIssueBody } from '../scripts/parse-nomination.mjs';
import {
  evaluateRepoSyncUpdate,
  stripHistoricalLockReadmes,
  syncAllRegisteredReleases,
} from '../scripts/sync-releases.mjs';
import { validatePluginTarball } from '../scripts/validate-plugin-tarball.mjs';

const __testDir = dirname(fileURLToPath(import.meta.url));
const CATALOG_REPO_ROOT = resolve(__testDir, '..');

const CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect x="16" y="16" width="96" height="96" rx="20" fill="#6366f1"/></svg>`;
const SHA_1 = '1111111111111111111111111111111111111111';
const SHA_2 = '2222222222222222222222222222222222222222';
const SHA_3 = '3333333333333333333333333333333333333333';

function makeUstarEntry(name, contentBuf, { typeflag = '0', linkname = '' } = {}) {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, Math.min(100, Buffer.byteLength(name)), 'utf8');
  header.write('0000644\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  const size = typeflag === '0' ? contentBuf.length : 0;
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 'ascii');
  header.write('00000000000\0', 136, 'ascii');
  header.fill(0x20, 148, 156);
  header.write(typeflag, 156, 1, 'ascii');
  if (linkname) {
    header.write(linkname, 157, Math.min(100, Buffer.byteLength(linkname)), 'utf8');
  }
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 0x20;
  if (typeflag !== '0' || size === 0) return header;
  const rem = size % 512;
  const pad = rem === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - rem, 0);
  return Buffer.concat([header, contentBuf, pad]);
}

function createTarGzWithSymlinks(filesObj, symlinks = []) {
  const chunks = [];
  for (const [p, content] of Object.entries(filesObj)) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    chunks.push(makeUstarEntry(p, buf, { typeflag: '0' }));
  }
  for (const s of symlinks) {
    chunks.push(makeUstarEntry(s.path, Buffer.alloc(0), { typeflag: s.typeflag || '2', linkname: s.target || '' }));
  }
  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks));
}

function makeRichPluginTarball({
  prefix = '',
  name = 'aurora-tool',
  displayName = 'Aurora Tool',
  version = '1.0.0',
  description = 'Native Google Antigravity workflow tool with sidebar panel.',
  extraFiles = {},
} = {}) {
  const p = prefix ? `${prefix}/` : '';
  return createTarGzBuffer({
    [`${p}plugin.json`]: JSON.stringify({
      name,
      displayName,
      version,
      description,
      logo: 'assets/logo.svg',
      suggestedPrompts: ['Open Aurora Tool', 'Inspect status'],
    }),
    [`${p}assets/logo.svg`]: CLEAN_SVG,
    [`${p}LICENSE`]: 'MIT License',
    [`${p}README.md`]: `# ${displayName}\n\n${description}\n\nComprehensive English documentation for Google Antigravity users.`,
    [`${p}README.zh-CN.md`]: `# ${displayName}\n\n适用于 Google Antigravity 的简体中文完整使用指南与工作流说明。`,
    [`${p}skills/${name}/SKILL.md`]:
      `---\nname: ${name}\ndescription: Interactive Antigravity productivity workflow\n---\n# ${displayName}\n\nProvides reliable Antigravity workflow automation, status inspection, and sidebar commands.\n`,
    ...extraFiles,
  });
}

test('Scoped external symlinks: allows strictly external symlinks with minClientVersion 1.6.0, hard-blocks root/internal/targeting symlinks', () => {
  const validSubdirFiles = {
    'repo-sha/plugins/good-tool/plugin.json': JSON.stringify({
      name: 'good-tool',
      displayName: 'Good Tool',
      version: '1.2.0',
      description: 'Genuine Antigravity plugin inside a multi-agent repo.',
      suggestedPrompts: ['Run Good Tool'],
    }),
    'repo-sha/plugins/good-tool/skills/good-tool/SKILL.md':
      '---\nname: good-tool\ndescription: Native Antigravity helper skill\n---\n# Good Tool\n\nHelps Google Antigravity users automate workspace diagnostics and checks.\n',
    'repo-sha/plugins/good-tool/README.md': '# Good Tool\n\nBuilt for Google Antigravity.',
    'repo-sha/shared/guide.md': '# Shared guide',
  };

  // 1. Symlink strictly OUTSIDE pluginRoot (`.claude/skills/link -> ../../shared/guide.md`)
  const extSymlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/.claude/skills/link', target: '../../shared/guide.md' },
  ]);

  // Strict default inspectTarGzBuffer MUST still reject symlinks!
  assert.throws(() => inspectTarGzBuffer(extSymlinkTar), /ERR_TAR_SYMLINK_FORBIDDEN/);

  // Scoped Track-2 validation accepts external-only symlink and flags hasExternalSymlinks=true + minClientVersion='1.6.0'
  const validated = validatePluginTarball(extSymlinkTar, {
    pluginRoot: 'plugins/good-tool',
    allowExternalSymlinks: true,
    allowScopedName: true,
    lenientManifest: true,
    requireAntigravityComponent: true,
    affinityContext: { repoName: 'antigravity-good-tool', topics: ['antigravity-plugin'] },
  });
  assert.equal(validated.hasExternalSymlinks, true);
  assert.equal(validated.authenticity.decision, 'accept');
  assert.equal(validated.structuralMeta.hasSuggestedPrompts, true);
  assert.ok(validated.fingerprint?.contentHash);

  const built = buildTrack2PluginRecordsForArchive({
    repoMeta: {
      id: 8001,
      name: 'antigravity-good-tool',
      full_name: 'alice/antigravity-good-tool',
      owner: { id: 81, login: 'alice' },
      stargazers_count: 15,
      topics: ['antigravity-plugin'],
    },
    releaseInfo: {
      tagName: 'v1.2.0',
      commitSha: SHA_1,
      tarballUrl: `https://github.com/alice/antigravity-good-tool/archive/${SHA_1}.tar.gz`,
      publishedAt: '2026-11-25T00:00:00Z',
    },
    tarballBuffer: extSymlinkTar,
  });
  assert.equal(built.records.length, 1);
  assert.equal(built.records[0].pluginEntry.minClientVersion, '1.6.0');
  assert.equal(built.records[0].pluginEntry.distribution.minClientVersion, '1.6.0');

  // 2. Symlink INSIDE pluginRoot -> HARD-THROW ERR_TAR_SYMLINK_FORBIDDEN
  const insideSymlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/plugins/good-tool/evil-link', target: '/etc/passwd' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(insideSymlinkTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 3. External symlink whose target traverses INTO pluginRoot -> HARD-THROW ERR_TAR_SYMLINK_FORBIDDEN
  const targetingSymlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/docs/escape-link', target: '../plugins/good-tool/plugin.json' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(targetingSymlinkTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 4. Root plugin (`pluginRoot === '.'`) with ANY symlink -> HARD-THROW ERR_TAR_SYMLINK_FORBIDDEN
  const rootSymlinkTar = createTarGzWithSymlinks(
    {
      'repo-sha/plugin.json': JSON.stringify({
        name: 'root-tool',
        version: '1.0.0',
        description: 'Root Antigravity plugin.',
      }),
      'repo-sha/skills/root-tool/SKILL.md':
        '---\nname: root-tool\n---\n# Root Tool\n\nA genuine Antigravity root plugin with full instructions and documentation.\n',
    },
    [{ path: 'repo-sha/docs/link', target: '../README.md' }],
  );
  assert.throws(
    () =>
      validatePluginTarball(rootSymlinkTar, {
        pluginRoot: '.',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 5. Ancestor symlink enclosing `pluginRoot` (`plugins` -> `other`) -> HARD-THROW ERR_TAR_SYMLINK_FORBIDDEN
  const ancestorSymlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/plugins', target: 'shared' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(ancestorSymlinkTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 6. `strippedRoot`-prefixed POSIX hardlink (`typeflag='1'`) targeting `pluginRoot` -> HARD-THROW ERR_TAR_SYMLINK_FORBIDDEN
  const strippedHardlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/docs/hl-stripped', typeflag: '1', target: 'repo-sha/plugins/good-tool/plugin.json' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(strippedHardlinkTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 7. Archive-root-relative POSIX hardlink (`typeflag='1'`) from subdir `docs/` targeting `plugins/good-tool/...` -> HARD-THROW
  const rootRelHardlinkTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/docs/hl-rel', typeflag: '1', target: 'plugins/good-tool/plugin.json' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(rootRelHardlinkTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );

  // 8. Intermediate `..` symlink traversal passing THROUGH `pluginRoot` (`../plugins/good-tool/../shared/guide.md`) -> HARD-THROW
  const intermediateHopTar = createTarGzWithSymlinks(validSubdirFiles, [
    { path: 'repo-sha/docs/hop-link', target: '../plugins/good-tool/../shared/guide.md' },
  ]);
  assert.throws(
    () =>
      validatePluginTarball(intermediateHopTar, {
        pluginRoot: 'plugins/good-tool',
        allowExternalSymlinks: true,
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_TAR_SYMLINK_FORBIDDEN/,
  );
});

test('FIRST_PARTY_REPO_OWNERS excludes google-labs-code & googlecloudplatform, foreign dirs/hooks vetoed, real templates/plugin/agent-guard survives', () => {
  assert.ok(FIRST_PARTY_REPO_OWNERS.has('google-labs-code'));
  assert.ok(FIRST_PARTY_REPO_OWNERS.has('googlecloudplatform'));
  assert.equal(parseSafeGitHubCandidateUrl('https://github.com/google-labs-code/stitch-skills'), null);
  assert.equal(parseSafeGitHubCandidateUrl('https://github.com/googlecloudplatform/bigquery-data-analytics-plugin'), null);

  // `.claude-plugin` & `locales` excluded by discoverPluginRootsInArchive
  const noisyFiles = new Map([
    ['core/.claude-plugin/plugin.json', Buffer.from('{"name":"engsys"}')],
    ['locales/ja/plugin.json', Buffer.from('{"name":"gravitas"}')],
    ['plugins/real-plugin/plugin.json', Buffer.from('{"name":"real-plugin","description":"Real Antigravity plugin."}')],
  ]);
  assert.deepEqual(discoverPluginRootsInArchive(noisyFiles), ['plugins/real-plugin']);

  // Real `templates/plugin/agent-guard` preserved when no non-template root exists
  const agentGuardFiles = new Map([
    ['templates/plugin/agent-guard/plugin.json', Buffer.from('{"name":"agent-guard","description":"Task supervisor."}')],
    ['templates/plugin/agent-guard/hooks.json', Buffer.from('{"hooks":{"Stop":[]}}')],
  ]);
  assert.deepEqual(discoverPluginRootsInArchive(agentGuardFiles), ['templates/plugin/agent-guard']);

  // Hard-veto on hooks.json with 0 valid ANTIGRAVITY_HOOK_EVENTS (Copilot camelCase)
  const foreignHooksTar = createTarGzBuffer({
    'plugin.json': JSON.stringify({
      name: 'copilot-hooks',
      version: '1.0.0',
      description: 'Hooks for Antigravity and Copilot.',
    }),
    'hooks.json': JSON.stringify({
      preToolUse: [{ command: 'echo hi' }],
      sessionStart: [{ command: 'echo start' }],
    }),
    'skills/copilot-hooks/SKILL.md':
      '---\nname: copilot-hooks\n---\n# Copilot Hooks\n\nLong enough skill content to ensure the hooks veto fires first.\n',
  });
  assert.throws(
    () =>
      validatePluginTarball(foreignHooksTar, {
        lenientManifest: true,
        requireAntigravityComponent: true,
      }),
    /ERR_FOREIGN_HOST_HOOKS/,
  );
});

test('crawl-topics fixes silent eviction bug, applies 3-strike >=72h 404 eviction, wires Two-Stage GraphQL + P1 + Dedup + Storage Split', async () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'agy-wiring-crawl-'));
  try {
    mkdirSync(join(tmpRoot, 'data'), { recursive: true });
    mkdirSync(join(tmpRoot, 'state'), { recursive: true });
    writeFileSync(join(tmpRoot, 'data', 'aggregators.json'), JSON.stringify({ schemaVersion: 1, aggregators: [] }));
    writeFileSync(join(tmpRoot, 'state', 'ledger.json'), JSON.stringify({ schemaVersion: 1, entries: {} }));

    // Seed unverified-cache with:
    //  1) `alice/sticky-plugin` (cold repo NOT returned by search -> MUST NEVER BE SILENTLY EVICTED!)
    //  2) `bob/vanishing-plugin` (hot repo that starts returning 404 -> kept for strikes 1 & 2, evicted on strike 3 >=72h!)
    const t0 = Date.parse('2026-11-20T00:00:00Z');
    writeFileSync(
      join(tmpRoot, 'state', 'unverified-cache.json'),
      JSON.stringify({
        schemaVersion: 2,
        plugins: [
          {
            id: 'alice__sticky-plugin',
            canonicalName: 'sticky-plugin',
            scopedName: 'alice--sticky-plugin',
            forceScopedInstall: true,
            displayName: 'Sticky Plugin',
            description: { zh: '稳定插件', en: 'Stable Antigravity plugin.' },
            version: '1.0.0',
            gitTag: 'v1.0.0',
            commitSha: SHA_1,
            repository: {
              url: 'https://github.com/alice/sticky-plugin',
              repositoryId: 5001,
              ownerId: 501,
              stars: 5,
              pluginRoot: '.',
              pushedAt: '2026-06-01T00:00:00Z',
            },
            distribution: {
              tarballUrl: `https://github.com/alice/sticky-plugin/archive/${SHA_1}.tar.gz`,
              sha256: 'a'.repeat(64),
              sizeBytes: 2048,
              npmMirrorPkg: null,
              preservePaths: [],
            },
            media: { iconUrl: null, screenshots: [] },
            taxonomy: { categories: ['productivity'], tags: ['workflow'], platforms: ['win32', 'darwin', 'linux'] },
            capabilities: { badges: ['declarative-only'] },
            updatedAt: '2026-06-01T00:00:00Z',
          },
          {
            id: 'bob__vanishing-plugin',
            canonicalName: 'vanishing-plugin',
            scopedName: 'bob--vanishing-plugin',
            forceScopedInstall: true,
            displayName: 'Vanishing Plugin',
            description: { zh: '即将删除', en: 'Soon to be deleted Antigravity plugin.' },
            version: '1.0.0',
            gitTag: 'v1.0.0',
            commitSha: SHA_2,
            repository: {
              url: 'https://github.com/bob/vanishing-plugin',
              repositoryId: 5002,
              ownerId: 502,
              stars: 30, // Hot tier -> checked every run!
              pluginRoot: '.',
              pushedAt: '2026-11-19T00:00:00Z',
            },
            distribution: {
              tarballUrl: `https://github.com/bob/vanishing-plugin/archive/${SHA_2}.tar.gz`,
              sha256: 'b'.repeat(64),
              sizeBytes: 2048,
              npmMirrorPkg: null,
              preservePaths: [],
            },
            media: { iconUrl: null, screenshots: [] },
            taxonomy: { categories: ['developer-tools'], tags: ['devtools'], platforms: ['win32', 'darwin', 'linux'] },
            capabilities: { badges: ['declarative-only'] },
            updatedAt: '2026-11-19T00:00:00Z',
          },
        ],
        readmeMeta: {},
      }),
    );

    const newTar = makeRichPluginTarball({
      name: 'nova-panel',
      displayName: 'Nova Panel',
      version: '1.4.0',
      description: 'Antigravity telemetry & quota panel.',
      extraFiles: {
        'sidecars/nova/sidecar.json': JSON.stringify({
          command: 'node',
          args: ['server.mjs'],
          has_web_ui: true,
          ui_config: { views: [{ path: '/' }] },
        }),
        'sidecars/nova/server.mjs': 'console.log("nova");',
      },
    });
    const cloneTar = makeRichPluginTarball({
      name: 'nova-panel',
      displayName: 'Nova Panel',
      version: '1.4.0',
      description: 'Antigravity telemetry & quota panel.',
      extraFiles: {
        'sidecars/nova/sidecar.json': JSON.stringify({
          command: 'node',
          args: ['server.mjs'],
          has_web_ui: true,
          ui_config: { views: [{ path: '/' }] },
        }),
        'sidecars/nova/server.mjs': 'console.log("nova");',
      },
    });

    let graphqlCalls = 0;
    let restRepoCalls = 0;

    const mockFetch = async (url, init = {}) => {
      const s = String(url);
      if (s === 'https://api.github.com/graphql') {
        graphqlCalls += 1;
        const body = JSON.parse(init.body || '{}');
        const q = String(body.query || '');
        const vars = body.variables || {};
        const data = { rateLimit: { cost: 1, remaining: 4990, resetAt: '2026-11-25T20:00:00Z' } };
        const errors = [];

        if (q.includes('Stage2AHeartbeat')) {
          for (let i = 0; vars[`o${i}`]; i++) {
            const full = `${vars[`o${i}`]}/${vars[`n${i}`]}`.toLowerCase();
            if (full === 'bob/vanishing-plugin') {
              data[`r${i}`] = null;
              errors.push({ type: 'NOT_FOUND', path: [`r${i}`], message: 'Could not resolve' });
            } else if (full === 'alice/sticky-plugin') {
              data[`r${i}`] = {
                id: 'R_sticky',
                databaseId: 5001,
                name: 'sticky-plugin',
                nameWithOwner: 'alice/sticky-plugin',
                url: 'https://github.com/alice/sticky-plugin',
                isArchived: false,
                isDisabled: false,
                isTemplate: false,
                isFork: false,
                pushedAt: '2026-06-01T00:00:00Z',
                stargazerCount: 6,
                owner: { login: 'alice', databaseId: 501 },
                defaultBranchRef: { name: 'main', target: { oid: SHA_1, committedDate: '2026-06-01T00:00:00Z' } },
              };
            }
          }
        } else if (q.includes('Stage2ANovel')) {
          for (let i = 0; vars[`o${i}`]; i++) {
            const full = `${vars[`o${i}`]}/${vars[`n${i}`]}`.toLowerCase();
            if (full === 'noise/no-manifest') {
              data[`r${i}`] = {
                id: 'R_noise',
                databaseId: 6001,
                name: 'no-manifest',
                nameWithOwner: 'noise/no-manifest',
                url: 'https://github.com/noise/no-manifest',
                isArchived: false,
                isDisabled: false,
                isTemplate: false,
                isFork: false,
                pushedAt: '2026-11-19T00:00:00Z',
                stargazerCount: 0,
                owner: { login: 'noise', databaseId: 601 },
                defaultBranchRef: { name: 'main', target: { oid: SHA_3, committedDate: '2026-11-19T00:00:00Z' } },
                rootManifest: null,
                dotManifest: null,
                companion: null,
                rootTree: { entries: [{ name: 'src', type: 'tree', object: { entries: [{ name: 'index.js', type: 'blob' }] } }] },
              };
            } else {
              const isOrig = full === 'carol/nova-panel';
              data[`r${i}`] = {
                id: isOrig ? 'R_carol' : 'R_clone',
                databaseId: isOrig ? 7001 : 7002,
                name: 'nova-panel',
                nameWithOwner: isOrig ? 'carol/nova-panel' : 'cloner/nova-panel',
                url: `https://github.com/${isOrig ? 'carol/nova-panel' : 'cloner/nova-panel'}`,
                isArchived: false,
                isDisabled: false,
                isTemplate: false,
                isFork: !isOrig,
                pushedAt: '2026-11-19T12:00:00Z',
                stargazerCount: isOrig ? 85 : 0,
                owner: { login: isOrig ? 'carol' : 'cloner', databaseId: isOrig ? 701 : 702 },
                defaultBranchRef: { name: 'main', target: { oid: SHA_3, committedDate: '2026-11-19T12:00:00Z' } },
                rootManifest: { byteSize: 240 },
                dotManifest: null,
                companion: null,
                rootTree: { entries: [{ name: 'plugin.json', type: 'blob' }] },
              };
            }
          }
        } else if (q.includes('Stage2BInspect')) {
          for (let i = 0; vars[`o${i}`]; i++) {
            const full = `${vars[`o${i}`]}/${vars[`n${i}`]}`.toLowerCase();
            const isOrig = full === 'carol/nova-panel';
            data[`r${i}`] = {
              id: isOrig ? 'R_carol' : 'R_clone',
              databaseId: isOrig ? 7001 : 7002,
              name: 'nova-panel',
              nameWithOwner: isOrig ? 'carol/nova-panel' : 'cloner/nova-panel',
              url: `https://github.com/${isOrig ? 'carol/nova-panel' : 'cloner/nova-panel'}`,
              description: 'Antigravity telemetry & quota panel.',
              isArchived: false,
              isDisabled: false,
              isTemplate: false,
              isFork: !isOrig,
              pushedAt: '2026-11-19T12:00:00Z',
              stargazerCount: isOrig ? 85 : 0,
              licenseInfo: { spdxId: 'MIT' },
              owner: { login: isOrig ? 'carol' : 'cloner', databaseId: isOrig ? 701 : 702 },
              parent: !isOrig ? { nameWithOwner: 'carol/nova-panel', pushedAt: '2026-11-19T12:00:00Z', isArchived: false } : null,
              repositoryTopics: { nodes: [{ topic: { name: 'antigravity-plugin' } }, { topic: { name: 'quota-hud' } }] },
              releases: {
                nodes: [
                  {
                    tagName: 'v1.4.0',
                    isDraft: false,
                    isPrerelease: false,
                    publishedAt: '2026-11-19T12:00:00Z',
                    tagCommit: { oid: SHA_3, committedDate: '2026-11-19T12:00:00Z' },
                    releaseAssets: { nodes: [] },
                  },
                ],
              },
              refs: { nodes: [] },
              defaultBranchRef: { name: 'main', target: { oid: SHA_3, committedDate: '2026-11-19T12:00:00Z' } },
              rootManifest: null,
              dotManifest: null,
              companion: null,
            };
          }
        } else if (q.includes('AuthorSnowballExpansion')) {
          for (let i = 0; vars[`u${i}`]; i++) {
            data[`u${i}`] = { login: vars[`u${i}`], databaseId: 501, repositories: { nodes: [] } };
          }
        }
        return new Response(JSON.stringify(errors.length ? { data, errors } : { data }), { status: 200 });
      }

      if (s.startsWith('https://api.github.com/search/repositories')) {
        if (s.includes('topic%3Aantigravity-plugin%20')) {
          return new Response(
            JSON.stringify({
              total_count: 3,
              items: [
                { full_name: 'carol/nova-panel', name: 'nova-panel', owner: { login: 'carol', id: 701 }, id: 7001, stargazers_count: 85, topics: ['antigravity-plugin'] },
                { full_name: 'cloner/nova-panel', name: 'nova-panel', owner: { login: 'cloner', id: 702 }, id: 7002, stargazers_count: 0, topics: ['antigravity-plugin'] },
                { full_name: 'noise/no-manifest', name: 'no-manifest', owner: { login: 'noise', id: 601 }, id: 6001, stargazers_count: 0, topics: [] },
              ],
            }),
            { status: 200, headers: { 'x-ratelimit-remaining': '25' } },
          );
        }
        return new Response(JSON.stringify({ total_count: 0, items: [] }), {
          status: 200,
          headers: { 'x-ratelimit-remaining': '25' },
        });
      }

      if (s.startsWith('https://api.github.com/search/code')) {
        return new Response(JSON.stringify({ total_count: 0, items: [] }), {
          status: 200,
          headers: { 'x-ratelimit-remaining': '9' },
        });
      }

      if (s.startsWith('https://registry.npmjs.org/-/v1/search')) {
        return new Response(JSON.stringify({ objects: [] }), { status: 200 });
      }

      if (s.startsWith('https://api.github.com/repos/')) {
        restRepoCalls += 1;
        return new Response('Not Found', { status: 404 });
      }

      if (s === `https://github.com/carol/nova-panel/archive/${SHA_3}.tar.gz`) {
        return new Response(newTar, { status: 200 });
      }
      if (s === `https://github.com/cloner/nova-panel/archive/${SHA_3}.tar.gz`) {
        return new Response(cloneTar, { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    };

    // Run 1 (t=0h): discovers carol/nova-panel, dedups cloner/nova-panel, Stage2A rejects noise/no-manifest,
    // preserves alice/sticky-plugin (NOT in search results!), and records 404 Strike 1 on bob/vanishing-plugin!
    const run1 = await crawlExperimentalTopics({
      repoRoot: tmpRoot,
      enableSearch: true,
      enableAggregators: false,
      token: 'mock-pat-token',
      fetchImpl: mockFetch,
      nowMs: t0,
      searchDelayMs: 0,
      codeSearchDelayMs: 0,
      repoSearchPoolBudget: 12,
      codeSearchPoolBudget: 4,
    });

    assert.ok(graphqlCalls >= 3, 'Expected GraphQL Stage 2A-Heartbeat + 2A-Novel + 2B-Inspect calls');
    assert.equal(restRepoCalls, 0, 'GraphQL path must not fall back to REST /repos/*');
    assert.equal(run1.dedupCollapsed, 1, 'Expected cloner/nova-panel collapsed into carol/nova-panel');
    assert.equal(run1.skipped.ERR_MISSING_PLUGIN_JSON, 1);

    const cache1 = JSON.parse(readFileSync(join(tmpRoot, 'state', 'unverified-cache.json'), 'utf8'));
    assert.equal(cache1.schemaVersion, 2);
    assert.equal(cache1.readmes, undefined, 'Storage split must strip bulky inline readmes from state/unverified-cache.json');
    assert.equal(cache1.readmesZh, undefined);
    assert.equal(cache1.readmesEn, undefined);
    assert.ok(cache1.readmeMeta['carol__nova-panel'].isBilingual === true);

    const ids1 = cache1.plugins.map((p) => p.id);
    assert.ok(ids1.includes('alice__sticky-plugin'), 'Silent eviction bug must stay fixed: sticky-plugin retained!');
    assert.ok(ids1.includes('bob__vanishing-plugin'), 'Strike 1 must NOT immediately evict cached plugin');
    assert.ok(ids1.includes('carol__nova-panel'));
    assert.ok(!ids1.includes('cloner__nova-panel'), 'Exact clone must be collapsed');

    const carol = cache1.plugins.find((p) => p.id === 'carol__nova-panel');
    assert.ok(carol.discoverySources.length >= 1);
    assert.ok(carol.authenticity.score >= 0.9);
    assert.equal(carol.authenticity.compatTier, 'native');
    assert.equal(carol.structuralMeta.hasLicense, true);
    assert.equal(carol.taxonomy.taxonomyVersion, 2);
    assert.ok(existsSync(join(tmpRoot, 'dist', 'readmes', 'carol__nova-panel.json')));
    assert.ok(existsSync(join(tmpRoot, 'state', 'discovery-state.json')));
    assert.ok(existsSync(join(tmpRoot, 'state', 'bandit-state.json')));
    assert.ok(existsSync(join(tmpRoot, 'state', 'fingerprints.json')));

    const neg1 = JSON.parse(readFileSync(join(tmpRoot, 'state', 'crawl-negative-cache.json'), 'utf8'));
    assert.equal(neg1.entries['noise/no-manifest'].reason, 'ERR_MISSING_PLUGIN_JSON');
    assert.equal(neg1.entries['noise/no-manifest'].validatorVersion, CURRENT_VALIDATOR_VERSION);
    assert.equal(neg1.entries['noise/no-manifest'].policyClass, 'missing_manifest');

    // Run 2 (t=+24h): Strike 2 on bob/vanishing-plugin -> still retained!
    await crawlExperimentalTopics({
      repoRoot: tmpRoot,
      enableSearch: true,
      enableAggregators: false,
      token: 'mock-pat-token',
      fetchImpl: mockFetch,
      nowMs: t0 + 24 * 3_600_000,
      searchDelayMs: 0,
      codeSearchDelayMs: 0,
      repoSearchPoolBudget: 4,
      codeSearchPoolBudget: 2,
    });
    const cache2 = JSON.parse(readFileSync(join(tmpRoot, 'state', 'unverified-cache.json'), 'utf8'));
    assert.ok(cache2.plugins.some((p) => p.id === 'bob__vanishing-plugin'), 'Strike 2 (<72h) must still retain plugin');

    // Run 3 (t=+73h): Strike 3 >=72h on bob/vanishing-plugin -> confirmed eviction!
    await crawlExperimentalTopics({
      repoRoot: tmpRoot,
      enableSearch: true,
      enableAggregators: false,
      token: 'mock-pat-token',
      fetchImpl: mockFetch,
      nowMs: t0 + 73 * 3_600_000,
      searchDelayMs: 0,
      codeSearchDelayMs: 0,
      repoSearchPoolBudget: 4,
      codeSearchPoolBudget: 2,
    });
    const cache3 = JSON.parse(readFileSync(join(tmpRoot, 'state', 'unverified-cache.json'), 'utf8'));
    assert.ok(!cache3.plugins.some((p) => p.id === 'bob__vanishing-plugin'), 'Strike 3 >=72h must evict confirmed 404 repo');
    assert.ok(cache3.plugins.some((p) => p.id === 'alice__sticky-plugin'), 'sticky-plugin must remain intact');
    const neg3 = JSON.parse(readFileSync(join(tmpRoot, 'state', 'crawl-negative-cache.json'), 'utf8'));
    assert.equal(neg3.entries['bob/vanishing-plugin'].reason, 'ERR_REPO_NOT_FOUND');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('build-catalog emits ranking, per-plugin dist/readmes/<id>.json, dist/readmes-verified.json, seeds from --seed-readmes-dir, and GCs orphan icons', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'agy-wiring-build-'));
  try {
    mkdirSync(join(tmpRoot, 'data', 'plugins'), { recursive: true });
    mkdirSync(join(tmpRoot, 'state', 'icons'), { recursive: true });
    const seedDir = join(tmpRoot, 'seed-readmes');
    mkdirSync(seedDir, { recursive: true });

    writeFileSync(
      join(tmpRoot, 'data', 'plugins', 'alice__verified-app.yml'),
      'url: https://github.com/alice/verified-app\npluginRoot: .\ncategory: developer-tools\ndescription:\n  zh: 认证工具\n  en: Verified tool.\n',
    );
    writeFileSync(
      join(tmpRoot, 'data', 'plugins', 'dave__archived-app.yml'),
      'url: https://github.com/dave/archived-app\npluginRoot: .\ncategory: developer-tools\ndescription:\n  zh: 已归档工具\n  en: Archived verified tool.\n',
    );
    writeFileSync(
      join(tmpRoot, 'state', 'ledger.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: {
          'verified-app': {
            entrySlug: 'alice__verified-app',
            canonicalName: 'verified-app',
            repositoryId: 1001,
            ownerId: 101,
            repoFullName: 'alice/verified-app',
            pluginRoot: '.',
            status: 'active',
          },
          'archived-app': {
            entrySlug: 'dave__archived-app',
            canonicalName: 'archived-app',
            repositoryId: 1003,
            ownerId: 103,
            repoFullName: 'dave/archived-app',
            pluginRoot: '.',
            status: 'ARCHIVED',
          },
          'gone-app': {
            entrySlug: 'bob__gone-app',
            canonicalName: 'gone-app',
            repositoryId: 1002,
            ownerId: 102,
            repoFullName: 'bob/gone-app',
            pluginRoot: '.',
            status: 'DEPRECATED_GONE',
          },
        },
      }),
    );
    writeFileSync(
      join(tmpRoot, 'state', 'versions-lock.json'),
      JSON.stringify({
        schemaVersion: 1,
        locks: {
          'alice__verified-app': {
            latest: '1.2.0',
            versions: {
              '1.2.0': {
                gitTag: 'v1.2.0',
                commitSha: SHA_1,
                tarballUrl: 'https://github.com/alice/verified-app/releases/download/v1.2.0/verified-app.tar.gz',
                sha256: 'a'.repeat(64),
                sizeBytes: 4096,
                publishedAt: '2026-11-24T00:00:00Z',
                manifest: { name: 'verified-app', displayName: 'Verified App', description: 'Verified developer tool.' },
                capabilities: { badges: ['sidecar-ui'] },
                stars: 42,
                readmeMarkdown: '# Verified App\n\nOfficial Track-1 README.',
                readmeZhMarkdown: '# 认证应用\n\n简体中文说明。',
                readmeEnMarkdown: '# Verified App\n\nOfficial Track-1 README.',
                iconExt: '.svg',
              },
            },
          },
          'dave__archived-app': {
            latest: '1.0.0',
            versions: {
              '1.0.0': {
                gitTag: 'v1.0.0',
                commitSha: SHA_2,
                tarballUrl: 'https://github.com/dave/archived-app/releases/download/v1.0.0/archived-app.tar.gz',
                sha256: 'd'.repeat(64),
                sizeBytes: 2048,
                publishedAt: '2025-01-01T00:00:00Z',
                manifest: { name: 'archived-app', displayName: 'Archived App', description: 'Archived developer tool.' },
                capabilities: { badges: ['declarative-only'] },
                stars: 20,
              },
            },
          },
          'bob__gone-app': {
            latest: '1.0.0',
            versions: {
              '1.0.0': {
                gitTag: 'v1.0.0',
                commitSha: SHA_2,
                tarballUrl: 'https://example.com/gone.tar.gz',
                sha256: 'b'.repeat(64),
                sizeBytes: 1024,
                manifest: { name: 'gone-app', description: 'Gone' },
              },
            },
          },
        },
      }),
    );
    writeFileSync(
      join(tmpRoot, 'state', 'unverified-cache.json'),
      JSON.stringify({
        schemaVersion: 2,
        plugins: [
          {
            id: 'carol__exp-tool',
            canonicalName: 'exp-tool',
            scopedName: 'carol--exp-tool',
            forceScopedInstall: true,
            displayName: 'Exp Tool',
            description: { zh: '实验插件', en: 'Experimental Antigravity plugin.' },
            version: '0.5.0',
            gitTag: 'v0.5.0',
            commitSha: SHA_3,
            repository: { url: 'https://github.com/carol/exp-tool', repositoryId: 2001, ownerId: 201, stars: 10, pluginRoot: '.' },
            distribution: { tarballUrl: `https://github.com/carol/exp-tool/archive/${SHA_3}.tar.gz`, sha256: 'c'.repeat(64), sizeBytes: 2048 },
            media: { iconUrl: 'https://azwosile.github.io/agy-market-catalog/icons/carol__exp-tool.svg', screenshots: [] },
            taxonomy: { categories: ['productivity'], tags: ['workflow'], platforms: ['win32', 'darwin', 'linux'] },
            capabilities: { badges: ['declarative-only'] },
            authenticity: { score: 0.94, compatTier: 'native' },
            updatedAt: '2026-11-24T00:00:00Z',
          },
          {
            id: 'eve__stale-tool',
            canonicalName: 'stale-tool',
            scopedName: 'eve--stale-tool',
            forceScopedInstall: true,
            displayName: 'Stale Tool',
            description: { zh: '陈旧插件', en: 'Unmaintained Antigravity plugin.' },
            version: '0.3.0',
            gitTag: 'v0.3.0',
            commitSha: SHA_1,
            repository: { url: 'https://github.com/eve/stale-tool', repositoryId: 2002, ownerId: 202, stars: 4, pluginRoot: '.', pushedAt: '2026-01-01T00:00:00Z' },
            distribution: { tarballUrl: `https://github.com/eve/stale-tool/archive/${SHA_1}.tar.gz`, sha256: 'e'.repeat(64), sizeBytes: 1024 },
            media: { iconUrl: null, screenshots: [] },
            taxonomy: { categories: ['productivity'], tags: ['workflow'], platforms: ['win32', 'darwin', 'linux'] },
            capabilities: { badges: ['declarative-only'] },
            authenticity: { score: 0.91, compatTier: 'native' },
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        readmeMeta: {
          'carol__exp-tool': { defaultBytes: 64, zhBytes: 30, enBytes: 64, isBilingual: true },
        },
      }),
    );

    // Seed per-plugin README for carol__exp-tool (simulating gh-pages seed) + create active & orphan icons
    writeFileSync(
      join(seedDir, 'carol__exp-tool.json'),
      JSON.stringify({
        id: 'carol__exp-tool',
        default: '# Exp Tool\n\nSeeded from gh-pages.',
        zh: '# 实验插件\n\n来自 gh-pages 的中文说明。',
        en: '# Exp Tool\n\nSeeded from gh-pages.',
      }),
    );
    writeFileSync(join(tmpRoot, 'state', 'icons', 'alice__verified-app.svg'), CLEAN_SVG);
    writeFileSync(join(tmpRoot, 'state', 'icons', 'carol__exp-tool.svg'), CLEAN_SVG);
    writeFileSync(join(tmpRoot, 'state', 'icons', 'stale__orphan-plugin.svg'), CLEAN_SVG);

    const out = buildCatalogToDisk({
      repoRoot: tmpRoot,
      generatedAt: '2026-11-25T10:00:00.000Z',
      seedReadmesDir: seedDir,
      gcIcons: true,
    });

    // DEPRECATED_GONE skipped from active index.json while Track-1 active & archived entries emit ranking status flags
    assert.equal(out.indexJson.plugins.length, 2);
    const activeVerified = out.indexJson.plugins.find((p) => p.id === 'alice__verified-app');
    const archivedVerified = out.indexJson.plugins.find((p) => p.id === 'dave__archived-app');
    assert.ok(activeVerified.ranking.score > 50);
    assert.equal(activeVerified.ranking.compatTier, 'native');
    assert.equal(activeVerified.ranking.archived, false);
    assert.equal(activeVerified.ranking.stale, false);
    assert.equal(activeVerified.ranking.status, undefined);
    assert.equal(archivedVerified.ranking.archived, true);
    assert.equal(archivedVerified.ranking.stale, false);
    assert.equal(archivedVerified.ranking.status, 'ARCHIVED');

    // Track-2 entries emit ranking + stale flags & preserve seeded README into dist/readmes/<id>.json + dist/readmes.json
    assert.equal(out.unverifiedIndexJson.plugins.length, 2);
    const freshExp = out.unverifiedIndexJson.plugins.find((p) => p.id === 'carol__exp-tool');
    const staleExp = out.unverifiedIndexJson.plugins.find((p) => p.id === 'eve__stale-tool');
    assert.ok(freshExp.ranking.score > 40);
    assert.equal(freshExp.ranking.archived, false);
    assert.equal(freshExp.ranking.stale, false);
    assert.equal(staleExp.ranking.archived, false);
    assert.equal(staleExp.ranking.stale, true);
    assert.equal(out.perPluginReadmesCount, 2);
    assert.ok(existsSync(join(tmpRoot, 'dist', 'readmes', 'alice__verified-app.json')));
    assert.ok(existsSync(join(tmpRoot, 'dist', 'readmes', 'carol__exp-tool.json')));
    assert.ok(existsSync(join(tmpRoot, 'dist', 'readmes-verified.json')));
    assert.equal(out.readmesVerifiedJson.entries['carol__exp-tool'], undefined);
    assert.ok(out.readmesVerifiedJson.entries['alice__verified-app'].includes('Track-1 README'));
    assert.ok(out.readmesJson.entries['carol__exp-tool'].includes('Seeded from gh-pages'));
    assert.ok(out.readmesJson.entriesZh['carol__exp-tool'].includes('gh-pages'));

    // Orphan icon GC removed stale__orphan-plugin.svg while preserving active icons
    assert.equal(out.gcRemovedIcons, 1);
    assert.ok(!existsSync(join(tmpRoot, 'state', 'icons', 'stale__orphan-plugin.svg')));
    assert.ok(!existsSync(join(tmpRoot, 'dist', 'icons', 'stale__orphan-plugin.svg')));
    assert.ok(existsSync(join(tmpRoot, 'dist', 'icons', 'alice__verified-app.svg')));
    assert.ok(existsSync(join(tmpRoot, 'dist', 'icons', 'carol__exp-tool.svg')));
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('sync-releases enforces always-on PRIVILEGE_REVIEW, MODERATE escalation, 3-strike >=72h DEPRECATED_GONE tombstone, ARCHIVED, GraphQL nodeId backfill, and historical README pruning', async () => {
  const baseLedger = {
    entrySlug: 'alice__aurora-tool',
    canonicalName: 'aurora-tool',
    repositoryId: 9001,
    ownerId: 901,
    repoFullName: 'alice/aurora-tool',
    pluginRoot: '.',
    status: 'active',
  };
  const baseLock = {
    latest: '1.2.0',
    versions: {
      '1.2.0': {
        gitTag: 'v1.2.0',
        commitSha: SHA_1,
        tarballUrl: 'https://example.com/1.2.0.tar.gz',
        sha256: 'a'.repeat(64),
        sizeBytes: 2048,
        manifest: { name: 'aurora-tool', displayName: 'Aurora Tool', description: 'Aurora' },
        capabilities: { badges: ['declarative-only'], mcpRemoteDomains: [], hookEvents: [], hostEnhancementKind: [], mcpServers: [], rulesEstimatedTokens: 0 },
        readmeMarkdown: '# v1.2.0 README',
        readmeZhMarkdown: '# v1.2.0 中文',
        readmeEnMarkdown: '# v1.2.0 README',
      },
    },
  };

  // 1. Always-on CRITICAL escalation (patch bump adding lifecycle-hooks WITHOUT owner change!) -> PRIVILEGE_REVIEW & held back
  const criticalPatchTar = makeRichPluginTarball({
    name: 'aurora-tool',
    version: '1.2.1',
    extraFiles: {
      'hooks.json': JSON.stringify({ hooks: { PreToolUse: [{ command: 'node hook.mjs' }] } }),
    },
  });
  const critOut = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool' },
    repoByNumericId: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool', stargazers_count: 50 },
    releases: [{ tagName: 'v1.2.1', commitSha: SHA_2, tarballUrl: 'https://example.com/1.2.1.tar.gz' }],
    tarballBuffersByTag: new Map([['v1.2.1', criticalPatchTar]]),
    nowIso: '2026-11-25T00:00:00Z',
  });
  assert.equal(critOut.ledgerRecord.status, 'PRIVILEGE_REVIEW');
  assert.equal(critOut.lockRecord.latest, '1.2.0'); // Held safely!
  assert.equal(critOut.ledgerRecord.lastEscalation.severity, 'CRITICAL');

  // 2. MODERATE escalation (minor bump adding sidecar-ui) -> ALLOW + attach lastEscalation + strip old 1.2.0 README!
  const moderateMinorTar = makeRichPluginTarball({
    name: 'aurora-tool',
    version: '1.3.0',
    extraFiles: {
      'sidecars/panel/sidecar.json': JSON.stringify({ command: 'node', args: ['server.mjs'], has_web_ui: true }),
      'sidecars/panel/server.mjs': 'console.log("ok");',
    },
  });
  const modOut = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool' },
    repoByNumericId: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool', stargazers_count: 60 },
    releases: [{ tagName: 'v1.3.0', commitSha: SHA_2, tarballUrl: 'https://example.com/1.3.0.tar.gz' }],
    tarballBuffersByTag: new Map([['v1.3.0', moderateMinorTar]]),
    nowIso: '2026-11-25T01:00:00Z',
  });
  assert.equal(modOut.ledgerRecord.status, 'active');
  assert.equal(modOut.lockRecord.latest, '1.3.0');
  assert.equal(modOut.lockRecord.versions['1.3.0'].lastEscalation.severity, 'MODERATE');
  assert.equal(modOut.lockRecord.versions['1.2.0'].readmeMarkdown, undefined, 'Historical README must be pruned');
  assert.ok(modOut.lockRecord.versions['1.3.0'].readmeMarkdown.includes('Aurora Tool'));

  // 3. 3-strike >=72h DEPRECATED_GONE tombstone
  const s1 = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: null,
    repoByNumericId: null,
    nowIso: '2026-11-20T00:00:00Z',
  });
  assert.equal(s1.ledgerRecord.status, 'active');
  assert.equal(s1.ledgerRecord.missCount, 1);

  const s2 = evaluateRepoSyncUpdate({
    ledgerRecord: s1.ledgerRecord,
    lockRecord: baseLock,
    repoAtOldSlug: null,
    repoByNumericId: null,
    nowIso: '2026-11-21T00:00:00Z',
  });
  assert.equal(s2.ledgerRecord.status, 'active');
  assert.equal(s2.ledgerRecord.missCount, 2);

  const s3 = evaluateRepoSyncUpdate({
    ledgerRecord: s2.ledgerRecord,
    lockRecord: baseLock,
    repoAtOldSlug: null,
    repoByNumericId: null,
    nowIso: '2026-11-23T01:00:00Z', // 73h elapsed!
  });
  assert.equal(s3.ledgerRecord.status, 'DEPRECATED_GONE');
  assert.equal(s3.ledgerRecord.repositoryId, 9001, 'Tombstone retains numeric repositoryId against RepoJacking');

  // 4. ARCHIVED tracking
  const archOut = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool', archived: true },
    repoByNumericId: { id: 9001, owner: { id: 901 }, full_name: 'alice/aurora-tool', archived: true },
    nowIso: '2026-11-25T02:00:00Z',
  });
  assert.equal(archOut.ledgerRecord.status, 'ARCHIVED');

  // 5. GraphQL `syncAllRegisteredReleases` backfills `nodeId` into ledger.json without REST calls
  const tmpRoot = mkdtempSync(join(tmpdir(), 'agy-wiring-sync-'));
  try {
    mkdirSync(join(tmpRoot, 'state'), { recursive: true });
    writeFileSync(join(tmpRoot, 'state', 'ledger.json'), JSON.stringify({ schemaVersion: 1, entries: { 'aurora-tool': baseLedger } }));
    writeFileSync(join(tmpRoot, 'state', 'versions-lock.json'), JSON.stringify({ schemaVersion: 1, locks: { 'alice__aurora-tool': baseLock } }));

    let gqlCalled = 0;
    const syncRes = await syncAllRegisteredReleases({
      repoRoot: tmpRoot,
      token: 'mock-tok',
      nowIso: '2026-11-25T05:00:00Z',
      fetchImpl: async (url) => {
        if (String(url) === 'https://api.github.com/graphql') {
          gqlCalled += 1;
          return new Response(
            JSON.stringify({
              data: {
                slug_0: {
                  id: 'R_kgDOAurora9001',
                  databaseId: 9001,
                  name: 'aurora-tool',
                  nameWithOwner: 'alice/aurora-tool',
                  url: 'https://github.com/alice/aurora-tool',
                  isArchived: false,
                  isDisabled: false,
                  isTemplate: false,
                  pushedAt: '2026-11-24T00:00:00Z',
                  stargazerCount: 77,
                  owner: { login: 'alice', databaseId: 901 },
                  defaultBranchRef: { name: 'main', target: { oid: SHA_1, committedDate: '2026-11-24T00:00:00Z' } },
                  releases: { nodes: [] },
                  refs: { nodes: [] },
                },
                rateLimit: { cost: 1, remaining: 4999, resetAt: '2026-11-25T06:00:00Z' },
              },
            }),
            { status: 200 },
          );
        }
        throw new Error(`Unexpected REST URL in GraphQL sync test: ${url}`);
      },
    });
    assert.equal(gqlCalled, 1);
    assert.equal(syncRes.synced, 1);
    const savedLedger = JSON.parse(readFileSync(join(tmpRoot, 'state', 'ledger.json'), 'utf8'));
    assert.equal(savedLedger.entries['aurora-tool'].nodeId, 'R_kgDOAurora9001');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  // Direct helper test
  const stripped = stripHistoricalLockReadmes({
    latest: '2.0.0',
    versions: {
      '1.0.0': { readmeMarkdown: 'old', readmeZhMarkdown: '旧', readmeEnMarkdown: 'old' },
      '2.0.0': { readmeMarkdown: 'new', readmeZhMarkdown: '新', readmeEnMarkdown: 'new' },
    },
  });
  assert.equal(stripped.versions['1.0.0'].readmeMarkdown, undefined);
  assert.equal(stripped.versions['2.0.0'].readmeMarkdown, 'new');
});

test('Nomination issue parser & GitHub Actions workflow invariants', () => {
  // 1. Parse Issue Form with `owner/repo` and subdir `plugin_root`
  const formRes = parseNominationIssueBody(
    '### Repository\n\nLumidarin/agy-capsule\n\n### Plugin Root\n\nagy-capsule\n',
  );
  assert.equal(formRes.ok, true);
  assert.equal(formRes.fullName, 'Lumidarin/agy-capsule');
  assert.equal(formRes.pluginRoot, 'agy-capsule');
  assert.equal(formRes.targetArg, 'https://github.com/Lumidarin/agy-capsule/tree/HEAD/agy-capsule');

  // 2. Parse Issue Form with default `.` plugin_root and full HTTPS URL
  const urlRes = parseNominationIssueBody(
    '### Repository\n\nhttps://github.com/INK-Q/agy-fast\n\n### Plugin Root\n\n_No response_\n',
  );
  assert.equal(urlRes.ok, true);
  assert.equal(urlRes.fullName, 'INK-Q/agy-fast');
  assert.equal(urlRes.pluginRoot, '.');
  assert.equal(urlRes.targetArg, 'INK-Q/agy-fast');

  // 3. Reject first-party Google repos, SSRF domains, and `..` plugin_root traversal
  assert.equal(parseNominationIssueBody('### Repository\n\ngoogle-labs-code/stitch-skills').ok, false);
  assert.equal(parseNominationIssueBody('### Repository\n\nhttps://evil.example.com/a/b').ok, false);
  const trav = parseNominationIssueBody('### Repository\n\nINK-Q/agy-fast\n\n### Plugin Root\n\n../../etc/passwd');
  assert.equal(trav.ok, false);
  assert.equal(trav.errorCode, 'ERR_UNSAFE_PLUGIN_ROOT');

  // 4. Verify Issue Form & Workflow files declare shared concurrency, timeouts, and exact field IDs
  const issueForm = readFileSync(join(CATALOG_REPO_ROOT, '.github', 'ISSUE_TEMPLATE', 'nominate-plugin.yml'), 'utf8');
  assert.ok(issueForm.includes('labels: ["community-discovery"]'));
  assert.ok(issueForm.includes('id: repo'));
  assert.ok(issueForm.includes('id: plugin_root'));

  for (const wf of ['crawl-topics.yml', 'sync-catalog.yml', 'ingest-nomination.yml']) {
    const content = readFileSync(join(CATALOG_REPO_ROOT, '.github', 'workflows', wf), 'utf8');
    assert.ok(content.includes('group: catalog-state-publish'), `${wf} missing shared concurrency group`);
    assert.ok(content.includes('cancel-in-progress: false'), `${wf} must not cancel in-progress state publish`);
    assert.ok(content.includes('timeout-minutes:'), `${wf} missing timeout-minutes cap`);
  }
  const ingestWf = readFileSync(join(CATALOG_REPO_ROOT, '.github', 'workflows', 'ingest-nomination.yml'), 'utf8');
  assert.ok(ingestWf.includes('community-discovery'));
  assert.ok(ingestWf.includes('parse-nomination.mjs'));
  assert.ok(
    ingestWf.includes('CRAWLER_TOKEN: ${{ secrets.CATALOG_CRAWLER_TOKEN || secrets.GITHUB_TOKEN }}'),
    'ingest-nomination.yml must isolate CATALOG_CRAWLER_TOKEN into CRAWLER_TOKEN',
  );
  assert.ok(
    ingestWf.includes('GITHUB_TOKEN="$CRAWLER_TOKEN" node scripts/crawl-topics.mjs'),
    'ingest-nomination.yml must pass CRAWLER_TOKEN only to crawl-topics.mjs so gh uses secrets.GITHUB_TOKEN',
  );
  assert.ok(
    !ingestWf.includes('GITHUB_TOKEN: ${{ secrets.CATALOG_CRAWLER_TOKEN'),
    'ingest-nomination.yml must never overwrite step-level GITHUB_TOKEN with CATALOG_CRAWLER_TOKEN',
  );
  assert.ok(ingestWf.includes('--body-file -'), 'ingest-nomination.yml must pipe real newlines via --body-file -');
  assert.ok(ingestWf.includes('SAFE_CRAWL_OUT'), 'ingest-nomination.yml must sanitize & truncate crawler logs');
  assert.ok(
    !/gh issue comment[^\n]*--body\s+"[^"]*\\n/.test(ingestWf),
    'ingest-nomination.yml must not pass literal \\n inside double-quoted --body',
  );
});

test('Issue #11: sync-releases isolates per-release validation failures (ERR_PLUGIN_JSON_UNKNOWN_KEY) and per-plugin sync errors without blocking other plugins', async () => {
  // 1. evaluateRepoSyncUpdate skips invalid candidate release (e.g. $schema in plugin.json), preserves locked version, and still accepts later valid releases
  const v100Tar = makeRichPluginTarball({
    name: 'demo-plug',
    displayName: 'Demo Plug',
    version: '1.0.0',
    description: 'Antigravity demo plugin.',
  });
  const v110BadTar = createTarGzBuffer({
    'demo-plug-v1.1.0/plugin.json': JSON.stringify({
      name: 'demo-plug',
      version: '1.1.0',
      description: 'Contains unknown custom key outside official 15-field allowlist.',
      unsupportedCustomField: true,
    }),
    'demo-plug-v1.1.0/skills/demo/SKILL.md': '---\nname: demo\ndescription: demo skill\n---\n# Demo\n',
  });
  const v120GoodTar = createTarGzBuffer({
    'demo-plug-v1.2.0/plugin.json': JSON.stringify({
      $schema: 'https://antigravity.google/schemas/v1/plugin.json',
      name: 'demo-plug',
      displayName: 'Demo Plug',
      version: '1.2.0',
      description: 'Official v1 15-field Antigravity demo plugin.',
      license: 'MIT',
      keywords: ['antigravity', 'demo'],
      skills: ['./skills'],
      extensions: { custom: { enabled: true } },
    }),
    'demo-plug-v1.2.0/skills/demo/SKILL.md': '---\nname: demo\ndescription: demo skill\n---\n# Demo\n',
  });

  const baseLedger = {
    canonicalName: 'demo-plug',
    entrySlug: 'alice__demo-plug',
    repoFullName: 'alice/demo-plug',
    repositoryId: 8801,
    ownerId: 881,
    pluginRoot: '.',
    status: 'active',
  };
  const baseLock = {
    latest: '1.0.0',
    versions: {
      '1.0.0': {
        gitTag: 'v1.0.0',
        commitSha: SHA_1,
        sha256: '1'.repeat(64),
        sizeBytes: v100Tar.length,
        tarballUrl: 'https://example.invalid/v1.0.0.tar.gz',
        capabilities: { badges: ['declarative-only'], rulesEstimatedTokens: 0, mcpServers: [], mcpRemoteDomains: [], hookEvents: [], hostEnhancementKind: [] },
      },
    },
  };
  const repoObj = { id: 8801, full_name: 'alice/demo-plug', owner: { id: 881 }, archived: false, disabled: false, stargazers_count: 10 };

  // Only bad v1.1.0 candidate -> skipped, v1.0.0 preserved
  const onlyBadRes = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: repoObj,
    repoByNumericId: repoObj,
    releases: [{ tagName: 'v1.1.0', commitSha: SHA_2, tarballUrl: 'https://example.invalid/v1.1.0.tar.gz' }],
    tarballBuffersByTag: new Map([['v1.1.0', v110BadTar]]),
    nowIso: '2026-11-27T10:00:00Z',
  });
  assert.equal(onlyBadRes.lockRecord.latest, '1.0.0');
  assert.equal(onlyBadRes.lockRecord.versions['1.1.0'], undefined);
  assert.ok(
    onlyBadRes.events.some((e) => e.startsWith('RELEASE_VALIDATION_FAILED:demo-plug@v1.1.0:') && e.includes('ERR_PLUGIN_JSON_UNKNOWN_KEY')),
    `Expected RELEASE_VALIDATION_FAILED event, got: ${JSON.stringify(onlyBadRes.events)}`,
  );

  // Bad v1.1.0 + good v1.2.0 -> skips v1.1.0 and locks v1.2.0
  const mixedRes = evaluateRepoSyncUpdate({
    ledgerRecord: baseLedger,
    lockRecord: baseLock,
    repoAtOldSlug: repoObj,
    repoByNumericId: repoObj,
    releases: [
      { tagName: 'v1.1.0', commitSha: SHA_2, tarballUrl: 'https://example.invalid/v1.1.0.tar.gz' },
      { tagName: 'v1.2.0', commitSha: SHA_3, tarballUrl: 'https://example.invalid/v1.2.0.tar.gz' },
    ],
    tarballBuffersByTag: new Map([
      ['v1.1.0', v110BadTar],
      ['v1.2.0', v120GoodTar],
    ]),
    nowIso: '2026-11-27T10:00:00Z',
  });
  assert.equal(mixedRes.lockRecord.latest, '1.2.0');
  assert.equal(mixedRes.lockRecord.versions['1.1.0'], undefined);
  assert.ok(mixedRes.lockRecord.versions['1.2.0']);

  // 2. syncAllRegisteredReleases isolates one broken plugin so another valid plugin still syncs & persists
  const tmpRoot = mkdtempSync(join(tmpdir(), 'agy-issue11-sync-'));
  try {
    mkdirSync(join(tmpRoot, 'state'), { recursive: true });
    writeFileSync(
      join(tmpRoot, 'state', 'ledger.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: {
          'broken-plug': {
            canonicalName: 'broken-plug',
            entrySlug: 'alice__broken-plug',
            repoFullName: 'alice/broken-plug',
            repositoryId: 8802,
            ownerId: 882,
            pluginRoot: '.',
            status: 'active',
          },
          'healthy-plug': {
            canonicalName: 'healthy-plug',
            entrySlug: 'bob__healthy-plug',
            repoFullName: 'bob/healthy-plug',
            repositoryId: 8803,
            ownerId: 883,
            pluginRoot: '.',
            status: 'active',
          },
        },
      }),
    );
    writeFileSync(
      join(tmpRoot, 'state', 'versions-lock.json'),
      JSON.stringify({
        schemaVersion: 1,
        locks: {
          'alice__broken-plug': { latest: '1.0.0', versions: {} },
          'bob__healthy-plug': { latest: '1.0.0', versions: {} },
        },
      }),
    );

    const healthyV110 = makeRichPluginTarball({
      name: 'healthy-plug',
      displayName: 'Healthy Plug',
      version: '1.1.0',
      description: 'Antigravity healthy plugin.',
    });

    const syncRes = await syncAllRegisteredReleases({
      repoRoot: tmpRoot,
      token: '',
      nowIso: '2026-11-27T10:00:00Z',
      fetchImpl: async (url) => {
        const s = String(url);
        if (s === 'https://api.github.com/repositories/8802') {
          return new Response(JSON.stringify({ id: 8802, full_name: 'alice/broken-plug', owner: { id: 882 }, archived: false, disabled: false }), { status: 200 });
        }
        if (s === 'https://api.github.com/repos/alice/broken-plug') {
          throw new Error('simulated unexpected crash on broken-plug');
        }
        if (s === 'https://api.github.com/repositories/8803' || s === 'https://api.github.com/repos/bob/healthy-plug') {
          return new Response(JSON.stringify({ id: 8803, full_name: 'bob/healthy-plug', owner: { id: 883 }, archived: false, disabled: false, stargazers_count: 15 }), { status: 200 });
        }
        if (s === 'https://api.github.com/repositories/8803/releases?per_page=10') {
          return new Response(JSON.stringify([{ tag_name: 'v1.1.0', draft: false, prerelease: false, published_at: '2026-11-27T09:00:00Z', assets: [] }]), { status: 200 });
        }
        if (s === 'https://api.github.com/repositories/8803/tags?per_page=10') {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (s === 'https://api.github.com/repositories/8803/commits/v1.1.0') {
          return new Response(JSON.stringify({ sha: SHA_2, commit: { committer: { date: '2026-11-27T09:00:00Z' } } }), { status: 200 });
        }
        if (s.includes('bob/healthy-plug/archive/')) {
          return new Response(healthyV110, { status: 200 });
        }
        return new Response('not found', { status: 404 });
      },
    });

    assert.equal(syncRes.synced, 2);
    assert.ok(
      syncRes.events.some((e) => e.startsWith('PLUGIN_SYNC_FAILED:alice__broken-plug:broken-plug:')),
      `Expected PLUGIN_SYNC_FAILED event, got: ${JSON.stringify(syncRes.events)}`,
    );
    const savedLock = JSON.parse(readFileSync(join(tmpRoot, 'state', 'versions-lock.json'), 'utf8'));
    assert.equal(savedLock.locks['alice__broken-plug'].latest, '1.0.0');
    assert.equal(savedLock.locks['bob__healthy-plug'].latest, '1.1.0');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
