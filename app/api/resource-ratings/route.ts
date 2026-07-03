import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getClientIp, withTimeout } from "@/lib/utils";
import { z } from "zod";

// 资源库评分提交 API
// 数据写入 rl Supabase 项目（ihnmfsfbfnctgkhxmghk）的 ratings 表
// 走 nav-site 自有 service_role 连接，绕过 rl 项目的 RLS

const RL_URL = "https://ihnmfsfbfnctgkhxmghk.supabase.co";
const RL_SERVICE_ROLE = process.env.RESOURCE_LIBRARY_SERVICE_ROLE_KEY || "";
const RATING_TIMEOUT_MS = 5000;

export const dynamic = "force-dynamic";

const ratingSchema = z.object({
  page_id: z.string().uuid("资源 ID 格式不正确"),
  query_text: z.string().max(200, "搜索词不能超过 200 字符").optional().default(""),
  rating: z.number().int().min(1, "评分最低 1 星").max(5, "评分最高 5 星"),
});

const ratingStatsSchema = z.object({
  page_id: z.string().uuid("资源 ID 格式不正确"),
});

export async function POST(request: Request) {
  if (!RL_SERVICE_ROLE) {
    logger.error("RESOURCE_LIBRARY_SERVICE_ROLE_KEY not configured", {
      source: "resource-ratings",
    });
    return NextResponse.json({ error: "评分服务未配置" }, { status: 503 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "请求 JSON 无效" }, { status: 400 });
    }

    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "输入验证失败", details: errors },
        { status: 400 }
      );
    }

    const { page_id, query_text, rating } = parsed.data;
    const ip = getClientIp(request);

    // 动态导入 supabase-js，避免在模块顶层加载
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(RL_URL, RL_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 速率限制：每 IP 每 15 分钟最多 10 次评分 ──
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error: rateLimitErr } = await withTimeout(
      Promise.resolve(
        supabase
          .from("ratings")
          .select("id", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("created_at", since)
      ),
      RATING_TIMEOUT_MS,
      "Resource ratings rate-limit check timed out"
    );
    if (rateLimitErr) {
      logger.warn("Resource ratings rate-limit check failed", {
        source: "resource-ratings",
        error: rateLimitErr.message,
      });
    }
    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { error: "评分过于频繁，请 15 分钟后再试" },
        { status: 429 }
      );
    }

    // 校验 pages 表中确实存在该 page_id
    const { data: page, error: pageErr } = await withTimeout(
      supabase
        .from("pages")
        .select("id")
        .eq("id", page_id)
        .maybeSingle(),
      RATING_TIMEOUT_MS,
      "Resource ratings page check timed out"
    );
    if (pageErr || !page) {
      return NextResponse.json(
        { error: "资源不存在" },
        { status: 404 }
      );
    }

    const { error } = await withTimeout(
      Promise.resolve(
        supabase.from("ratings").insert({
          page_id,
          query_text,
          rating,
          ip,
        })
      ),
      RATING_TIMEOUT_MS,
      "Resource ratings insert timed out"
    );

    if (error) {
      logger.error("Failed to insert rating", { source: "resource-ratings", error: error.message });
      return NextResponse.json({ error: "提交评分失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("Resource ratings POST error", { source: "resource-ratings" }, e instanceof Error ? e : undefined);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 获取某资源的评分统计
 * GET /api/resource-ratings?page_id=xxx
 */
export async function GET(request: Request) {
  if (!RL_SERVICE_ROLE) {
    return NextResponse.json({ error: "评分服务未配置" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = ratingStatsSchema.safeParse({
      page_id: searchParams.get("page_id") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { page_id: pageId } = parsed.data;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(RL_URL, RL_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { count, error } = await withTimeout(
      Promise.resolve(
        supabase
          .from("ratings")
          .select("id", { count: "exact", head: true })
          .eq("page_id", pageId)
      ),
      RATING_TIMEOUT_MS,
      "Resource ratings stats timed out"
    );

    if (error) {
      return NextResponse.json({ error: "获取评分失败" }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
