const DEFAULT_ALLOWED_BRANCHES = "main";

export function parseAllowedBranches(value = DEFAULT_ALLOWED_BRANCHES) {
  return value
    .split(",")
    .map((branch) => branch.trim())
    .filter(Boolean);
}

export function detectBranch(env = process.env) {
  return env.BRANCH || env.HEAD || env.NETLIFY_BRANCH || "";
}

export function shouldIgnoreBuild(env = process.env) {
  const branch = detectBranch(env);
  const allowedBranches = parseAllowedBranches(env.NETLIFY_ALLOWED_BUILD_BRANCHES);

  if (!branch) {
    return {
      ignore: false,
      reason: "branch is unknown; continuing build to avoid skipping a production deploy",
    };
  }

  if (allowedBranches.includes(branch)) {
    return {
      ignore: false,
      reason: `branch ${branch} is allowed`,
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
