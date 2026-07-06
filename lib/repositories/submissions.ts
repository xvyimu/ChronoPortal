import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * 检查 URL 是否已存在（供提交去重）。
 */
export async function findExistingLinkByUrl(url: string): Promise<{ id: string; approved: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nav_links")
    .select("id, approved")
    .eq("url", url)
    .maybeSingle();

  return data ?? null;
}

/**
 * 提交新链接（待审核）。
 */
export async function submitLink(input: {
  title: string;
  url: string;
  description: string | null;
  category_id: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("nav_links").insert({
    title: input.title,
    url: input.url,
    description: input.description,
    category_id: input.category_id,
    approved: false,
    paid: false,
    featured: false,
  });

  if (error) {
    logger.error("Submit: Failed to insert link", { source: "repositories", url: input.url }, error);
    return false;
  }

  return true;
}

/**
 * 验证链接是否存在且已批准（供点击计数使用）。
 */
export async function findApprovedLinkByUrl(url: string): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nav_links")
    .select("id")
    .eq("url", url)
    .eq("approved", true)
    .maybeSingle();

  if (error) {
    logger.warn("findApprovedLinkByUrl query failed", { url, error: error.message });
    return null;
  }
  return data ?? null;
}
