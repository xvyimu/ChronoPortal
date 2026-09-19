import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT_DOCS = [
  'README.md',
  'AGENTS.md',
  'TODO.md',
  'task_plan.md',
  'findings.md',
  'progress.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'GITHUB_IDENTITY.md',
];

// 日期型文件名 = 历史快照。快照记的是**当时**的事实，它引用的文件后来搬走了
// 属预期，不该被追改（同 audit-docs.mjs 的 D5 降级口径：历史文件里的死链只记 info）。
// 只按「文件名带日期」和「archive/legacy 目录」判定，与 audit-docs 保持一致。
const DATED_RE = /\d{4}-\d{2}(-\d{2})?/u;
function isHistoricalPath(file) {
  const norm = file.replace(/\\/g, '/');
  const base = norm.slice(norm.lastIndexOf('/') + 1);
  return DATED_RE.test(base) || /\/(archive|legacy)\//u.test(norm);
}

function walkMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(entryPath);
    return entryPath.endsWith('.md') ? [entryPath] : [];
  });
}

function extractTarget(rawTarget) {
  const target = rawTarget.trim();
  if (target.startsWith('<')) {
    const closing = target.indexOf('>');
    return closing === -1 ? target : target.slice(1, closing);
  }

  let end = 0;
  while (end < target.length && !/\s/u.test(target[end])) {
    end += target[end] === '\\' && end + 1 < target.length ? 2 : 1;
  }

  return target.slice(0, end).replace(/\\([\\()])/gu, '$1');
}

function isExternalOrDocumentAnchor(target) {
  return (
    !target ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^(?:https?:|mailto:|tel:|data:)/iu.test(target)
  );
}

// file:///D:/x.md —— 绝对路径，按绝对路径校验，别当相对路径解析。
// 与 audit-docs.mjs 的 D5 同口径（Chronicle 自身现无此写法，LexVoyage 的
// ARCHITECTURE.md / stack-matrix 用；本仓保留该分支以便三仓共用同一脚本）。
function resolveFileUrl(target) {
  let abs = decodeURI(target.replace(/^file:\/\//u, ''));
  if (/^\/[A-Za-z]:/u.test(abs)) abs = abs.slice(1);
  return abs;
}

function stripInlineCode(line) {
  let output = '';

  for (let index = 0; index < line.length;) {
    if (line[index] !== '`') {
      output += line[index];
      index += 1;
      continue;
    }

    let openerLength = 1;
    while (line[index + openerLength] === '`') openerLength += 1;

    let closingIndex = -1;
    for (let cursor = index + openerLength; cursor < line.length;) {
      if (line[cursor] !== '`') {
        cursor += 1;
        continue;
      }

      let closerLength = 1;
      while (line[cursor + closerLength] === '`') closerLength += 1;
      if (closerLength === openerLength) {
        closingIndex = cursor;
        break;
      }
      cursor += closerLength;
    }

    if (closingIndex === -1) {
      output += line.slice(index);
      break;
    }

    const codeLength = closingIndex + openerLength - index;
    output += ' '.repeat(codeLength);
    index = closingIndex + openerLength;
  }

  return output;
}

function stripMarkdownCode(markdown) {
  let activeFence = null;

  return markdown
    .split(/\r?\n/u)
    .map((line) => {
      if (activeFence) {
        const closing = /^ {0,3}(`+|~+)[ \t]*$/u.exec(line);
        if (
          closing &&
          closing[1][0] === activeFence.character &&
          closing[1].length >= activeFence.length
        ) {
          activeFence = null;
        }
        return '';
      }

      const opening = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
      if (opening) {
        activeFence = {
          character: opening[1][0],
          length: opening[1].length,
        };
        return '';
      }

      if (/^(?: {4}|\t)/u.test(line)) return '';
      return stripInlineCode(line);
    })
    .join('\n');
}

function extractInlineTargets(markdown) {
  const targets = [];

  for (let index = 0; index < markdown.length; index += 1) {
    if (markdown[index] === '\\') {
      index += 1;
      continue;
    }
    if (markdown[index] !== '[') continue;

    let labelDepth = 1;
    let labelEnd = index + 1;
    for (; labelEnd < markdown.length; labelEnd += 1) {
      if (markdown[labelEnd] === '\\') {
        labelEnd += 1;
        continue;
      }
      if (markdown[labelEnd] === '[') labelDepth += 1;
      if (markdown[labelEnd] === ']') labelDepth -= 1;
      if (labelDepth === 0) break;
    }

    if (labelDepth !== 0 || markdown[labelEnd + 1] !== '(') continue;

    const targetStart = labelEnd + 2;
    let parenthesisDepth = 1;
    let insideAngleBrackets = false;
    let targetEnd = targetStart;

    for (; targetEnd < markdown.length; targetEnd += 1) {
      const character = markdown[targetEnd];
      if (character === '\\') {
        targetEnd += 1;
        continue;
      }
      if (character === '<' && parenthesisDepth === 1) {
        insideAngleBrackets = true;
        continue;
      }
      if (character === '>' && insideAngleBrackets) {
        insideAngleBrackets = false;
        continue;
      }
      if (insideAngleBrackets) continue;
      if (character === '(') parenthesisDepth += 1;
      if (character === ')') parenthesisDepth -= 1;
      if (parenthesisDepth === 0) break;
    }

    if (parenthesisDepth === 0) {
      targets.push(markdown.slice(targetStart, targetEnd));
      index = targetEnd;
    }
  }

  return targets;
}

function extractReferenceTargets(markdown) {
  const targets = [];
  const definition = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(.+)$/gmu;

  for (const match of markdown.matchAll(definition)) {
    if (!match[1].startsWith('^')) targets.push(match[2]);
  }

  return targets;
}

function normalizeReferenceLabel(label) {
  return label.trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function findMissingReferenceDefinitions(markdown) {
  const withoutCode = stripMarkdownCode(markdown);
  const definition = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(.+)$/gmu;
  const labels = new Set();

  for (const match of withoutCode.matchAll(definition)) {
    if (!match[1].startsWith('^')) {
      labels.add(normalizeReferenceLabel(match[1]));
    }
  }

  const withoutDefinitions = withoutCode.replace(definition, '');
  const reference = /(?<!\\)!?\[([^\]\n]+)\]\[([^\]\n]*)\]/gu;
  const missing = [];

  for (const match of withoutDefinitions.matchAll(reference)) {
    const rawLabel = match[2] || match[1];
    if (!labels.has(normalizeReferenceLabel(rawLabel))) {
      missing.push(rawLabel);
    }
  }

  return missing;
}

export function extractMarkdownLinkTargets(markdown) {
  const withoutCode = stripMarkdownCode(markdown);
  return [...extractInlineTargets(withoutCode), ...extractReferenceTargets(withoutCode)];
}

export function findBrokenDocumentLinks(root = process.cwd()) {
  const docsDirectory = path.join(root, 'docs');
  const files = [
    ...ROOT_DOCS.map((file) => path.join(root, file)).filter(existsSync),
    ...(existsSync(docsDirectory) ? walkMarkdown(docsDirectory) : []),
  ];
  const broken = [];
  const historical = [];

  for (const file of files) {
    const markdown = readFileSync(file, 'utf8');
    // 历史快照里的死链只记入 historical，不让它们把门禁打红 —— 快照记的是当时的事实。
    const record = (target, reason) =>
      (isHistoricalPath(file) ? historical : broken).push({ file, target, reason });

    for (const label of findMissingReferenceDefinitions(markdown)) {
      record(`[${label}]`, 'reference definition does not exist');
    }

    for (const rawTarget of extractMarkdownLinkTargets(markdown)) {
      let target = extractTarget(rawTarget);
      if (isExternalOrDocumentAnchor(target)) continue;

      if (/^file:\/\//u.test(target)) {
        if (!existsSync(resolveFileUrl(target)))
          record(rawTarget, 'target does not exist');
        continue;
      }

      target = target.split('#', 1)[0].split('?', 1)[0];
      try {
        target = decodeURIComponent(target);
      } catch {
        record(rawTarget, 'invalid URI encoding');
        continue;
      }

      const resolved = path.resolve(path.dirname(file), target);
      if (!existsSync(resolved)) record(rawTarget, 'target does not exist');
    }
  }

  return { files, broken, historical };
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  const { files, broken, historical } = findBrokenDocumentLinks();
  for (const issue of historical) {
    console.log(
      `- [historical] ${path.relative(process.cwd(), issue.file)} -> ${issue.target} (${issue.reason})`,
    );
  }
  if (broken.length > 0) {
    console.error(`Documentation link check failed with ${broken.length} issue(s):`);
    for (const issue of broken) {
      console.error(
        `- ${path.relative(process.cwd(), issue.file)} -> ${issue.target} (${issue.reason})`,
      );
    }
    process.exitCode = 1;
  } else {
    const suffix = historical.length ? `; ${historical.length} historical skipped` : '';
    console.log(
      `Documentation link check passed (${files.length} Markdown files${suffix}).`,
    );
  }
}
