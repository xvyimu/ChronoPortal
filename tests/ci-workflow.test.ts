import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = join(process.cwd(), ".github", "workflows", "ci.yml");

function readWorkflow() {
  return readFileSync(workflowPath, "utf8");
}

describe("CI workflow launch behavior", () => {
  it("allows a manual production deployment run after external blockers are cleared", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain(
      "github.ref == 'refs/heads/master' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')"
    );
  });
});
