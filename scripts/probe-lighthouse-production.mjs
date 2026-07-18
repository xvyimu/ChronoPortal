#!/usr/bin/env node
/**
 * 生产主域性能抽检（Playwright Chromium）。
 * 不依赖全局 lighthouse CLI；在 CF 挑战时记录 title/状态便于诊断。
 *
 * 输出：docs/perf/lighthouse-YYYY-MM-DD-production.summary.json
 *
 * 用法：
 *   node scripts/probe-lighthouse-production.mjs
 *   node scripts/probe-lighthouse-production.mjs --base-url https://yuanjia1314.ccwu.cc
 */

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const args = process.argv.slice(2);
function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  if (hit) return hit.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  return fallback;
}

const baseUrl = (flag("--base-url", process.env.LH_BASE_URL || "https://yuanjia1314.ccwu.cc")).replace(
  /\/$/,
  ""
);
const path = flag("--path", "/");
const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
const outDir = join(root, "docs", "perf");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "zh-CN",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 nav-site-lh-probe/1.0",
});
const page = await context.newPage();

const client = await context.newCDPSession(page);
await client.send("Performance.enable");

const started = Date.now();
const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
const title = await page.title();
const finalUrl = page.url();
const status = response?.status() ?? 0;

// 简单交互：等 atlas
await page.waitForTimeout(1500);
const hasAtlas = await page.locator("#atlas").count();

const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const paint = performance.getEntriesByType("paint");
  const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime;
  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
  const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : undefined;
  return {
    domContentLoaded: nav?.domContentLoadedEventEnd,
    loadEventEnd: nav?.loadEventEnd,
    responseStart: nav?.responseStart,
    transferSize: nav?.transferSize,
    fcp,
    lcp,
  };
});

// Web Vitals 尽力：PerformanceObserver 已过窗口则用上述 paint
const challenge =
  /just a moment|cloudflare|attention required|verify you are human/i.test(title) ||
  status === 403 ||
  status === 503;

const summary = {
  tool: "playwright-chromium-performance",
  url,
  finalUrl,
  status,
  title,
  challengeSuspected: challenge,
  hasAtlas: hasAtlas > 0,
  durationMs: Date.now() - started,
  metricsMs: {
    TTFB: perf.responseStart,
    FCP: perf.fcp,
    LCP: perf.lcp,
    DCL: perf.domContentLoaded,
    load: perf.loadEventEnd,
  },
  transferSize: perf.transferSize,
  note: challenge
    ? "可能命中 CF 挑战；指标不可作为 Lighthouse 真值。可本机 Chrome 手动 LH 或放行探针 UA。"
    : "Playwright 导航时序，非完整 Lighthouse 评分；完整 LH 可另装 lighthouse CLI。",
  fetchedAt: new Date().toISOString(),
};

const summaryPath = join(outDir, `lighthouse-${stamp}-production.summary.json`);
writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
console.log(JSON.stringify(summary, null, 2));
console.log(`Summary → ${summaryPath}`);

await browser.close();
process.exit(challenge ? 2 : 0);
