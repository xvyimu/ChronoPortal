import { NextResponse } from "next/server";
import { captureMessage, setMeasurement } from "@sentry/nextjs";
import { webVitalMetricSchema } from "@/lib/schemas";
import { checkDistributedRateLimit } from "@/lib/rate-limit-distributed";
import { getClientIp } from "@/lib/utils";

const WEB_VITALS_WINDOW_MS = 60_000;
const WEB_VITALS_MAX_PER_MIN = 30;
/** Soft cap: metric JSON is tiny; reject oversized bodies before parse. */
const MAX_BODY_BYTES = 4_096;

function shouldSample(id: string): boolean {
  const configured = Number(process.env.SENTRY_WEB_VITALS_SAMPLE_RATE);
  const rate = Number.isFinite(configured)
    ? Math.min(1, Math.max(0, configured))
    : process.env.NODE_ENV === "production" ? 0.1 : 1;
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash / 0xffffffff < rate;
}

/**
 * Web Vitals 上报端点
 *
 * 接收 useReportWebVitals hook 通过 sendBeacon 上报的 Core Web Vitals 指标，
 * 写入 Sentry 用于性能监控。
 *
 * 安全：
 *   - same-origin 检查（防跨站滥用）
 *   - Zod 严格校验（防字段注入）
 *   - 不写入数据库（仅 Sentry 上报，无持久化开销）
 *
 * 详见 docs/superpowers/specs/2026-06-29-performance-optimization-design.md §3.1 管线 B
 */

export async function POST(request: Request) {
  // same-origin 检查（防跨站刷量）
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { allowed } = await checkDistributedRateLimit(
    `web-vitals:${ip}`,
    WEB_VITALS_WINDOW_MS,
    WEB_VITALS_MAX_PER_MIN
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!raw || raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: raw ? "payload too large" : "invalid body" },
      { status: raw ? 413 : 400 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = webVitalMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  }

  const m = parsed.data;

  // 写入 Sentry：仅 metric 枚举 + 数值；无 URL/UA/PII（Zod strip 未知键）
  if (shouldSample(m.id)) {
    captureMessage(`web-vital: ${m.name}`, {
      level: "info",
      tags: {
        metric: m.name,
        rating: m.rating,
        navigationType: m.navigationType.slice(0, 50),
      },
      extra: {
        // id is a web-vitals generated id (not user PII); keep short for aggregation hygiene
        id: m.id.slice(0, 100),
        value: m.value,
        delta: m.delta,
      },
    });
  }

  // 关联 measurement 到当前 Sentry transaction（若存在）
  // CLS 是无单位分数，其他指标是毫秒
  const unit = m.name === "CLS" ? "none" : "millisecond";
  try {
    setMeasurement(m.name, m.value, unit);
  } catch {
    // setMeasurement 在无 active transaction 时可能抛错，静默忽略
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
