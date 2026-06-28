import { describe, it, expect } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const goldenQueries = require("./fixtures/golden-queries.json") as Array<{
  query: string;
  category: string | null;
  expectedIds: string[];
  checkPrecision: boolean;
}>;

const BASE_URL = process.env.QUALITY_TEST_BASE_URL ?? "http://localhost:3264";
const TIMEOUT = 15_000;
const runQualityTests = Boolean(process.env.QUALITY_TEST_BASE_URL);

interface SearchResultItem {
  id: string;
  title: string;
  similarity?: number;
}

describe.skipIf(!runQualityTests)("search quality - golden queries", () => {
  for (const gq of goldenQueries) {
    it(
      `should return expected results for "${gq.query}"`,
      { timeout: TIMEOUT },
      async () => {
        const params = new URLSearchParams({
          q: gq.query,
          semantic: "true",
          limit: "10",
        });
        if (gq.category) params.set("category", gq.category);

        const res = await fetch(`${BASE_URL}/api/search?${params}`);
        expect(res.ok).toBe(true);

        const body = await res.json();
        const ids: string[] = (body.results as SearchResultItem[]).map(
          (r) => r.id,
        );

        const found = gq.expectedIds.filter((id) => ids.includes(id));
        const ratio = found.length / gq.expectedIds.length;

        console.log(
          `[${gq.query}] recall@10: ${found.length}/${gq.expectedIds.length} (${(ratio * 100).toFixed(0)}%)`,
        );

        if (gq.checkPrecision) {
          expect(ratio).toBeGreaterThanOrEqual(0.5);
        }
      },
    );
  }
});
