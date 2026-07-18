import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AdminCategoryUpdateInput } from "@/lib/admin/contracts";
import type { Category } from "@/lib/types";
import { logger } from "@/lib/logger";
import {
  createAdminClient,
  MissingDatabaseMigrationError,
  resolveQueryOptions,
  type RepositoryQueryOptions,
  type SupabaseDataClient,
  type SupabaseServerClient,
} from "./shared";

const CATEGORY_BASE_COLUMNS = "id,name,slug,description,icon,sort_order,created_at";
const CATEGORY_COLUMNS = `${CATEGORY_BASE_COLUMNS},parent_id`;

type CategoryQueryError = { code?: string; message?: string };

/** 识别尚未执行分类层级迁移时的数据库错误。 */
function isMissingHierarchyColumn(error: CategoryQueryError | null): boolean {
  return Boolean(
    error &&
    /parent_id/i.test(error.message ?? "") &&
    (error.code === "42703" || error.code === "PGRST204" || /does not exist|not found/i.test(error.message ?? ""))
  );
}

/** 统一旧 schema 与新 schema 的分类 DTO 形状。 */
function normalizeCategories(data: unknown[] | null): Category[] {
  return (data ?? []).map((category) => ({
    ...(category as Category),
    parent_id: (category as Category).parent_id ?? null,
  }));
}

/** 生成兼容旧 schema 的写入对象，不修改调用方输入。 */
function omitParentId<T extends Record<string, unknown>>(value: T): Omit<T, "parent_id"> {
  const legacyValue = { ...value };
  Reflect.deleteProperty(legacyValue, "parent_id");
  return legacyValue;
}

/** 执行分类列表查询并按需透传取消信号。 */
async function selectCategories(
  supabase: SupabaseDataClient,
  columns: string,
  signal?: AbortSignal
) {
  let query = supabase
    .from("nav_categories")
    .select(columns)
    .order("sort_order", { ascending: true });
  if (signal) query = query.abortSignal(signal);
  return await query;
}

/** 优先读取层级字段，迁移缺失时安全降级为平铺分类。 */
async function selectCategoriesWithLegacyFallback(
  supabase: SupabaseDataClient,
  signal?: AbortSignal
): Promise<Category[]> {
  let result = await selectCategories(supabase, CATEGORY_COLUMNS, signal);
  if (isMissingHierarchyColumn(result.error)) {
    logger.warn("Category hierarchy migration missing; using flat categories", {
      source: "repositories",
      migration: "scripts/migration-category-hierarchy.sql",
    });
    result = await selectCategories(supabase, CATEGORY_BASE_COLUMNS, signal);
  }

  if (result.error) {
    logger.error("Failed to fetch categories", { source: "repositories" }, result.error);
    throw new Error("Failed to fetch categories");
  }

  return normalizeCategories(result.data);
}

/** 解析 repository 查询选项并读取公开分类。 */
async function getCategoriesImpl(
  input?: SupabaseServerClient | RepositoryQueryOptions
): Promise<Category[]> {
  const options = resolveQueryOptions(input);
  const supabase = options.client ?? await createClient();
  return selectCategoriesWithLegacyFallback(supabase, options.signal);
}

/** 读取公开分类，并在同一 React 服务端渲染请求内复用结果。 */
export const getCategories = cache(getCategoriesImpl);

/**
 * 获取所有分类（供 admin 管理）
 */
export async function getAllCategoriesForAdmin(): Promise<Category[]> {
  const supabase = createAdminClient();
  return selectCategoriesWithLegacyFallback(supabase);
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
  const payload = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    icon: input.icon,
    sort_order: input.sort_order,
    parent_id: input.parent_id ?? null,
  };
  let result = await supabase
    .from("nav_categories")
    .insert(payload)
    .select(CATEGORY_COLUMNS)
    .single();

  if (isMissingHierarchyColumn(result.error)) {
    if (input.parent_id) {
      throw new MissingDatabaseMigrationError("Category hierarchy", { cause: result.error });
    }
    const legacyPayload = omitParentId(payload);
    result = await supabase
      .from("nav_categories")
      .insert(legacyPayload)
      .select(CATEGORY_BASE_COLUMNS)
      .single();
  }

  if (result.error) {
    logger.error("Admin: Failed to create category", { source: "repositories", slug: input.slug }, result.error);
    throw new Error("Failed to create category");
  }

  return normalizeCategories([result.data])[0];
}

/**
 * 更新分类（admin）
 */
export async function updateCategory(
  id: string,
  input: AdminCategoryUpdateInput
): Promise<Category> {
  const supabase = createAdminClient();
  let result = await supabase
    .from("nav_categories")
    .update(input)
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .single();

  if (isMissingHierarchyColumn(result.error)) {
    if (typeof input.parent_id === "string" && input.parent_id) {
      throw new MissingDatabaseMigrationError("Category hierarchy", { cause: result.error });
    }
    const legacyInput = omitParentId(input);
    result = await supabase
      .from("nav_categories")
      .update(legacyInput)
      .eq("id", id)
      .select(CATEGORY_BASE_COLUMNS)
      .single();
  }

  if (result.error) {
    logger.error("Admin: Failed to update category", { source: "repositories", id }, result.error);
    throw new Error("Failed to update category");
  }

  return normalizeCategories([result.data])[0];
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
