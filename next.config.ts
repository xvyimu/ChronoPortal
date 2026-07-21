import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV !== "production";
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

/**
 * Enforcing CSP (current production baseline).
 * script/style still allow 'unsafe-inline' (Next/GA); full nonce tighten is T9 follow-up.
 */
const cspEnforcing = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // 生产 favicon/CDN 与 Sentry/GA；不放宽 script 的 unsafe-inline（Next/GA 仍需，T9 完整收紧另立项）
  "connect-src 'self' https://*.supabase.co https://*.ingest.us.sentry.io https://www.google-analytics.com https://region1.google-analytics.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Report-Only CSP (P1-3): tighter script-src without 'unsafe-inline'/'unsafe-eval'.
 * Violations POST to /api/csp-report (sampled logs only; never blocks render).
 * Enable/disable with CSP_REPORT_ONLY=0 to turn off without removing enforcing CSP.
 */
const cspReportOnlyEnabled = process.env.CSP_REPORT_ONLY !== "0";
const cspReportOnly = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    // intentional: no 'unsafe-inline' / 'unsafe-eval' — measure breakage only
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "connect-src 'self' https://*.supabase.co https://*.ingest.us.sentry.io https://www.google-analytics.com https://region1.google-analytics.com",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: cspEnforcing,
  },
  ...(cspReportOnlyEnabled
    ? [
        {
          key: "Content-Security-Policy-Report-Only",
          value: cspReportOnly,
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // NOTE: Turbopack is disabled due to NTFS reparse point issue in node_modules.
  // 30 top-level package directories have leftover pnpm junction reparse points
  // that Turbopack cannot traverse. Use `next build --webpack` and `next dev --webpack`.
  // See CLAUDE-HANDOFF.md for details.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        // Dynamic API probes must not inherit Vercel/CDN public default caching.
        // Explicit no-store on these paths keeps health/search semantics fresh and
        // matches scripts/probe-production.mjs no-store assertions.
        source: "/api/health",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/api/search",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/build-info.json",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    org: "yuanjia-m0",
    project: "javascript-nextjs",
    silent: !process.env.CI || !hasSentryAuthToken,
    widenClientFileUpload: true,
    release: { create: hasSentryAuthToken },
    sourcemaps: { disable: !hasSentryAuthToken },
    // 构建期 tree-shaking 削减 client bundle（详见 docs/perf/findings.md H7）。
    // 本项目不使用 Session Replay / Canvas / Feedback，排除其代码以减小首屏 JS。
    bundleSizeOptimizations: {
      excludeReplayShadowDom: true,
      excludeReplayIframe: true,
      excludeReplayWorker: true,
      excludeDebugStatements: true,
    },
    // Turbopack 不支持以下选项，可忽略
    // disableLogger / automaticVercelMonitors 已废弃
  })
);
