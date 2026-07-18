import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  hasAdminTestSession,
  installAdminTestSession,
} from "./helpers/admin-session";

interface NavigationSample {
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  fcpMs: number;
  lcpMs: number;
  cls: number;
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

function summarize(values: number[]) {
  return {
    median: Number(percentile(values, 0.5).toFixed(1)),
    p95: Number(percentile(values, 0.95).toFixed(1)),
  };
}

async function installObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      __adminPerf?: { lcp: number; cls: number };
    };
    target.__adminPerf = { lcp: 0, cls: 0 };

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      target.__adminPerf!.lcp = entries.at(-1)?.startTime ?? target.__adminPerf!.lcp;
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) target.__adminPerf!.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function sampleNavigation(
  page: Page,
  path: string,
  ready: () => Promise<void>,
  runs = 5
): Promise<NavigationSample[]> {
  const samples: NavigationSample[] = [];

  for (let index = 0; index < runs; index += 1) {
    await page.goto(path, { waitUntil: "load" });
    await ready();
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    samples.push(
      await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const paints = performance.getEntriesByType("paint");
        const fcp = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? 0;
        const perf = (window as typeof window & {
          __adminPerf?: { lcp: number; cls: number };
        }).__adminPerf ?? { lcp: 0, cls: 0 };

        return {
          ttfbMs: navigation.responseStart - navigation.requestStart,
          domContentLoadedMs: navigation.domContentLoadedEventEnd - navigation.startTime,
          loadMs: navigation.loadEventEnd - navigation.startTime,
          fcpMs: fcp,
          lcpMs: perf.lcp,
          cls: perf.cls,
        };
      })
    );
  }

  return samples;
}

function summarizeNavigation(samples: NavigationSample[]) {
  return {
    runs: samples.length,
    ttfbMs: summarize(samples.map((sample) => sample.ttfbMs)),
    domContentLoadedMs: summarize(samples.map((sample) => sample.domContentLoadedMs)),
    loadMs: summarize(samples.map((sample) => sample.loadMs)),
    fcpMs: summarize(samples.map((sample) => sample.fcpMs)),
    lcpMs: summarize(samples.map((sample) => sample.lcpMs)),
    cls: summarize(samples.map((sample) => sample.cls)),
  };
}

async function sampleApi(page: Page, path: string, runs = 10): Promise<number[]> {
  const samples: number[] = [];
  for (let index = 0; index < runs; index += 1) {
    const started = performance.now();
    const response = await page.request.get(path, { headers: { "Cache-Control": "no-cache" } });
    samples.push(performance.now() - started);
    expect(response.status()).toBe(200);
  }
  return samples;
}

test.describe("后台本地性能基线", () => {
  test.skip(!process.env.PERF_BASELINE, "Run through pnpm perf:admin");
  test.skip(
    !hasAdminTestSession(),
    "E2E_AUTH_SECRET must match the test server AUTH_SECRET"
  );

  test("采集页面与只读 API 多轮中位数", async ({ page, context, baseURL, browser }) => {
    test.setTimeout(180_000);
    await installObservers(page);

    const login = await sampleNavigation(page, "/login", async () => {
      await expect(page.getByRole("heading", { name: "登录管理后台" })).toBeVisible();
    });

    await installAdminTestSession(context, baseURL);
    const dashboard = await sampleNavigation(page, "/admin", async () => {
      await expect(page.getByRole("heading", { name: "链接工作台" })).toBeVisible({
        timeout: 20_000,
      });
    });

    const linksApi = await sampleApi(page, "/api/admin/links?page=1&pageSize=20");
    const categoriesApi = await sampleApi(page, "/api/admin/categories");
    const date = new Date().toISOString().slice(0, 10);
    const output = resolve(
      process.env.PERF_OUTPUT ?? `docs/perf/admin-baseline-${date}.json`
    );
    const report = {
      measuredAt: new Date().toISOString(),
      scope: "local-synthetic",
      caveat: "Actual local measurements; not production RUM or a Lighthouse report.",
      baseURL,
      browser: {
        name: "chromium",
        version: browser.version(),
        mode: process.env.PERF_BROWSER_MODE ?? "unknown",
      },
      serverMode: process.env.PERF_SERVER_MODE ?? "unknown",
      pages: {
        login: summarizeNavigation(login),
        dashboard: summarizeNavigation(dashboard),
      },
      api: {
        links: { runs: linksApi.length, latencyMs: summarize(linksApi) },
        categories: { runs: categoriesApi.length, latencyMs: summarize(categoriesApi) },
      },
    };

    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`[admin-performance] wrote ${output}`);
  });
});
