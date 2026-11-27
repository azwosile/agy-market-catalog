// Streaming Tarball & Antigravity 10-Field `plugin.json` + `agy-market.json` Validator (`scripts/validate-plugin-tarball.mjs`).

import { scoreAntigravityAuthenticity } from './lib/authenticity-scorer.mjs';
import {
  AGY_MARKET_JSON_ALLOWED_KEYS,
  ALLOWED_CATEGORIES,
  CANONICAL_NAME_RE,
  normalizeRelPosix,
  parseJsonc,
  parseSemver,
  PLUGIN_JSON_ALLOWED_KEYS,
  SCOPED_NAME_RE,
} from './lib/constants.mjs';
import { computePluginFingerprint } from './lib/dedup-engine.mjs';
import { inspectTarGzBuffer } from './lib/tar-stream.mjs';
import { normalizeIconBuffer } from './sanitize-icon.mjs';
import { scanPluginCapabilities } from './scan-capabilities.mjs';

const MAX_README_CHARS = 64_000;
const CJK_HAN_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/;
const CJK_HAN_GLOBAL_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/g;
const LATIN_LETTER_GLOBAL_RE = /[A-Za-z]/g;
const ANTIGRAVITY_AFFINITY_RE = /(?:antigravity|\bagy-[a-z0-9]|google\s+antigravity)/i;
const SCRIPT_RUNNER_RE = /^(?:node|agy-node|python|python3|deno|bun)(?:\.exe)?$/i;
const NODE_RUNNER_RE = /^(?:node|agy-node)(?:\.exe)?$/i;

const ZH_README_CANDIDATES = [
  'README.zh-CN.md',
  'README_zh-CN.md',
  'README.zh.md',
  'README_zh.md',
  'docs/README.zh-CN.md',
  'docs/README.zh.md',
];

const EN_README_CANDIDATES = [
  'README.en.md',
  'README.en-US.md',
  'README_en.md',
  'docs/README.en.md',
];

const DEFAULT_README_CANDIDATES = ['README.md'];

export function containsChineseCjk(text) {
  return CJK_HAN_RE.test(String(text || ''));
}

export function isPredominantlyChinese(text) {
  const s = String(text || '');
  const cjkCount = (s.match(CJK_HAN_GLOBAL_RE) || []).length;
  if (cjkCount === 0) return false;
  const latinCount = (s.match(LATIN_LETTER_GLOBAL_RE) || []).length;
  if (latinCount === 0) return true;
  return cjkCount >= 10 && cjkCount * 4 >= latinCount;
}

function findMarkdownInMap(filesMap, candidates) {
  if (!filesMap) return null;
  let lowerMap = null;
  for (const candidate of candidates) {
    if (filesMap.has(candidate)) {
      return filesMap.get(candidate);
    }
    if (!lowerMap) {
      lowerMap = new Map();
      for (const [k, v] of filesMap.entries()) {
        const lower = k.toLowerCase();
        if (!lowerMap.has(lower)) lowerMap.set(lower, v);
      }
    }
    const matched = lowerMap.get(candidate.toLowerCase());
    if (matched) return matched;
  }
  return null;
}

function findMarkdownCandidate(scopedFiles, rootFiles, candidates) {
  const maps = rootFiles && rootFiles !== scopedFiles ? [scopedFiles, rootFiles] : [scopedFiles];
  for (const filesMap of maps) {
    const matched = findMarkdownInMap(filesMap, candidates);
    if (matched) return matched;
  }
  return null;
}

function decodeReadmeBuffer(buf) {
  if (!buf) return '';
  return buf.toString('utf8').replace(/^\uFEFF/, '').slice(0, MAX_README_CHARS);
}

export function extractLocalizedReadmes(scopedFiles, rootFiles = null) {
  const scopedDefault = decodeReadmeBuffer(findMarkdownInMap(scopedFiles, DEFAULT_README_CANDIDATES));
  const rootDefault =
    rootFiles && rootFiles !== scopedFiles
      ? decodeReadmeBuffer(findMarkdownInMap(rootFiles, DEFAULT_README_CANDIDATES))
      : '';
  const defaultReadme = scopedDefault || rootDefault;
  const explicitZh = decodeReadmeBuffer(findMarkdownCandidate(scopedFiles, rootFiles, ZH_README_CANDIDATES));
  const explicitEn = decodeReadmeBuffer(findMarkdownCandidate(scopedFiles, rootFiles, EN_README_CANDIDATES));

  const defaultHasCjk = containsChineseCjk(defaultReadme);
  const defaultMostlyZh = isPredominantlyChinese(defaultReadme);

  let readmeZhMarkdown = explicitZh || (defaultHasCjk ? defaultReadme : '');
  // Subdirectory plugin fallback: when scoped README.md has no Chinese (or is English with a small CJK link)
  // and no explicit README.zh-CN.md exists, probe repo-root README.md for Chinese documentation.
  if (
    !explicitZh &&
    rootDefault &&
    rootDefault !== defaultReadme &&
    containsChineseCjk(rootDefault) &&
    (!readmeZhMarkdown || (!defaultMostlyZh && isPredominantlyChinese(rootDefault)))
  ) {
    readmeZhMarkdown = rootDefault;
  }

  let readmeEnMarkdown = explicitEn;
  if (!readmeEnMarkdown && defaultReadme) {
    if (!defaultHasCjk) {
      readmeEnMarkdown = defaultReadme;
    } else if ((explicitZh || (readmeZhMarkdown && readmeZhMarkdown !== defaultReadme)) && !defaultMostlyZh) {
      // Preserve English README.md when an explicit README.zh-CN.md (or root Chinese README) exists alongside a small `[简体中文]` link or quote.
      readmeEnMarkdown = defaultReadme;
    }
  }
  // Symmetric fallback: when subdirectory README.md is Chinese-only and no explicit EN file exists,
  // probe repo-root README.md for English documentation.
  if (
    !readmeEnMarkdown &&
    rootDefault &&
    rootDefault !== defaultReadme &&
    !isPredominantlyChinese(rootDefault) &&
    (!containsChineseCjk(rootDefault) || defaultMostlyZh)
  ) {
    readmeEnMarkdown = rootDefault;
  }

  const readmeMarkdown = defaultReadme || explicitEn || explicitZh || '';

  return {
    readmeMarkdown,
    readmeZhMarkdown,
    readmeEnMarkdown,
  };
}

export function extractPluginRootFiles(allFilesMap, pluginRoot = '.') {
  const normRoot = normalizeRelPosix(pluginRoot);
  if (normRoot === '.') {
    return new Map(allFilesMap);
  }
  const prefix = `${normRoot}/`;
  const scoped = new Map();
  for (const [p, buf] of allFilesMap.entries()) {
    if (p.startsWith(prefix)) {
      scoped.set(p.slice(prefix.length), buf);
    }
  }
  return scoped;
}

function extractPluginRootFileSizes(allFileSizesMap, pluginRoot = '.') {
  if (!allFileSizesMap || typeof allFileSizesMap.entries !== 'function') return null;
  const normRoot = normalizeRelPosix(pluginRoot);
  if (normRoot === '.') {
    return new Map(allFileSizesMap);
  }
  const prefix = `${normRoot}/`;
  const scoped = new Map();
  for (const [p, sz] of allFileSizesMap.entries()) {
    if (p.startsWith(prefix)) {
      scoped.set(p.slice(prefix.length), sz);
    }
  }
  return scoped;
}

function normalizeLenientPluginName(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTwoPartSemver(raw) {
  const m = /^v?(\d+)\.(\d+)$/i.exec(String(raw || '').trim());
  if (!m) return null;
  return `${Number(m[1])}.${Number(m[2])}.0`;
}

export function isHeterogeneousEcosystemManifest(rawManifest) {
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest)) return false;
  if (
    'grafanaDependency' in rawManifest ||
    (rawManifest.dependencies &&
      typeof rawManifest.dependencies === 'object' &&
      'grafanaDependency' in rawManifest.dependencies)
  ) {
    return true;
  }
  if (
    'mattermost' in rawManifest ||
    ('min_server_version' in rawManifest &&
      rawManifest.server &&
      typeof rawManifest.server === 'object' &&
      ('executables' in rawManifest.server || 'executable' in rawManifest.server))
  ) {
    return true;
  }
  if ('library' in rawManifest && ('nbbpm' in rawManifest || 'staticDirs' in rawManifest || 'hooks' in rawManifest)) {
    return true;
  }
  if ('minAppVersion' in rawManifest && 'isDesktopOnly' in rawManifest) {
    return true;
  }
  if (rawManifest.engines && typeof rawManifest.engines === 'object' && 'vscode' in rawManifest.engines) {
    return true;
  }
  return false;
}

export function hasAntigravityAffinity({ rawManifest = null, readmes = null, affinityContext = null } = {}) {
  const parts = [];
  if (rawManifest && typeof rawManifest === 'object') {
    if (typeof rawManifest.$schema === 'string') parts.push(rawManifest.$schema);
    if (typeof rawManifest.name === 'string') parts.push(rawManifest.name);
    if (typeof rawManifest.displayName === 'string') parts.push(rawManifest.displayName);
    if (typeof rawManifest.description === 'string') parts.push(rawManifest.description);
    if (Array.isArray(rawManifest.keywords)) {
      parts.push(rawManifest.keywords.filter((k) => typeof k === 'string').join(' '));
    }
  }
  if (readmes && typeof readmes === 'object') {
    if (readmes.readmeMarkdown) parts.push(readmes.readmeMarkdown.slice(0, 8192));
    if (readmes.readmeZhMarkdown) parts.push(readmes.readmeZhMarkdown.slice(0, 8192));
    if (readmes.readmeEnMarkdown) parts.push(readmes.readmeEnMarkdown.slice(0, 8192));
  }
  if (affinityContext && typeof affinityContext === 'object') {
    if (affinityContext.repoName) parts.push(String(affinityContext.repoName));
    if (affinityContext.repoFullName) parts.push(String(affinityContext.repoFullName));
    if (affinityContext.repoDescription) parts.push(String(affinityContext.repoDescription));
    if (Array.isArray(affinityContext.topics)) {
      parts.push(affinityContext.topics.join(' '));
    }
  }
  return parts.some((p) => ANTIGRAVITY_AFFINITY_RE.test(p));
}

export function validatePluginManifestObject(
  manifest,
  { allowScopedName = false, lenientManifest = false, fallbackDescription = '', fallbackName = '' } = {},
) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('ERR_PLUGIN_JSON_NOT_OBJECT: plugin.json root must be an object');
  }

  if (!lenientManifest) {
    for (const key of Object.keys(manifest)) {
      if (!PLUGIN_JSON_ALLOWED_KEYS.has(key)) {
        throw new Error(
          `ERR_PLUGIN_JSON_UNKNOWN_KEY: "${key}" is outside Antigravity's official 15-field plugin.json allowlist`,
        );
      }
    }

    if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
      throw new Error('ERR_PLUGIN_JSON_NAME: "name" is required in plugin.json');
    }
    const nameValid = allowScopedName
      ? CANONICAL_NAME_RE.test(manifest.name) || SCOPED_NAME_RE.test(manifest.name)
      : CANONICAL_NAME_RE.test(manifest.name);
    if (!nameValid) {
      throw new Error(
        `ERR_PLUGIN_JSON_NAME_FORMAT: "${manifest.name}" must be lowercase kebab-case${allowScopedName ? '' : ' (single hyphens only; "--" is reserved for scoped installs)'}`,
      );
    }

    if (typeof manifest.description !== 'string' || !manifest.description.trim()) {
      throw new Error('ERR_PLUGIN_JSON_DESCRIPTION: "description" is required in plugin.json');
    }

    if (manifest.version !== undefined && !parseSemver(manifest.version)) {
      throw new Error(`ERR_PLUGIN_JSON_VERSION: "${manifest.version}" is not a valid SemVer string`);
    }

    if (manifest.logo !== undefined) {
      if (typeof manifest.logo !== 'string' || !manifest.logo.trim()) {
        throw new Error('ERR_PLUGIN_JSON_LOGO: "logo" must be a non-empty relative path');
      }
      if (/^https?:\/\//i.test(manifest.logo) || manifest.logo.startsWith('/') || manifest.logo.includes('..')) {
        throw new Error(
          `ERR_PLUGIN_JSON_LOGO_PATH: "${manifest.logo}" must be a relative path inside pluginRoot (never https:// or ..)`,
        );
      }
    }

    if (manifest.suggestedPrompts !== undefined) {
      if (
        !Array.isArray(manifest.suggestedPrompts) ||
        manifest.suggestedPrompts.length > 3 ||
        manifest.suggestedPrompts.some((s) => typeof s !== 'string' || !s.trim())
      ) {
        throw new Error('ERR_PLUGIN_JSON_PROMPTS: "suggestedPrompts" must be an array of 1..3 non-empty strings');
      }
    }

    if (manifest.$schema !== undefined && (typeof manifest.$schema !== 'string' || !manifest.$schema.trim())) {
      throw new Error('ERR_PLUGIN_JSON_SCHEMA: "$schema" must be a non-empty string');
    }

    if (manifest.skills !== undefined) {
      const skillEntries = Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills];
      if (
        skillEntries.length === 0 ||
        skillEntries.some(
          (s) =>
            typeof s !== 'string' ||
            !s.trim() ||
            s.startsWith('/') ||
            s.includes('..'),
        )
      ) {
        throw new Error('ERR_PLUGIN_JSON_SKILLS: "skills" must be a relative directory string or array of relative directory strings');
      }
    }

    if (manifest.license !== undefined && typeof manifest.license !== 'string') {
      throw new Error('ERR_PLUGIN_JSON_LICENSE: "license" must be an SPDX string');
    }

    if (
      manifest.keywords !== undefined &&
      (!Array.isArray(manifest.keywords) || manifest.keywords.some((k) => typeof k !== 'string'))
    ) {
      throw new Error('ERR_PLUGIN_JSON_KEYWORDS: "keywords" must be an array of strings');
    }

    if (
      manifest.extensions !== undefined &&
      (!manifest.extensions || typeof manifest.extensions !== 'object' || Array.isArray(manifest.extensions))
    ) {
      throw new Error('ERR_PLUGIN_JSON_EXTENSIONS: "extensions" must be an object');
    }

    return manifest;
  }

  // Lenient Track-2 sanitization: strip unknown keys, degrade unsafe/external logos, normalize name & prompts.
  const clean = {};
  for (const [key, val] of Object.entries(manifest)) {
    if (!PLUGIN_JSON_ALLOWED_KEYS.has(key)) continue;
    clean[key] = val;
  }

  const rawName = typeof clean.name === 'string' && clean.name.trim() ? clean.name.trim() : String(fallbackName || '').trim();
  if (!rawName) {
    throw new Error('ERR_PLUGIN_JSON_NAME: "name" is required in plugin.json');
  }
  const keptScoped = allowScopedName && SCOPED_NAME_RE.test(rawName);
  const normalizedName = keptScoped
    ? rawName
    : CANONICAL_NAME_RE.test(rawName)
      ? rawName
      : normalizeLenientPluginName(rawName);
  if (!normalizedName) {
    throw new Error(`ERR_PLUGIN_JSON_NAME_FORMAT: "${rawName}" cannot be normalized to a valid plugin name`);
  }
  clean.name = normalizedName;

  if (typeof clean.displayName !== 'string' || !clean.displayName.trim()) {
    delete clean.displayName;
  } else {
    clean.displayName = clean.displayName.trim();
  }

  const desc =
    (typeof clean.description === 'string' && clean.description.trim()) ||
    String(fallbackDescription || '').trim() ||
    clean.displayName ||
    clean.name;
  if (!desc) {
    throw new Error('ERR_PLUGIN_JSON_DESCRIPTION: "description" is required in plugin.json');
  }
  clean.description = desc;

  if (clean.version !== undefined) {
    const parsed = parseSemver(clean.version) || parseSemver(normalizeTwoPartSemver(clean.version));
    if (parsed) {
      clean.version = parsed.version;
    } else {
      delete clean.version;
    }
  }

  if (clean.logo !== undefined) {
    if (typeof clean.logo !== 'string' || !clean.logo.trim()) {
      delete clean.logo;
    } else {
      const trimmedLogo = clean.logo.trim();
      const normLogo = trimmedLogo.replace(/\\/g, '/');
      if (
        /^(?:https?:|data:|file:)/i.test(normLogo) ||
        normLogo.startsWith('/') ||
        /^[A-Za-z]:/.test(normLogo) ||
        normLogo.split('/').includes('..')
      ) {
        delete clean.logo;
      } else {
        clean.logo = trimmedLogo;
      }
    }
  }

  if (clean.suggestedPrompts !== undefined) {
    if (!Array.isArray(clean.suggestedPrompts)) {
      delete clean.suggestedPrompts;
    } else {
      const sanitizedPrompts = clean.suggestedPrompts
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);
      if (sanitizedPrompts.length > 0) {
        clean.suggestedPrompts = sanitizedPrompts;
      } else {
        delete clean.suggestedPrompts;
      }
    }
  }

  if (clean.homepage !== undefined && (typeof clean.homepage !== 'string' || !clean.homepage.trim())) {
    delete clean.homepage;
  }
  if (clean.disabled !== undefined && typeof clean.disabled !== 'boolean') {
    delete clean.disabled;
  }
  if (
    clean.author !== undefined &&
    typeof clean.author !== 'string' &&
    (!clean.author || typeof clean.author !== 'object' || Array.isArray(clean.author))
  ) {
    delete clean.author;
  }
  if (
    clean.repository !== undefined &&
    typeof clean.repository !== 'string' &&
    (!clean.repository || typeof clean.repository !== 'object' || Array.isArray(clean.repository))
  ) {
    delete clean.repository;
  }

  return clean;
}

export function validateMarketCompanionManifest(rawCompanion, { lenientManifest = false } = {}) {
  if (!rawCompanion || typeof rawCompanion !== 'object' || Array.isArray(rawCompanion)) {
    throw new Error('ERR_AGY_MARKET_JSON: agy-market.json must be a JSON object');
  }
  const target = lenientManifest ? {} : rawCompanion;
  for (const key of Object.keys(rawCompanion)) {
    if (!AGY_MARKET_JSON_ALLOWED_KEYS.has(key)) {
      if (lenientManifest) continue;
      throw new Error(`ERR_AGY_MARKET_JSON_KEY: Unknown key "${key}" in agy-market.json`);
    }
    if (lenientManifest) target[key] = rawCompanion[key];
  }
  if (target.schemaVersion !== undefined && target.schemaVersion !== 1) {
    throw new Error(`ERR_AGY_MARKET_SCHEMA_VERSION: Unsupported schemaVersion "${target.schemaVersion}"`);
  }
  if (target.categories !== undefined) {
    if (
      !Array.isArray(target.categories) ||
      target.categories.some((c) => typeof c !== 'string' || !ALLOWED_CATEGORIES.has(c))
    ) {
      if (lenientManifest) {
        target.categories = Array.isArray(target.categories)
          ? target.categories.filter((c) => typeof c === 'string' && ALLOWED_CATEGORIES.has(c))
          : [];
      } else {
        throw new Error('ERR_AGY_MARKET_CATEGORIES: Invalid categories list in agy-market.json');
      }
    }
  }
  if (target.platforms !== undefined) {
    const validPlatforms = new Set(['win32', 'darwin', 'linux']);
    if (!Array.isArray(target.platforms) || target.platforms.some((p) => !validPlatforms.has(p))) {
      if (lenientManifest) {
        target.platforms = Array.isArray(target.platforms)
          ? target.platforms.filter((p) => validPlatforms.has(p))
          : [];
      } else {
        throw new Error('ERR_AGY_MARKET_PLATFORMS: platforms must be a subset of ["win32", "darwin", "linux"]');
      }
    }
  }
  if (target.preservePaths !== undefined) {
    if (
      !Array.isArray(target.preservePaths) ||
      target.preservePaths.some(
        (p) => typeof p !== 'string' || !p.trim() || p.includes('..') || p.startsWith('/') || /^[A-Za-z]:/.test(p),
      )
    ) {
      throw new Error('ERR_AGY_MARKET_PRESERVE_PATHS: preservePaths must be safe relative globs');
    }
  }
  return target;
}

function findSidecarBackendScript(parsed, sidecarBaseDir, scopedFiles) {
  const cmd = String(parsed?.command || '').trim();
  const cmdBase = cmd.split(/[\\/]/).pop() || '';
  const isScriptRunner = SCRIPT_RUNNER_RE.test(cmdBase);
  const args = Array.isArray(parsed?.args) ? parsed.args : [];
  const prefix = sidecarBaseDir && sidecarBaseDir !== '.' ? `${sidecarBaseDir}/` : '';

  if (!isScriptRunner) {
    if (cmd && !cmd.startsWith('/') && !/^[A-Za-z]:/.test(cmd) && (cmd.includes('/') || cmd.includes('.'))) {
      const cleanedCmd = cmd
        .replace(/^\$\{PLUGIN_ROOT\}[\\/]/, '')
        .replace(/^\$\{SIDECAR_DIR\}[\\/]/, '')
        .replace(/^\$\{__dirname\}[\\/]/, '');
      if (!cleanedCmd.startsWith('/') && !/^[A-Za-z]:/.test(cleanedCmd) && !cleanedCmd.includes('..')) {
        const normCmd = normalizeRelPosix(cleanedCmd);
        if (normCmd && normCmd !== '.') {
          const candidates = prefix ? [`${prefix}${normCmd}`, normCmd] : [normCmd];
          return { declared: normCmd, exists: candidates.some((c) => scopedFiles.has(c)), candidates };
        }
      }
    }
    return { declared: null, exists: false, candidates: [] };
  }

  for (const rawArg of args) {
    if (typeof rawArg !== 'string') continue;
    const trimmed = rawArg.trim();
    if (!trimmed || trimmed.startsWith('-')) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    const cleaned = trimmed
      .replace(/^\$\{PLUGIN_ROOT\}[\\/]/, '')
      .replace(/^\$\{SIDECAR_DIR\}[\\/]/, '')
      .replace(/^\$\{__dirname\}[\\/]/, '');
    if (cleaned.startsWith('/') || /^[A-Za-z]:/.test(cleaned) || cleaned.includes('..')) {
      return { declared: null, exists: false, candidates: [] };
    }
    const normScript = normalizeRelPosix(cleaned);
    if (!normScript || normScript === '.') continue;
    if (/\.[a-z0-9]+$/i.test(normScript) || normScript.includes('/')) {
      const candidates = prefix ? [`${prefix}${normScript}`, normScript] : [normScript];
      return { declared: normScript, exists: candidates.some((c) => scopedFiles.has(c)), candidates };
    }
    break;
  }

  return { declared: null, exists: false, candidates: [] };
}

function collectSidecarEntriesForPrebuiltCheck(scopedFiles) {
  const collected = [];
  for (const [relPath, buf] of scopedFiles.entries()) {
    const m = /^sidecars\/([^/]+)\/sidecar\.json$/.exec(relPath);
    if (!m) continue;
    const parsed = parseJsonc(buf.toString('utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      collected.push({ baseDir: `sidecars/${m[1]}`, parsed });
    }
  }
  if (collected.length === 0 && scopedFiles.has('sidecars.json')) {
    const parsedRoot = parseJsonc(scopedFiles.get('sidecars.json').toString('utf8'));
    const list = Array.isArray(parsedRoot)
      ? parsedRoot
      : Array.isArray(parsedRoot?.sidecars)
        ? parsedRoot.sidecars
        : [];
    for (const item of list) {
      if (typeof item === 'string') {
        const rel = normalizeRelPosix(item);
        if (!rel || rel === '.' || rel.includes('..') || rel.startsWith('/')) continue;
        const target = rel.toLowerCase().endsWith('.json') ? rel : `${rel}/sidecar.json`;
        const buf = scopedFiles.get(target);
        if (!buf) continue;
        const sc = parseJsonc(buf.toString('utf8'));
        const lastSlash = target.lastIndexOf('/');
        collected.push({ baseDir: lastSlash === -1 ? '.' : target.slice(0, lastSlash), parsed: sc });
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        const relRef = String(
          item.sidecarJson || item.manifest || item.config || item.path || item.dir || item.folder || '',
        ).trim();
        if (relRef && !item.ui_config && !item.command && !item.has_web_ui) {
          const rel = normalizeRelPosix(relRef);
          if (!rel || rel === '.' || rel.includes('..') || rel.startsWith('/')) continue;
          const target = rel.toLowerCase().endsWith('.json') ? rel : `${rel}/sidecar.json`;
          const buf = scopedFiles.get(target);
          if (!buf) continue;
          const sc = parseJsonc(buf.toString('utf8'));
          const lastSlash = target.lastIndexOf('/');
          collected.push({ baseDir: lastSlash === -1 ? '.' : target.slice(0, lastSlash), parsed: sc });
        } else {
          collected.push({ baseDir: '.', parsed: item });
        }
      }
    }
  }
  return collected;
}

function hasLocalNodeRuntimeEntrypoint(scopedFiles) {
  for (const { parsed } of collectSidecarEntriesForPrebuiltCheck(scopedFiles)) {
    const cmdBase = String(parsed?.command || '').trim().split(/[\\/]/).pop() || '';
    if (NODE_RUNNER_RE.test(cmdBase)) return true;
  }
  if (scopedFiles.has('mcp_config.json')) {
    try {
      const parsed = parseJsonc(scopedFiles.get('mcp_config.json').toString('utf8'));
      const serversObj = parsed?.mcpServers && typeof parsed.mcpServers === 'object' ? parsed.mcpServers : {};
      for (const cfg of Object.values(serversObj)) {
        const cmdBase = String(cfg?.command || '').trim().split(/[\\/]/).pop() || '';
        if (NODE_RUNNER_RE.test(cmdBase)) return true;
      }
    } catch {
      /* ignore */
    }
  }
  if (scopedFiles.has('hooks.json')) {
    try {
      const parsed = parseJsonc(scopedFiles.get('hooks.json').toString('utf8'));
      const visit = (node) => {
        if (!node || typeof node !== 'object') return false;
        if (Array.isArray(node)) return node.some(visit);
        if (typeof node.command === 'string' && /^(?:node|agy-node)(?:\.exe)?\s+/i.test(node.command.trim())) {
          return true;
        }
        return Object.values(node).some(visit);
      };
      if (visit(parsed)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function verifySelfContainedPrebuiltFiles(scopedFiles, packageJson = null) {
  for (const { baseDir, parsed } of collectSidecarEntriesForPrebuiltCheck(scopedFiles)) {
    const prefix = baseDir && baseDir !== '.' ? `${baseDir}/` : '';
    const backendScript = findSidecarBackendScript(parsed, baseDir, scopedFiles);
    const views = Array.isArray(parsed?.ui_config?.views) ? parsed.ui_config.views : [];

    for (const view of views) {
      if (!view || typeof view.path !== 'string') continue;
      const cleanView = view.path.split('?')[0].split('#')[0].replace(/^\/+/, '');
      const isExplicitStaticHtml = /\.html?$/i.test(cleanView);
      const htmlCandidates = cleanView
        ? [`${prefix}${cleanView}`, `${prefix}${cleanView.replace(/\/+$/, '')}/index.html`]
        : [`${prefix}index.html`];
      const hasStaticHtml = htmlCandidates.some((c) => scopedFiles.has(c));

      if (isExplicitStaticHtml && !hasStaticHtml) {
        throw new Error(
          `ERR_UNBUILT_SOURCE_ARCHIVE: Missing prebuilt sidecar UI entrypoint "${htmlCandidates[0]}" in archive`,
        );
      }

      if (!isExplicitStaticHtml && !hasStaticHtml) {
        if (backendScript.exists) {
          // Zero-build dynamic HTTP Sidecar (e.g. Node server.mjs serving dynamic HTML at "/")
          continue;
        }
        if (backendScript.declared) {
          throw new Error(
            `ERR_UNBUILT_SOURCE_ARCHIVE: Missing sidecar backend entrypoint "${backendScript.candidates[0]}" in archive`,
          );
        }
        throw new Error(
          `ERR_UNBUILT_SOURCE_ARCHIVE: Missing prebuilt sidecar UI entrypoint "${htmlCandidates[0]}" in archive`,
        );
      }
    }

    if (
      views.length === 0 &&
      backendScript.declared &&
      !backendScript.exists &&
      !scopedFiles.has(`${prefix}index.html`)
    ) {
      throw new Error(
        `ERR_UNBUILT_SOURCE_ARCHIVE: Missing sidecar backend entrypoint "${backendScript.candidates[0]}" in archive`,
      );
    }
  }

  const deps =
    packageJson?.dependencies && typeof packageJson.dependencies === 'object'
      ? Object.keys(packageJson.dependencies)
      : [];
  if (deps.length > 0 && hasLocalNodeRuntimeEntrypoint(scopedFiles)) {
    let hasBundledNodeModules = false;
    for (const k of scopedFiles.keys()) {
      if (k.startsWith('node_modules/') || k.includes('/node_modules/')) {
        hasBundledNodeModules = true;
        break;
      }
    }
    if (!hasBundledNodeModules) {
      throw new Error(
        `ERR_UNBUNDLED_NPM_DEPS: Archive declares runtime dependencies (${deps.join(', ')}) without prebuilt bundle`,
      );
    }
  }
}

function doesLinkTargetTraversePluginRoot(linkPath, rawTarget, normRoot, strippedTopDir = '', typeFlag = '2') {
  const target = String(rawTarget || '').trim().replace(/\\/g, '/');
  if (!target || normRoot === '.') return false;

  const entersPluginRoot = (relPath) => {
    const clean = relPath.replace(/^\/+|\/+$/g, '');
    return clean === normRoot || clean.startsWith(`${normRoot}/`);
  };

  // Evaluate both the raw target and a version stripped of the archive's
  // single top-level wrapper folder (e.g. GitHub `repo-sha/...` hardlinks).
  const candidates = [target];
  if (strippedTopDir) {
    const cleanTarget = target.replace(/^(\.\/)+/, '').replace(/^\/+/, '');
    if (cleanTarget.startsWith(`${strippedTopDir}/`)) {
      candidates.push(cleanTarget.slice(strippedTopDir.length + 1));
    }
  }

  for (const cand of candidates) {
    const isAbs = cand.startsWith('/') || /^[A-Za-z]:/.test(cand);
    const strippedAbs = cand.replace(/^[A-Za-z]:/, '').replace(/^\/+/, '');
    if (entersPluginRoot(strippedAbs)) return true;

    // POSIX tar hardlinks (typeFlag === '1') resolve relative to the archive root,
    // NOT relative to dirname(linkPath). Symlinks (typeFlag === '2') resolve from dirname(linkPath).
    const startSegs =
      isAbs || typeFlag === '1'
        ? []
        : linkPath.includes('/')
          ? linkPath.slice(0, linkPath.lastIndexOf('/')).split('/').filter(Boolean)
          : [];
    const segs = [...startSegs];
    let escapedAboveRoot = false;
    for (const part of cand.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (segs.length === 0) {
          escapedAboveRoot = true;
        } else {
          segs.pop();
        }
      } else {
        segs.push(part);
      }
      if (!escapedAboveRoot && segs.length > 0 && entersPluginRoot(segs.join('/'))) {
        return true;
      }
    }
    if (!escapedAboveRoot && segs.length > 0 && entersPluginRoot(segs.join('/'))) {
      return true;
    }
  }
  return false;
}

/**
 * Enforces scoped symlink safety against `tarInfo.symlinkPaths` (1:1 parity with
 * client `agy-market/src/installer/tar-extract.mjs` `assertNoScopedSymlinks`):
 *   - Hard-throws `ERR_TAR_SYMLINK_FORBIDDEN` if `pluginRoot === '.'` and ANY link exists.
 *   - Hard-throws `ERR_TAR_SYMLINK_FORBIDDEN` if ANY link sits inside `pluginRoot`,
 *     is an ancestor of `pluginRoot`, or resolves/traverses through `pluginRoot`
 *     (including archive-root-relative hardlinks and `strippedRoot`-prefixed targets).
 *   - Returns `{ hasExternalSymlinks: true }` when links exist strictly outside `pluginRoot`.
 */
export function enforceScopedSymlinkSafety(tarInfo, pluginRoot = '.') {
  const symlinks = Array.isArray(tarInfo?.symlinkPaths) ? tarInfo.symlinkPaths : [];
  if (symlinks.length === 0) {
    return { hasExternalSymlinks: false, externalSymlinkCount: 0 };
  }
  const normRoot = normalizeRelPosix(pluginRoot || '.');
  if (normRoot === '.') {
    throw new Error(
      `ERR_TAR_SYMLINK_FORBIDDEN: Root plugin archive contains forbidden link "${symlinks[0].path}"`,
    );
  }
  const rootPrefix = `${normRoot}/`;
  const strippedTopDir = String(tarInfo?.strippedRoot || '').replace(/^\/+|\/+$/g, '');
  for (const link of symlinks) {
    const lp = normalizeRelPosix(link.path || '');
    if (!lp || lp === '.' || lp === normRoot || lp.startsWith(rootPrefix)) {
      throw new Error(
        `ERR_TAR_SYMLINK_FORBIDDEN: Archive link "${lp || link.path}" sits inside pluginRoot "${normRoot}"`,
      );
    }
    if (normRoot.startsWith(`${lp}/`)) {
      throw new Error(
        `ERR_TAR_SYMLINK_FORBIDDEN: Archive link "${lp}" is an ancestor of pluginRoot "${normRoot}"`,
      );
    }
    if (
      link.target &&
      doesLinkTargetTraversePluginRoot(lp, link.target, normRoot, strippedTopDir, link.typeflag || '2')
    ) {
      throw new Error(
        `ERR_TAR_SYMLINK_FORBIDDEN: Archive link "${lp}" -> "${link.target}" traverses into pluginRoot "${normRoot}"`,
      );
    }
  }
  return { hasExternalSymlinks: true, externalSymlinkCount: symlinks.length };
}

function computeStructuralMeta({ rawManifest, manifest, manifestPath, companion, scopedFiles, allFiles, affinityContext }) {
  let strictManifest = false;
  try {
    validatePluginManifestObject(rawManifest, { allowScopedName: false, lenientManifest: false });
    if (manifest.logo) {
      const logoRel = normalizeRelPosix(manifest.logo);
      strictManifest = Boolean(
        scopedFiles.has(logoRel) ||
          (manifestPath === '.antigravity-plugin/plugin.json' && scopedFiles.has(`.antigravity-plugin/${logoRel}`)),
      );
    } else {
      strictManifest = true;
    }
  } catch {
    strictManifest = false;
  }

  let hasLicense = Boolean(
    affinityContext?.licenseSpdxId &&
      String(affinityContext.licenseSpdxId).toUpperCase() !== 'NOASSERTION',
  );
  let hasCiTests = false;
  const fileMaps = allFiles && allFiles !== scopedFiles ? [scopedFiles, allFiles] : [scopedFiles];
  for (const map of fileMaps) {
    if (!map) continue;
    for (const rel of map.keys()) {
      if (!hasLicense && /^(?:licen[cs]e|copying)(?:\.(?:md|txt))?$/i.test(rel)) {
        hasLicense = true;
      }
      if (
        !hasCiTests &&
        (/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(rel) ||
          /(?:^|\/)(?:test|tests|__tests__)\/|\.(?:test|spec)\.[a-z0-9]+$/i.test(rel))
      ) {
        hasCiTests = true;
      }
      if (hasLicense && hasCiTests) break;
    }
  }

  const hasSuggestedPrompts = Boolean(
    Array.isArray(manifest?.suggestedPrompts) && manifest.suggestedPrompts.length >= 1,
  );
  const hasCompanion = Boolean(companion && typeof companion === 'object');

  return {
    strictManifest,
    hasLicense,
    hasSuggestedPrompts,
    hasCompanion,
    hasCiTests,
  };
}

export function validatePluginTarball(
  compressedBuf,
  {
    pluginRoot = '.',
    allowScopedName = false,
    fallbackVersion = '',
    requireSelfContained = false,
    lenientManifest = false,
    requireAntigravityComponent = false,
    allowExternalSymlinks = false,
    fallbackDescription = '',
    fallbackName = '',
    affinityContext = null,
    tarInfo: preInspectedTarInfo = null,
  } = {},
) {
  const normRoot = normalizeRelPosix(pluginRoot || '.');
  const tarInfo =
    preInspectedTarInfo ||
    inspectTarGzBuffer(compressedBuf, { allowExternalSymlinks: Boolean(allowExternalSymlinks) });
  const { hasExternalSymlinks } = enforceScopedSymlinkSafety(tarInfo, normRoot);
  const scopedFiles = extractPluginRootFiles(tarInfo.files, normRoot);
  const scopedFileSizes = extractPluginRootFileSizes(tarInfo.fileSizes, normRoot);

  const manifestPath = scopedFiles.has('plugin.json')
    ? 'plugin.json'
    : scopedFiles.has('.antigravity-plugin/plugin.json')
      ? '.antigravity-plugin/plugin.json'
      : null;

  if (!manifestPath) {
    throw new Error(`ERR_MISSING_PLUGIN_JSON: No plugin.json found at pluginRoot "${normRoot}"`);
  }

  let rawManifest;
  try {
    rawManifest = parseJsonc(scopedFiles.get(manifestPath).toString('utf8'));
  } catch (err) {
    throw new Error(`ERR_INVALID_PLUGIN_JSON: Failed to parse ${manifestPath} (${err?.message || String(err)})`);
  }
  const manifest = validatePluginManifestObject(rawManifest, {
    allowScopedName,
    lenientManifest,
    fallbackDescription,
    fallbackName,
  });

  // Optional companion agy-market.json (in pluginRoot or archive root)
  let companion = null;
  const companionBuf = scopedFiles.get('agy-market.json') || tarInfo.files.get('agy-market.json') || null;
  if (companionBuf) {
    companion = validateMarketCompanionManifest(parseJsonc(companionBuf.toString('utf8')), { lenientManifest });
  }

  // Logo verification & sanitization (strict security red line on SVG XXE/XSS even in lenient mode)
  let iconArtifact = null;
  if (manifest.logo) {
    const logoRel = normalizeRelPosix(manifest.logo);
    const logoResolvedRel = scopedFiles.has(logoRel)
      ? logoRel
      : manifestPath === '.antigravity-plugin/plugin.json' && scopedFiles.has(`.antigravity-plugin/${logoRel}`)
        ? `.antigravity-plugin/${logoRel}`
        : logoRel;
    const logoBuf = scopedFiles.get(logoResolvedRel) || null;
    const trueLogoBytes = scopedFileSizes?.get(logoResolvedRel) ?? (logoBuf ? logoBuf.length : 0);
    if (!logoBuf) {
      if (lenientManifest) {
        delete manifest.logo;
      } else {
        throw new Error(`ERR_MISSING_LOGO_FILE: plugin.json.logo "${manifest.logo}" does not exist in tarball`);
      }
    } else if (logoBuf.length === 0 && trueLogoBytes > 2 * 1024 * 1024) {
      if (!lenientManifest) {
        throw new Error(`ERR_ICON_TOO_LARGE: Logo exceeds 2 MB (${trueLogoBytes} bytes)`);
      }
      iconArtifact = null;
      delete manifest.logo;
    } else {
      try {
        iconArtifact = normalizeIconBuffer(logoBuf, logoRel);
      } catch (err) {
        if (!lenientManifest || /^ERR_ICON_SVG_(?:XXE|XSS)\b/.test(String(err?.message || ''))) {
          throw err;
        }
        iconArtifact = null;
        delete manifest.logo;
      }
    }
  }

  // 4-Layer static capability & safety scan (4 hard security red lines ALWAYS enforced)
  const { capabilities, components } = scanPluginCapabilities(scopedFiles, { pluginName: manifest.name });

  const { readmeMarkdown, readmeZhMarkdown, readmeEnMarkdown } = extractLocalizedReadmes(scopedFiles, tarInfo.files);
  const scopedReadme = decodeReadmeBuffer(findMarkdownInMap(scopedFiles, DEFAULT_README_CANDIDATES));

  // Hard veto on hooks.json with non-empty hook declarations and 0 valid ANTIGRAVITY_HOOK_EVENTS
  const signals = components.signals || {};
  if (
    signals.hasHooks &&
    !signals.hasAntigravityHookEvent &&
    ((capabilities.hookEvents || []).length > 0 || (signals.hooksJsonNonMetaKeyCount || 0) > 0)
  ) {
    throw new Error(
      'ERR_FOREIGN_HOST_HOOKS: hooks.json declares hook events outside valid Antigravity hook lifecycle events',
    );
  }

  const repoMetaForAuth = affinityContext
    ? {
        name: affinityContext.repoName || '',
        full_name: affinityContext.repoFullName || '',
        description: affinityContext.repoDescription || '',
        topics: Array.isArray(affinityContext.topics) ? affinityContext.topics : [],
        is_template: Boolean(affinityContext.isTemplate),
      }
    : null;

  const authenticity = scoreAntigravityAuthenticity({
    manifestPath,
    pluginRoot: normRoot,
    rawManifest,
    companion,
    scopedFiles,
    capabilities,
    components,
    readmes: { readmeMarkdown, readmeZhMarkdown, readmeEnMarkdown },
    scopedReadme,
    repoMeta: repoMetaForAuth,
    isHeterogeneousManifest: isHeterogeneousEcosystemManifest(rawManifest),
  });

  if (requireAntigravityComponent) {
    const hasStrong = Boolean(signals.hasStrongSignal || companion);
    if (isHeterogeneousEcosystemManifest(rawManifest) && !hasStrong) {
      throw new Error(
        'ERR_NOT_ANTIGRAVITY_PLUGIN: Manifest matches a non-Antigravity plugin ecosystem without Antigravity components',
      );
    }
    if (!signals.hasAnyComponent) {
      throw new Error(
        'ERR_NOT_ANTIGRAVITY_PLUGIN: Archive does not contain any valid Antigravity component (skills, agents, rules, hooks.json, mcp_config.json, sidecars, or host-enhancement scripts)',
      );
    }
    if (
      !hasStrong &&
      !hasAntigravityAffinity({
        rawManifest,
        readmes: { readmeMarkdown, readmeZhMarkdown, readmeEnMarkdown },
        affinityContext,
      })
    ) {
      throw new Error(
        'ERR_NOT_ANTIGRAVITY_PLUGIN: Weak-only components (rules/agents) lack Antigravity ecosystem affinity',
      );
    }
    if (authenticity.decision !== 'accept') {
      const code = authenticity.reasonCode || 'ERR_LOW_AGY_CONFIDENCE';
      throw new Error(
        `${code}: Authenticity classifier decision="${authenticity.decision}" (score=${authenticity.score})`,
      );
    }
  }

  const parsedSemver =
    parseSemver(manifest.version) ||
    parseSemver(fallbackVersion) ||
    (lenientManifest ? parseSemver('0.0.0') : !manifest.version && !fallbackVersion ? parseSemver('0.1.0') : null);
  if (!parsedSemver) {
    throw new Error('ERR_VERSION_MISSING: Neither plugin.json.version nor release tag provides a valid SemVer');
  }

  let packageJson = null;
  if (scopedFiles.has('package.json')) {
    try {
      packageJson = JSON.parse(scopedFiles.get('package.json').toString('utf8'));
    } catch {
      packageJson = null;
    }
  }

  if (requireSelfContained) {
    verifySelfContainedPrebuiltFiles(scopedFiles, packageJson);
  }

  const structuralMeta = computeStructuralMeta({
    rawManifest,
    manifest,
    manifestPath,
    companion,
    scopedFiles,
    allFiles: tarInfo.files,
    affinityContext,
  });

  const fingerprint = computePluginFingerprint(scopedFiles, {
    description: manifest.description,
    capabilities,
    readmeMarkdown,
    fileSizes: scopedFileSizes,
  });

  return {
    sha256: tarInfo.sha256,
    sizeBytes: tarInfo.compressedBytes,
    manifest,
    manifestPath,
    companion,
    version: parsedSemver.version,
    iconArtifact,
    readmeMarkdown,
    readmeZhMarkdown,
    readmeEnMarkdown,
    capabilities,
    components,
    packageJson,
    hasExternalSymlinks,
    authenticity,
    structuralMeta,
    fingerprint,
    skillDescriptions: components.skillDescriptions || [],
    scopedFiles,
    scopedFileSizes,
  };
}
