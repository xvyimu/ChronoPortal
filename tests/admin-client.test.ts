import { describe, expect, it, vi } from "vitest";
import {
  AdminApiError,
  createAdminContentApi,
} from "@/lib/admin/client";
import type { AdminLinkFilters } from "@/lib/admin/contracts";

const filters: AdminLinkFilters = {
  page: 2,
  pageSize: 20,
  query: "chat",
  category: "550e8400-e29b-41d4-a716-446655440000",
  status: "pending",
};

/** 创建 JSON Response，保持测试中的 HTTP contract 清晰。 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 把 Vitest mock 收窄为浏览器 fetch adapter。 */
function asFetcher(mock: ReturnType<typeof vi.fn>): typeof fetch {
  return mock as unknown as typeof fetch;
}

describe("管理后台浏览器 API adapter", () => {
  it("编码链接筛选参数并校验分页响应", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ links: [], total: 21, page: 2, pageSize: 20 })
    );
    const api = createAdminContentApi(asFetcher(fetcher));
    const signal = new AbortController().signal;

    await expect(api.links.list(filters, signal)).resolves.toMatchObject({
      total: 21,
      page: 2,
    });

    expect(String(fetcher.mock.calls[0][0])).toContain(
      "page=2&pageSize=20&status=pending&q=chat&category=550e8400-e29b-41d4-a716-446655440000"
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      signal,
      credentials: "same-origin",
    });
  });

  it("根据资源 ID 选择创建或更新链接", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ link: { id: "created" } }))
      .mockResolvedValueOnce(jsonResponse({ link: { id: "updated" } }));
    const api = createAdminContentApi(asFetcher(fetcher));
    const input = {
      title: "工具",
      url: "https://example.com",
      description: null,
      icon: null,
      category_id: null,
      approved: true,
      featured: false,
    };

    await api.links.save({ input });
    await api.links.save({ id: "550e8400-e29b-41d4-a716-446655440000", input });

    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/links");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetcher.mock.calls[1][0]).toBe(
      "/api/admin/links/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(fetcher.mock.calls[1][1]).toMatchObject({ method: "PUT" });
  });

  it("统一暴露服务端错误状态和字段详情", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: "输入验证失败", details: { title: ["名称不能为空"] } },
        400
      )
    );
    const api = createAdminContentApi(asFetcher(fetcher));

    const error = await api.categories
      .save({ input: { name: "", slug: "invalid" } })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({
      message: "输入验证失败",
      status: 400,
      details: { title: ["名称不能为空"] },
    });
  });

  it("拒绝 HTTP 200 但未确认成功的删除响应", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ success: false }));
    const api = createAdminContentApi(asFetcher(fetcher));

    await expect(
      api.tags.remove("550e8400-e29b-41d4-a716-446655440000")
    ).rejects.toMatchObject({
      message: "服务器未确认删除结果",
      status: 502,
    });
  });

  it("解包分类与标签集合响应", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ categories: [{ id: "category-1" }] }))
      .mockResolvedValueOnce(jsonResponse({ tags: [{ id: "tag-1" }] }));
    const api = createAdminContentApi(asFetcher(fetcher));

    await expect(api.categories.list()).resolves.toEqual([{ id: "category-1" }]);
    await expect(api.tags.list()).resolves.toEqual([{ id: "tag-1" }]);
  });
});

