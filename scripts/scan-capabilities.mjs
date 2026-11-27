// 4-Layer Static Capability & Safety Scanner (`scripts/scan-capabilities.mjs`).
//
// Security Philosophy:
//   - HARD-BLOCK genuine supply-chain / exfiltration attacks:
//       1. `rules/*.md` `@[label](path)` local-file exfiltration (`..`, `~/`, `$ENV`, absolute paths) & >24KB ceiling
//       2. Invisible prompt-injection smuggling (Unicode Tag block U+E0000..U+E007F & bidi overrides)
//   - PERMISSIVELY PROFILE legitimate Antigravity capabilities (including CDP & `app.asar` host enhancements ->
//     gentle `host-enhancement` badge `💡 宿主界面增强`, NEVER blocked or penalized).

import { GENERIC_MCP_SERVER_NAMES, MAX_RULE_FILE_BYTES, normalizeRelPosix, parseJsonc } from './lib/constants.mjs';

const INVISIBLE_SMUGGLING_RE = /[\u{E0000}-\u{E007F}\u202A-\u202E\u2066-\u2069]/u;

const CDP_DETECTION_RE =
  /--remote-debugging-port|webSocketDebuggerUrl|DevToolsActivePort|Runtime\.evaluate|Page\.addScriptToEvaluateOnNewDocument/;

const ASAR_DETECTION_RE = /\bapp\.asar\b|asar\.extractAll|asar\.createPackage/;

const NON_RUNTIME_TEST_PATH_RE = /(?:^|\/)(?:test|tests|__tests__)\/|\.(?:test|spec)\.[a-z0-9]+$/i;

const HOOK_META_KEYS = new Set(['$schema', 'version', 'description', 'enabled']);

const ANTIGRAVITY_HOOK_EVENTS = new Set([
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

function isValidSidecarManifestObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const hasCommand = typeof obj.command === 'string' && obj.command.trim().length > 0;
  const hasUiConfig = Boolean(obj.ui_config && typeof obj.ui_config === 'object');
  const hasWebUi = obj.has_web_ui === true;
  return hasCommand || hasUiConfig || hasWebUi;
}

function inspectRootSidecarsJson(rawBuf, pluginFilesMap) {
  const parsed = parseJsonc(rawBuf.toString('utf8'));
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.sidecars)
      ? parsed.sidecars
      : [];
  for (const item of entries) {
    if (typeof item === 'string') {
      const rel = normalizeRelPosix(item);
      if (!rel || rel === '.' || rel.includes('..') || rel.startsWith('/')) continue;
      const target = rel.toLowerCase().endsWith('.json') ? rel : `${rel}/sidecar.json`;
      const targetBuf = pluginFilesMap.get(target);
      if (!targetBuf) continue;
      const sc = parseJsonc(targetBuf.toString('utf8'));
      if (isValidSidecarManifestObject(sc)) return true;
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const relRef = String(
        item.sidecarJson || item.manifest || item.config || item.path || item.dir || item.folder || '',
      ).trim();
      if (relRef && !item.ui_config && !item.command && !item.has_web_ui) {
        const rel = normalizeRelPosix(relRef);
        if (!rel || rel === '.' || rel.includes('..') || rel.startsWith('/')) continue;
        const target = rel.toLowerCase().endsWith('.json') ? rel : `${rel}/sidecar.json`;
        const targetBuf = pluginFilesMap.get(target);
        if (!targetBuf) continue;
        const sc = parseJsonc(targetBuf.toString('utf8'));
        if (isValidSidecarManifestObject(sc)) return true;
      } else if (isValidSidecarManifestObject(item)) {
        return true;
      }
    }
  }
  return false;
}

function stripMarkdownCodeExamples(mdText) {
  // Strip fenced code blocks (```...``` or ~~~...~~~) and single-line inline code spans (`...`)
  // so documentation tables/examples do not falsely trip @[label](path) include checks.
  return mdText
    .replace(/^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^ {0,3}\1[ \t]*$/gm, '')
    .replace(/`[^`\r\n]+`/g, '');
}

function stripSourceComments(src, relPath) {
  if (/\.(?:py|sh|ps1)$/i.test(relPath)) {
    return src.replace(/^\s*#.*$/gm, '');
  }
  if (/\.(?:cmd|bat)$/i.test(relPath)) {
    return src.replace(/^\s*(?:rem\b|::).*$/gim, '');
  }
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

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
        out += ' ';
        i++;
      } else if (ch === '\n') {
        out += '\n';
      }
      continue;
    }
    if (inSingle) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === "'" || ch === '\n') inSingle = false;
      continue;
    }
    if (inDouble) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"' || ch === '\n') inDouble = false;
      continue;
    }
    if (inTemplate) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '`') inTemplate = false;
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
    if (ch === "'") {
      inSingle = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      out += ch;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function checkRulesExfiltration(relPath, contentText) {
  // Match real `@[label](target)` includes outside fenced/inline code documentation examples
  const proseOnly = stripMarkdownCodeExamples(contentText);
  const atIncludeRe = /@\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = atIncludeRe.exec(proseOnly)) !== null) {
    const rawTarget = match[1].trim();
    if (!rawTarget || /^https?:\/\//i.test(rawTarget)) continue;
    if (
      /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(rawTarget) ||
      rawTarget.startsWith('~/') ||
      rawTarget.startsWith('~\\') ||
      rawTarget.startsWith('/') ||
      rawTarget.startsWith('\\') ||
      /^[A-Za-z]:/.test(rawTarget) ||
      /^file:/i.test(rawTarget) ||
      /\$[A-Za-z_{]|%[A-Za-z_]+%/.test(rawTarget)
    ) {
      throw new Error(
        `ERR_RULES_PATH_EXFILTRATION: "${relPath}" references out-of-root path "${rawTarget}" via @[...](...)`,
      );
    }
  }
}

function parseSkillFrontmatterName(mdText) {
  const clean = mdText.replace(/^\uFEFF/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(clean);
  if (!m) return null;
  const nameMatch = /^\s*name\s*:\s*([^\r\n#]+)/m.exec(m[1]);
  if (!nameMatch) return null;
  return nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
}

function parseSkillFrontmatterDescription(mdText) {
  const clean = mdText.replace(/^\uFEFF/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(clean);
  if (!m) return '';
  const descMatch = /^\s*description\s*:\s*([^\r\n]+)/m.exec(m[1]);
  if (!descMatch) return '';
  return descMatch[1].trim().replace(/^['"]|['"]$/g, '');
}

/**
 * Inspects files inside `<pluginRoot>` (`Map<string, Buffer>`) and produces
 * `{ capabilities, components }` or throws on hard-blocked exfiltration/smuggling.
 */
export function scanPluginCapabilities(pluginFilesMap, { pluginName = '' } = {}) {
  const badges = [];
  let totalRuleBytes = 0;
  let hasRules = false;
  let hasSidecarUi = false;
  let hasMcpStdio = false;
  let hasMcpRemote = false;
  let hasLifecycleHooks = false;
  let hooksJsonNonMetaKeyCount = 0;
  let hasSkillsOrAgents = false;
  let nonEmptySkillsCount = 0;
  let nonEmptyAgentsCount = 0;
  let nonEmptyRulesCount = 0;

  const mcpServers = [];
  const mcpRawKeys = [];
  const mcpRemoteDomains = new Set();
  const hookEvents = new Set();
  const hostEnhancementKinds = new Set();
  const claimedSkills = [];
  const skillDescriptions = [];
  const claimedAgents = [];

  for (const [relPath, buf] of pluginFilesMap.entries()) {
    // 1. Rules scan (`rules/*.md`)
    if (/^rules\/[^/]+\.md$/i.test(relPath)) {
      hasRules = true;
      if (buf.length > MAX_RULE_FILE_BYTES) {
        throw new Error(
          `ERR_RULE_SIZE_EXCEEDED: "${relPath}" is ${buf.length} bytes (Antigravity ceiling is ${MAX_RULE_FILE_BYTES} bytes)`,
        );
      }
      totalRuleBytes += buf.length;
      const text = buf.toString('utf8');
      if (INVISIBLE_SMUGGLING_RE.test(text)) {
        throw new Error(
          `ERR_INVISIBLE_PROMPT_INJECTION: Disallowed Unicode Tag or bidi override characters in "${relPath}"`,
        );
      }
      checkRulesExfiltration(relPath, text);
      if (text.trim().length > 0) {
        nonEmptyRulesCount += 1;
      }
    }

    // 2. Skills scan (`skills/<skill>/SKILL.md` & nested smuggling check)
    const skillMatch = /^skills\/([^/]+)\/SKILL\.md$/.exec(relPath);
    if (skillMatch) {
      hasSkillsOrAgents = true;
      const skillDir = skillMatch[1];
      const text = buf.toString('utf8');
      if (INVISIBLE_SMUGGLING_RE.test(text)) {
        throw new Error(
          `ERR_INVISIBLE_PROMPT_INJECTION: Disallowed Unicode Tag or bidi override characters in "${relPath}"`,
        );
      }
      if (text.trim().length > 0) {
        nonEmptySkillsCount += 1;
      }
      const fmName = parseSkillFrontmatterName(text);
      const fmDesc = parseSkillFrontmatterDescription(text);
      if (fmDesc) skillDescriptions.push(fmDesc);
      claimedSkills.push({ dir: skillDir, frontmatterName: fmName || skillDir });
    } else if (/^skills\/.+\/SKILL\.md$/i.test(relPath)) {
      const text = buf.toString('utf8');
      if (INVISIBLE_SMUGGLING_RE.test(text)) {
        throw new Error(
          `ERR_INVISIBLE_PROMPT_INJECTION: Disallowed Unicode Tag or bidi override characters in "${relPath}"`,
        );
      }
    }

    // 3. Agents scan (`agents/<agent>.md`)
    const agentMatch = /^agents\/([^/]+)\.md$/i.exec(relPath);
    if (agentMatch) {
      hasSkillsOrAgents = true;
      const agentName = agentMatch[1];
      const text = buf.toString('utf8');
      if (INVISIBLE_SMUGGLING_RE.test(text)) {
        throw new Error(
          `ERR_INVISIBLE_PROMPT_INJECTION: Disallowed Unicode Tag or bidi override characters in "${relPath}"`,
        );
      }
      if (text.trim().length > 0) {
        nonEmptyAgentsCount += 1;
      }
      claimedAgents.push(agentName);
    }

    // 4. Sidecar UI (`sidecars/<id>/sidecar.json` & root `sidecars.json`)
    if (/^sidecars\/[^/]+\/sidecar\.json$/.test(relPath)) {
      const parsed = parseJsonc(buf.toString('utf8'));
      if (isValidSidecarManifestObject(parsed)) {
        hasSidecarUi = true;
      }
    } else if (relPath === 'sidecars.json') {
      if (inspectRootSidecarsJson(buf, pluginFilesMap)) {
        hasSidecarUi = true;
      }
    }

    // 5. MCP Config (`mcp_config.json`)
    if (relPath === 'mcp_config.json') {
      const parsed = parseJsonc(buf.toString('utf8'));
      const serversObj = parsed?.mcpServers && typeof parsed.mcpServers === 'object' ? parsed.mcpServers : {};
      for (const [serverKey, cfg] of Object.entries(serversObj)) {
        mcpRawKeys.push(serverKey);
        const namespaced = pluginName ? `${pluginName}_${serverKey}` : serverKey;
        mcpServers.push(namespaced);
        const remoteUrl = cfg?.serverUrl || cfg?.url || cfg?.httpUrl || '';
        if (typeof remoteUrl === 'string' && /^https?:\/\//i.test(remoteUrl)) {
          hasMcpRemote = true;
          try {
            const u = new URL(remoteUrl);
            mcpRemoteDomains.add(u.hostname.toLowerCase());
          } catch {
            throw new Error(`ERR_MCP_INVALID_URL: Invalid remote URL "${remoteUrl}" in mcp_config.json`);
          }
        }
        if (typeof cfg?.command === 'string' && cfg.command.trim()) {
          hasMcpStdio = true;
        }
      }
    }

    // 6. Lifecycle Hooks (`hooks.json` — supports Antigravity named hook groups, `{ hooks: {...} }`, & flat maps)
    if (relPath === 'hooks.json') {
      const parsed = parseJsonc(buf.toString('utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [topKey, topVal] of Object.entries(parsed)) {
          if (HOOK_META_KEYS.has(topKey)) continue;
          hooksJsonNonMetaKeyCount += 1;
          if (Array.isArray(topVal)) {
            hookEvents.add(topKey);
          } else if (topVal && typeof topVal === 'object') {
            if (topVal.enabled === false) continue;
            for (const [eventKey, eventVal] of Object.entries(topVal)) {
              if (HOOK_META_KEYS.has(eventKey)) continue;
              if (Array.isArray(eventVal)) {
                hookEvents.add(eventKey);
              }
            }
          }
        }
      }
      if (hookEvents.size > 0) {
        hasLifecycleHooks = true;
      }
    }

    // 7. Permissive Host-Enhancement Profiling (CDP & app.asar — strip comments & skip non-runtime test suites!)
    if (/\.(?:mjs|cjs|js|ts|py|ps1|sh|cmd|bat)$/i.test(relPath) && !NON_RUNTIME_TEST_PATH_RE.test(relPath)) {
      const code = stripSourceComments(buf.toString('utf8'), relPath);
      if (CDP_DETECTION_RE.test(code)) {
        hostEnhancementKinds.add('cdp');
      }
      if (ASAR_DETECTION_RE.test(code)) {
        hostEnhancementKinds.add('app-asar');
      }
    }
  }

  const rulesEstimatedTokens = hasRules ? Math.ceil(totalRuleBytes / 4) : 0;
  const hostEnhancementKind = [...hostEnhancementKinds].sort();
  const hasHostEnhancement = hostEnhancementKind.length > 0;
  const hasAntigravityHookEvent = [...hookEvents].some((ev) => ANTIGRAVITY_HOOK_EVENTS.has(ev));
  const hasMcp = hasMcpStdio || hasMcpRemote;
  const hasAnyComponent =
    nonEmptySkillsCount > 0 ||
    nonEmptyAgentsCount > 0 ||
    nonEmptyRulesCount > 0 ||
    hasMcp ||
    hasSidecarUi ||
    hookEvents.size > 0 ||
    hasHostEnhancement;
  const hasStrongSignal =
    nonEmptySkillsCount > 0 || hasMcp || hasSidecarUi || hasAntigravityHookEvent;

  const isPureDeclarative =
    hasSkillsOrAgents &&
    !hasRules &&
    !hasSidecarUi &&
    !hasMcpStdio &&
    !hasMcpRemote &&
    !hasLifecycleHooks &&
    hostEnhancementKind.length === 0;

  if (isPureDeclarative) badges.push('declarative-only');
  if (hasRules) badges.push('global-rules');
  if (hasSidecarUi) badges.push('sidecar-ui');
  if (hasMcpStdio) badges.push('mcp-stdio');
  if (hasMcpRemote) badges.push('mcp-remote');
  if (hasLifecycleHooks) badges.push('lifecycle-hooks');
  if (hostEnhancementKind.length > 0) badges.push('host-enhancement');

  const genericMcpViolations = mcpRawKeys.filter((k) => GENERIC_MCP_SERVER_NAMES.has(k.toLowerCase()));

  return {
    capabilities: {
      badges,
      rulesEstimatedTokens,
      mcpServers: mcpServers.sort(),
      mcpRemoteDomains: [...mcpRemoteDomains].sort(),
      hookEvents: [...hookEvents].sort(),
      hostEnhancementKind,
    },
    components: {
      claimedSkills,
      skillDescriptions,
      claimedAgents: claimedAgents.sort(),
      mcpRawKeys,
      genericMcpViolations,
      signals: {
        hasSkill: nonEmptySkillsCount > 0,
        hasAgent: nonEmptyAgentsCount > 0,
        hasRule: nonEmptyRulesCount > 0,
        hasMcp,
        hasSidecar: hasSidecarUi,
        hasHooks: hookEvents.size > 0 || hooksJsonNonMetaKeyCount > 0,
        hooksJsonNonMetaKeyCount,
        hasAntigravityHookEvent,
        hasHostEnhancement,
        hasAnyComponent,
        hasStrongSignal,
      },
    },
  };
}
