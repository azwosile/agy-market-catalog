#!/usr/bin/env node
// Deterministic Static Feed Compiler (`scripts/build-catalog.mjs`).
// Compiles `state/ledger.json` + `state/versions-lock.json` + `data/plugins/*.yml` + `state/unverified-cache.json`
// into:
//   - `dist/index.json` (Track-1 verified plugins w/ calibrated `ranking`)
//   - `dist/unverified-index.json` (Track-2 experimental plugins w/ calibrated `ranking`)
//   - `dist/readmes/<id>.json` (per-plugin lazy README files `{ id, default, zh, en }`)
//   - `dist/readmes-verified.json` (compact Track-1 README bundle)
//   - `dist/readmes.json` (backward-compatible full README bundle for v1.5.x clients)
//   - `dist/icons/*` (with optional `--gc-icons` orphan pruning)

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_CATALOG_BASE_URL, normalizeRelPosix, toScopedPluginName } from './lib/constants.mjs';
import { computeQualityScore } from './lib/quality-ranker.mjs';
import { inferPluginTaxonomy } from './lib/taxonomy-classifier.mjs';
import { validateEntriesDirectory } from './validate-entries.mjs';
import { containsChineseCjk, isPredominantlyChinese } from './validate-plugin-tarball.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

export function computeCatalogVersion(now = new Date(), runSeq = 1) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}.${mm}${dd}.${runSeq}`;
}

function safeReadmeFilename(id) {
  return String(id || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function repoCountKey(plugin) {
  const rid = Number(plugin?.repository?.repositoryId || 0);
  if (rid > 0) return `id:${rid}`;
  return `url:${String(plugin?.repository?.url || plugin?.id || '').toLowerCase().replace(/\/+$/, '')}`;
}

function attachRankingStatusMeta(ranking, entry, rawStatus, nowMs) {
  const normStatus = String(rawStatus || entry?.status || 'active').toUpperCase();
  const archived = normStatus === 'ARCHIVED' || Boolean(entry?.repository?.archived);
  const ts = Date.parse(entry?.updatedAt || entry?.repository?.pushedAt || '');
  const dtDays = Number.isFinite(ts) ? Math.max(0, (nowMs - ts) / 86_400_000) : 0;
  const stale = normStatus === 'STALE_WARNING' || (!archived && dtDays > 180);
  const effectiveStatus = archived ? 'ARCHIVED' : normStatus;
  return {
    ...ranking,
    archived,
    stale,
    ...(effectiveStatus !== 'ACTIVE' ? { status: effectiveStatus } : {}),
  };
}

export function loadPerPluginReadmesDir(dirPath) {
  const entries = {};
  const entriesZh = {};
  const entriesEn = {};
  if (!dirPath || !existsSync(dirPath)) {
    return { entries, entriesZh, entriesEn };
  }
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith('.json')) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(dirPath, file), 'utf8'));
      const id = String(parsed?.id || file.slice(0, -5));
      if (!id) continue;
      if (typeof parsed?.default === 'string' && parsed.default) entries[id] = parsed.default;
      if (typeof parsed?.zh === 'string' && parsed.zh) entriesZh[id] = parsed.zh;
      if (typeof parsed?.en === 'string' && parsed.en) entriesEn[id] = parsed.en;
    } catch {
      /* ignore corrupt seeded readme JSON */
    }
  }
  return { entries, entriesZh, entriesEn };
}

function sortRecordKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj || {}).sort((a, b) => a.localeCompare(b))) {
    out[k] = obj[k];
  }
  return out;
}

export function compileCatalogArtifacts({
  entries = [],
  ledger = { schemaVersion: 1, entries: {} },
  versionsLock = { schemaVersion: 1, locks: {} },
  unverifiedCache = { schemaVersion: 1, plugins: [], readmes: {}, readmesZh: {}, readmesEn: {} },
  seededReadmes = { entries: {}, entriesZh: {}, entriesEn: {} },
  catalogBaseUrl = process.env.AGY_MARKET_CATALOG_BASE_URL || DEFAULT_CATALOG_BASE_URL,
  generatedAt = new Date().toISOString(),
  catalogVersion = computeCatalogVersion(new Date(generatedAt)),
} = {}) {
  const nowMs = Date.parse(generatedAt) || Date.now();
  const entryMap = new Map(entries.map((e) => [e.entrySlug, e]));
  const verifiedPlugins = [];

  const readmes = { ...(seededReadmes?.entries || {}), ...(unverifiedCache.readmes || {}) };
  const readmesZh = { ...(seededReadmes?.entriesZh || {}), ...(unverifiedCache.readmesZh || {}) };
  const readmesEn = { ...(seededReadmes?.entriesEn || {}), ...(unverifiedCache.readmesEn || {}) };
  const verifiedReadmes = {};
  const verifiedReadmesZh = {};
  const verifiedReadmesEn = {};

  const sortedLedgerRecords = Object.values(ledger.entries || {}).sort((a, b) =>
    String(a.entrySlug).localeCompare(String(b.entrySlug)),
  );

  for (const rec of sortedLedgerRecords) {
    // Exclude hard-blocked RepoJacking & confirmed gone tombstones from active index
    if (rec.status === 'REPOJACKING_BLOCKED' || rec.status === 'DEPRECATED_GONE') continue;

    const lock = versionsLock.locks?.[rec.entrySlug];
    if (!lock?.latest || !lock.versions?.[lock.latest]) continue;

    const verData = lock.versions[lock.latest];
    const yamlEntry = entryMap.get(rec.entrySlug);
    const manifest = verData.manifest || {};
    const companion = verData.companion || {};
    const owner = String(rec.repoFullName || '').split('/')[0] || rec.entrySlug.split('__')[0];

    const description = yamlEntry?.description || {
      zh: manifest.description || '',
      en: manifest.description || '',
    };

    const resolvedTaxonomy = inferPluginTaxonomy({
      id: rec.entrySlug,
      canonicalName: rec.canonicalName,
      displayName: manifest.displayName || rec.canonicalName,
      description,
      capabilities: verData.capabilities || {},
      existingCategories: companion.categories || [],
      existingTags: companion.tags || [],
      yamlCategory: yamlEntry?.category || '',
      readmeText: verData.readmeMarkdown || '',
    });

    const categories = resolvedTaxonomy.categories.length
      ? resolvedTaxonomy.categories
      : yamlEntry?.category
        ? [yamlEntry.category]
        : ['productivity'];

    const iconUrl = verData.iconExt ? `${catalogBaseUrl}/icons/${rec.entrySlug}${verData.iconExt}` : null;

    if (verData.readmeMarkdown) {
      readmes[rec.entrySlug] = verData.readmeMarkdown;
      verifiedReadmes[rec.entrySlug] = verData.readmeMarkdown;
    }

    if (typeof verData.readmeZhMarkdown === 'string') {
      if (verData.readmeZhMarkdown) {
        readmesZh[rec.entrySlug] = verData.readmeZhMarkdown;
        verifiedReadmesZh[rec.entrySlug] = verData.readmeZhMarkdown;
      }
    } else if (verData.readmeMarkdown && isPredominantlyChinese(verData.readmeMarkdown)) {
      readmesZh[rec.entrySlug] = verData.readmeMarkdown;
      verifiedReadmesZh[rec.entrySlug] = verData.readmeMarkdown;
    }

    if (typeof verData.readmeEnMarkdown === 'string') {
      if (verData.readmeEnMarkdown) {
        readmesEn[rec.entrySlug] = verData.readmeEnMarkdown;
        verifiedReadmesEn[rec.entrySlug] = verData.readmeEnMarkdown;
      }
    } else if (
      verData.readmeMarkdown &&
      (!containsChineseCjk(verData.readmeMarkdown) || !isPredominantlyChinese(verData.readmeMarkdown))
    ) {
      readmesEn[rec.entrySlug] = verData.readmeMarkdown;
      verifiedReadmesEn[rec.entrySlug] = verData.readmeMarkdown;
    }

    const baseVerified = {
      id: rec.entrySlug,
      canonicalName: rec.canonicalName,
      scopedName: toScopedPluginName(owner, rec.canonicalName),
      forceScopedInstall: false,
      displayName: manifest.displayName || rec.canonicalName,
      description,
      version: lock.latest,
      gitTag: verData.gitTag,
      commitSha: verData.commitSha,
      repository: {
        url: `https://github.com/${rec.repoFullName}`,
        repositoryId: rec.repositoryId,
        ownerId: rec.ownerId,
        stars: Number(verData.stars || 0),
        pluginRoot: rec.pluginRoot || '.',
      },
      distribution: {
        tarballUrl: verData.tarballUrl,
        sha256: verData.sha256,
        sizeBytes: Number(verData.sizeBytes || 0),
        npmMirrorPkg: verData.npmMirrorPkg || null,
        preservePaths: [
          ...new Set(
            [
              ...(Array.isArray(companion.preservePaths) ? companion.preservePaths : []),
              ...(Array.isArray(yamlEntry?.preservePaths) ? yamlEntry.preservePaths : []),
            ].filter((p) => typeof p === 'string' && p.trim().length > 0),
          ),
        ],
      },
      media: {
        iconUrl,
        screenshots: companion.screenshots || [],
      },
      taxonomy: {
        categories,
        tags: resolvedTaxonomy.tags,
        platforms: companion.platforms?.length ? companion.platforms : ['win32', 'darwin', 'linux'],
      },
      capabilities: verData.capabilities || {
        badges: [],
        rulesEstimatedTokens: 0,
        mcpServers: [],
        mcpRemoteDomains: [],
        hookEvents: [],
        hostEnhancementKind: [],
      },
      ...(rec.status && rec.status !== 'active' ? { status: rec.status } : {}),
      ...(verData.lastEscalation || rec.lastEscalation
        ? { lastEscalation: verData.lastEscalation || rec.lastEscalation }
        : {}),
      updatedAt: verData.publishedAt || generatedAt,
    };

    const rmDefault = verifiedReadmes[rec.entrySlug] || '';
    const isBilingualReadme = Boolean(verifiedReadmesZh[rec.entrySlug] && verifiedReadmesEn[rec.entrySlug]);
    baseVerified.ranking = attachRankingStatusMeta(
      computeQualityScore(baseVerified, {
        track: 'verified',
        repoPluginCount: 1,
        nowMs,
        status: rec.status || 'active',
        metadata: {
          readmeLength: rmDefault.length,
          isBilingualReadme,
          strictManifest: true,
          hasCompanion: Boolean(verData.companion && Object.keys(verData.companion).length > 0),
          hasSuggestedPrompts: Boolean(Array.isArray(manifest.suggestedPrompts) && manifest.suggestedPrompts.length > 0),
          hasUnreviewedEscalation:
            rec.status === 'PRIVILEGE_REVIEW' || rec.status === 'OWNERSHIP_TRANSFER_REVIEW',
        },
      }),
      baseVerified,
      rec.status || 'active',
      nowMs,
    );

    verifiedPlugins.push(baseVerified);
  }

  const track1Ids = new Set(verifiedPlugins.map((p) => p.id));
  const track1RepoRoots = new Set(
    verifiedPlugins
      .filter((p) => Number(p.repository?.repositoryId) > 0)
      .map((p) => `${p.repository.repositoryId}:${normalizeRelPosix(p.repository?.pluginRoot || '.')}`),
  );
  const track1RepoUrlRoots = new Set(
    verifiedPlugins
      .filter((p) => p.repository?.url)
      .map(
        (p) =>
          `${String(p.repository.url).toLowerCase().replace(/\/+$/, '')}:${normalizeRelPosix(p.repository?.pluginRoot || '.')}`,
      ),
  );

  // Pre-pass: deduplicate Track-2 entries and compute per-repo plugin counts for monorepo star deflation
  const seenUnverifiedIds = new Set();
  const seenUnverifiedRepoRoots = new Set();
  const filteredUnverified = [];
  const unverifiedRepoCounts = new Map();

  for (const p of unverifiedCache.plugins || []) {
    if (!p || !p.id) continue;
    const normRoot = normalizeRelPosix(p.repository?.pluginRoot || '.');
    const repoId = Number(p.repository?.repositoryId || 0);
    const repoRootKey = repoId > 0 ? `${repoId}:${normRoot}` : '';
    const repoUrlRootKey = p.repository?.url
      ? `${String(p.repository.url).toLowerCase().replace(/\/+$/, '')}:${normRoot}`
      : '';
    if (track1Ids.has(p.id)) continue;
    if (repoRootKey && track1RepoRoots.has(repoRootKey)) continue;
    if (repoUrlRootKey && track1RepoUrlRoots.has(repoUrlRootKey)) continue;
    if (seenUnverifiedIds.has(p.id)) continue;
    if (repoRootKey && seenUnverifiedRepoRoots.has(repoRootKey)) continue;
    seenUnverifiedIds.add(p.id);
    if (repoRootKey) seenUnverifiedRepoRoots.add(repoRootKey);
    filteredUnverified.push({ p, normRoot });
    const rk = repoCountKey(p);
    unverifiedRepoCounts.set(rk, (unverifiedRepoCounts.get(rk) || 0) + 1);
  }

  const unverifiedPlugins = [];
  const readmeMetaMap = unverifiedCache.readmeMeta || {};

  for (const { p, normRoot } of filteredUnverified) {
    const rawCategories = Array.isArray(p.taxonomy?.categories) ? p.taxonomy.categories : [];
    const rawTags = Array.isArray(p.taxonomy?.tags) ? p.taxonomy.tags : [];
    const platforms = p.taxonomy?.platforms?.length ? p.taxonomy.platforms : ['win32', 'darwin', 'linux'];
    const needsTaxonomyUpgrade =
      rawCategories.length === 0 ||
      rawCategories.every((c) => c === 'other') ||
      (rawTags.length === 1 && rawTags[0] === 'experimental');
    const resolvedUnverifiedTaxonomy = needsTaxonomyUpgrade
      ? {
          ...inferPluginTaxonomy({
            id: p.id,
            canonicalName: p.canonicalName,
            displayName: p.displayName,
            description: p.description,
            capabilities: p.capabilities || {},
            existingCategories: rawCategories,
            existingTags: rawTags,
            readmeText: readmes[p.id] || '',
          }),
          platforms,
        }
      : {
          categories: rawCategories,
          tags: rawTags,
          platforms,
          ...(p.taxonomy?.taxonomyVersion ? { taxonomyVersion: p.taxonomy.taxonomyVersion } : {}),
        };

    const rmMeta = readmeMetaMap[p.id] || null;
    const readmeLen =
      typeof rmMeta?.defaultBytes === 'number'
        ? rmMeta.defaultBytes
        : typeof readmes[p.id] === 'string'
          ? readmes[p.id].length
          : undefined;
    const isBilingual =
      typeof rmMeta?.isBilingual === 'boolean'
        ? rmMeta.isBilingual
        : readmesZh[p.id] !== undefined || readmesEn[p.id] !== undefined
          ? Boolean(readmesZh[p.id] && readmesEn[p.id])
          : undefined;

    const entry = {
      ...p,
      repository: {
        ...p.repository,
        pluginRoot: normRoot,
      },
      taxonomy: resolvedUnverifiedTaxonomy,
      forceScopedInstall: true,
    };
    if (entry._liveness) delete entry._liveness;

    const structuralMeta = p.structuralMeta && typeof p.structuralMeta === 'object' ? p.structuralMeta : {};
    const track2Status = p.repository?.archived ? 'ARCHIVED' : p.status || 'active';
    entry.ranking = attachRankingStatusMeta(
      computeQualityScore(entry, {
        track: 'unverified',
        repoPluginCount: unverifiedRepoCounts.get(repoCountKey(p)) || 1,
        nowMs,
        authenticityScore: p.authenticity?.score,
        compatTier: p.authenticity?.compatTier,
        status: track2Status,
        metadata: {
          ...structuralMeta,
          ...(readmeLen !== undefined ? { readmeLength: readmeLen } : {}),
          ...(isBilingual !== undefined ? { isBilingualReadme: isBilingual } : {}),
        },
      }),
      entry,
      track2Status,
      nowMs,
    );

    unverifiedPlugins.push(entry);
  }

  // Build active per-plugin README map (for lazy `dist/readmes/<id>.json` emission)
  const activeIds = new Set([...verifiedPlugins.map((p) => p.id), ...unverifiedPlugins.map((p) => p.id)]);
  const perPluginReadmes = new Map();
  const activeReadmes = {};
  const activeReadmesZh = {};
  const activeReadmesEn = {};

  for (const id of [...activeIds].sort((a, b) => a.localeCompare(b))) {
    const def = readmes[id] || '';
    const zh = readmesZh[id] || '';
    const en = readmesEn[id] || '';
    if (def) activeReadmes[id] = def;
    if (zh) activeReadmesZh[id] = zh;
    if (en) activeReadmesEn[id] = en;
    if (def || zh || en) {
      perPluginReadmes.set(id, { id, default: def, zh, en });
    }
  }

  const indexJson = {
    schemaVersion: 1,
    track: 'verified',
    generatedAt,
    catalogVersion,
    plugins: verifiedPlugins,
  };

  const unverifiedIndexJson = {
    schemaVersion: 1,
    track: 'unverified',
    generatedAt,
    catalogVersion,
    plugins: unverifiedPlugins,
  };

  const readmesJson = {
    schemaVersion: 1,
    generatedAt,
    entries: activeReadmes,
    entriesZh: activeReadmesZh,
    entriesEn: activeReadmesEn,
  };

  const readmesVerifiedJson = {
    schemaVersion: 1,
    generatedAt,
    entries: sortRecordKeys(verifiedReadmes),
    entriesZh: sortRecordKeys(verifiedReadmesZh),
    entriesEn: sortRecordKeys(verifiedReadmesEn),
  };

  return { indexJson, unverifiedIndexJson, readmesJson, readmesVerifiedJson, perPluginReadmes };
}

export function parseBuildCliArgs(argv = process.argv.slice(2)) {
  const opts = {
    seedReadmesDir: '',
    gcIcons: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed-readmes-dir' && i + 1 < argv.length) {
      opts.seedReadmesDir = argv[++i];
    } else if (arg.startsWith('--seed-readmes-dir=')) {
      opts.seedReadmesDir = arg.slice('--seed-readmes-dir='.length);
    } else if (arg === '--gc-icons') {
      opts.gcIcons = true;
    }
  }
  return opts;
}

export function buildCatalogToDisk({
  repoRoot = REPO_ROOT,
  generatedAt,
  catalogVersion,
  seedReadmesDir = '',
  gcIcons = false,
} = {}) {
  const entries = validateEntriesDirectory(join(repoRoot, 'data', 'plugins'));
  const ledgerPath = join(repoRoot, 'state', 'ledger.json');
  const lockPath = join(repoRoot, 'state', 'versions-lock.json');
  const unverifiedPath = join(repoRoot, 'state', 'unverified-cache.json');

  const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { schemaVersion: 1, entries: {} };
  const versionsLock = existsSync(lockPath)
    ? JSON.parse(readFileSync(lockPath, 'utf8'))
    : { schemaVersion: 1, locks: {} };
  const unverifiedCache = existsSync(unverifiedPath)
    ? JSON.parse(readFileSync(unverifiedPath, 'utf8'))
    : { schemaVersion: 2, plugins: [], readmeMeta: {} };

  const distDir = join(repoRoot, 'dist');
  const distReadmesDir = join(distDir, 'readmes');

  // Seed per-plugin READMEs from explicit `--seed-readmes-dir` (e.g. origin/gh-pages) and local `dist/readmes/`
  const seededReadmes = { entries: {}, entriesZh: {}, entriesEn: {} };
  const dirsToSeed = [];
  if (seedReadmesDir) dirsToSeed.push(resolve(repoRoot, seedReadmesDir));
  dirsToSeed.push(distReadmesDir);

  for (const dir of dirsToSeed) {
    const loaded = loadPerPluginReadmesDir(dir);
    Object.assign(seededReadmes.entries, loaded.entries);
    Object.assign(seededReadmes.entriesZh, loaded.entriesZh);
    Object.assign(seededReadmes.entriesEn, loaded.entriesEn);
  }

  const { indexJson, unverifiedIndexJson, readmesJson, readmesVerifiedJson, perPluginReadmes } = compileCatalogArtifacts({
    entries,
    ledger,
    versionsLock,
    unverifiedCache,
    seededReadmes,
    generatedAt,
    catalogVersion,
  });

  const distIconsDir = join(distDir, 'icons');
  const stateIconsDir = join(repoRoot, 'state', 'icons');
  mkdirSync(distIconsDir, { recursive: true });
  mkdirSync(distReadmesDir, { recursive: true });

  // Active icons set for optional `--gc-icons`
  const activeIconFiles = new Set();
  for (const p of [...indexJson.plugins, ...unverifiedIndexJson.plugins]) {
    if (p.media?.iconUrl) {
      activeIconFiles.add(basename(p.media.iconUrl));
    }
  }

  let gcRemovedIcons = 0;
  if (gcIcons) {
    if (existsSync(stateIconsDir)) {
      for (const iconFile of readdirSync(stateIconsDir)) {
        if (iconFile.startsWith('.')) continue;
        if (!activeIconFiles.has(iconFile)) {
          rmSync(join(stateIconsDir, iconFile), { force: true });
          gcRemovedIcons += 1;
        }
      }
    }
    for (const iconFile of readdirSync(distIconsDir)) {
      if (iconFile.startsWith('.')) continue;
      if (!activeIconFiles.has(iconFile)) {
        rmSync(join(distIconsDir, iconFile), { force: true });
      }
    }
  }

  if (existsSync(stateIconsDir)) {
    for (const iconFile of readdirSync(stateIconsDir)) {
      if (iconFile.startsWith('.')) continue;
      cpSync(join(stateIconsDir, iconFile), join(distIconsDir, iconFile));
    }
  }

  // Emit per-plugin lazy README JSONs (`dist/readmes/<id>.json`)
  for (const [id, payload] of perPluginReadmes.entries()) {
    writeFileSync(join(distReadmesDir, `${safeReadmeFilename(id)}.json`), `${JSON.stringify(payload)}\n`, 'utf8');
  }

  writeFileSync(join(distDir, 'index.json'), `${JSON.stringify(indexJson, null, 2)}\n`, 'utf8');
  writeFileSync(join(distDir, 'unverified-index.json'), `${JSON.stringify(unverifiedIndexJson, null, 2)}\n`, 'utf8');
  writeFileSync(join(distDir, 'readmes.json'), `${JSON.stringify(readmesJson, null, 2)}\n`, 'utf8');
  writeFileSync(join(distDir, 'readmes-verified.json'), `${JSON.stringify(readmesVerifiedJson, null, 2)}\n`, 'utf8');

  return {
    distDir,
    distReadmesDir,
    indexJson,
    unverifiedIndexJson,
    readmesJson,
    readmesVerifiedJson,
    perPluginReadmesCount: perPluginReadmes.size,
    gcRemovedIcons,
  };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const cliOpts = parseBuildCliArgs(process.argv.slice(2));
  const out = buildCatalogToDisk(cliOpts);
  console.log(
    `[build-catalog] Built dist/index.json (${out.indexJson.plugins.length} verified), dist/unverified-index.json (${out.unverifiedIndexJson.plugins.length} experimental), dist/readmes/<id>.json (${out.perPluginReadmesCount} files), dist/readmes-verified.json, & dist/readmes.json (entries=${Object.keys(out.readmesJson.entries).length}, zh=${Object.keys(out.readmesJson.entriesZh).length}, en=${Object.keys(out.readmesJson.entriesEn).length}, gcRemovedIcons=${out.gcRemovedIcons})`,
  );
}
