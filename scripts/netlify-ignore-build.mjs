/**
 * Netlify ignore 脚本 — 生产单轨为 Vercel 后，默认跳过所有 Netlify 构建。
 *
 * Netlify ignore 约定：exit 0 = 跳过构建；exit 1 = 继续构建。
 *
 * 放行条件（任一）：
 * - NETLIFY_FORCE_BUILD=1|true|yes|on
 * - NETLIFY_ALLOWED_BUILD_BRANCHES 显式包含当前分支（且未设 FORCE 时仍可放行）
 *
 * 默认：无 FORCE 且未配置允许分支 → 跳过（省 credit、避免双轨漂移）。
 * 若配置了 NETLIFY_ALLOWED_BUILD_BRANCHES，则仅这些分支继续构建。
 */

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function parseAllowedBranches(value = "") {
  return value
    .split(",")
    .map((branch) => branch.trim())
    .filter(Boolean);
}

export function detectBranch(env = process.env) {
  return env.BRANCH || env.HEAD || env.NETLIFY_BRANCH || "";
}

function isTruthy(value) {
  return TRUE_VALUES.has(String(value ?? "").toLowerCase());
}

export function shouldIgnoreBuild(env = process.env) {
  if (isTruthy(env.NETLIFY_FORCE_BUILD)) {
    return {
      ignore: false,
      reason: "NETLIFY_FORCE_BUILD is set; continuing Netlify build",
    };
  }

  const allowedBranches = parseAllowedBranches(env.NETLIFY_ALLOWED_BUILD_BRANCHES);
  if (allowedBranches.length === 0) {
    return {
      ignore: true,
      reason:
        "production track is Vercel; Netlify builds skipped by default (set NETLIFY_FORCE_BUILD=1 or NETLIFY_ALLOWED_BUILD_BRANCHES to override)",
    };
  }

  const branch = detectBranch(env);
  if (!branch) {
    return {
      ignore: true,
      reason:
        "branch is unknown and Netlify is not primary; skipping to protect credits",
    };
  }

  if (allowedBranches.includes(branch)) {
    return {
      ignore: false,
      reason: `branch ${branch} is allowlisted for Netlify`,
    };
  }

  return {
    ignore: true,
    reason: `branch ${branch} is not in allowed branches: ${allowedBranches.join(", ")}`,
  };
}

export function main({ env = process.env, logger = console } = {}) {
  const decision = shouldIgnoreBuild(env);
  logger.log(`[netlify-ignore-build] ${decision.reason}`);

  return decision.ignore ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
