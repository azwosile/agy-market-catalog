#!/usr/bin/env node
// Track-1 Zero-PR Release Sync & Immutable Numeric ID RepoJacking Guard (`scripts/sync-releases.mjs`).
// Uses GraphQL `batchTrack1DualLookup` (`nodes(ids:)` + aliased slug lookup + releases/tags)
// with transparent REST fallback, always-on `computeCapabilityDiff` privilege review,
// 3-strike >=72h `DEPRECATED_GONE` tombstones, `ARCHIVED` tracking, and historical README pruning.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSourceArchiveUrl, compareSemver, parseSemver } from './lib/constants.mjs';
import { fetchWithLimit, TARBALL_FETCH_TIMEOUT_MS } from './lib/discovery-sources.mjs';
import { batchTrack1DualLookup } from './lib/graphql-batch.mjs';
import { computeCapabilityDiff } from './lib/quality-ranker.mjs';
import { inspectTarGzStream } from './lib/tar-stream.mjs';
import { probeNpmMirrorPackage } from './probe-npm.mjs';
import { validatePluginTarball } from './validate-plugin-tarball.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEPRECATED_GONE_MIN_STRIKES = 3;
const DEPRECATED_GONE_MIN_ELAPSED_MS = 72 * 3_600_000; // 72 hours

export function hasCapabilityExpansion(prevCapabilities, nextCapabilities) {
  if (!prevCapabilities) return false;
  const prevBadges = new Set(prevCapabilities.badges || []);
  for (const b of nextCapabilities?.badges || []) {
    if (b !== 'declarative-only' && !prevBadges.has(b)) return true;
  }
  const prevDomains = new Set(prevCapabilities.mcpRemoteDomains || []);
  for (const d of nextCapabilities?.mcpRemoteDomains || []) {
    if (!prevDomains.has(d)) return true;
  }
  return false;
}

/**
 * Strips bulky README fields from non-`latest` historical versions in a lock record
 * while keeping README fields intact on `lockRecord.latest`.
 */
export function stripHistoricalLockReadmes(lockRecord) {
  if (!lockRecord || typeof lockRecord !== 'object' || !lockRecord.versions) return lockRecord;
  const latest = lockRecord.latest;
  for (const [ver, vd] of Object.entries(lockRecord.versions)) {
    if (!vd || typeof vd !== 'object' || ver === latest) continue;
    delete vd.readmeMarkdown;
    delete vd.readmeZhMarkdown;
    delete vd.readmeEnMarkdown;
  }
  return lockRecord;
}

/**
 * Evaluates a single registered Track-1 repository snapshot during scheduled sync:
 *   - Case A: `repoAtOldSlug.id !== ledgerRecord.repositoryId` -> REPOJACKING_BLOCKED
 *   - Missing (`repoByNumericId == null`): 3-strike >=72h -> DEPRECATED_GONE (keeps tombstone!)
 *   - Archived: transitions status to `ARCHIVED`
 *   - Case B: `repoByNumericId.id === ledgerRecord.repositoryId` & same `ownerId` -> seamless rename support
 *   - Always-on `computeCapabilityDiff`:
 *       * ownerChanged + expansion -> OWNERSHIP_TRANSFER_REVIEW (hold release)
 *       * CRITICAL -> PRIVILEGE_REVIEW (hold release)
 *       * MODERATE -> ALLOW + attach `lastEscalation` for client modal
 *   - Verifies existing locked tags for `TAG_MUTATION_BLOCKED` before appending new SemVer releases.
 */
export function evaluateRepoSyncUpdate({
  ledgerRecord,
  lockRecord,
  repoAtOldSlug,
  repoByNumericId,
  releases = [],
  tarballBuffersByTag = new Map(),
  tarInfoByTag = null,
  nowIso = new Date().toISOString(),
}) {
  const updatedLedger = structuredClone(ledgerRecord);
  const updatedLock = structuredClone(lockRecord || { latest: null, versions: {} });
  const events = [];

  // Case A: Different repository recreated at old `owner/repo` URL
  if (repoAtOldSlug && repoAtOldSlug.id !== updatedLedger.repositoryId) {
    // Only if numeric ID lookup also shows original repo is gone or moved elsewhere while impostor sits on old slug
    if (!repoByNumericId || repoByNumericId.full_name === updatedLedger.repoFullName) {
      updatedLedger.status = 'REPOJACKING_BLOCKED';
      events.push(`REPOJACKING_BLOCKED:${updatedLedger.canonicalName}`);
      return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
    }
  }

  // Confirmed gone / 404 by numeric ID -> 3-strike >=72h DEPRECATED_GONE (preserves permanent tombstone!)
  if (!repoByNumericId) {
    const missCount = Number(updatedLedger.missCount || 0) + 1;
    const firstMissedAt = updatedLedger.firstMissedAt || nowIso;
    const elapsedMs = Math.max(0, Date.parse(nowIso) - Date.parse(firstMissedAt));
    updatedLedger.missCount = missCount;
    updatedLedger.firstMissedAt = firstMissedAt;
    updatedLedger.lastCheckedAt = nowIso;

    if (missCount >= DEPRECATED_GONE_MIN_STRIKES && elapsedMs >= DEPRECATED_GONE_MIN_ELAPSED_MS) {
      updatedLedger.status = 'DEPRECATED_GONE';
      events.push(`DEPRECATED_GONE:${updatedLedger.canonicalName}`);
    } else {
      events.push(`MISSING_STRIKE_${missCount}:${updatedLedger.canonicalName}`);
    }
    return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
  }

  // Repo is reachable -> clear any prior 404 miss streak & persist nodeId if provided
  if (updatedLedger.missCount) delete updatedLedger.missCount;
  if (updatedLedger.firstMissedAt) delete updatedLedger.firstMissedAt;
  if (repoByNumericId.node_id && !updatedLedger.nodeId) {
    updatedLedger.nodeId = repoByNumericId.node_id;
  }

  if (repoByNumericId.archived) {
    updatedLedger.status = 'ARCHIVED';
    events.push(`REPO_ARCHIVED:${updatedLedger.canonicalName}`);
    return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
  }
  if (repoByNumericId.disabled) {
    events.push(`SKIPPED_INACTIVE:${updatedLedger.canonicalName}`);
    return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
  }
  if (updatedLedger.status === 'ARCHIVED') {
    updatedLedger.status = 'active';
    events.push(`REPO_UNARCHIVED:${updatedLedger.canonicalName}`);
  }

  // Case B: Repo renamed under same ownerId
  if (
    repoByNumericId.owner?.id === updatedLedger.ownerId &&
    repoByNumericId.full_name &&
    repoByNumericId.full_name !== updatedLedger.repoFullName
  ) {
    updatedLedger.previousRepoFullNames = [
      ...new Set([...(updatedLedger.previousRepoFullNames || []), updatedLedger.repoFullName]),
    ];
    updatedLedger.repoFullName = repoByNumericId.full_name;
    events.push(`REPO_RENAMED:${updatedLedger.canonicalName}->${repoByNumericId.full_name}`);
  }

  const ownerChanged = repoByNumericId.owner?.id && repoByNumericId.owner.id !== updatedLedger.ownerId;
  if (ownerChanged) {
    updatedLedger.pendingOwnerId = repoByNumericId.owner.id;
  }

  // Verify existing locked tags were NOT force-pushed with a mutated commitSha
  for (const rel of releases) {
    const sem = parseSemver(rel.tagName);
    if (!sem) continue;
    const lockedVer = updatedLock.versions?.[sem.version];
    if (lockedVer && rel.commitSha && lockedVer.commitSha !== rel.commitSha) {
      updatedLedger.status = 'TAG_MUTATION_BLOCKED';
      events.push(`TAG_MUTATION_BLOCKED:${updatedLedger.canonicalName}@${rel.tagName}`);
      return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
    }
  }

  // Process any new SemVer releases in chronological/semver order
  const candidateReleases = releases
    .filter((r) => parseSemver(r.tagName) && !r.draft && !r.prerelease)
    .sort((a, b) => compareSemver(a.tagName, b.tagName));

  for (const rel of candidateReleases) {
    const sem = parseSemver(rel.tagName);
    const preInspectedTarInfo = tarInfoByTag?.get(rel.tagName) || null;
    if (updatedLock.versions[sem.version]) {
      // Check sha256 immutability if buffer also supplied
      const buf = tarballBuffersByTag.get(rel.tagName);
      if (buf) {
        let check;
        try {
          check = validatePluginTarball(buf, {
            pluginRoot: updatedLedger.pluginRoot || '.',
            allowScopedName: false,
            fallbackVersion: rel.tagName,
            tarInfo: preInspectedTarInfo,
          });
        } catch (err) {
          const msg = err?.message || String(err);
          console.warn(
            `[sync-releases] Skipping locked release re-validation for ${updatedLedger.canonicalName}@${rel.tagName}: ${msg}`,
          );
          events.push(`RELEASE_VALIDATION_FAILED:${updatedLedger.canonicalName}@${rel.tagName}:${msg}`);
          continue;
        }
        if (check.sha256 !== updatedLock.versions[sem.version].sha256) {
          updatedLedger.status = 'TAG_MUTATION_BLOCKED';
          events.push(`TAG_MUTATION_BLOCKED:${updatedLedger.canonicalName}@${rel.tagName}`);
          return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
        }
      }
      continue;
    }

    const buf = tarballBuffersByTag.get(rel.tagName);
    if (!buf) continue;

    let inspected;
    try {
      inspected = validatePluginTarball(buf, {
        pluginRoot: updatedLedger.pluginRoot || '.',
        allowScopedName: false,
        fallbackVersion: rel.tagName,
        requireSelfContained: Boolean(rel.requireSelfContained),
        tarInfo: preInspectedTarInfo,
      });
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(
        `[sync-releases] Skipping invalid release candidate ${updatedLedger.canonicalName}@${rel.tagName} (preserving locked version ${updatedLock.latest || 'none'}): ${msg}`,
      );
      events.push(`RELEASE_VALIDATION_FAILED:${updatedLedger.canonicalName}@${rel.tagName}:${msg}`);
      continue;
    }

    if (inspected.manifest.name !== updatedLedger.canonicalName) {
      events.push(`NAME_DRIFT_IGNORED:${inspected.manifest.name}!=${updatedLedger.canonicalName}`);
      continue;
    }

    // Always-on capability privilege-escalation diff against current latest locked version
    const prevLatestVer = updatedLock.latest || '';
    const prevLatestCap =
      prevLatestVer && updatedLock.versions?.[prevLatestVer]
        ? updatedLock.versions[prevLatestVer].capabilities
        : null;

    const capDiff = prevLatestCap
      ? computeCapabilityDiff(prevLatestCap, inspected.capabilities, {
          ownerChanged: Boolean(ownerChanged),
          prevVersion: prevLatestVer,
          nextVersion: sem.version,
          scopedFiles: inspected.scopedFiles || null,
        })
      : { severity: 'NONE', action: 'ALLOW', hasExpansion: false, reasons: [], escalation: null };

    // Case C: Ownership transfer + capability expansion -> hold in OWNERSHIP_TRANSFER_REVIEW
    if (ownerChanged && (capDiff.hasExpansion || hasCapabilityExpansion(prevLatestCap, inspected.capabilities))) {
      updatedLedger.status = 'OWNERSHIP_TRANSFER_REVIEW';
      updatedLedger.lastEscalation = {
        fromVersion: prevLatestVer || null,
        toVersion: sem.version,
        severity: capDiff.severity,
        reasons: capDiff.reasons,
        escalation: capDiff.escalation,
        detectedAt: nowIso,
      };
      events.push(`OWNERSHIP_TRANSFER_REVIEW:${updatedLedger.canonicalName}@${sem.version}`);
      return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
    }

    // Always-on CRITICAL privilege escalation (even without ownership transfer!) -> hold in PRIVILEGE_REVIEW
    if (capDiff.action === 'PRIVILEGE_REVIEW') {
      updatedLedger.status = 'PRIVILEGE_REVIEW';
      updatedLedger.lastEscalation = {
        fromVersion: prevLatestVer || null,
        toVersion: sem.version,
        severity: capDiff.severity,
        reasons: capDiff.reasons,
        escalation: capDiff.escalation,
        detectedAt: nowIso,
      };
      events.push(`PRIVILEGE_REVIEW:${updatedLedger.canonicalName}@${sem.version}:${capDiff.reasons.join('|')}`);
      return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events };
    }

    if (ownerChanged) {
      updatedLedger.ownerId = repoByNumericId.owner.id;
      delete updatedLedger.pendingOwnerId;
    }

    const moderateEscalation =
      capDiff.action === 'ESCALATION_MODAL'
        ? {
            fromVersion: prevLatestVer || null,
            toVersion: sem.version,
            severity: capDiff.severity,
            reasons: capDiff.reasons,
            escalation: capDiff.escalation,
            detectedAt: nowIso,
          }
        : null;

    if (moderateEscalation) {
      updatedLedger.lastEscalation = moderateEscalation;
      events.push(`ESCALATION_MODERATE:${updatedLedger.canonicalName}@${sem.version}`);
    }

    updatedLock.versions[sem.version] = {
      gitTag: rel.tagName,
      commitSha: rel.commitSha,
      tarballUrl: rel.tarballUrl,
      sha256: inspected.sha256,
      sizeBytes: inspected.sizeBytes,
      publishedAt: rel.publishedAt || nowIso,
      manifest: inspected.manifest,
      companion: inspected.companion,
      capabilities: inspected.capabilities,
      stars: Number(repoByNumericId.stargazers_count || 0),
      readmeMarkdown: inspected.readmeMarkdown,
      readmeZhMarkdown: inspected.readmeZhMarkdown || '',
      readmeEnMarkdown: inspected.readmeEnMarkdown || '',
      iconExt: inspected.iconArtifact?.ext || null,
      npmMirrorPkg: rel.npmMirrorPkg || null,
      ...(moderateEscalation ? { lastEscalation: moderateEscalation } : {}),
    };

    if (!updatedLock.latest || compareSemver(sem.version, updatedLock.latest) > 0) {
      updatedLock.latest = sem.version;
    }
    events.push(`SYNCED_VERSION:${updatedLedger.canonicalName}@${sem.version}`);
  }

  stripHistoricalLockReadmes(updatedLock);

  return { ledgerRecord: updatedLedger, lockRecord: updatedLock, events, probeNpmMirrorPackage };
}

export function chunkArray(items, size = 60) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export async function syncAllRegisteredReleases({
  repoRoot = REPO_ROOT,
  token = process.env.GITHUB_TOKEN || '',
  fetchImpl = fetch,
  nowIso = new Date().toISOString(),
  useGraphql = true,
} = {}) {
  const ledgerPath = join(repoRoot, 'state', 'ledger.json');
  const lockPath = join(repoRoot, 'state', 'versions-lock.json');
  const iconsDir = join(repoRoot, 'dist', 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { schemaVersion: 1, entries: {} };
  const versionsLock = existsSync(lockPath)
    ? JSON.parse(readFileSync(lockPath, 'utf8'))
    : { schemaVersion: 1, locks: {} };

  const activeRecords = Object.values(ledger.entries).filter(
    (e) => e.status === 'active' || e.status === 'ARCHIVED',
  );
  if (activeRecords.length === 0) {
    return { synced: 0, events: [] };
  }

  if (process.argv.includes('--offline')) {
    console.log('[sync-releases] Offline mode enabled; skipping remote polling.');
    return { synced: 0, events: ['OFFLINE_MODE'] };
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'agy-market-catalog-sync/1.6',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const stateIconsDir = join(repoRoot, 'state', 'icons');
  mkdirSync(stateIconsDir, { recursive: true });

  // Attempt batched GraphQL dual lookup first (`nodes(ids:)` + aliased slug lookup + releases + tags)
  let gqlResults = null;
  if (useGraphql && token) {
    const gqlOut = await batchTrack1DualLookup(activeRecords, {
      batchSize: 25,
      token,
      fetchImpl,
      userAgent: 'agy-market-catalog-sync/1.6',
    });
    if (gqlOut.ok) {
      gqlResults = gqlOut.results;
    }
  }

  async function downloadAndPrepareCandidate({ rec, repoByNumericId, tagName, commitSha, assets, publishedAt }) {
    const sem = parseSemver(tagName);
    if (!sem) return null;
    const asset = (assets || []).find((a) => /\.(?:tar\.gz|tgz)$/i.test(a.name));
    const requireSelfContained = !asset;
    const downloadUrl = asset
      ? asset.browser_download_url || asset.downloadUrl
      : buildSourceArchiveUrl(repoByNumericId.full_name, commitSha, tagName);

    const alreadyLocked = versionsLock.locks[rec.entrySlug]?.versions?.[sem.version];
    let npmMirrorPkg = alreadyLocked?.npmMirrorPkg || null;
    let tarballBuf = null;
    let tarInfo = null;

    if (!alreadyLocked) {
      const dl = await fetchWithLimit(downloadUrl, {
        fetchImpl,
        headers: { 'User-Agent': 'agy-market-catalog-sync/1.6' },
        maxBytes: 0,
        timeoutMs: TARBALL_FETCH_TIMEOUT_MS,
        stallTimeoutMs: TARBALL_FETCH_TIMEOUT_MS,
      });
      if (dl.ok) {
        tarballBuf = dl.buffer;
        try {
          tarInfo = await inspectTarGzStream(tarballBuf);
          const parsed = validatePluginTarball(tarballBuf, {
            pluginRoot: rec.pluginRoot || '.',
            allowScopedName: false,
            fallbackVersion: tagName,
            requireSelfContained,
            tarInfo,
          });
          if (parsed.iconArtifact) {
            const iconFile = `${rec.entrySlug}${parsed.iconArtifact.ext}`;
            writeFileSync(join(stateIconsDir, iconFile), parsed.iconArtifact.sanitizedBuffer);
            writeFileSync(join(iconsDir, iconFile), parsed.iconArtifact.sanitizedBuffer);
          }
          if (parsed.packageJson) {
            npmMirrorPkg = await probeNpmMirrorPackage(parsed.packageJson, repoByNumericId.full_name);
          }
        } catch {
          /* handled inside evaluateRepoSyncUpdate */
        }
      }
    }

    return {
      rel: {
        tagName,
        commitSha,
        tarballUrl: downloadUrl,
        publishedAt,
        npmMirrorPkg,
        requireSelfContained,
      },
      tarballBuf,
      tarInfo,
    };
  }

  const allEvents = [];
  for (const rec of activeRecords) {
    try {
    let repoByNumericId = null;
    let repoAtOldSlug = null;
    const releases = [];
    const tarballBuffersByTag = new Map();
    const tarInfoByTag = new Map();

    const gqlEntry = gqlResults?.get(rec.entrySlug) || null;
    let usedGraphqlForRec = false;

    if (gqlEntry && gqlEntry.status === 'ok' && !gqlEntry.needsRestFallbackById) {
      usedGraphqlForRec = true;
      repoByNumericId = gqlEntry.repoByNumericId;
      repoAtOldSlug = gqlEntry.repoAtOldSlug;

      if (gqlEntry.nodeId && !rec.nodeId) {
        rec.nodeId = gqlEntry.nodeId;
      }

      if (repoByNumericId && !repoByNumericId.archived && !repoByNumericId.disabled) {
        const seenTagNames = new Set();
        const candidateTags = [];

        for (const r of gqlEntry.releases || []) {
          const sem = parseSemver(r.tagName);
          if (!sem || sem.prerelease.length > 0 || r.isDraft || r.isPrerelease || !r.commitSha) continue;
          seenTagNames.add(r.tagName);
          candidateTags.push({
            tagName: r.tagName,
            commitSha: r.commitSha,
            assets: r.assets || [],
            publishedAt: r.publishedAt || null,
          });
        }
        for (const t of gqlEntry.tags || []) {
          if (!t?.name || seenTagNames.has(t.name) || !t.commitSha) continue;
          const sem = parseSemver(t.name);
          if (!sem || sem.prerelease.length > 0) continue;
          seenTagNames.add(t.name);
          candidateTags.push({
            tagName: t.name,
            commitSha: t.commitSha,
            assets: [],
            publishedAt: t.committedDate || null,
          });
        }

        for (const cand of candidateTags) {
          const prepared = await downloadAndPrepareCandidate({ rec, repoByNumericId, ...cand });
          if (!prepared) continue;
          if (prepared.tarballBuf) tarballBuffersByTag.set(cand.tagName, prepared.tarballBuf);
          if (prepared.tarInfo) tarInfoByTag.set(cand.tagName, prepared.tarInfo);
          releases.push(prepared.rel);
        }
      }
    }

    // Transparent REST fallback (unauthenticated, GraphQL error, or first-run `needsRestFallbackById`)
    if (!usedGraphqlForRec) {
      let byIdRes;
      try {
        byIdRes = await fetchImpl(`https://api.github.com/repositories/${rec.repositoryId}`, {
          headers,
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        allEvents.push(`SKIPPED_NETWORK_ERROR:${rec.canonicalName}`);
        continue;
      }
      if (byIdRes.status !== 200 && byIdRes.status !== 404) {
        allEvents.push(`SKIPPED_API_${byIdRes.status}:${rec.canonicalName}`);
        continue;
      }
      repoByNumericId = byIdRes.ok ? await byIdRes.json() : null;
      if (repoByNumericId?.node_id && !rec.nodeId) {
        rec.nodeId = repoByNumericId.node_id;
      }

      const bySlugRes = await fetchImpl(`https://api.github.com/repos/${rec.repoFullName}`, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (bySlugRes.status !== 200 && bySlugRes.status !== 404) {
        allEvents.push(`SKIPPED_API_${bySlugRes.status}:${rec.canonicalName}`);
        continue;
      }
      repoAtOldSlug = bySlugRes.ok ? await bySlugRes.json() : null;

      if (repoByNumericId && !repoByNumericId.archived && !repoByNumericId.disabled) {
        const relRes = await fetchImpl(`https://api.github.com/repositories/${rec.repositoryId}/releases?per_page=10`, {
          headers,
          signal: AbortSignal.timeout(15_000),
        });
        const rawRels = relRes.ok ? await relRes.json() : [];
        const seenTagNames = new Set();
        const candidateTags = [];

        for (const r of Array.isArray(rawRels) ? rawRels : []) {
          const sem = parseSemver(r.tag_name);
          if (!sem || sem.prerelease.length > 0 || r.draft || r.prerelease) continue;
          seenTagNames.add(r.tag_name);
          candidateTags.push({
            tagName: r.tag_name,
            assets: r.assets || [],
            publishedAt: r.published_at || null,
          });
        }

        const tagsRes = await fetchImpl(`https://api.github.com/repositories/${rec.repositoryId}/tags?per_page=10`, {
          headers,
          signal: AbortSignal.timeout(15_000),
        });
        const rawTags = tagsRes.ok ? await tagsRes.json() : [];
        for (const t of Array.isArray(rawTags) ? rawTags : []) {
          if (!t?.name || seenTagNames.has(t.name)) continue;
          const sem = parseSemver(t.name);
          if (!sem || sem.prerelease.length > 0) continue;
          seenTagNames.add(t.name);
          candidateTags.push({
            tagName: t.name,
            assets: [],
            publishedAt: null,
          });
        }

        for (const r of candidateTags) {
          const refRes = await fetchImpl(
            `https://api.github.com/repositories/${rec.repositoryId}/commits/${encodeURIComponent(r.tagName)}`,
            { headers, signal: AbortSignal.timeout(15_000) },
          );
          if (!refRes.ok) continue;
          const refJson = await refRes.json();
          const publishedAt =
            r.publishedAt || refJson?.commit?.committer?.date || refJson?.commit?.author?.date || null;
          const prepared = await downloadAndPrepareCandidate({
            rec,
            repoByNumericId,
            tagName: r.tagName,
            commitSha: refJson.sha,
            assets: r.assets,
            publishedAt,
          });
          if (!prepared) continue;
          if (prepared.tarballBuf) tarballBuffersByTag.set(r.tagName, prepared.tarballBuf);
          if (prepared.tarInfo) tarInfoByTag.set(r.tagName, prepared.tarInfo);
          releases.push(prepared.rel);
        }
      }
    }

    const out = evaluateRepoSyncUpdate({
      ledgerRecord: rec,
      lockRecord: versionsLock.locks[rec.entrySlug],
      repoAtOldSlug,
      repoByNumericId,
      releases,
      tarballBuffersByTag,
      tarInfoByTag,
      nowIso,
    });
    ledger.entries[rec.canonicalName] = out.ledgerRecord;
    versionsLock.locks[rec.entrySlug] = out.lockRecord;
    allEvents.push(...out.events);
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(
        `[sync-releases] Isolated per-plugin sync failure for ${rec.entrySlug} (${rec.canonicalName}): ${msg}`,
      );
      allEvents.push(`PLUGIN_SYNC_FAILED:${rec.entrySlug}:${rec.canonicalName}:${msg}`);
    }
  }

  // Prune historical READMEs across all lock entries before persisting
  for (const lockRec of Object.values(versionsLock.locks || {})) {
    stripHistoricalLockReadmes(lockRec);
  }

  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  writeFileSync(lockPath, `${JSON.stringify(versionsLock, null, 2)}\n`, 'utf8');
  return { synced: activeRecords.length, events: allEvents };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const res = await syncAllRegisteredReleases();
  console.log(`[sync-releases] Checked ${res.synced} plugins (${res.events.length} events)`);
}
