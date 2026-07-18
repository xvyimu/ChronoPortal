"use client";

import type {
  AdminCategorySaveCommand,
  AdminContentApi,
  AdminLinkFilters,
  AdminLinkSaveCommand,
  AdminLinksPage,
  AdminTagSaveCommand,
} from "@/lib/admin/contracts";
import type { Category, NavLink, Tag } from "@/lib/types";

type Fetcher = typeof fetch;

/** 管理 API 错误，保留 HTTP 状态和服务端校验详情供 UI 统一处理。 */
export class AdminApiError extends Error {
  /** 创建类型化管理 API 错误。 */
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/** 判断未知响应是否为普通 JSON 对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 统一发送同源管理请求并转换服务端错误。 */
async function requestJson(
  fetcher: Fetcher,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetcher(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : `请求失败 (${response.status})`;
    throw new AdminApiError(
      message,
      response.status,
      isRecord(body) ? body.details : undefined
    );
  }

  if (body === null) {
    throw new AdminApiError("服务器返回了无效 JSON", response.status);
  }
  return body;
}

/** 从写入响应中读取指定实体，拒绝静默接受漂移的 envelope。 */
function readEntity<T>(body: unknown, key: string): T {
  if (!isRecord(body) || !isRecord(body[key])) {
    throw new AdminApiError(`服务器响应缺少 ${key}`, 502);
  }
  return body[key] as T;
}

/** 从列表响应中读取指定数组，拒绝错误对象被误判为空列表。 */
function readCollection<T>(body: unknown, key: string): T[] {
  if (!isRecord(body) || !Array.isArray(body[key])) {
    throw new AdminApiError(`服务器响应缺少 ${key}`, 502);
  }
  return body[key] as T[];
}

/** 校验链接分页响应的最小运行时 contract。 */
function readLinksPage(body: unknown): AdminLinksPage {
  if (
    !isRecord(body) ||
    !Array.isArray(body.links) ||
    typeof body.total !== "number" ||
    typeof body.page !== "number" ||
    typeof body.pageSize !== "number"
  ) {
    throw new AdminApiError("服务器返回了无效的链接分页数据", 502);
  }
  return body as unknown as AdminLinksPage;
}

/** 校验删除响应，防止 HTTP 200 但业务未成功。 */
function readDeleteSuccess(body: unknown): void {
  if (!isRecord(body) || body.success !== true) {
    throw new AdminApiError("服务器未确认删除结果", 502);
  }
}

/** 把链接筛选条件编码为现有 GET 查询参数。 */
function buildLinkSearchParams(filters: AdminLinkFilters): URLSearchParams {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    status: filters.status,
  });
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);
  return params;
}

/** 使用注入的 fetch adapter 创建浏览器侧管理 API interface。 */
export function createAdminContentApi(fetcher: Fetcher = fetch): AdminContentApi {
  /** 分页读取链接并验证响应 contract。 */
  async function listLinks(
    filters: AdminLinkFilters,
    signal?: AbortSignal
  ): Promise<AdminLinksPage> {
    const params = buildLinkSearchParams(filters);
    const body = await requestJson(fetcher, `/api/admin/links?${params}`, { signal });
    return readLinksPage(body);
  }

  /** 根据命令中的 ID 选择创建或更新链接。 */
  async function saveLink(command: AdminLinkSaveCommand): Promise<NavLink> {
    const editing = command.id !== undefined;
    const body = await requestJson(
      fetcher,
      editing ? `/api/admin/links/${command.id}` : "/api/admin/links",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(command.input),
      }
    );
    return readEntity<NavLink>(body, "link");
  }

  /** 删除链接并校验服务端确认结果。 */
  async function removeLink(id: string): Promise<void> {
    const body = await requestJson(fetcher, `/api/admin/links/${id}`, {
      method: "DELETE",
    });
    readDeleteSuccess(body);
  }

  /** 读取全部管理分类。 */
  async function listCategories(signal?: AbortSignal): Promise<Category[]> {
    const body = await requestJson(fetcher, "/api/admin/categories", { signal });
    return readCollection<Category>(body, "categories");
  }

  /** 根据命令中的 ID 选择创建或更新分类。 */
  async function saveCategory(command: AdminCategorySaveCommand): Promise<Category> {
    const editing = command.id !== undefined;
    const body = await requestJson(
      fetcher,
      editing ? `/api/admin/categories/${command.id}` : "/api/admin/categories",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(command.input),
      }
    );
    return readEntity<Category>(body, "category");
  }

  /** 删除分类并校验服务端确认结果。 */
  async function removeCategory(id: string): Promise<void> {
    const body = await requestJson(fetcher, `/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    readDeleteSuccess(body);
  }

  /** 读取全部管理标签。 */
  async function listTags(signal?: AbortSignal): Promise<Tag[]> {
    const body = await requestJson(fetcher, "/api/admin/tags", { signal });
    return readCollection<Tag>(body, "tags");
  }

  /** 根据命令中的 ID 选择创建或更新标签。 */
  async function saveTag(command: AdminTagSaveCommand): Promise<Tag> {
    const editing = command.id !== undefined;
    const body = await requestJson(
      fetcher,
      editing ? `/api/admin/tags/${command.id}` : "/api/admin/tags",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(command.input),
      }
    );
    return readEntity<Tag>(body, "tag");
  }

  /** 删除标签并校验服务端确认结果。 */
  async function removeTag(id: string): Promise<void> {
    const body = await requestJson(fetcher, `/api/admin/tags/${id}`, {
      method: "DELETE",
    });
    readDeleteSuccess(body);
  }

  return {
    links: { list: listLinks, save: saveLink, remove: removeLink },
    categories: {
      list: listCategories,
      save: saveCategory,
      remove: removeCategory,
    },
    tags: { list: listTags, save: saveTag, remove: removeTag },
  };
}

/** 生产浏览器默认使用的同源 HTTP adapter；调用时读取全局 fetch 以支持运行时替换。 */
export const adminApi = createAdminContentApi((input, init) => fetch(input, init));
