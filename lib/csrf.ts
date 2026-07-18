import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * 写操作 Origin header 校验（防 CSRF）
 *
 * 优先校验 Origin，其次校验 Referer / Fetch Metadata。
 * 无浏览器来源头的非 Cookie 客户端可继续调用；携带 Cookie 却无法证明同源时拒绝。
 */
export function checkOrigin(
  request: Request,
  source = "csrf"
): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  const host = (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")
  );

  const isSameHost = (rawUrl: string) => {
    if (!host) return false;
    try {
      return new URL(rawUrl).host === host;
    } catch {
      return false;
    }
  };

  const reject = (reason: string) => {
    logger.warn("Write blocked by CSRF origin check", {
      source,
      reason,
      host,
    });
    return NextResponse.json({ error: "跨站请求被拒绝" }, { status: 403 });
  };

  if (origin) {
    return isSameHost(origin) ? null : reject("origin_mismatch");
  }

  if (fetchSite === "cross-site") {
    return reject("cross_site_fetch");
  }

  if (referer) {
    return isSameHost(referer) ? null : reject("referer_mismatch");
  }

  if (fetchSite === "same-origin") return null;

  if (request.headers.has("cookie")) {
    return reject("cookie_without_same_origin_proof");
  }

  return null;
}
