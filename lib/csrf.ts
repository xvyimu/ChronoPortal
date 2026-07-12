import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * 写操作 Origin header 校验（防 CSRF）
 *
 * 浏览器对跨域 POST/PUT/DELETE 会带 Origin；
 * 同源时 origin.host === request Host。
 * 无 Origin 时放行（非浏览器 / 服务端调用），依赖 cookie SameSite 兜底。
 */
export function checkOrigin(
  request: Request,
  source = "csrf"
): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host = request.headers.get("host");
  if (!host) return null;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return null;
  } catch {
    // Origin 无法解析 → 拒绝
  }

  logger.warn("Write blocked by CSRF origin check", {
    source,
    origin,
    host,
  });
  return NextResponse.json({ error: "跨站请求被拒绝" }, { status: 403 });
}
