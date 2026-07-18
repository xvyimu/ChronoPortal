import type { NavLink } from "@/lib/types";
import type {
  AdminLinksPage,
  AdminLinksQuery,
  AdminLinkUpdateInput,
} from "@/lib/admin/contracts";
import { logger } from "@/lib/logger";
import {
  createAdminClient,
  mapLinkRow,
  PUBLIC_LINK_SELECT,
  type SupabaseDataClient,
} from "./shared";

/** 转义 PostgREST `or` 模式中的控制字符，避免筛选语义被用户输入改变。 */
function escapePostgrestPattern(value: string): string {
  return value.replace(/[\\%_*,()]/g, (character) => `\\${character}`);
}

/**
 * 获取所有链接（含未批准，供 admin 管理）。
 */
export async function getAllLinksForAdmin(): Promise<NavLink[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("nav_links")
    .select(PUBLIC_LINK_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Admin: Failed to fetch all links", { source: "repositories" }, error);
    throw new Error("Failed to fetch links");
  }

  return (data ?? []).map(mapLinkRow);
}

/**
 * 分页查询管理链接。筛选与分页在数据库执行，避免把全量记录发送到浏览器。
 */
export async function getAdminLinksPage({
  page = 1,
  pageSize = 20,
  search = "",
  categoryId,
  status = "all",
}: AdminLinksQuery = {}): Promise<AdminLinksPage> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const supabase = createAdminClient();

  let query = supabase
    .from("nav_links")
    .select(PUBLIC_LINK_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  const normalizedSearch = search.trim();
  if (normalizedSearch) {
    const pattern = escapePostgrestPattern(normalizedSearch);
    query = query.or(`title.ilike.%${pattern}%,url.ilike.%${pattern}%`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (status === "pending") query = query.eq("approved", false);
  if (status === "featured") query = query.eq("featured", true);

  const { data, error, count } = await query.range(from, to);
  if (error) {
    logger.error("Admin: Failed to fetch link page", { source: "repositories" }, error);
    throw new Error("Failed to fetch links");
  }

  return {
    links: (data ?? []).map(mapLinkRow),
    total: count ?? data?.length ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

/** 写入完成后按公开 DTO contract 重新读取链接及标签。 */
async function fetchLinkWithTags(
  supabase: SupabaseDataClient,
  id: string
): Promise<NavLink> {
  const { data, error } = await supabase
    .from("nav_links")
    .select(PUBLIC_LINK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    logger.error(
      "Failed to refetch link with tags",
      { source: "repositories", id },
      error ?? undefined
    );
    throw new Error("Failed to fetch link");
  }

  return mapLinkRow(data);
}

/**
 * 创建链接（admin）。
 */
export async function createLink(
  input: {
    title: string;
    url: string;
    description: string | null;
    icon: string;
    category_id: string | null;
    approved: boolean;
    featured: boolean;
    tag_ids?: string[];
  }
): Promise<NavLink> {
  const supabase = createAdminClient();

  if (input.tag_ids !== undefined) {
    const { data, error } = await supabase.rpc("create_nav_link_with_tags", {
      p_title: input.title,
      p_url: input.url,
      p_description: input.description,
      p_icon: input.icon,
      p_category_id: input.category_id,
      p_approved: input.approved,
      p_featured: input.featured,
      p_tag_ids: input.tag_ids,
    });

    if (error || typeof data !== "string") {
      logger.error(
        "Admin: Failed to create link with tags",
        { source: "repositories", url: input.url },
        error ?? undefined
      );
      throw new Error("Failed to create link");
    }

    return fetchLinkWithTags(supabase, data);
  }

  const { data, error } = await supabase
    .from("nav_links")
    .insert({
      title: input.title,
      url: input.url,
      description: input.description,
      icon: input.icon,
      category_id: input.category_id,
      approved: input.approved,
      featured: input.featured,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Admin: Failed to create link", { source: "repositories", url: input.url }, error);
    throw new Error("Failed to create link");
  }

  return fetchLinkWithTags(supabase, data.id);
}

/**
 * 更新链接（admin）。
 */
export async function updateLink(id: string, input: AdminLinkUpdateInput): Promise<NavLink> {
  const supabase = createAdminClient();
  const { tag_ids, ...linkFields } = input;

  if (tag_ids !== undefined) {
    const { error } = await supabase.rpc("update_nav_link_with_tags", {
      p_link_id: id,
      p_patch: linkFields,
      p_tag_ids: tag_ids,
    });

    if (error) {
      logger.error(
        "Admin: Failed to update link with tags",
        { source: "repositories", id },
        error
      );
      throw new Error("Failed to update link");
    }

    return fetchLinkWithTags(supabase, id);
  }

  if (Object.keys(linkFields).length > 0) {
    const { error } = await supabase
      .from("nav_links")
      .update(linkFields)
      .eq("id", id);

    if (error) {
      logger.error("Admin: Failed to update link", { source: "repositories", id }, error);
      throw new Error("Failed to update link");
    }
  }

  return fetchLinkWithTags(supabase, id);
}

/**
 * 删除链接（admin）。
 */
export async function deleteLink(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("nav_links").delete().eq("id", id);
  if (error) {
    logger.error("Admin: Failed to delete link", { source: "repositories", id }, error);
    throw new Error("Failed to delete link");
  }
}
