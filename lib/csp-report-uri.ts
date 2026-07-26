/**
 * Path-only URI helper for CSP report sinks.
 *
 * Drops query + hash before we hand a URI to logs / Sentry — tokens and PII
 * frequently ride there. Non-URL CSP values (e.g. "inline", "eval", "data:…")
 * fall back to a plain string strip.
 *
 * Extracted from `app/api/csp-report/route.ts` so it can live outside the
 * Next.js route module (route files disallow arbitrary named exports under
 * the App Router type contract).
 */
export function toPathOnlyUri(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    const noHash = raw.includes("#") ? raw.slice(0, raw.indexOf("#")) : raw;
    const q = noHash.indexOf("?");
    return q === -1 ? noHash : noHash.slice(0, q);
  }
}
