/**
 * Pure Netscape Bookmark HTML parser (Chrome/Edge/Firefox export).
 * Text-only: does not execute scripts; only extracts <A HREF> entries.
 *
 * @typedef {{ title: string, url: string, description?: string, folder?: string }} BookmarkItem
 */

const TITLE_MAX = 200;
const HTTP_RE = /^https?:\/\//i;

/**
 * Decode common HTML entities in bookmark titles / folder names.
 * @param {string} s
 * @returns {string}
 */
/**
 * Safe code point → string; invalid / out-of-range → U+FFFD (never throws).
 * @param {number} code
 * @returns {string}
 */
function codePointToChar(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "�";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "�";
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => codePointToChar(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePointToChar(parseInt(h, 16)));
}

/**
 * Normalize title: trim, decode entities, truncate to 200 chars.
 * @param {string} raw
 * @returns {string}
 */
function normalizeTitle(raw) {
  let title = decodeEntities(String(raw ?? "")).trim();
  if (title.length > TITLE_MAX) title = title.slice(0, TITLE_MAX);
  return title;
}

/**
 * Extract HREF value from an <A ...> open tag (case-insensitive).
 * @param {string} openTag
 * @returns {string | null}
 */
function extractHref(openTag) {
  const m = openTag.match(/\bHREF\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

/**
 * Whether content looks like a Netscape bookmark file.
 * @param {string} html
 * @returns {boolean}
 */
export function isNetscapeBookmarkHtml(html) {
  if (!html || typeof html !== "string") return false;
  const head = html.slice(0, 4096);
  if (/<!DOCTYPE\s+NETSCAPE-Bookmark-file-1/i.test(head)) return true;
  if (/<DL\b/i.test(html) && /<A\b[^>]*\bHREF\s*=/i.test(html)) return true;
  return false;
}

/**
 * Parse Netscape Bookmark HTML into bookmark items.
 * - Keeps first occurrence per URL (dedupe)
 * - Ignores javascript: / empty / non-http(s)
 * - Optional nearest <H3> folder name as `folder`
 *
 * @param {string} html
 * @returns {Array<BookmarkItem>}
 */
export function parseNetscapeBookmarks(html) {
  if (!html || typeof html !== "string") return [];
  const text = html;
  if (!text.trim()) return [];

  /** @type {Array<BookmarkItem>} */
  const items = [];
  const seenUrls = new Set();
  /** @type {string[]} */
  const folderStack = [];

  // Walk tags that matter: H3, /DL (pop folder when leaving a nested list), A
  // Netscape format: <DT><H3>Folder</H3><DL><p> ... <DT><A HREF="...">title</A>
  const re =
    /<\/DL\b[^>]*>|<H3\b[^>]*>([\s\S]*?)<\/H3\s*>|<A\b([^>]*)>([\s\S]*?)<\/A\s*>/gi;

  let match;
  while ((match = re.exec(text)) !== null) {
    const full = match[0];

    if (/^<\/DL/i.test(full)) {
      if (folderStack.length > 0) folderStack.pop();
      continue;
    }

    if (/^<H3/i.test(full)) {
      const folderName = normalizeTitle(match[1] ?? "");
      if (folderName) folderStack.push(folderName);
      continue;
    }

    // <A ...>
    const openAttrs = match[2] ?? "";
    const titleRaw = match[3] ?? "";
    const href = extractHref(`<A ${openAttrs}>`);
    if (!href) continue;
    if (/^javascript:/i.test(href)) continue;
    if (!HTTP_RE.test(href)) continue;

    let url;
    try {
      url = new URL(href).href;
    } catch {
      continue;
    }

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    let title = normalizeTitle(titleRaw);
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, "") || url;
      } catch {
        title = url;
      }
      if (title.length > TITLE_MAX) title = title.slice(0, TITLE_MAX);
    }

    const folder =
      folderStack.length > 0 ? folderStack[folderStack.length - 1] : undefined;

    /** @type {BookmarkItem} */
    const item = { title, url };
    if (folder) item.folder = folder;
    items.push(item);
  }

  return items;
}
