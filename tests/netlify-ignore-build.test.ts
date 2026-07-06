import { describe, expect, it } from "vitest";

async function importIgnoreBuildModule() {
  return import("../scripts/netlify-ignore-build.mjs");
}

function asEnv(env: Record<string, string>): NodeJS.ProcessEnv {
  return env as unknown as NodeJS.ProcessEnv;
}

function quietLogger(): Console {
  return { log: () => {} } as unknown as Console;
}

describe("scripts/netlify-ignore-build", () => {
  it("continues builds for the Netlify production mirror branch", async () => {
    const { shouldIgnoreBuild, main } = await importIgnoreBuildModule();

    expect(shouldIgnoreBuild(asEnv({ BRANCH: "main" }))).toMatchObject({
      ignore: false,
    });
    expect(main({ env: asEnv({ BRANCH: "main" }), logger: quietLogger() })).toBe(1);
  });

  it("skips builds for non-production branches to avoid accidental credit use", async () => {
    const { shouldIgnoreBuild, main } = await importIgnoreBuildModule();

    expect(shouldIgnoreBuild(asEnv({ BRANCH: "master" }))).toMatchObject({
      ignore: true,
    });
    expect(main({ env: asEnv({ BRANCH: "master" }), logger: quietLogger() })).toBe(0);
  });

  it("allows multiple explicitly configured branches", async () => {
    const { shouldIgnoreBuild } = await importIgnoreBuildModule();

    expect(
      shouldIgnoreBuild(asEnv({
        BRANCH: "release",
        NETLIFY_ALLOWED_BUILD_BRANCHES: "main, release",
      }))
    ).toMatchObject({ ignore: false });
  });

  it("continues when the branch is unknown so production is not skipped by accident", async () => {
    const { shouldIgnoreBuild } = await importIgnoreBuildModule();

    expect(shouldIgnoreBuild(asEnv({}))).toMatchObject({ ignore: false });
  });
});
