import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function readFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

const buildInfo = {
  commit: readFirstEnv([
    "NEXT_PUBLIC_BUILD_COMMIT",
    "COMMIT_REF",
    "NETLIFY_COMMIT_REF",
    "GITHUB_SHA",
    "VERCEL_GIT_COMMIT_SHA",
  ]),
  branch: readFirstEnv([
    "BRANCH",
    "HEAD",
    "GITHUB_REF_NAME",
    "VERCEL_GIT_COMMIT_REF",
  ]),
  deployId: readFirstEnv(["DEPLOY_ID", "NETLIFY_DEPLOY_ID", "VERCEL_DEPLOYMENT_ID"]),
  generatedAt: new Date().toISOString(),
};

const outputPath = path.join(process.cwd(), "public", "build-info.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(buildInfo, null, 2)}\n`, "utf8");
console.log(`[build-info] wrote ${outputPath}`);
