import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { NavLink } from "@/lib/types";
import { slugify } from "@/lib/slugify";
import { logger } from "@/lib/logger";
import { mapLinkRow, type RawLinkRow, type SupabaseServerClient } from "./shared";
import { attachTagsToLinks } from "./tags";

interface GetApprovedLinksOpts {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

/**
 * 获取所有已批准链接。
 */
async function getApprovedLinksImpl(options?: GetApprovedLinksOpts): Promise<NavLink[]> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (options?.signal?.aborted) {
      throw new Error("Failed to fetch links");
    }

    try {
      const supabase = await createClient();
      const selectBasic = "*, nav_categories(name, slug)";

      const buildQuery = (select: string) => {
        let query = supabase
          .from("nav_links")
          .select(select)
          .eq("approved", true)
          .order("featured", { ascending: false })
          .order("paid", { ascending: false })
          .order("created_at", { ascending: false });

        if (options?.limit) {
          query = query.range(
            options.offset ?? 0,
            (options.offset ?? 0) + options.limit - 1
          );
        }

        if (options?.signal) {
          query = query.abortSignal(options.signal);
        }

        return query;
      };

      const { data, error } = await buildQuery(selectBasic);

      if (error) {
        logger.error("Failed to fetch links", { source: "repositories", attempt }, error);
        lastError = new Error("Failed to fetch links");
        if (options?.signal?.aborted) break;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
        continue;
      }

      const result = await attachTagsToLinks(
        supabase,
        ((data ?? []) as unknown as RawLinkRow[]).map(mapLinkRow),
        options?.signal
      );

      if (result.length === 0 && attempt < 2) {
        logger.warn("getApprovedLinks returned empty", { attempt });
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (options?.signal?.aborted) break;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error("getApprovedLinks failed after 3 attempts");
}

export const getApprovedLinks = cache(getApprovedLinksImpl);

/**
 * 根据 slug 获取已批准的链接（用于 /tool/[slug] 页面）。
 */
async function getApprovedLinkBySlugImpl(slug: string): Promise<NavLink | null> {
  const supabase = await createClient();

  const { data: bySlug, error: slugErr } = await supabase
    .from("nav_links")
    .select("*, nav_categories(name, slug)")
    .eq("approved", true)
    .eq("slug", slug)
    .maybeSingle();

  if (!slugErr && bySlug) {
    return mapLinkRow(bySlug);
  }

  const { data, error } = await supabase
    .from("nav_links")
    .select("*, nav_categories(name, slug)")
    .eq("approved", true);

  if (error) {
    logger.error("Failed to fetch link by slug", { source: "repositories", slug }, error);
    return null;
  }

  const link = (data ?? []).find((l) => slugify(l.title) === slug);
  if (!link) return null;

  return mapLinkRow(link);
}

export const getApprovedLinkBySlug = cache(getApprovedLinkBySlugImpl);

/**
 * 获取所有已批准链接的 slug 列表（用于 generateStaticParams / sitemap）。
 */
async function getAllApprovedLinkSlugsImpl(client?: SupabaseServerClient): Promise<string[]> {
  const supabase = client ?? await createClient();

  const { data, error } = await supabase
    .from("nav_links")
    .select("slug, title")
    .eq("approved", true);

  if (error) {
    logger.error("Failed to fetch link slugs", { source: "repositories" }, error);
    return [];
  }

  return (data ?? [])
    .map((l) => l.slug || slugify(l.title))
    .filter(Boolean);
}

export const getAllApprovedLinkSlugs = cache(getAllApprovedLinkSlugsImpl);

/**
 * 获取同分类的相关工具（用于工具详情页的"相关推荐"）。
 */
async function getRelatedLinksImpl(
  categoryId: string | null,
  excludeUrl: string,
  limit = 6
): Promise<NavLink[]> {
  if (!categoryId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nav_links")
    .select("*, nav_categories(name, slug)")
    .eq("approved", true)
    .eq("category_id", categoryId)
    .neq("url", excludeUrl)
    .order("click_count", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to fetch related links", { source: "repositories" }, error);
    return [];
  }

  return (data ?? []).map(mapLinkRow);
}

export const getRelatedLinks = cache(getRelatedLinksImpl);

/**
 * 获取所有已批准链接（用于 Agent API 端点），支持分类过滤。
 */
export async function getApprovedLinksForApi(categorySlug?: string): Promise<NavLink[]> {
  const supabase = await createClient();

  if (categorySlug && categorySlug !== "all") {
    const { data, error } = await supabase
      .from("nav_links")
      .select("*, nav_categories(name, slug)")
      .eq("approved", true)
      .eq("nav_categories.slug", categorySlug)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch links for API", { source: "repositories", categorySlug }, error);
      return [];
    }

    return (data ?? []).map(mapLinkRow);
  }

  return getApprovedLinks();
}
