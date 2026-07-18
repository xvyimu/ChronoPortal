import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkOrigin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/csrf", () => ({ checkOrigin: mocks.checkOrigin }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { withAdminIdDelete, withAdminIdWrite } from "@/lib/with-admin";

const validId = "550e8400-e29b-41d4-a716-446655440000";

/** 创建符合 Next.js 动态 Route Handler 形状的参数上下文。 */
function routeContext(id?: string): { params: Promise<Record<string, string>> } {
  const params: Record<string, string> = {};
  if (id) params.id = id;
  return { params: Promise.resolve(params) };
}

describe("带 UUID 的管理路由包装器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin", role: "admin" } });
    mocks.checkOrigin.mockReturnValue(null);
  });

  it("在 Auth、CSRF 和 body 校验后向写入 handler 传递规范 UUID", async () => {
    const handler = vi.fn(async ({ id, parsed }) =>
      NextResponse.json({ id, name: parsed.name })
    );
    const wrapped = withAdminIdWrite(z.object({ name: z.string() }), handler);
    const request = new Request("http://localhost/api/admin/categories/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "开发工具" }),
    });

    const response = await wrapped(request, routeContext(validId));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: validId, parsed: { name: "开发工具" } })
    );
  });

  it("在调用 domain handler 前拒绝无效 UUID", async () => {
    const handler = vi.fn(async () => NextResponse.json({ success: true }));
    const wrapped = withAdminIdDelete(handler);
    const request = new Request("http://localhost/api/admin/links/not-a-uuid", {
      method: "DELETE",
    });

    const response = await wrapped(request, routeContext("not-a-uuid"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ID 格式不正确" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("保持缺少动态 ID 时的既有错误 contract", async () => {
    const handler = vi.fn(async () => NextResponse.json({ success: true }));
    const wrapped = withAdminIdDelete(handler);
    const request = new Request("http://localhost/api/admin/links", {
      method: "DELETE",
    });

    const response = await wrapped(request, routeContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "缺少 id 参数" });
    expect(handler).not.toHaveBeenCalled();
  });
});
