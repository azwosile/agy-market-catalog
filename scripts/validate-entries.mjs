#!/usr/bin/env node
// Tier-1 zero-secret YAML entry validator (`scripts/validate-entries.mjs`).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ALLOWED_CATEGORIES,
  ENTRY_FILENAME_RE,
  MAX_DELETED_ENTRIES_PER_PR,
  MAX_ENTRIES_PER_PR,
  normalizeRelPosix,
  parseSubmissionYaml,
  SUBMISSION_YAML_ALLOWED_KEYS,
} from './lib/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

export function validateSingleEntryFile(filename, rawYaml) {
  const base = basename(filename);
  const slugMatch = ENTRY_FILENAME_RE.exec(base);
  if (!slugMatch) {
    throw new Error(
      `ERR_ENTRY_FILENAME: "${base}" must match <owner>__<repo>[--<subpath>].yml (lowercase alphanumeric, "__" between owner and repo)`,
    );
  }
  const [, expectedOwner, expectedRepo, subpathSlug] = slugMatch;
  const entrySlug = base.slice(0, -4);

  const parsed = parseSubmissionYaml(rawYaml);
  for (const key of Object.keys(parsed)) {
    if (key === 'sha256' || key === 'npm' || key === 'npmMirrorPkg' || key === 'repositoryId' || key === 'ownerId') {
      throw new Error(`ERR_FORBIDDEN_HANDWRITTEN_KEY: "${key}" is machine-computed and forbidden in submission YAML`);
    }
    if (!SUBMISSION_YAML_ALLOWED_KEYS.has(key)) {
      throw new Error(`ERR_UNKNOWN_YAML_KEY: Disallowed key "${key}" in ${base}`);
    }
  }

  if (typeof parsed.url !== 'string' || !parsed.url.trim()) {
    throw new Error(`ERR_MISSING_URL: "url" is required in ${base}`);
  }
  const urlMatch = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)\/?$/.exec(parsed.url.trim());
  if (!urlMatch) {
    throw new Error(`ERR_INVALID_GITHUB_URL: "${parsed.url}" must be https://github.com/<owner>/<repo>`);
  }
  const [, urlOwner, urlRepo] = urlMatch;
  if (urlOwner.toLowerCase() !== expectedOwner || urlRepo.toLowerCase() !== expectedRepo) {
    throw new Error(
      `ERR_SLUG_URL_MISMATCH: Filename "${base}" expects ${expectedOwner}/${expectedRepo}, but url points to ${urlOwner}/${urlRepo}`,
    );
  }

  const pluginRoot = normalizeRelPosix(parsed.pluginRoot || '.');
  if (pluginRoot.startsWith('/') || pluginRoot.includes('..') || /^[A-Za-z]:/.test(pluginRoot)) {
    throw new Error(`ERR_UNSAFE_PLUGIN_ROOT: Invalid pluginRoot "${parsed.pluginRoot}" in ${base}`);
  }
  if (subpathSlug && pluginRoot === '.') {
    throw new Error(
      `ERR_SUBPATH_MISMATCH: Entry "${base}" includes "--${subpathSlug}" suffix so pluginRoot must not be "."`,
    );
  }

  if (typeof parsed.category !== 'string' || !ALLOWED_CATEGORIES.has(parsed.category)) {
    throw new Error(
      `ERR_INVALID_CATEGORY: "${parsed.category}" in ${base} must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}`,
    );
  }

  if (!parsed.description || typeof parsed.description !== 'object' || Array.isArray(parsed.description)) {
    throw new Error(`ERR_INVALID_DESCRIPTION: "description" must be an object with { zh, en } in ${base}`);
  }
  for (const dk of Object.keys(parsed.description)) {
    if (dk !== 'zh' && dk !== 'en') {
      throw new Error(`ERR_INVALID_DESCRIPTION_LOCALE: Unsupported locale "${dk}" in ${base}`);
    }
  }
  if (typeof parsed.description.zh !== 'string' || parsed.description.zh.trim().length < 2) {
    throw new Error(`ERR_DESCRIPTION_ZH: "description.zh" must be at least 2 characters in ${base}`);
  }
  if (typeof parsed.description.en !== 'string' || parsed.description.en.trim().length < 2) {
    throw new Error(`ERR_DESCRIPTION_EN: "description.en" must be at least 2 characters in ${base}`);
  }

  if (parsed.releaseAsset !== undefined) {
    if (
      typeof parsed.releaseAsset !== 'string' ||
      !/^[A-Za-z0-9._-]+\.(?:tar\.gz|tgz)$/.test(parsed.releaseAsset)
    ) {
      throw new Error(`ERR_INVALID_RELEASE_ASSET: "${parsed.releaseAsset}" must be a .tar.gz or .tgz asset filename`);
    }
  }

  let preservePaths = [];
  if (parsed.preservePaths !== undefined) {
    if (!Array.isArray(parsed.preservePaths)) {
      throw new Error(`ERR_INVALID_PRESERVE_PATHS: "preservePaths" must be an array of relative path strings in ${base}`);
    }
    if (parsed.preservePaths.length > 64) {
      throw new Error(`ERR_INVALID_PRESERVE_PATHS: "preservePaths" exceeds 64 items in ${base}`);
    }
    const deduped = new Set();
    for (const rawItem of parsed.preservePaths) {
      if (typeof rawItem !== 'string') {
        throw new Error(`ERR_INVALID_PRESERVE_PATHS: "preservePaths" entries must be strings in ${base}`);
      }
      if (/[\x00-\x1f\x7f]/.test(rawItem)) {
        throw new Error(`ERR_INVALID_PRESERVE_PATHS: "preservePaths" contains control characters in ${base}`);
      }
      const trimmed = rawItem.trim();
      if (trimmed.length < 1 || trimmed.length > 200) {
        throw new Error(`ERR_INVALID_PRESERVE_PATHS: "preservePaths" items must be 1..200 characters in ${base}`);
      }
      if (/^[/\\]/.test(trimmed) || /^[A-Za-z]:/.test(trimmed)) {
        throw new Error(`ERR_UNSAFE_PRESERVE_PATH: Absolute or drive-prefixed preservePath "${rawItem}" is forbidden in ${base}`);
      }
      if (trimmed.replace(/\\/g, '/').split('/').includes('..')) {
        throw new Error(`ERR_UNSAFE_PRESERVE_PATH: Path traversal ".." is forbidden in preservePath "${rawItem}" in ${base}`);
      }
      const normalized = normalizeRelPosix(trimmed);
      if (
        normalized === '.' ||
        normalized.startsWith('/') ||
        /^[A-Za-z]:/.test(normalized) ||
        normalized.split('/').some((seg) => seg === '..' || seg === '.')
      ) {
        throw new Error(`ERR_UNSAFE_PRESERVE_PATH: Invalid relative preservePath "${rawItem}" in ${base}`);
      }
      deduped.add(normalized);
    }
    preservePaths = [...deduped];
  }

  return {
    entrySlug,
    owner: urlOwner,
    repo: urlRepo,
    repoFullName: `${urlOwner}/${urlRepo}`,
    url: `https://github.com/${urlOwner}/${urlRepo}`,
    pluginRoot,
    category: parsed.category,
    releaseAsset: parsed.releaseAsset || null,
    preservePaths,
    description: {
      zh: parsed.description.zh.trim(),
      en: parsed.description.en.trim(),
    },
  };
}

export function validatePrDiffLimits({ addedOrModified = [], deleted = [] } = {}) {
  for (const p of [...addedOrModified, ...deleted]) {
    const norm = p.replace(/\\/g, '/');
    if (!/^data\/plugins\/[a-z0-9-]+__[a-z0-9._-]+\.yml$/.test(norm)) {
      throw new Error(`ERR_PR_PATH_FORBIDDEN: Untrusted PRs may only touch data/plugins/*.yml (got "${norm}")`);
    }
  }
  if (addedOrModified.length > MAX_ENTRIES_PER_PR) {
    throw new Error(
      `ERR_PR_TOO_MANY_ENTRIES: At most ${MAX_ENTRIES_PER_PR} plugin entries allowed per PR (got ${addedOrModified.length})`,
    );
  }
  if (deleted.length > MAX_DELETED_ENTRIES_PER_PR) {
    throw new Error(
      `ERR_PR_MASS_DELETION: Deleting more than ${MAX_DELETED_ENTRIES_PER_PR} entries in a single PR is blocked`,
    );
  }
  return true;
}

export function validateEntriesDirectory(pluginsDir = join(REPO_ROOT, 'data', 'plugins')) {
  if (!existsSync(pluginsDir)) return [];
  const files = readdirSync(pluginsDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();
  const validated = [];
  for (const f of files) {
    if (f.endsWith('.yaml')) {
      throw new Error(`ERR_EXTENSION_MUST_BE_YML: Use .yml extension instead of .yaml ("${f}")`);
    }
    const raw = readFileSync(join(pluginsDir, f), 'utf8');
    validated.push(validateSingleEntryFile(f, raw));
  }
  return validated;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const entries = validateEntriesDirectory();
  console.log(`[validate-entries] OK (${entries.length} entries validated)`);
}
