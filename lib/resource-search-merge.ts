import type { ResourceItem } from "@/lib/types";

/** RRF constant (Cormack et al.) — same order of magnitude as nav link hybrid merge */
export const RESOURCE_RRF_K = 60;

/**
 * Lightweight RRF merge for resource library vector + FTS lists.
 */
export function mergeResourceHybrid(
  vector: ResourceItem[],
  fts: ResourceItem[],
  limit: number,
  k: number = RESOURCE_RRF_K
): ResourceItem[] {
  if (vector.length === 0 && fts.length === 0) return [];
  if (vector.length === 0) return fts.slice(0, limit);
  if (fts.length === 0) return vector.slice(0, limit);

  const scores = new Map<string, { item: ResourceItem; score: number }>();

  const addRank = (results: ResourceItem[]) => {
    for (let rank = 0; rank < results.length; rank += 1) {
      const item = results[rank];
      const rrf = 1 / (k + rank + 1);
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrf;
        // keep the stronger source rank for display metadata
        if (item.rank > existing.item.rank) {
          existing.item = item;
        }
      } else {
        scores.set(item.id, { item, score: rrf });
      }
    }
  };

  addRank(vector);
  addRank(fts);

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, rank: score }));
}
