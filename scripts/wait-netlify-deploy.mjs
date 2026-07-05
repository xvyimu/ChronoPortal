import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 10 * 1000;
const FAILED_STATES = new Set(["error", "failed", "rejected", "skipped", "canceled", "cancelled"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function parsePositiveNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function candidateValues(deploy) {
  return [
    deploy.commit_ref,
    deploy.commit_sha,
    deploy.commit,
    deploy.sha,
    deploy.review_id,
  ]
    .map(normalize)
    .filter(Boolean);
}

export function matchesCommit(deploy, targetSha) {
  const normalizedTargetSha = normalize(targetSha);
  if (!normalizedTargetSha) return false;

  const targetShortSha = normalizedTargetSha.slice(0, 7);
  const values = candidateValues(deploy);
  if (values.length === 0) return false;

  return values.some((value) => {
    if (value === normalizedTargetSha) return true;
    return (
      value.length >= 7 &&
      (normalizedTargetSha.startsWith(value) || value.startsWith(targetShortSha))
    );
  });
}

export function matchesBranch(deploy, targetBranch) {
  if (!targetBranch || !deploy.branch) return true;
  return deploy.branch === targetBranch;
}

export function matchesCreatedAfter(deploy, createdAfter) {
  if (!Number.isFinite(createdAfter) || !deploy.created_at) return false;
  return Date.parse(deploy.created_at) >= createdAfter;
}

export function findMatchingDeploy(deploys, { targetSha, targetBranch, createdAfter }) {
  return deploys.find(
    (deploy) =>
      matchesBranch(deploy, targetBranch) &&
      (matchesCommit(deploy, targetSha) || matchesCreatedAfter(deploy, createdAfter))
  );
}

export function deployUrl(deploy) {
  return deploy.deploy_ssl_url || deploy.ssl_url || deploy.deploy_url || deploy.url || "";
}

export function summarizeDeploy(deploy) {
  const commit = candidateValues(deploy)[0]?.slice(0, 7) || "unknown";
  const branch = deploy.branch || "unknown";
  const url = deployUrl(deploy) || "no-url";
  return `${deploy.id}: state=${deploy.state}, branch=${branch}, commit=${commit}, created_at=${deploy.created_at}, url=${url}`;
}

export function readConfigFromEnv(env = process.env) {
  const token = env.NETLIFY_AUTH_TOKEN;
  const siteId = env.NETLIFY_SITE_ID;
  const targetSha = env.GITHUB_SHA?.toLowerCase();
  const targetBranch = env.NETLIFY_DEPLOY_BRANCH || env.GITHUB_REF_NAME;
  const createdAfter = env.NETLIFY_DEPLOY_CREATED_AFTER
    ? Date.parse(env.NETLIFY_DEPLOY_CREATED_AFTER)
    : Number.NaN;

  if (!token) {
    throw new Error("NETLIFY_AUTH_TOKEN is not set");
  }

  if (!siteId) {
    throw new Error("NETLIFY_SITE_ID is not set");
  }

  if (!targetSha) {
    throw new Error("GITHUB_SHA is not set");
  }

  return {
    token,
    siteId,
    targetSha,
    targetBranch,
    createdAfter,
    timeoutMs: parsePositiveNumber(env.NETLIFY_DEPLOY_POLL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    intervalMs: parsePositiveNumber(env.NETLIFY_DEPLOY_POLL_INTERVAL_MS, DEFAULT_INTERVAL_MS),
  };
}

export async function listDeploys({ config, fetchImpl = fetch }) {
  const url = new URL(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(config.siteId)}/deploys`);
  url.searchParams.set("per_page", "50");

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "User-Agent": "nav-site-ci",
    },
  });

  if (!response.ok) {
    throw new Error(`Netlify deploy lookup failed with HTTP ${response.status}`);
  }

  return response.json();
}

export function writeDeployUrl(url, outputPath = process.env.GITHUB_OUTPUT, appendFile = appendFileSync) {
  if (!url || !outputPath) return;
  appendFile(outputPath, `deploy-url=${url}\n`);
}

export async function waitForNetlifyDeploy({
  config,
  fetchImpl = fetch,
  sleep: sleepImpl = sleep,
  writeOutput = writeDeployUrl,
  logger = console,
  now = Date.now,
}) {
  const start = now();
  const targetShortSha = config.targetSha.slice(0, 7);

  while (now() - start < config.timeoutMs) {
    const deploys = await listDeploys({ config, fetchImpl });
    const latest = deploys.slice(0, 5).map(summarizeDeploy);
    logger.log(`[netlify] latest deploys:\n${latest.map((item) => `- ${item}`).join("\n")}`);

    const deploy = findMatchingDeploy(deploys, config);

    if (!deploy) {
      logger.log(`[netlify] waiting for Git deploy for ${config.targetBranch ?? "unknown-branch"}@${targetShortSha}`);
      await sleepImpl(config.intervalMs);
      continue;
    }

    logger.log(`[netlify] matched deploy: ${summarizeDeploy(deploy)}`);

    if (deploy.state === "ready") {
      writeOutput(deployUrl(deploy));
      logger.log("[netlify] deploy is ready");
      return deploy;
    }

    if (FAILED_STATES.has(deploy.state)) {
      throw new Error(`Netlify deploy ${deploy.id} finished with state=${deploy.state}`);
    }

    await sleepImpl(config.intervalMs);
  }

  throw new Error(`Timed out waiting for Netlify Git deploy for ${config.targetBranch ?? "unknown-branch"}@${targetShortSha}`);
}

export async function main({ env = process.env, fetchImpl = fetch, logger = console } = {}) {
  const config = readConfigFromEnv(env);
  return waitForNetlifyDeploy({ config, fetchImpl, logger });
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliInvocation()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
