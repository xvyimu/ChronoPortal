import type { NavLink, Tag } from "@/lib/types";
import type {
  AdminTagCreateInput,
  AdminTagUpdateInput,
} from "@/lib/admin/contracts";
import { logger } from "@/lib/logger";
import {
  createAdminClient,
  isMissingRelationError,
  type SupabaseDataClient,
  type SupabaseServerClient,
} from "./shared";

interface RawLinkTagRow {
  link_id: string;
  tag_id: string;
}

const TAG_COLUMNS = "id,name,slug,created_at";

let reportedMissingTagsTables = false;

/** 识别标签表或关联关系尚未迁移时的查询错误。 */
function isMissingTagsJoinError(error: { code?: string; message?: string }): boolean {
  return (
    isMissingRelationError(error) ||
    error.code === "PGRST200" ||
    /nav_links_tags|tags|relationship/i.test(error.message ?? "")
  );
}

/** 每个进程只记录一次可选标签迁移缺失，避免日志洪泛。 */
function reportMissingTagsTablesOnce(code?: string) {
  if (reportedMissingTagsTables) return;

  logger.info("Optional tags tables unavailable; returning links without tags", {
    source: "repositories",
    code,
    optionalFeature: "tags",
    migration: "scripts/migration-tags.sql",
  });
  reportedMissingTagsTables = true;
}

/** 批量附加链接标签；可选迁移缺失时保留原始链接结果。 */
export async function attachTagsToLinks(
  supabase: SupabaseServerClient,
  links: NavLink[],
  signal?: AbortSignal,
): Promise<NavLink[]> {
  if (links.length === 0) return links;

  const linkIds = links.map((link) => link.id);
  let linkTagsQuery = supabase
    .from("nav_links_tags")
    .select("link_id, tag_id")
    .in("link_id", linkIds);
  if (signal) linkTagsQuery = linkTagsQuery.abortSignal(signal);
  const { data: linkTags, error: linkTagsError } = await linkTagsQuery;

  if (linkTagsError) {
    if (isMissingTagsJoinError(linkTagsError)) {
      reportMissingTagsTablesOnce(linkTagsError.code);
      return links;
    }
    logger.warn("Failed to fetch link tags; returning links without tags", {
      source: "repositories",
      code: linkTagsError.code,
    });
    return links;
  }

  const rows = (linkTags ?? []) as RawLinkTagRow[];
  const tagIds = Array.from(new Set(rows.map((row) => row.tag_id)));
  if (tagIds.length === 0) return links;

  let tagsQuery = supabase
    .from("tags")
    .select("id, name, slug, created_at")
    .in("id", tagIds);
  if (signal) tagsQuery = tagsQuery.abortSignal(signal);
  const { data: tags, error: tagsError } = await tagsQuery;

  if (tagsError) {
    if (isMissingTagsJoinError(tagsError)) {
      reportMissingTagsTablesOnce(tagsError.code);
      return links;
    }
    logger.warn("Failed to fetch tags; returning links without tags", {
      source: "repositories",
      code: tagsError.code,
    });
    return links;
  }

  const tagsById = new Map((tags ?? []).map((tag) => [tag.id, tag as Tag]));
  const tagsByLinkId = new Map<string, Tag[]>();

  for (const row of rows) {
    const tag = tagsById.get(row.tag_id);
    if (!tag) continue;
    const current = tagsByLinkId.get(row.link_id) ?? [];
    current.push(tag);
    tagsByLinkId.set(row.link_id, current);
  }

  return links.map((link) => ({
    ...link,
    tags: tagsByLinkId.get(link.id) ?? [],
  }));
}

/**
 * 同步链接与标签的关联（删除现有，插入新的）
 * 用于 createLink / updateLink 时同步标签关联表。
 */
export async function syncLinkTags(
  supabase: SupabaseDataClient,
  linkId: string,
  tagIds: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("nav_links_tags")
    .delete()
    .eq("link_id", linkId);
  if (delErr) {
    logger.error("Failed to clear link tags", { source: "repositories", linkId }, delErr);
    throw new Error("Failed to sync link tags");
  }

  if (tagIds.length === 0) return;

  const rows = tagIds.map((tag_id) => ({ link_id: linkId, tag_id }));
  const { error: insErr } = await supabase.from("nav_links_tags").insert(rows);
  if (insErr) {
    logger.error(
      "Failed to insert link tags",
      { source: "repositories", linkId, count: tagIds.length },
      insErr
    );
    throw new Error("Failed to sync link tags");
  }
}

/**
 * 获取所有标签（供 admin 管理）
 */
export async function getAllTagsForAdmin(): Promise<Tag[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .order("name", { ascending: true });

  if (error) {
    logger.error("Admin: Failed to fetch all tags", { source: "repositories" }, error);
    throw new Error("Failed to fetch tags");
  }

  return data ?? [];
}

/**
 * 创建标签（admin）
 */
export async function createTag(input: AdminTagCreateInput): Promise<Tag> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: input.name, slug: input.slug })
    .select(TAG_COLUMNS)
    .single();

  if (error) {
    logger.error("Admin: Failed to create tag", { source: "repositories", slug: input.slug }, error);
    throw new Error("Failed to create tag");
  }

  return data;
}

/**
 * 更新标签（admin）
 */
export async function updateTag(
  id: string,
  input: AdminTagUpdateInput
): Promise<Tag> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .update(input)
    .eq("id", id)
    .select(TAG_COLUMNS)
    .single();

  if (error) {
    logger.error("Admin: Failed to update tag", { source: "repositories", id }, error);
    throw new Error("Failed to update tag");
  }

  return data;
}

/**
 * 删除标签（admin）
 * 关联表 nav_links_tags 通过 ON DELETE CASCADE 自动清理。
 */
export async function deleteTag(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) {
    logger.error("Admin: Failed to delete tag", { source: "repositories", id }, error);
    throw new Error("Failed to delete tag");
  }
}
