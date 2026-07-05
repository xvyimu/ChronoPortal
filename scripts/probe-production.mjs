import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://nav-site.netlify.app";
const DEFAULT_TIMEOUT_MS = 45_000;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const ENDPOINTS = [
  { name: "home", path: "/", contentType: /text\/html/i },
  { name: "health", path: "/api/health", contentType: /application\/json/i, json: "health" },
  { name: "search", path: "/api/search?q=ai&limit=5", contentType: /application\/json/i, json: "search" },
  { name: "tool-detail", path: "/tool/figma", contentType: /text\/html/i },
  { name: "sitemap", path: "/sitemap.xml", contentType: /(application|text)\/xml/i },
  { name: "robots", path: "/robots.txt", contentType: /text\/plain/i },
];

function normalize(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function parseBoolean(value) {
  return TRUE_VALUES.has(normalize(value));
}

function parsePositiveNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readArgValue(args, name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

export function readConfigFromEnv(env = process.env, args = process.argv.slice(2)) {
  return {
    baseUrl: readArgValue(args, "--base-url") || env.PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: parsePositiveNumber(
      readArgValue(args, "--timeout-ms") || env.PRODUCTION_PROBE_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    ),
    expectEmbeddingSkipped:
      args.includes("--expect-embedding-skipped") ||
      parseBoolean(env.PRODUCTION_EXPECT_EMBEDDING_SKIPPED),
  };
}

export function makeProbeUrl(baseUrl, path) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBase).toString();
}

function getHeader(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name) || "";
  return headers?.[name] || headers?.[name.toLowerCase()] || "";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function validateHealthPayload(payload, { expectEmbeddingSkipped } = {}) {
  const failures = [];

  if (payload?.status !== "healthy") {
    failures.push(`expected health status healthy, got ${payload?.status ?? "missing"}`);
  }

  const databaseStatus = payload?.checks?.database?.status;
  if (databaseStatus !== "ok") {
    failures.push(`expected database check ok, got ${databaseStatus ?? "missing"}`);
  }

  const envStatus = payload?.checks?.env?.status;
  if (envStatus !== "ok") {
    failures.push(`expected env check ok, got ${envStatus ?? "missing"}`);
  }

  if (expectEmbeddingSkipped) {
    const embeddingStatus = payload?.checks?.embedding?.status;
    if (embeddingStatus !== "skipped") {
      failures.push(`expected embedding check skipped, got ${embeddingStatus ?? "missing"}`);
    }
  }

  return failures;
}

export function validateSearchPayload(payload) {
  const failures = [];

  if (!Array.isArray(payload?.results)) {
    failures.push("expected search results array");
  }

  if (typeof payload?.total !== "number") {
    failures.push("expected numeric search total");
  }

  if (payload?.mode !== "fuse" && payload?.mode !== "semantic") {
    failures.push(`expected search mode fuse or semantic, got ${payload?.mode ?? "missing"}`);
  }

  return failures;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`invalid JSON response: ${errorMessage(error)}`);
  }
}

export async function probeEndpoint(endpoint, {
  baseUrl,
  timeoutMs,
  expectEmbeddingSkipped,
  fetchImpl = fetch,
}) {
  const url = makeProbeUrl(baseUrl, endpoint.path);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": "nav-site-production-probe",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = getHeader(response.headers, "content-type");
    const failures = [];

    if (!response.ok) {
      failures.push(`HTTP ${response.status}`);
    }

    if (endpoint.contentType && !endpoint.contentType.test(contentType)) {
      failures.push(`unexpected content-type ${contentType || "missing"}`);
    }

    if (endpoint.json === "health") {
      const payload = await readJson(response);
      failures.push(...validateHealthPayload(payload, { expectEmbeddingSkipped }));
    }

    if (endpoint.json === "search") {
      const payload = await readJson(response);
      failures.push(...validateSearchPayload(payload));
    }

    return {
      name: endpoint.name,
      url,
      status: response.status,
      ok: failures.length === 0,
      detail: failures.length === 0 ? "ok" : failures.join("; "),
    };
  } catch (error) {
    return {
      name: endpoint.name,
      url,
      status: 0,
      ok: false,
      detail: errorMessage(error),
    };
  }
}

export async function runProductionProbe({
  config = readConfigFromEnv(),
  fetchImpl = fetch,
  endpoints = ENDPOINTS,
} = {}) {
  const results = [];

  for (const endpoint of endpoints) {
    results.push(await probeEndpoint(endpoint, { ...config, fetchImpl }));
  }

  return results;
}

export function summarizeResults(results) {
  return results.map((result) => {
    const mark = result.ok ? "PASS" : "FAIL";
    return `[${mark}] ${result.name} ${result.status || "ERR"} ${result.detail}`;
  });
}

export function assertProbePassed(results) {
  const failures = results.filter((result) => !result.ok);
  if (failures.length === 0) return;

  throw new Error(
    `Production probe failed: ${failures.map((result) => `${result.name}: ${result.detail}`).join("; ")}`
  );
}

export async function main({ env = process.env, args = process.argv.slice(2), fetchImpl = fetch, logger = console } = {}) {
  const config = readConfigFromEnv(env, args);
  const results = await runProductionProbe({ config, fetchImpl });
  logger.log(`Production probe base: ${config.baseUrl}`);
  for (const line of summarizeResults(results)) logger.log(line);
  assertProbePassed(results);
  return results;
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliInvocation()) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
