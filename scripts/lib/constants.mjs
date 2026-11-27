// Canonical cross-repository constants, allowlists, reserved denylists, SemVer & strict flat YAML parser.

export const MIN_AGE_DAYS = 1;
export const MIN_AGE_MS = MIN_AGE_DAYS * 86_400_000;
export const MIN_NON_EMPTY_COMMITS = 3;
export const MAX_ENTRIES_PER_PR = 3;
export const MAX_DELETED_ENTRIES_PER_PR = 2;
export const MAX_TARBALL_BYTES = 0; // 0 = no artificial archive size limit
export const MAX_RULE_FILE_BYTES = 24_000; // Antigravity per-rule ceiling

export const DEFAULT_CATALOG_REPO_URL = 'https://github.com/azwosile/agy-market-catalog';
export const DEFAULT_CATALOG_BASE_URL = 'https://azwosile.github.io/agy-market-catalog';
export const DEFAULT_CATALOG_RAW_URL = 'https://raw.githubusercontent.com/azwosile/agy-market-catalog/gh-pages';
export const OFFICIAL_MARKET_CLIENT_REPO = 'azwosile/agy-market';

export const PLUGIN_JSON_ALLOWED_KEYS = new Set([
  '$schema',
  'name',
  'displayName',
  'description',
  'version',
  'logo',
  'author',
  'homepage',
  'repository',
  'suggestedPrompts',
  'disabled',
  'skills',
  'license',
  'keywords',
  'extensions',
]);

export const AGY_MARKET_JSON_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'pluginRoot',
  'categories',
  'tags',
  'screenshots',
  'minAntigravityVersion',
  'platforms',
  'releaseAsset',
  'preservePaths',
]);

export const SUBMISSION_YAML_ALLOWED_KEYS = new Set([
  'url',
  'pluginRoot',
  'category',
  'description',
  'releaseAsset',
]);

export const ALLOWED_CATEGORIES = new Set([
  'monitoring-quota',
  'context-cache',
  'ui-themes',
  'agents-reasoning',
  'developer-tools',
  'mcp-integrations',
  'skills-workflows',
  'productivity',
  'data-science',
  'cloud-devops',
  'creative-media',
  'writing-knowledge',
  'automation',
  'security',
  'other',
]);

export const ALLOWED_LOGO_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);

export const BUILTIN_PLUGINS = new Set(['swarm', 'agy-market', 'agy-market-catalog']);

export const BUILTIN_AGENTS = new Set([
  'self',
  'browser',
  'research',
  'deepagent',
  'review-agent',
  'image-generator',
]);

export const BUILTIN_SKILLS = new Set([
  'plugin',
  'agy-customizations',
  'antigravity-guide',
  'automation',
  'generative_ui',
  'mcp-app-development',
  'migrate-agent-settings',
  'migrate-workflows',
  'run-workflow',
  'swarm_monitor',
  'swarm_pane',
  'ui-plugin-navigation',
]);

export const OFFICIAL_MARKETPLACE_SLUGS = new Set([
  'gdocs',
  'gsheets',
  'gslides',
  'gdrive',
  'gcal',
  'gmail',
  'gemini-api',
  'chrome-devtools-plugin',
  'android-cli-plugin',
  'canva',
  'figma',
  'science-overview',
  'genomics',
  'atlassian-twg-cli',
  'clickup',
  'cloudflare',
  'netlify',
  'arize-skills',
  'auth0',
  'zoho-bigin',
  'databricks',
  'looker',
  'n8n-skills',
]);

export const RESERVED_PLUGIN_NAMES = new Set([
  ...BUILTIN_PLUGINS,
  ...BUILTIN_AGENTS,
  ...BUILTIN_SKILLS,
  ...OFFICIAL_MARKETPLACE_SLUGS,
]);

export const GENERIC_MCP_SERVER_NAMES = new Set([
  'search',
  'db',
  'database',
  'filesystem',
  'fs',
  'fetch',
  'http',
  'git',
  'shell',
  'default',
  'server',
  'mcp',
]);

export const FIRST_PARTY_REPO_OWNERS = new Set([
  'google',
  'google-deepmind',
  'antigravity-plugins-official',
  'google-labs-code',
  'googlecloudplatform',
]);

export const CANONICAL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SCOPED_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*--[a-z0-9]+(-[a-z0-9]+)*$/;
export const ENTRY_FILENAME_RE = /^([a-z0-9-]+)__([a-z0-9._-]+?)(?:--([a-z0-9._-]+))?\.yml$/;

export function toScopedPluginName(owner, slug) {
  const cleanOwner = String(owner || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanSlug = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanOwner}--${cleanSlug}`;
}

export function normalizeRelPosix(input = '.') {
  const raw = String(input || '.').trim().replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/g, '');
  return raw === '' ? '.' : raw;
}

export function levenshteinDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  const curr = new Array(t.length + 1);
  for (let i = 0; i < s.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < t.length; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

export function parseSemver(raw) {
  const clean = String(raw || '').trim().replace(/^v/i, '');
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(clean);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split('.') : [],
    version: `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}${m[4] ? `-${m[4]}` : ''}`,
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return String(a).localeCompare(String(b));
  if (!pa) return -1;
  if (!pb) return 1;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  const len = Math.max(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < len; i++) {
    const x = pa.prerelease[i];
    const y = pb.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x) ? Number(x) : null;
    const ny = /^\d+$/.test(y) ? Number(y) : null;
    if (nx !== null && ny !== null) {
      if (nx !== ny) return nx - ny;
    } else if (nx !== null) {
      return -1;
    } else if (ny !== null) {
      return 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Strict, deterministic parser for Track-1 flat submission YAML files.
 * Supports top-level scalar strings and 1-level nested maps (such as `description: { zh, en }`).
 * Rejects anchors, aliases, multi-document streams, or executable YAML tags.
 */
export function parseSubmissionYaml(rawText) {
  if (typeof rawText !== 'string') {
    throw new Error('YAML content must be a string');
  }
  const text = rawText.replace(/^\uFEFF/, '');
  if (/^---\s*$/m.test(text) && text.trim().split(/^---\s*$/m).filter(Boolean).length > 1) {
    throw new Error('Multi-document YAML streams are not permitted');
  }
  const lines = text.split(/\r?\n/);
  const result = {};
  let currentMapKey = null;

  function unquoteScalar(val) {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      if (trimmed.startsWith('"')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return trimmed.slice(1, -1);
        }
      }
      return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    if (/^[!&*]/.test(trimmed)) {
      throw new Error(`Disallowed YAML tag/anchor syntax: ${trimmed}`);
    }
    return trimmed.replace(/\s+#.*$/, '').trim();
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1;
    const rawLine = lines[idx];
    if (/^\s*(#.*)?$/.test(rawLine)) continue;
    if (/\t/.test(rawLine)) {
      throw new Error(`Line ${lineNo}: Tabs are not allowed in YAML indentation`);
    }
    const indent = rawLine.match(/^ */)[0].length;
    const trimmed = rawLine.trim();

    if (indent === 0) {
      currentMapKey = null;
      const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(trimmed);
      if (!m) {
        throw new Error(`Line ${lineNo}: Invalid top-level YAML mapping "${trimmed}"`);
      }
      const [, key, rest] = m;
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        throw new Error(`Line ${lineNo}: Duplicate YAML key "${key}"`);
      }
      if (!rest || /^#/.test(rest)) {
        result[key] = {};
        currentMapKey = key;
      } else {
        result[key] = unquoteScalar(rest);
      }
    } else if (indent === 2 && currentMapKey) {
      const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(trimmed);
      if (!m) {
        throw new Error(`Line ${lineNo}: Invalid nested YAML mapping "${trimmed}"`);
      }
      const [, subKey, subVal] = m;
      if (Object.prototype.hasOwnProperty.call(result[currentMapKey], subKey)) {
        throw new Error(`Line ${lineNo}: Duplicate nested key "${currentMapKey}.${subKey}"`);
      }
      result[currentMapKey][subKey] = unquoteScalar(subVal);
    } else {
      throw new Error(`Line ${lineNo}: Unsupported indentation level (${indent} spaces)`);
    }
  }

  return result;
}

/**
 * Strip JSONC comments and trailing commas cleanly before JSON.parse
 * (Antigravity's loader parses plugin.json as JSONC).
 */
export function parseJsonc(rawText) {
  const src = String(rawText || '').replace(/^\uFEFF/, '');
  let out = '';
  let inStr = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    out += ch;
  }

  const withoutTrailingCommas = out.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
}

/**
 * Build an immutable GitHub source archive URL pinned to the resolved 40-char commit SHA
 * when available, falling back to the tag archive URL only if no valid commit SHA exists.
 * Pinning to commit SHA prevents upstream tag force-pushes from breaking locked SHA-256 hashes.
 */
export function buildSourceArchiveUrl(repoFullName, commitSha, tagName) {
  const sha = String(commitSha || '').trim();
  if (/^[0-9a-f]{40}$/i.test(sha)) {
    return `https://github.com/${repoFullName}/archive/${sha}.tar.gz`;
  }
  return `https://github.com/${repoFullName}/archive/refs/tags/${encodeURIComponent(String(tagName || ''))}.tar.gz`;
}
