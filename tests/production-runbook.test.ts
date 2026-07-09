import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readDoc(fileName: string) {
  return readFileSync(join(process.cwd(), "docs", fileName), "utf8");
}

describe("production runbook", () => {
  it("keeps launch checklist linked to the production runbook", () => {
    const checklist = readDoc("LAUNCH-CHECKLIST.md");

    expect(checklist).toContain("[生产运行手册](./PRODUCTION-RUNBOOK.md)");
    expect(checklist).toContain("checks.resourceLibrarySearch.status");
  });

  it("documents the current manual deploy and health-check contract", () => {
    const runbook = readDoc("PRODUCTION-RUNBOOK.md");

    expect(runbook).toContain("CI 检查 / 手动 Netlify 部署");
    expect(runbook).toContain("Netlify account credit");
    expect(runbook).toContain("resourceLibrarySearch");
    expect(runbook).toContain("resource_search_health");
    expect(runbook).toContain("不要在 handoff、日志、commit message、README 中写入任何 secret");
  });
});
