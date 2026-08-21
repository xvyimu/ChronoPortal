import { describe, it, expect } from "vitest";
import { toRawLinkRows } from "@/lib/repositories/shared";
import { toSemanticRows } from "@/lib/search/types";

/**
 * 类型收窄守卫的行为门闩。
 *
 * 背景：这两个函数替换掉了各调用点的 `as unknown as` 双重断言。双重断言等于
 * 关掉全部检查 —— 脏行会带着 undefined 字段流进 mapLinkRow 与 boost 计算。
 *
 * 但收窄的代价是**静默丢弃**不合格的行，这是行为变更，必须钉住：
 * 既要证明脏行确实被挡，也要证明合格行不会被误杀（过度收紧会静默丢真数据，
 * 比 `as unknown as` 更难查）。
 */
describe("toRawLinkRows", () => {
  it("keeps rows that carry a string id", () => {
    const rows = toRawLinkRows([
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("preserves extra fields (RawLinkRow has an index signature)", () => {
    const rows = toRawLinkRows([{ id: "a", total_count: 7, nested: { x: 1 } }]);
    expect(rows[0].total_count).toBe(7);
    expect(rows[0].nested).toEqual({ x: 1 });
  });

  it("returns [] for non-array input, matching the previous `data ?? []` fallback", () => {
    for (const input of [null, undefined, {}, "rows", 0, false]) {
      expect(toRawLinkRows(input)).toEqual([]);
    }
  });

  it("drops rows that would reach mapLinkRow with a missing or non-string id", () => {
    const rows = toRawLinkRows([
      { id: "keep" },
      { id: 123 }, // numeric id — mapLinkRow expects string
      { id: null },
      { title: "no id at all" },
      null,
      undefined,
      "not an object",
      [],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("keep");
  });

  it("does not treat an empty array as a failure", () => {
    expect(toRawLinkRows([])).toEqual([]);
  });
});

describe("toSemanticRows", () => {
  const valid = {
    id: "a",
    similarity: 0.87,
    click_count: 3,
  };

  it("keeps rows with a string id and finite numeric scoring fields", () => {
    const rows = toSemanticRows([valid, { ...valid, id: "b" }]);
    expect(rows).toHaveLength(2);
  });

  it("returns [] for non-array input", () => {
    for (const input of [null, undefined, {}, "rows"]) {
      expect(toSemanticRows(input)).toEqual([]);
    }
  });

  it("drops rows whose similarity would poison the boost arithmetic", () => {
    // 下游直接对 similarity / click_count 做算术；缺字段或非有限值会算出 NaN，
    // NaN 参与排序会让顺序变成实现细节（比较永远 false）。
    const rows = toSemanticRows([
      valid,
      { ...valid, id: "no-sim", similarity: undefined },
      { ...valid, id: "str-sim", similarity: "0.9" },
      { ...valid, id: "nan-sim", similarity: Number.NaN },
      { ...valid, id: "inf-sim", similarity: Number.POSITIVE_INFINITY },
      { ...valid, id: "no-clicks", click_count: undefined },
      { ...valid, id: "str-clicks", click_count: "3" },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps legitimate edge values that are still finite numbers", () => {
    const rows = toSemanticRows([
      { ...valid, id: "zero-sim", similarity: 0 },
      { ...valid, id: "zero-clicks", click_count: 0 },
      { ...valid, id: "neg-sim", similarity: -0.5 },
    ]);
    // 0 相似度与 0 点击是真实数据，不该被 falsy 检查误杀。
    expect(rows.map((r) => r.id)).toEqual(["zero-sim", "zero-clicks", "neg-sim"]);
  });

  it("drops rows with a missing or non-string id", () => {
    const rows = toSemanticRows([
      valid,
      { ...valid, id: undefined },
      { ...valid, id: 7 },
      null,
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });
});
