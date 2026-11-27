// Calibrated Log-Odds Antigravity Plugin Authenticity & Compatibility Classifier
// (`scripts/lib/authenticity-scorer.mjs`).
//
// Zero external dependencies; deterministic pure Node.js.
// Enforces hard vetoes against foreign-host manifests/directories/hooks & template stubs,
// prevents monorepo root-README / repo-name affinity bleed into foreign subplugins,
// and computes calibrated P(AGY | x) = sigmoid(w0 + sum w_i * phi_i(x)).

import {
  normalizeRelPosix,
  parseJsonc,
  PLUGIN_JSON_ALLOWED_KEYS,
} from './constants.mjs';

export const AUTHENTICITY_SCORER_VERSION = 1;

export const ANTIGRAVITY_HOOK_EVENTS = new Set([
  'SessionStart',
  'SessionEnd',
  'PreInvocation',
  'PostInvocation',
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'UserPromptSubmit',
  'PreCompact',
  'Notification',
]);

export const AGY_EXCLUSIVE_HOOK_EVENTS = new Set([
  'PreInvocation',
  'PostInvocation',
]);

// Benign lenient keys commonly present in real community Antigravity plugin.json files;
// exempt from unknown-key purity penalty so valid lenient plugins (e.g. BetterGravity) are not falsely demoted.
export const BENIGN_LENIENT_MANIFEST_KEYS = new Set([
  '$schema',
  'license',
  'keywords',
  'compatibility',
  'main',
]);

// Claude Code plugin.json nests component paths/maps directly inside plugin.json;
// Antigravity uses directory conventions (`skills/`, `agents/`, `rules/`, `mcp_config.json`, `hooks.json`).
export const CLAUDE_CODE_MANIFEST_KEYS = new Set([
  'commands',
  'agents',
  'hooks',
  'mcpServers',
  'lspServers',
  'outputStyles',
  'strict',
]);

export const PLACEHOLDER_PLUGIN_NAMES = new Set([
  'my-plugin',
  'example-plugin',
  'template-plugin',
  'hello-world',
  'starter-plugin',
  'sample-plugin',
  'sample-agent-plugin',
  'test-plugin',
]);

// Expanded excluded directory segments for Wave-2 root discovery (explicitly preserves
// `.agents`, `.agent`, `.antigravity-plugin`, and `host_resources` since `host_resources/antigravity` is valid).
export const EXCLUDED_SCAN_DIR_SEGMENTS_V2 = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.idea',
  '.tmp',
  'test',
  'tests',
  '__tests__',
  'fixtures',
  'mocks',
  '__fixtures__',
  'vendor',
  'target',
  'dist',
  'build',
  // Foreign host metadata directories
  '.claude-plugin',
  '.claude',
  '.cursor',
  '.cursor-plugin',
  '.codex',
  '.codex-plugin',
  '.opencode',
  'copilot',
  'dsh',
  // Template / boilerplate / non-runtime directories
  'examples',
  'example',
  'templates',
  'template',
  'samples',
  'sample',
  'demo',
  'demos',
  'starter',
  'boilerplate',
  'archive',
  'archived',
  'deprecated',
  'docs',
  'website',
  'site',
  'locales',
  'plugin-src',
]);

const HOOK_META_KEYS = new Set(['$schema', 'version', 'description', 'enabled']);

const FOREIGN_HOST_PATH_RE = /(?:^|\/)\.(?:claude-plugin|cursor-plugin|codex-plugin|opencode)(?:\/|$)/i;
const FOREIGN_COPILOT_PATH_RE = /(?:^|\/)(?:plugins\/)?copilot(?:\/|$)/i;
const PLACEHOLDER_PATH_RE = /__name__|\{\{[^}]+\}\}/i;

const AGY_SCHEMA_RE = /antigravity\.google\/schemas\//i;
const AGY_RUNTIME_URI_RE = /(?:customization|sidecar):\/\/[a-z0-9._-]+/i;
const AGY_INSTALL_PATH_RE = /(?:\.gemini\/config\/plugins|\.agents\/plugins|\.agent\/plugins)/i;
const AGY_TEXT_MENTION_RE = /(?:google\s+antigravity|\bantigravity\b|\bagy-[a-z0-9][a-z0-9-]*)/gi;
const AGY_REPO_NAME_RE = /(?:antigravity|^agy-)/i;
const AGY_TOPIC_RE = /^(?:antigravity-plugins?|google-antigravity-plugins?|agy-plugins?)$/i;

const FOREIGN_HOST_TEXT_RE =
  /(?:\bclaude[\s-]?code\b|\.claude-plugin\b|\bclaude\s+marketplace\b|\bgithub\s+copilot\b|\bcopilot\s+cli\b|\bcursor\s+ide\b|\.cursorrules\b|\bopenai\s+codex\b|\bcodex\s+cli\b|\bwindsurf\b|\bcline\b|\bobsidian\b|\bgrok\s+build\b|\bclaude\.md\b)/gi;
const FOREIGN_CLAUDE_TEXT_RE = /(?:\bclaude[\s-]?code\b|\.claude-plugin\b|\bclaude\s+marketplace\b|\bclaude\.md\b)/gi;
const FOREIGN_REPO_NAME_RE = /(?:^|[-_.])(?:claude|cursor|copilot|obsidian|vscode)(?:[-_.]|$)/i;

const PRIOR_LOG_ODDS = -1.2;
const ACCEPT_THRESHOLD = 0.72;
const NATIVE_THRESHOLD = 0.88;
const GRAY_THRESHOLD = 0.45;

function sigmoid(x) {
  if (x >= 20) return 1;
  if (x <= -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function toUtf8(val) {
  if (typeof val === 'string') return val;
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  return '';
}

function countRegexMatches(re, text) {
  if (!text) return 0;
  const clone = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const m = String(text).match(clone);
  return m ? m.length : 0;
}

export function isHeterogeneousHostManifest(rawManifest) {
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
  if (typeof rawManifest.$schema === 'string' && /raycast\.com|vscode|obsidian/i.test(rawManifest.$schema)) {
    return true;
  }
  if (
    Array.isArray(rawManifest.commands) &&
    rawManifest.commands.some(
      (c) => c && typeof c === 'object' && (c.mode === 'view' || c.mode === 'no-view') && typeof c.name === 'string',
    ) &&
    typeof rawManifest.icon === 'string'
  ) {
    return true;
  }
  return false;
}

function inspectScopedFilesDetails(scopedFiles) {
  const info = {
    hasScopedFiles: Boolean(scopedFiles && scopedFiles.size > 0),
    hasSidecar: false,
    hasMcpConfig: false,
    hasDotMcpJson: false,
    hasHooksJson: false,
    hooksJsonEvents: [],
    hooksJsonNonMetaKeyCount: 0,
    hasSkills: false,
    hasRules: false,
    hasAgents: false,
    hasRuntimeUri: false,
    hasInstallPathRef: false,
    hasForeignClaudeSibling: false,
    hasForeignCommandsDir: false,
    hasForeignCursorOrGemini: false,
    hasClaudeMdOnly: false,
    markdownContentChars: 0,
    scopedReadmeText: '',
    scopedProseText: '',
  };
  if (!scopedFiles || typeof scopedFiles.entries !== 'function') return info;

  let hasClaudeMd = false;
  let hasAgentsMd = false;
  const readmeParts = [];
  const proseParts = [];

  for (const [rawRel, rawBuf] of scopedFiles.entries()) {
    const rel = normalizeRelPosix(rawRel);
    const lower = rel.toLowerCase();

    if (/^sidecars\/[^/]+\/sidecar\.json$/.test(rel) || rel === 'sidecars.json') {
      info.hasSidecar = true;
    }
    if (rel === 'mcp_config.json') {
      info.hasMcpConfig = true;
    }
    if (lower === '.mcp.json') {
      info.hasDotMcpJson = true;
    }
    if (rel === 'hooks.json') {
      info.hasHooksJson = true;
      try {
        const parsed = parseJsonc(toUtf8(rawBuf));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [topKey, topVal] of Object.entries(parsed)) {
            if (HOOK_META_KEYS.has(topKey)) continue;
            info.hooksJsonNonMetaKeyCount += 1;
            if (Array.isArray(topVal)) {
              info.hooksJsonEvents.push(topKey);
            } else if (topVal && typeof topVal === 'object') {
              if (topVal.enabled === false) continue;
              for (const [evKey, evVal] of Object.entries(topVal)) {
                if (HOOK_META_KEYS.has(evKey)) continue;
                if (Array.isArray(evVal)) {
                  info.hooksJsonEvents.push(evKey);
                }
              }
            }
          }
        }
      } catch {
        /* ignore malformed hooks.json */
      }
    }
    if (lower.startsWith('.claude-plugin/') || lower === 'marketplace.json') {
      info.hasForeignClaudeSibling = true;
    }
    if (/^commands\/[^/]+\.md$/i.test(rel)) {
      info.hasForeignCommandsDir = true;
    }
    if (
      lower === '.cursorrules' ||
      lower.startsWith('.cursor/rules/') ||
      lower === 'gemini-extension.json' ||
      lower === 'codex.json'
    ) {
      info.hasForeignCursorOrGemini = true;
    }
    if (lower === 'claude.md') hasClaudeMd = true;
    if (lower === 'agents.md' || lower === 'rules/agents.md') hasAgentsMd = true;

    const isSkillMd = /^skills\/[^/]+\/SKILL\.md$/.test(rel);
    const isRuleMd = /^rules\/[^/]+\.md$/i.test(rel);
    const isAgentMd = /^agents\/[^/]+\.md$/i.test(rel);
    const isReadme = /^(?:docs\/)?readme(?:[._-][a-z-]+)?\.md$/i.test(rel);
    const isCode = /\.(?:mjs|cjs|js|ts|py|sh|ps1)$/i.test(rel);

    if (isSkillMd) info.hasSkills = true;
    if (isRuleMd) info.hasRules = true;
    if (isAgentMd) info.hasAgents = true;

    if (isSkillMd || isRuleMd || isAgentMd || isReadme || isCode) {
      const text = toUtf8(rawBuf).slice(0, 16_000);
      if (isSkillMd || isRuleMd || isAgentMd) {
        info.markdownContentChars += text.replace(/\s+/g, '').length;
        proseParts.push(text.slice(0, 2000));
      }
      if (isReadme) {
        readmeParts.push(text.slice(0, 6000));
      }
      if (!info.hasRuntimeUri && AGY_RUNTIME_URI_RE.test(text)) {
        info.hasRuntimeUri = true;
      }
      if (!info.hasInstallPathRef && AGY_INSTALL_PATH_RE.test(text)) {
        info.hasInstallPathRef = true;
      }
    }
  }

  info.hasClaudeMdOnly = hasClaudeMd && !hasAgentsMd;
  info.scopedReadmeText = readmeParts.join('\n');
  info.scopedProseText = proseParts.join('\n');
  return info;
}

/**
 * Calibrated deterministic log-odds authenticity classifier for Antigravity plugins.
 *
 * Returns `{ score, logOdds, decision: 'accept' | 'gray' | 'reject', compatTier: 'native' | 'compatible' | null, reasonCode, signals }`.
 */
export function scoreAntigravityAuthenticity({
  manifestPath = 'plugin.json',
  pluginRoot = '.',
  rawManifest = null,
  companion = null,
  scopedFiles = null,
  capabilities = null,
  components = null,
  readmes = null,
  scopedReadme = '',
  repoMeta = null,
  isHeterogeneousManifest = null,
} = {}) {
  const normRoot = normalizeRelPosix(pluginRoot || '.');
  const normManifestPath = normalizeRelPosix(manifestPath || 'plugin.json');
  const fullManifestPath = normRoot === '.' ? normManifestPath : `${normRoot}/${normManifestPath}`;
  const isSubdir = normRoot !== '.';

  const badges = Array.isArray(capabilities?.badges) ? capabilities.badges : [];
  const capHookEvents = Array.isArray(capabilities?.hookEvents) ? capabilities.hookEvents : [];
  const compSignals = components?.signals || {};
  const fileInfo = inspectScopedFilesDetails(scopedFiles);

  const hasSidecar = Boolean(compSignals.hasSidecar || badges.includes('sidecar-ui') || fileInfo.hasSidecar);
  const hasMcp = Boolean(
    compSignals.hasMcp || badges.includes('mcp-stdio') || badges.includes('mcp-remote') || fileInfo.hasMcpConfig,
  );
  const hasCompanion = Boolean(companion && typeof companion === 'object');
  const hasSkill = Boolean(compSignals.hasSkill || fileInfo.hasSkills || badges.includes('declarative-only'));
  const hasRule = Boolean(compSignals.hasRule || fileInfo.hasRules || badges.includes('global-rules'));
  const hasAgent = Boolean(compSignals.hasAgent || fileInfo.hasAgents);
  const hostEnhancementKind = Array.isArray(capabilities?.hostEnhancementKind)
    ? capabilities.hostEnhancementKind.filter(Boolean)
    : [];
  const hasHostEnhancement = Boolean(
    compSignals.hasHostEnhancement ||
      badges.includes('host-enhancement') ||
      hostEnhancementKind.length > 0,
  );

  const mergedHookEvents = [...new Set([...capHookEvents, ...fileInfo.hooksJsonEvents])];
  const validAgyHooks = mergedHookEvents.filter((ev) => ANTIGRAVITY_HOOK_EVENTS.has(ev));
  const hasHooksDeclared = Boolean(
    fileInfo.hasHooksJson ||
      compSignals.hasHooks ||
      badges.includes('lifecycle-hooks') ||
      mergedHookEvents.length > 0,
  );
  const hasAgyExclusiveHook = validAgyHooks.some((ev) => AGY_EXCLUSIVE_HOOK_EVENTS.has(ev));

  const hasAnyComponent = Boolean(
    compSignals.hasAnyComponent !== undefined
      ? compSignals.hasAnyComponent || hasHostEnhancement
      : hasSidecar ||
          hasMcp ||
          hasSkill ||
          hasRule ||
          hasAgent ||
          validAgyHooks.length > 0 ||
          hasHostEnhancement ||
          badges.length > 0,
  );

  const signals = {
    vetoes: [],
    tier1: [],
    positive: [],
    negative: [],
    subScopeIsolated: false,
    manifestPurity: null,
    cAgy: 0,
    cOther: 0,
  };

  const veto = (reasonCode) => {
    signals.vetoes.push(reasonCode);
    return {
      score: 0,
      logOdds: -Infinity,
      decision: 'reject',
      compatTier: null,
      reasonCode,
      signals,
    };
  };

  // ── HARD VETOES ─────────────────────────────────────────────────────────────
  // 1. Foreign host directory (`.claude-plugin`, `.cursor-plugin`, `.codex-plugin`, `.opencode`, `plugins/copilot`)
  if (
    FOREIGN_HOST_PATH_RE.test(fullManifestPath) ||
    FOREIGN_HOST_PATH_RE.test(normRoot) ||
    (FOREIGN_COPILOT_PATH_RE.test(normRoot) && !hasSidecar && !hasCompanion)
  ) {
    return veto('ERR_FOREIGN_HOST_DIR');
  }

  // 2. Heterogeneous non-Antigravity manifest (Grafana, Mattermost, NodeBB, Obsidian, VSCode, Raycast)
  const heterogeneous =
    typeof isHeterogeneousManifest === 'boolean'
      ? isHeterogeneousManifest
      : isHeterogeneousHostManifest(rawManifest);
  if (heterogeneous && !hasSidecar && !hasCompanion) {
    return veto('ERR_FOREIGN_HOST_MANIFEST');
  }

  // 3. `hooks.json` present with non-empty hook declarations and 0 valid ANTIGRAVITY_HOOK_EVENTS
  //    (kills Copilot camelCase `preToolUse`/`sessionStart`/`userPromptSubmitted` & panorama-term `modules`)
  if (
    hasHooksDeclared &&
    validAgyHooks.length === 0 &&
    (mergedHookEvents.length > 0 || fileInfo.hooksJsonNonMetaKeyCount > 0)
  ) {
    return veto('ERR_FOREIGN_HOST_HOOKS');
  }

  // 4. Template / boilerplate / placeholder stub
  const rawNameLower = String(rawManifest?.name || '').trim().toLowerCase();
  if (
    repoMeta?.is_template === true ||
    PLACEHOLDER_PLUGIN_NAMES.has(rawNameLower) ||
    PLACEHOLDER_PATH_RE.test(normRoot)
  ) {
    return veto('ERR_TEMPLATE_STUB');
  }
  if (
    fileInfo.hasScopedFiles &&
    !hasSidecar &&
    !hasMcp &&
    validAgyHooks.length === 0 &&
    (hasSkill || hasRule || hasAgent) &&
    fileInfo.markdownContentChars < 80
  ) {
    return veto('ERR_TEMPLATE_STUB');
  }

  // 5. Zero valid Antigravity components
  if (!hasAnyComponent) {
    return veto('ERR_NO_AGY_COMPONENTS');
  }

  // ── SUBDIR SCOPE ISOLATION (Prevents Root-README / Repo-Name Bleed) ─────────
  const manifestText = [
    rawManifest?.name || '',
    rawManifest?.displayName || '',
    rawManifest?.description || '',
  ]
    .filter((s) => typeof s === 'string' && s.trim())
    .join(' ');

  const fallbackReadmeBlob = [
    readmes?.readmeMarkdown || '',
    readmes?.readmeEnMarkdown || '',
    readmes?.readmeZhMarkdown || '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 12_000);

  const effectiveScopedReadme =
    (typeof scopedReadme === 'string' && scopedReadme.trim()) ||
    fileInfo.scopedReadmeText ||
    (!isSubdir ? fallbackReadmeBlob : '');

  const scopedDirectCorpus = `${normRoot} ${manifestText} ${fileInfo.scopedProseText} ${effectiveScopedReadme}`;
  const scopedAgyHits = countRegexMatches(AGY_TEXT_MENTION_RE, scopedDirectCorpus);
  const scopedForeignHits = countRegexMatches(FOREIGN_HOST_TEXT_RE, scopedDirectCorpus);
  const manifestAgyHits = countRegexMatches(AGY_TEXT_MENTION_RE, manifestText);
  const manifestForeignHits = countRegexMatches(FOREIGN_HOST_TEXT_RE, manifestText);

  const subdirTargetsForeignHost =
    isSubdir &&
    (manifestForeignHits > 0 && manifestAgyHits === 0 ||
      (scopedForeignHits > 0 && scopedAgyHits === 0) ||
      FOREIGN_REPO_NAME_RE.test(normRoot) && !AGY_REPO_NAME_RE.test(normRoot) ||
      fileInfo.hasForeignClaudeSibling ||
      fileInfo.hasClaudeMdOnly);

  if (subdirTargetsForeignHost) {
    signals.subScopeIsolated = true;
  }

  // Only fall back to repo-root README when NOT a foreign-targeting subdir.
  const analysisReadme = effectiveScopedReadme || (subdirTargetsForeignHost ? '' : fallbackReadmeBlob);
  const fullAnalysisCorpus = `${manifestText}\n${fileInfo.scopedProseText}\n${analysisReadme}`;

  const cAgy = countRegexMatches(AGY_TEXT_MENTION_RE, fullAnalysisCorpus);
  const cOther = countRegexMatches(FOREIGN_HOST_TEXT_RE, fullAnalysisCorpus);
  const cClaude = countRegexMatches(FOREIGN_CLAUDE_TEXT_RE, fullAnalysisCorpus);
  signals.cAgy = cAgy;
  signals.cOther = cOther;

  const hasRuntimeUri = Boolean(
    fileInfo.hasRuntimeUri || AGY_RUNTIME_URI_RE.test(effectiveScopedReadme || manifestText),
  );
  const hasInstallPathRef = Boolean(
    fileInfo.hasInstallPathRef || AGY_INSTALL_PATH_RE.test(effectiveScopedReadme || ''),
  );

  // ── WEIGHTED EVIDENCE SCORING ───────────────────────────────────────────────
  let logOdds = PRIOR_LOG_ODDS;
  const addPos = (name, w, isTier1 = false) => {
    logOdds += w;
    signals.positive.push({ name, weight: w });
    if (isTier1) signals.tier1.push(name);
  };
  const addNeg = (name, w) => {
    logOdds += w;
    signals.negative.push({ name, weight: w });
  };

  // Tier-1 Antigravity-Exclusive Structural Signals
  if (typeof rawManifest?.$schema === 'string' && AGY_SCHEMA_RE.test(rawManifest.$schema)) {
    addPos('agy_schema', 5.0, true);
  }
  if (hasSidecar) {
    addPos('sidecar_ui', 4.5, true);
  }
  if (hasCompanion) {
    addPos('agy_market_companion', 4.5, true);
  }
  if (
    normManifestPath === '.antigravity-plugin/plugin.json' ||
    fullManifestPath.endsWith('/.antigravity-plugin/plugin.json')
  ) {
    addPos('antigravity_plugin_dir', 3.5, true);
  }
  if (hasRuntimeUri) {
    addPos('agy_runtime_uri', 2.8, true);
  }
  if (
    Array.isArray(rawManifest?.suggestedPrompts) &&
    rawManifest.suggestedPrompts.length >= 1 &&
    rawManifest.suggestedPrompts.length <= 3 &&
    rawManifest.suggestedPrompts.every((s) => typeof s === 'string' && s.trim().length > 0)
  ) {
    addPos('suggested_prompts', 2.4, true);
  }
  if (hasAgyExclusiveHook) {
    addPos('agy_exclusive_hook', 2.2, true);
  }

  const hasTier1Signal = signals.tier1.length > 0;

  // Tier-2 Compatibility, Ecosystem & Schema Adherence Signals
  const topics = Array.isArray(repoMeta?.topics) ? repoMeta.topics : [];
  if (!subdirTargetsForeignHost && topics.some((t) => AGY_TOPIC_RE.test(String(t || '').trim()))) {
    addPos('agy_plugin_topic', 2.2);
  }
  if (hasMcp) {
    addPos('mcp_config', 1.8);
  }
  const repoName = String(
    repoMeta?.name || (repoMeta?.full_name ? String(repoMeta.full_name).split('/')[1] : '') || '',
  ).trim();
  if (!subdirTargetsForeignHost && repoName && AGY_REPO_NAME_RE.test(repoName)) {
    addPos('agy_repo_name', 1.6);
  }

  // Manifest schema purity (exempts BENIGN_LENIENT_MANIFEST_KEYS so valid lenient manifests are not penalized)
  if (rawManifest && typeof rawManifest === 'object' && !Array.isArray(rawManifest)) {
    const keys = Object.keys(rawManifest);
    const evaluatedKeys = keys.filter((k) => !BENIGN_LENIENT_MANIFEST_KEYS.has(k));
    if (evaluatedKeys.length > 0) {
      const allowedCount = evaluatedKeys.filter((k) => PLUGIN_JSON_ALLOWED_KEYS.has(k)).length;
      const rho = allowedCount / evaluatedKeys.length;
      signals.manifestPurity = round4(rho);
      const purityWeight = round4(1.6 * (2 * rho - 1));
      if (purityWeight >= 0) {
        addPos('manifest_purity', purityWeight);
      } else {
        addNeg('manifest_purity_low', purityWeight);
      }
    }

    // Foreign Claude Code manifest keys inside plugin.json
    const claudeKeys = keys.filter((k) => CLAUDE_CODE_MANIFEST_KEYS.has(k));
    if (claudeKeys.length > 0) {
      addNeg('claude_manifest_keys', Math.max(-4.5, -2.2 * claudeKeys.length));
    }
  }

  // Scoped text AGY mention
  if (!subdirTargetsForeignHost && cAgy > 0) {
    addPos('agy_text_affinity', 1.2);
  }

  // Demoted non-Tier-1 install path mention (only rewarded when NOT foreign-dominant)
  const foreignDominant =
    (cOther >= 3 && cAgy === 0) || (cOther >= 3 && cOther > 3 * (cAgy + 1) && !hasTier1Signal);
  if (hasInstallPathRef && !foreignDominant && !subdirTargetsForeignHost) {
    addPos('agy_install_path_ref', 1.0);
  }

  // Component presence signals (modest so cross-agent SKILL.md / hooks / host scripts alone cannot pass)
  if (hasSkill) addPos('has_skill', 0.9);
  if (hasRule || hasAgent) addPos('has_rule_or_agent', 0.7);
  if (hasHostEnhancement) addPos('has_host_enhancement', 0.5);
  if (validAgyHooks.length > 0 && !hasAgyExclusiveHook) {
    addPos('has_shared_hook_events', 0.4);
  }

  // Tier-3 Negative / Foreign-Host Competition Signals
  if (fileInfo.hasForeignClaudeSibling && !normManifestPath.includes('.antigravity-plugin')) {
    addNeg('foreign_claude_sibling', -3.5);
  }
  if (fileInfo.hasDotMcpJson && !hasMcp) {
    addNeg('claude_dot_mcp_json', -2.2);
  }
  let foreignLayoutPenalty = 0;
  if (fileInfo.hasForeignCommandsDir) foreignLayoutPenalty -= 1.8;
  if (fileInfo.hasForeignCursorOrGemini) foreignLayoutPenalty -= 1.8;
  if (fileInfo.hasClaudeMdOnly) foreignLayoutPenalty -= 1.5;
  if (foreignLayoutPenalty < 0) {
    addNeg('foreign_host_layout', Math.max(-3.6, foreignLayoutPenalty));
  }

  const manifestTargetsForeignHost = manifestForeignHits > 0 && manifestAgyHits === 0;
  if (manifestTargetsForeignHost && !hasTier1Signal) {
    addNeg('manifest_targets_foreign_host', -2.2);
  }
  if (subdirTargetsForeignHost && !hasTier1Signal) {
    addNeg('subdir_targets_foreign_host', -2.0);
  }
  if (repoName && FOREIGN_REPO_NAME_RE.test(repoName) && !AGY_REPO_NAME_RE.test(repoName) && !hasTier1Signal) {
    addNeg('foreign_repo_name', -1.8);
  }

  if (cOther >= 3 && cAgy === 0) {
    addNeg('foreign_host_only_text', -3.2);
  } else if (cOther >= 3 && cOther > 3 * (cAgy + 1) && !hasTier1Signal) {
    addNeg('foreign_host_dominant_text', -2.0);
  }

  // ── CALIBRATED 3-BAND DECISION GATE ─────────────────────────────────────────
  const score = round4(sigmoid(logOdds));
  const roundedLogOdds = round4(logOdds);

  if (score >= ACCEPT_THRESHOLD) {
    const compatTier = hasTier1Signal || score >= NATIVE_THRESHOLD ? 'native' : 'compatible';
    return {
      score,
      logOdds: roundedLogOdds,
      decision: 'accept',
      compatTier,
      reasonCode: null,
      signals,
    };
  }

  // Gray Zone (0.45 <= score < 0.72): NO `|| agyAffinity` auto-accept!
  // Accept ONLY if valid sidecar.json or mcp_config.json AND NOT foreign-dominant / foreign-targeting.
  if (score >= GRAY_THRESHOLD) {
    if ((hasSidecar || hasMcp) && !foreignDominant && !manifestTargetsForeignHost && !subdirTargetsForeignHost) {
      return {
        score,
        logOdds: roundedLogOdds,
        decision: 'accept',
        compatTier: 'compatible',
        reasonCode: null,
        signals,
      };
    }
    return {
      score,
      logOdds: roundedLogOdds,
      decision: 'gray',
      compatTier: null,
      reasonCode:
        foreignDominant || manifestTargetsForeignHost || subdirTargetsForeignHost
          ? 'ERR_FOREIGN_HOST_DOMINANT'
          : 'ERR_GRAY_ZONE_AMBIGUOUS',
      signals,
    };
  }

  // Reject (score < 0.45) with granular reason code for Neg-Cache v2 backoff
  let reasonCode = 'ERR_LOW_AGY_CONFIDENCE';
  if (
    fileInfo.hasForeignClaudeSibling ||
    fileInfo.hasDotMcpJson ||
    cClaude > 0 ||
    signals.negative.some((s) => s.name === 'claude_manifest_keys')
  ) {
    reasonCode = 'ERR_FOREIGN_HOST_CLAUDE';
  } else if (foreignDominant || manifestTargetsForeignHost || subdirTargetsForeignHost || fileInfo.hasForeignCursorOrGemini) {
    reasonCode = 'ERR_FOREIGN_HOST_OTHER';
  }

  return {
    score,
    logOdds: roundedLogOdds,
    decision: 'reject',
    compatTier: null,
    reasonCode,
    signals,
  };
}

function hasDirectPluginComponents(rootDir, filesMap) {
  if (!filesMap) return false;
  const prefix = rootDir === '.' ? '' : `${rootDir}/`;
  for (const relPath of filesMap.keys()) {
    if (prefix && !relPath.startsWith(prefix)) continue;
    const sub = prefix ? relPath.slice(prefix.length) : relPath;
    if (
      /^skills\/[^/]+\/SKILL\.md$/.test(sub) ||
      /^rules\/[^/]+\.md$/i.test(sub) ||
      /^agents\/[^/]+\.md$/i.test(sub) ||
      /^sidecars\/[^/]+\/sidecar\.json$/.test(sub) ||
      sub === 'sidecars.json' ||
      sub === 'mcp_config.json' ||
      sub === 'hooks.json'
    ) {
      return true;
    }
  }
  return false;
}

function isStandardContainerChild(dir) {
  return /^(?:plugins|packages|extensions|community\/plugins|\.agents\/plugins|\.agent\/plugins)\/[^/]+$/i.test(dir);
}

/**
 * Trie-based ancestor-descendant containment pruning & intra-repo source/build collapse
 * for monorepo / multi-root tarballs (ready for Wave-2 `discoverPluginRootsInArchive` wiring).
 */
export function pruneNestedCandidateRoots(candidateRoots, filesMap = null, { isMonorepo = false } = {}) {
  const unique = [...new Set((candidateRoots || []).map((r) => normalizeRelPosix(r)))].filter((r) => {
    if (r === '.') return true;
    const segs = r.split('/');
    return !segs.some((s) => EXCLUDED_SCAN_DIR_SEGMENTS_V2.has(s.toLowerCase()));
  });

  // Sort shallowest first so ancestors are evaluated before descendants
  unique.sort((a, b) => {
    const da = a === '.' ? 0 : a.split('/').length;
    const db = b === '.' ? 0 : b.split('/').length;
    return da - db || a.localeCompare(b);
  });

  const kept = [];
  for (const dir of unique) {
    let pruned = false;
    for (const anc of kept) {
      const isAncestor = anc === '.' ? dir !== '.' : dir.startsWith(`${anc}/`);
      if (!isAncestor) continue;
      const ancHasDirect = hasDirectPluginComponents(anc, filesMap);
      if (anc === '.') {
        if (!isMonorepo && !isStandardContainerChild(dir) && ancHasDirect) {
          pruned = true;
          break;
        }
      } else if (ancHasDirect || !isStandardContainerChild(dir)) {
        pruned = true;
        break;
      }
    }
    if (!pruned) kept.push(dir);
  }

  // Intra-repo source/build duplicate collapse (e.g., `plugin` vs `plugin-src`)
  if (!filesMap) return kept;
  const bySignature = new Map();
  const finalRoots = [];
  for (const dir of kept) {
    const prefix = dir === '.' ? '' : `${dir}/`;
    const mBuf = filesMap.get(`${prefix}plugin.json`) || filesMap.get(`${prefix}.antigravity-plugin/plugin.json`);
    let sig = '';
    if (mBuf) {
      try {
        const m = parseJsonc(toUtf8(mBuf));
        const name = String(m?.name || '').trim().toLowerCase();
        const desc = String(m?.description || '').trim().toLowerCase();
        if (name && desc.length >= 15) {
          sig = `${name}\0${desc}`;
        }
      } catch {
        sig = '';
      }
    }
    if (!sig) {
      finalRoots.push(dir);
      continue;
    }
    if (!bySignature.has(sig)) {
      bySignature.set(sig, dir);
      finalRoots.push(dir);
    } else {
      // Prefer shorter / non-`-src` root
      const prev = bySignature.get(sig);
      const prevIsSrc = /(?:^|\/|-)src$/i.test(prev);
      const curIsSrc = /(?:^|\/|-)src$/i.test(dir);
      if ((prevIsSrc && !curIsSrc) || (prevIsSrc === curIsSrc && dir.length < prev.length)) {
        const idx = finalRoots.indexOf(prev);
        if (idx !== -1) finalRoots[idx] = dir;
        bySignature.set(sig, dir);
      }
    }
  }
  return finalRoots;
}
