import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { logger } from "@/lib/logger";
import {
  createAdminClient,
  resolveQueryOptions,
  type RepositoryQueryOptions,
  type SupabaseServerClient,
} from "./shared";

async function getCategoriesImpl(
  input?: SupabaseServerClient | RepositoryQueryOptions
): Promise<Category[]> {
  const options = resolveQueryOptions(input);
  const supabase = options.client ?? await createClient();
  let query = supabase
    .from("nav_categories")
    .select("*")
    .order("sort_order");
  if (options.signal) query = query.abortSignal(options.signal);
  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch categories", { source: "repositories" }, error);
    throw new Error("Failed to fetch categories");
  }

  return data ?? [];
}

export const getCategories = cache(getCategoriesImpl);

/**
 * 获取所有分类（供 admin 管理）
 */
export async function getAllCategoriesForAdmin(): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("nav_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logger.error("Admin: Failed to fetch all categories", { source: "repositories" }, error);
    throw new Error("Failed to fetch categories");
  }

  return data ?? [];
}

/**
 * 创建分类（admin）
 *
 * parent_id 为可选字段：NULL = 顶级分类，非 NULL = 子分类。
 */
export async function createCategory(input: {
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  parent_id?: string | null;
}): Promise<Category> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("nav_categories")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      sort_order: input.sort_order,
      parent_id: input.parent_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Admin: Failed to create category", { source: "repositories", slug: input.slug }, error);
    throw new Error("Failed to create category");
  }

  return data;
}

/**
 * 更新分类（admin）
 */
export async function updateCategory(id: string, input: Record<string, unknown>): Promise<Category> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("nav_categories")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Admin: Failed to update category", { source: "repositories", id }, error);
    throw new Error("Failed to update category");
  }

  return data;
}

/**
 * 删除分类（admin）
 */
export async function deleteCategory(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("nav_categories").delete().eq("id", id);
  if (error) {
    logger.error("Admin: Failed to delete category", { source: "repositories", id }, error);
    throw new Error("Failed to delete category");
  }
}
