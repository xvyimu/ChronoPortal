import { describe, expect, it, vi } from "vitest";

type TestLogger = Pick<Console, "log" | "error">;

type Deploy = {
  id: string;
  state?: string;
  branch?: string;
  commit_ref?: string;
  commit_sha?: string;
  commit?: string;
  sha?: string;
  review_id?: string;
  created_at?: string;
  deploy_ssl_url?: string;
};

async function importDeployModule() {
  return import("../scripts/wait-netlify-deploy.mjs");
}

function asFetch(fetchImpl: unknown): typeof fetch {
  return fetchImpl as typeof fetch;
}

function asConsole(logger: TestLogger): Console {
  return logger as unknown as Console;
}

describe("scripts/wait-netlify-deploy", () => {
  it("is importable without CI environment variables", async () => {
    const originalToken = process.env.NETLIFY_AUTH_TOKEN;
    const originalSiteId = process.env.NETLIFY_SITE_ID;
    const originalSha = process.env.GITHUB_SHA;
    delete process.env.NETLIFY_AUTH_TOKEN;
    delete process.env.NETLIFY_SITE_ID;
    delete process.env.GITHUB_SHA;

    try {
      const mod = await importDeployModule();
      expect(mod.candidateValues).toBeTypeOf("function");
      expect(mod.findMatchingDeploy).toBeTypeOf("function");
    } finally {
      if (originalToken === undefined) delete process.env.NETLIFY_AUTH_TOKEN;
      else process.env.NETLIFY_AUTH_TOKEN = originalToken;
      if (originalSiteId === undefined) delete process.env.NETLIFY_SITE_ID;
      else process.env.NETLIFY_SITE_ID = originalSiteId;
      if (originalSha === undefined) delete process.env.GITHUB_SHA;
      else process.env.GITHUB_SHA = originalSha;
    }
  });

  it("matches mirrored Git deploys by branch and created_at fallback", async () => {
    const { findMatchingDeploy } = await importDeployModule();
    const deploys: Deploy[] = [
      {
        id: "old-main",
        state: "ready",
        branch: "main",
        created_at: "2026-07-05T01:59:59Z",
      },
      {
        id: "fresh-master",
        state: "ready",
        branch: "master",
        created_at: "2026-07-05T02:01:00Z",
      },
      {
        id: "fresh-main",
        state: "building",
        branch: "main",
        created_at: "2026-07-05T02:01:00Z",
      },
    ];

    const match = findMatchingDeploy(deploys, {
      targetSha: "abcdef1234567890",
      targetBranch: "main",
      createdAfter: Date.parse("2026-07-05T02:00:00Z"),
    });

    expect(match?.id).toBe("fresh-main");
  });

  it("matches deploys by full or short commit fields", async () => {
    const { findMatchingDeploy } = await importDeployModule();
    const deploys: Deploy[] = [
      {
        id: "wrong-branch",
        branch: "master",
        commit_ref: "abcdef1",
        created_at: "2026-07-05T02:01:00Z",
      },
      {
        id: "right-branch",
        branch: "main",
        commit_sha: "abcdef1234567890",
        created_at: "2026-07-05T02:01:00Z",
      },
    ];

    const match = findMatchingDeploy(deploys, {
      targetSha: "abcdef1234567890",
      targetBranch: "main",
      createdAfter: Number.NaN,
    });

    expect(match?.id).toBe("right-branch");
  });

  it("waits once, writes the deploy URL, and returns the ready deploy", async () => {
    const { waitForNetlifyDeploy } = await importDeployModule();
    const output: string[] = [];
    const logger = { log: vi.fn(), error: vi.fn() };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: "deploy-1",
          state: "ready",
          branch: "main",
          commit_ref: "abcdef1",
          created_at: "2026-07-05T02:01:00Z",
          deploy_ssl_url: "https://nav-site.netlify.app",
        },
      ],
    }));

    const deploy = await waitForNetlifyDeploy({
      config: {
        token: "test-token",
        siteId: "site-id",
        targetSha: "abcdef1234567890",
        targetBranch: "main",
        createdAfter: Number.NaN,
        timeoutMs: 1000,
        intervalMs: 1,
      },
      fetchImpl: asFetch(fetchImpl),
      sleep: vi.fn(),
      writeOutput: (url: string) => output.push(url),
      logger: asConsole(logger),
      now: (() => {
        let value = 0;
        return () => value++;
      })(),
    });

    expect(deploy.id).toBe("deploy-1");
    expect(output).toEqual(["https://nav-site.netlify.app"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws when a matched deploy reaches a failed terminal state", async () => {
    const { waitForNetlifyDeploy } = await importDeployModule();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: "deploy-failed",
          state: "failed",
          branch: "main",
          commit_ref: "abcdef1",
          created_at: "2026-07-05T02:01:00Z",
        },
      ],
    }));

    await expect(
      waitForNetlifyDeploy({
        config: {
          token: "test-token",
          siteId: "site-id",
          targetSha: "abcdef1234567890",
          targetBranch: "main",
          createdAfter: Number.NaN,
          timeoutMs: 1000,
          intervalMs: 1,
        },
        fetchImpl: asFetch(fetchImpl),
        sleep: vi.fn(),
        writeOutput: vi.fn(),
        logger: asConsole({ log: vi.fn(), error: vi.fn() }),
        now: () => 0,
      })
    ).rejects.toThrow("Netlify deploy deploy-failed finished with state=failed");
  });
});
