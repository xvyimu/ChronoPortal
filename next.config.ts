import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import {
  buildCspHeaderPairs,
  readCspFlags,
} from "./lib/csp";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV !== "production";
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const cspFlags = readCspFlags(process.env);

/**
 * Static CSP headers from next.config.
 * When CSP_DYNAMIC=1, proxy.ts owns CSP (+ per-request nonce) and we skip
 * Content-Security-Policy* here to avoid duplicate / conflicting headers.
 */
const cspHeaderPairs = cspFlags.dynamic
  ? []
  : buildCspHeaderPairs({
      isDev,
      scriptUnsafeInline: cspFlags.scriptUnsafeInline,
      reportOnlyEnabled: cspFlags.reportOnlyEnabled,
    });

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
  ...cspHeaderPairs,
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
