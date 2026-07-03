import { createClient } from "./supabase/server";
import type { ModelRanking } from "@/lib/types";
import { logger } from "@/lib/logger";
import { cache } from "react";

async function getModelRankingsImpl(options?: { signal?: AbortSignal }): Promise<ModelRanking[]> {
  const supabase = await createClient();

  let query = supabase
    .from("model_rankings")
    .select("*")
    .order("source")
    .order("rank");
  if (options?.signal) query = query.abortSignal(options.signal);
  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch model rankings", { table: "model_rankings" });
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    rank: r.rank,
    model_name: r.model_name,
    source: r.source,
    score: r.score,
    description: r.description,
    icon: r.icon || "🤖",
    url: r.url,
    category: r.category || "closed",
  }));
}

export const getModelRankings = cache(getModelRankingsImpl);
