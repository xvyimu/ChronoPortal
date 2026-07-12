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
  it("skips all builds by default (Vercel is production track)", async () => {
    const { shouldIgnoreBuild, main } = await importIgnoreBuildModule();

    expect(shouldIgnoreBuild(asEnv({ BRANCH: "main" }))).toMatchObject({
      ignore: true,
    });
    expect(shouldIgnoreBuild(asEnv({ BRANCH: "master" }))).toMatchObject({
      ignore: true,
    });
    expect(shouldIgnoreBuild(asEnv({}))).toMatchObject({ ignore: true });
    expect(main({ env: asEnv({ BRANCH: "main" }), logger: quietLogger() })).toBe(0);
  });

  it("continues when NETLIFY_FORCE_BUILD is set", async () => {
    const { shouldIgnoreBuild, main } = await importIgnoreBuildModule();

    expect(
      shouldIgnoreBuild(asEnv({ BRANCH: "feature", NETLIFY_FORCE_BUILD: "1" }))
    ).toMatchObject({ ignore: false });
    expect(
      main({
        env: asEnv({ BRANCH: "feature", NETLIFY_FORCE_BUILD: "true" }),
        logger: quietLogger(),
      })
    ).toBe(1);
  });

  it("allows only explicitly configured branches when allowlist is set", async () => {
    const { shouldIgnoreBuild } = await importIgnoreBuildModule();

    expect(
      shouldIgnoreBuild(
        asEnv({
          BRANCH: "release",
          NETLIFY_ALLOWED_BUILD_BRANCHES: "main, release",
        })
      )
    ).toMatchObject({ ignore: false });

    expect(
      shouldIgnoreBuild(
        asEnv({
          BRANCH: "master",
          NETLIFY_ALLOWED_BUILD_BRANCHES: "main, release",
        })
      )
    ).toMatchObject({ ignore: true });
  });

  it("skips unknown branch when allowlist is configured (protect credits)", async () => {
    const { shouldIgnoreBuild } = await importIgnoreBuildModule();

    expect(
      shouldIgnoreBuild(
        asEnv({
          NETLIFY_ALLOWED_BUILD_BRANCHES: "main",
        })
      )
    ).toMatchObject({ ignore: true });
  });
});
