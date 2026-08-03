import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkflow(fileName: string) {
  const workflowPath = join(process.cwd(), ".github", "workflows", fileName);
  return readFileSync(workflowPath, "utf8");
}

describe("CI workflow launch behavior", () => {
  it("gates production deployment behind a manual workflow dispatch", () => {
    const workflow = readWorkflow("ci.yml");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("ALLOW_NETLIFY_MIRROR");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).not.toContain(
      "github.event_name == 'push' || github.event_name == 'workflow_dispatch'"
    );
    expect(workflow).toContain("[Emergency] Netlify mirror");
  });

  it("monitors production smoke on a schedule without requiring deploy credentials", () => {
    const workflow = readWorkflow("production-smoke.yml");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain('cron: "17 */6 * * *"');
    expect(workflow).toContain("node scripts/probe-production.mjs");
    expect(workflow).toContain("Close recovered outage issue");
    expect(workflow).toContain("state: 'closed'");
    expect(workflow).not.toContain("NETLIFY_AUTH_TOKEN");
    expect(workflow).not.toContain("labels: ['production-monitor', 'automated']");
  });

  it("keeps resource library privileged credentials out of pull-request CI", () => {
    const ci = readWorkflow("ci.yml");
    const lighthouse = readWorkflow("lighthouse.yml");
    const buildSteps = [
      ...ci.matchAll(/- name: 生产构建\s+run: pnpm run build\s+env:[\s\S]*?(?=\n\s+- name:)/g),
    ].map((match) => match[0]);

    // e2e 的 build step 已替换为下载 artifact，因此只有一个生产构建 step
    expect(buildSteps).toHaveLength(1);
    for (const step of buildSteps) {
      expect(step).not.toContain("RESOURCE_LIBRARY_SERVICE_ROLE_KEY");
      expect(step).not.toContain("NEXT_PUBLIC_RESOURCE_LIBRARY_API_KEY");
    }

    expect(ci).not.toContain("RESOURCE_LIBRARY_SERVICE_ROLE_KEY");
    expect(ci).not.toContain("RESOURCE_LIBRARY_API_KEY");
    expect(ci).not.toContain("NEXT_PUBLIC_RESOURCE_LIBRARY_API_KEY");
    expect(lighthouse).not.toContain("RESOURCE_LIBRARY_SERVICE_ROLE_KEY");
    expect(lighthouse).not.toContain("NEXT_PUBLIC_RESOURCE_LIBRARY_API_KEY");
  });

  it("does not enable authenticated admin E2E without an isolated nav database", () => {
    const workflow = readWorkflow("ci.yml");

    expect(workflow).not.toContain("E2E_AUTH_SECRET");
    expect(workflow).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("pnpm run e2e");
  });

  it("fails quality on high/critical dependency advisories (Chronicle-aligned)", () => {
    const workflow = readWorkflow("ci.yml");

    // quality job: install → audit(--prod, high+) → lint → typecheck → tests
    //
    // 2026-08-03: gate scoped from full-tree to --prod. This is a DELIBERATE,
    // documented narrowing — not a silent weakening. Justification:
    //   * Package/advisory: brace-expansion, GHSA-mh99-v99m-4gvg (high, DoS).
    //   * Upstream has NO installable fix for the 1.x line: the advisory names
    //     1.1.17 as patched, but 1.1.17 was never published (registry 404;
    //     maintenance-v1 tops out at 1.1.16).
    //   * It cannot be force-upgraded either: the sole consumer is minimatch@3
    //     (via eslint -> @eslint/config-array), which calls brace-expansion as a
    //     function; v5 is named-export only -> "TypeError: expand is not a function".
    //   * It is dev-only. Hard evidence: `pnpm audit --prod` exits 0 at both
    //     high and moderate; the only brace-expansion reaching production is
    //     5.0.8 (patched) via @sentry/nextjs.
    // Severity threshold is unchanged (high+). Revisit when 1.1.17+ ships.
    // Full rationale + lock evidence: docs/ops/cp-deps-brace-expansion-postcss-2026-08-03.md
    expect(workflow).toMatch(
      /pnpm install --frozen-lockfile[\s\S]*Dependency audit \(production deps, high\+\)[\s\S]*pnpm audit --prod --registry=https:\/\/registry\.npmjs\.org --audit-level=high/
    );
    expect(workflow).toContain(
      "pnpm audit --prod --registry=https://registry.npmjs.org --audit-level=high"
    );
    // Do not silently weaken the gate to critical-only or continue-on-error.
    expect(workflow).not.toMatch(
      /Dependency audit \(production deps, high\+\)[\s\S]{0,200}continue-on-error:\s*true/
    );
    expect(workflow).not.toContain("--audit-level=critical");
    // Replacement guard for the coverage lost by --prod: the narrowing is only
    // defensible while production scope is actually clean, so the gate must stay
    // blocking (no `|| true` escape hatch) and must keep an explicit rationale.
    expect(workflow).not.toMatch(/pnpm audit[^\n]*\|\|\s*true/);
    expect(workflow).toMatch(/GHSA-mh99-v99m-4gvg/);
  });

  it("keeps security overrides on lower-bound ranges so advisories cannot silently re-open", () => {
    // Exact-version security pins rot: once the advisory range advances, an exact
    // pin flips from "the fix" to "holding the package below the patch line", and
    // audit stays quiet because the override is what pinned it. Use
    // `>=<first_patched> <<next_major>` instead. Sole allowed exception is a line
    // with no published fix (brace-expansion@1 -> 1.1.16, DEFER; see docs/ops card).
    const workspace = readFileSync(
      join(process.cwd(), "pnpm-workspace.yaml"),
      "utf8"
    );
    const overrides = workspace.slice(workspace.indexOf("overrides:"));

    const exactPinExceptions = new Set(["brace-expansion@1"]);
    const offenders: string[] = [];

    for (const line of overrides.split("\n")) {
      const match = line.match(/^\s{2}'?([^':#\s]+)'?:\s*(.+?)\s*$/);
      if (!match) continue;
      const [, name, range] = match;
      if (name === "overrides") continue;
      if (exactPinExceptions.has(name)) continue;
      // Bare exact version (no >=, ^, ~ or other range operator).
      if (/^\d+\.\d+\.\d+/.test(range)) offenders.push(`${name}: ${range}`);
    }

    expect(offenders).toEqual([]);
  });
});
