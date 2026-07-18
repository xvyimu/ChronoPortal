import type { z } from "zod";
import type {
  createCategorySchema,
  createLinkSchema,
  createTagSchema,
  updateCategorySchema,
  updateLinkSchema,
  updateTagSchema,
} from "@/lib/schemas";
import type { Category, NavLink, Tag } from "@/lib/types";

/** 管理链接支持的审核状态筛选。 */
export type AdminLinkStatus = "all" | "pending" | "featured";

/** 浏览器管理工作台使用的链接筛选条件。 */
export interface AdminLinkFilters {
  page: number;
  pageSize: number;
  query: string;
  category: string;
  status: AdminLinkStatus;
}

/** 后端链接 repository 接受的规范化查询条件。 */
export interface AdminLinksQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: AdminLinkStatus;
}

/** 管理链接分页响应 contract。 */
export interface AdminLinksPage {
  links: NavLink[];
  total: number;
  page: number;
  pageSize: number;
}

/** 链接创建请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminLinkCreateInput = z.input<typeof createLinkSchema>;

/** 链接更新请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminLinkUpdateInput = z.input<typeof updateLinkSchema>;

/** 分类创建请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminCategoryCreateInput = z.input<typeof createCategorySchema>;

/** 分类更新请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminCategoryUpdateInput = z.input<typeof updateCategorySchema>;

/** 标签创建请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminTagCreateInput = z.input<typeof createTagSchema>;

/** 标签更新请求 contract，与服务端 Zod 输入保持同源。 */
export type AdminTagUpdateInput = z.input<typeof updateTagSchema>;

/** 根据是否携带资源 ID 区分创建与更新，固定 POST/PUT 选择规则。 */
export type AdminSaveCommand<TCreate, TUpdate> =
  | { id?: undefined; input: TCreate }
  | { id: string; input: TUpdate };

/** 链接保存命令。 */
export type AdminLinkSaveCommand = AdminSaveCommand<
  AdminLinkCreateInput,
  AdminLinkUpdateInput
>;

/** 分类保存命令。 */
export type AdminCategorySaveCommand = AdminSaveCommand<
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput
>;

/** 标签保存命令。 */
export type AdminTagSaveCommand = AdminSaveCommand<
  AdminTagCreateInput,
  AdminTagUpdateInput
>;

/** 浏览器侧管理 API interface，不暴露 URL、HTTP method 或 JSON envelope。 */
export interface AdminContentApi {
  readonly links: {
    /** 分页读取管理链接。 */
    list(filters: AdminLinkFilters, signal?: AbortSignal): Promise<AdminLinksPage>;
    /** 创建或更新链接。 */
    save(command: AdminLinkSaveCommand): Promise<NavLink>;
    /** 删除链接。 */
    remove(id: string): Promise<void>;
  };
  readonly categories: {
    /** 读取全部管理分类。 */
    list(signal?: AbortSignal): Promise<Category[]>;
    /** 创建或更新分类。 */
    save(command: AdminCategorySaveCommand): Promise<Category>;
    /** 删除分类。 */
    remove(id: string): Promise<void>;
  };
  readonly tags: {
    /** 读取全部管理标签。 */
    list(signal?: AbortSignal): Promise<Tag[]>;
    /** 创建或更新标签。 */
    save(command: AdminTagSaveCommand): Promise<Tag>;
    /** 删除标签。 */
    remove(id: string): Promise<void>;
  };
}

