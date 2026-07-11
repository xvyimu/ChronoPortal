/**
 * Hacker News via Algolia public API (no auth).
 * https://hn.algolia.com/api
 */
const DEFAULT_BASE = "https://hn.algolia.com/api/v1";

/**
 * @param {{
 *   query?: string,
 *   perPage?: number,
 *   page?: number,
 *   tags?: string,
 *   baseUrl?: string,
 *   fetchImpl?: typeof fetch,
 * }} opts
 */
export async function fetchHnHits(opts = {}) {
  const {
    query = "programming",
    perPage = 20,
    page = 0,
    tags = "story",
    baseUrl = DEFAULT_BASE,
    fetchImpl = globalThis.fetch,
  } = opts;

  if (perPage < 1 || perPage > 100) {
    throw new Error("perPage must be 1..100");
  }

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/search`);
  url.searchParams.set("query", query || "");
  url.searchParams.set("hitsPerPage", String(perPage));
  url.searchParams.set("page", String(page));
  if (tags) url.searchParams.set("tags", tags);

  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "nav-site-resource-ingest/0.1 (+local; hn)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HN Algolia HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.hits)) {
    throw new Error("HN Algolia returned no hits array");
  }
  return data.hits;
}
