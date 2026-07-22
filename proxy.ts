import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Admin auth gate only (narrow matcher).
 *
 * Dynamic CSP + per-request nonce lives in `lib/csp.ts` builders and is
 * opt-in via env (CSP_DYNAMIC). Full middleware attachment is deferred until
 * layout can consume `x-nonce` without double CSP headers — see
 * docs/csp-t9-decision-2026-07-22.md §4 / T9′.
 *
 * Static CSP (default production path): next.config.ts + readCspFlags().
 */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isAdmin = (req.auth?.user as { role?: string } | undefined)?.role === "admin";
  const isAdminApi = path.startsWith("/api/admin/");
  const isAdminPage = path.startsWith("/admin");
  const isPublicApi = path.startsWith("/api/") && !isAdminApi;

  // 公开 API 直接放行
  if (isPublicApi) {
    return NextResponse.next();
  }

  // Admin 路由需要管理员权限
  if ((isAdminApi || isAdminPage) && !isAdmin) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 已登录管理员访问登录页 → 重定向到管理面板
  if (path === "/login" && isAdmin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login"],
};
