import { NextResponse } from "next/server";
import { checkDistributedRateLimit } from "@/lib/rate-limit-distributed";
import { getClientIp } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Soft cap so a misbehaving browser cannot flood logs. */
const MAX_BODY_BYTES = 8_192;
const SAMPLE_EVERY = 20;

type CspReportBody = {
  "csp-report"?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * CSP Report-Only collector (P1-3).
 * Accepts browser CSP violation reports; never blocks page loads.
 * Sampling + rate-limit keep log volume bounded.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkDistributedRateLimit(`csp-report:${ip}`, 60, 60_000);
  if (!allowed) {
    return new NextResponse(null, { status: 204 });
  }

  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204 });
  }

  let parsed: CspReportBody;
  try {
    parsed = JSON.parse(raw) as CspReportBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const report =
    (parsed["csp-report"] as Record<string, unknown> | undefined) ??
    (typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : null);

  if (!report) {
    return new NextResponse(null, { status: 204 });
  }

  // Deterministic light sampling by violated directive + blocked uri hash
  const directive = String(report["violated-directive"] ?? report["effective-directive"] ?? "");
  const blocked = String(report["blocked-uri"] ?? "");
  const sampleKey = `${directive}|${blocked}`;
  let hash = 0;
  for (let i = 0; i < sampleKey.length; i += 1) {
    hash = (hash * 31 + sampleKey.charCodeAt(i)) >>> 0;
  }
  if (hash % SAMPLE_EVERY !== 0) {
    return new NextResponse(null, { status: 204 });
  }

  logger.warn("CSP report-only violation (sampled)", {
    source: "csp-report",
    documentUri: report["document-uri"] ?? report["documentURI"],
    violatedDirective: directive,
    blockedUri: blocked,
    originalPolicy: report["original-policy"] ?? undefined,
    disposition: report["disposition"] ?? "report",
  });

  return new NextResponse(null, { status: 204 });
}

/** Browsers may probe with GET; stay silent. */
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
