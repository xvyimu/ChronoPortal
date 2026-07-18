import { describe, expect, it } from "vitest";
import { getDescendantSlugs } from "@/lib/category-tree";
import { buildDescendantSlugsMap, buildTabTree } from "@/lib/nav-derived-data";
import type { Category } from "@/lib/types";

const MAX_EXPECTED_CATEGORY_DEPTH = 32;

function category(id: string, parentId: string | null = null): Category {
  return {
    id,
    name: id,
    slug: id,
    description: null,
    icon: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    parent_id: parentId,
  };
}

function firstBranchKeys(
  tree: ReturnType<typeof buildTabTree>,
): string[] {
  const keys: string[] = [];
  let node = tree.find((item) => item.key !== "all");

  while (node) {
    keys.push(node.key);
    node = node.children[0];
  }

  return keys;
}

describe("category tree recursion guards", () => {
  it("preserves descendant order for a valid category tree", () => {
    const categories = [
      category("root"),
      category("child", "root"),
      category("grandchild", "child"),
    ];

    expect(getDescendantSlugs(categories, "root")).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
  });

  it("returns each reachable category once when parent links form a cycle", () => {
    const categories = [
      category("alpha", "beta"),
      category("beta", "alpha"),
    ];

    expect(getDescendantSlugs(categories, "alpha")).toEqual(["alpha", "beta"]);
    expect(buildDescendantSlugsMap(categories)).toEqual({
      alpha: ["alpha", "beta"],
      beta: ["beta", "alpha"],
    });
  });

  it("caps descendant traversal for an abnormally deep tree", () => {
    const categories = Array.from({ length: 80 }, (_, index) =>
      category(`node-${index}`, index === 0 ? null : `node-${index - 1}`),
    );

    const descendants = getDescendantSlugs(categories, "node-0");

    expect(descendants).toHaveLength(MAX_EXPECTED_CATEGORY_DEPTH);
    expect(descendants.at(-1)).toBe("node-31");
  });

  it("stops a repeated category id on a sidebar recursion path", () => {
    const categories = [
      category("root"),
      category("branch", "root"),
      { ...category("cycle", "branch"), id: "root" },
    ];

    const tree = buildTabTree(categories, [],
      buildDescendantSlugsMap(categories));

    expect(firstBranchKeys(tree)).toEqual(["root", "branch"]);
  });

  it("caps sidebar nesting for an abnormally deep tree", () => {
    const categories = Array.from({ length: 80 }, (_, index) =>
      category(`node-${index}`, index === 0 ? null : `node-${index - 1}`),
    );

    const descendants = buildDescendantSlugsMap(categories);
    const tree = buildTabTree(categories, [], descendants);

    expect(firstBranchKeys(tree)).toHaveLength(MAX_EXPECTED_CATEGORY_DEPTH);
    expect(firstBranchKeys(tree).at(-1)).toBe("node-31");
  });
});
