import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkOrigin } from "@/lib/csrf";
import { logger } from "@/lib/logger";

/**
 * Admin 路由统一鉴权 + 请求包装层
 *
 * 合并自 lib/admin-auth.ts（requireAdmin / unauthorized）+ 原 with-admin.ts。
 * 所有 admin API 路由通过 withAdmin* 包装器获得：
 *   1. NextAuth session 鉴权（role === "admin"）
 *   2. 写操作（POST/PUT/DELETE）的 Origin header CSRF 检查
 *   3. 自动 try-catch + 统一错误响应
 *   4. （可选）Zod schema 校验 + 类型安全的 parsed 参数
 *   5. 透传 Next.js 路由参数 params（用于 [id] 动态路由）
 */

// ── 鉴权原语（原 admin-auth.ts）──────────────────────────────────────

/**
 * Admin 路由认证检查
 * middleware.ts 已保护路由，此函数在 handler 内部二次确认 + 提取用户信息
 */
export async function requireAdmin(): Promise<{ authorized: boolean; userId?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false };
  }
  if (session.user.role !== "admin") {
    return { authorized: false };
  }
  return { authorized: true, userId: session.user.id };
}

/** 401 响应（与 middleware 一致的格式） */
export function unauthorized() {
  return NextResponse.json({ error: "未授权" }, { status: 401 });
}

// ── 路由包装器 ────────────────────────────────────────────────────────

/**
 * Admin GET 路由包装器 — 只做鉴权检查
 *
 * GET 不需要 CSRF 检查（幂等），但所有 admin 路由都需要鉴权。
 */
export function withAdminGet(
  handler: (request: Request) => Promise<NextResponse>,
): (request: Request) => Promise<NextResponse> {
  return async (request) => {
    const { authorized } = await requireAdmin();
    if (!authorized) return unauthorized();
    try {
      return await handler(request);
    } catch (e) {
      logger.error("Admin GET handler failed", { source: "with-admin" }, e instanceof Error ? e : undefined);
      return NextResponse.json({ error: "服务器错误" }, { status: 500 });
    }
  };
}

/**
 * Admin POST/PUT 路由包装器 — 鉴权 + CSRF + JSON body 校验 + 自动 try-catch
 *
 * handler 收到 { parsed, params, request }：
 *   - parsed: Zod 校验通过的类型安全数据
 *   - params: Next.js 动态路由参数（如 { id: "..." }），可选
 *   - request: 原始 Request 对象（极少用到，保留以备特殊场景）
 */
export function withAdminWrite<T extends z.ZodType>(
  schema: T,
  handler: (params: {
    parsed: z.infer<T>;
    params?: Record<string, string>;
    request: Request;
  }) => Promise<NextResponse>,
): (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (request: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const { authorized } = await requireAdmin();
    if (!authorized) return unauthorized();

    const csrfError = checkOrigin(request, "with-admin");
    if (csrfError) return csrfError;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "请求体不是有效的 JSON" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: "输入验证失败", details: errors }, { status: 400 });
    }

    const routeParams = await ctx.params;

    try {
      return await handler({ parsed: parsed.data, params: routeParams, request });
    } catch (e) {
      logger.error("Admin write handler failed", { source: "with-admin" }, e instanceof Error ? e : undefined);
      return NextResponse.json({ error: "服务器错误" }, { status: 500 });
    }
  };
}

/**
 * Admin DELETE 路由包装器 — 鉴权 + CSRF + 自动 try-catch
 *
 * DELETE 通常无 body（资源标识在 params 或 query string 中），
 * 因此不做 Zod schema 校验，但保留 params 透传。
 */
export function withAdminDelete(
  handler: (params: { params?: Record<string, string>; request: Request }) => Promise<NextResponse>,
): (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (request: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const { authorized } = await requireAdmin();
    if (!authorized) return unauthorized();

    const csrfError = checkOrigin(request, "with-admin");
    if (csrfError) return csrfError;

    const routeParams = await ctx.params;

    try {
      return await handler({ params: routeParams, request });
    } catch (e) {
      logger.error("Admin DELETE handler failed", { source: "with-admin" }, e instanceof Error ? e : undefined);
      return NextResponse.json({ error: "服务器错误" }, { status: 500 });
    }
  };
}

/** 解析动态管理路由 ID，并保持现有 400 错误 contract。 */
function parseAdminId(
  params?: Record<string, string>
): { id: string } | { response: NextResponse } {
  const id = params?.id;
  if (!id) {
    return {
      response: NextResponse.json({ error: "缺少 id 参数" }, { status: 400 }),
    };
  }

  const parsed = z.string().uuid("ID 格式不正确").safeParse(id);
  if (!parsed.success) {
    return {
      response: NextResponse.json({ error: "ID 格式不正确" }, { status: 400 }),
    };
  }
  return { id: parsed.data };
}

/**
 * 带 UUID 参数的管理写入包装器。
 *
 * 在通用 Auth、CSRF、JSON 和 Zod 校验后统一解析动态路由 ID，
 * 让具体 Route Handler 只负责调用后端 domain module。
 */
export function withAdminIdWrite<T extends z.ZodType>(
  schema: T,
  handler: (params: {
    id: string;
    parsed: z.infer<T>;
    request: Request;
  }) => Promise<NextResponse>
): (
  request: Request,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return withAdminWrite(schema, async ({ parsed, params, request }) => {
    const idResult = parseAdminId(params);
    if ("response" in idResult) return idResult.response;
    return handler({ id: idResult.id, parsed, request });
  });
}

/** 带 UUID 参数的管理删除包装器，复用 Auth、CSRF 和错误处理 contract。 */
export function withAdminIdDelete(
  handler: (params: { id: string; request: Request }) => Promise<NextResponse>
): (
  request: Request,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return withAdminDelete(async ({ params, request }) => {
    const idResult = parseAdminId(params);
    if ("response" in idResult) return idResult.response;
    return handler({ id: idResult.id, request });
  });
}
