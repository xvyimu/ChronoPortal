#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv(".env.local");
loadEnv(".env");

const performanceMode = process.argv.includes("--performance");
const headless = process.argv.includes("--headless") || process.env.CI === "true";
const authSecret = process.env.E2E_AUTH_SECRET ?? process.env.AUTH_SECRET;

if (!authSecret) {
  console.error("Missing AUTH_SECRET or E2E_AUTH_SECRET; refusing to run authenticated admin tests.");
  process.exit(2);
}

process.env.AUTH_SECRET ??= authSecret;
process.env.E2E_AUTH_SECRET = authSecret;
process.env.PW_TEST_HTML_REPORT_OPEN = "never";
process.env.PERF_BROWSER_MODE = headless ? "headless" : "headed";
if (performanceMode) {
  if (!existsSync(".next/BUILD_ID")) {
    console.error("Missing .next production build; run pnpm build before pnpm perf:admin.");
    process.exit(2);
  }
  process.env.PERF_BASELINE = "1";
  process.env.PERF_SERVER_MODE = "production-build";
  process.env.E2E_DEV_COMMAND ??= "pnpm start -p 3264";
}

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const spec = performanceMode
  ? "e2e/admin-performance.spec.ts"
  : "e2e/admin.spec.ts";
const args = [playwrightCli, "test", spec, "--reporter=line"];
if (performanceMode) args.push("--project=chromium");
if (!headless) args.push("--headed");

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
