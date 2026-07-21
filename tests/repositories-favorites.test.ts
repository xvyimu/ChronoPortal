import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addUserFavorites,
  clearUserFavorites,
  getUserFavorites,
  removeUserFavorite,
} from "@/lib/repositories/favorites";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const LINK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

class FavoritesMockDB {
  private rows: Record<string, { data?: unknown; error?: { message?: string } | null }> = {};
  private lastTable = "";
  calls: Record<string, unknown[][]> = {};

  setResponse(table: string, response: { data?: unknown; error?: { message?: string } | null }) {
    this.rows[table] = response;
  }

  from(table: string) {
    this.lastTable = table;
    this.call("from", table);
    return this;
  }

  select(...args: unknown[]) { this.call("select", ...args); return this; }
  eq(...args: unknown[]) { this.call("eq", ...args); return this; }
  delete(...args: unknown[]) { this.call("delete", ...args); return this; }
  upsert(...args: unknown[]) { this.call("upsert", ...args); return this; }

  private call(...args: unknown[]) {
    (this.calls[this.lastTable] ||= []).push(args);
  }

  private response() {
    const response = this.rows[this.lastTable] ?? {};
    return { data: response.data ?? null, error: response.error ?? null };
  }

  get data() { return this.response().data; }
  get error() { return this.response().error; }
}

const mockDb = new FavoritesMockDB();

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => mockDb),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function eqCalls(column: string) {
  return (mockDb.calls.user_favorites ?? []).filter(
    (call) => call[0] === "eq" && call[1] === column
  );
}

function hasEq(column: string, value: string) {
  return eqCalls(column).some((call) => call[2] === value);
}

describe("repositories/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockDb.calls)) delete mockDb.calls[key];
    mockDb.setResponse("user_favorites", { data: null, error: null });
  });

  // R1
  it("reads a user's favorite link ids scoped by user_id only (USER_A)", async () => {
    mockDb.setResponse("user_favorites", {
      data: [{ link_id: LINK_A }, { link_id: LINK_B }],
      error: null,
    });

    await expect(getUserFavorites(USER_A)).resolves.toEqual([LINK_A, LINK_B]);
    expect(hasEq("user_id", USER_A)).toBe(true);
    expect(hasEq("user_id", USER_B)).toBe(false);
    expect(eqCalls("user_id")).toHaveLength(1);
  });

  // R2
  it("upserts favorites with all rows carrying USER_A user_id", async () => {
    mockDb.setResponse("user_favorites", {
      data: [{ link_id: LINK_A }],
      error: null,
    });
    const result = await addUserFavorites(
      mockDb as unknown as Parameters<typeof addUserFavorites>[0],
      USER_A,
      [LINK_A, LINK_B]
    );

    expect(result).toEqual({ added: 1 });
    expect(mockDb.calls.user_favorites).toContainEqual([
      "upsert",
      [
        { user_id: USER_A, link_id: LINK_A },
        { user_id: USER_A, link_id: LINK_B },
      ],
      { onConflict: "user_id,link_id", ignoreDuplicates: true },
    ]);
    const upsertCall = mockDb.calls.user_favorites.find((c) => c[0] === "upsert");
    const rows = upsertCall?.[1] as Array<{ user_id: string; link_id: string }>;
    expect(rows.every((r) => r.user_id === USER_A)).toBe(true);
    expect(rows.some((r) => r.user_id === USER_B)).toBe(false);
  });

  // R3
  it("removes one favorite by user_id and link_id together", async () => {
    await expect(removeUserFavorite(USER_A, LINK_A)).resolves.toEqual({ ok: true });

    expect(mockDb.calls.user_favorites).toContainEqual(["delete"]);
    expect(hasEq("user_id", USER_A)).toBe(true);
    expect(hasEq("link_id", LINK_A)).toBe(true);
    expect(hasEq("user_id", USER_B)).toBe(false);
  });

  // R4
  it("clears favorites with user_id filter only (no unfiltered delete)", async () => {
    await expect(clearUserFavorites(USER_A)).resolves.toEqual({ ok: true, cleared: true });

    expect(mockDb.calls.user_favorites).toContainEqual(["delete"]);
    expect(hasEq("user_id", USER_A)).toBe(true);
    expect(eqCalls("user_id")).toHaveLength(1);
    // delete must be paired with at least one eq user_id in the same call chain
    const deleteIndex = mockDb.calls.user_favorites.findIndex((c) => c[0] === "delete");
    const eqAfterDelete = mockDb.calls.user_favorites
      .slice(deleteIndex + 1)
      .filter((c) => c[0] === "eq" && c[1] === "user_id");
    expect(eqAfterDelete.length).toBeGreaterThanOrEqual(1);
    expect(eqAfterDelete[0][2]).toBe(USER_A);
  });

  // R5 dual-user serial: clear A then get B — clear eq is A not B
  it("serial clear(USER_A) then get(USER_B) keeps eq values isolated", async () => {
    mockDb.setResponse("user_favorites", {
      data: [{ link_id: LINK_B }],
      error: null,
    });

    await clearUserFavorites(USER_A);
    const clearEqs = eqCalls("user_id").map((c) => c[2]);
    expect(clearEqs).toEqual([USER_A]);
    expect(clearEqs).not.toContain(USER_B);

    // reset call log for second operation clarity while preserving isolation assertion
    for (const key of Object.keys(mockDb.calls)) delete mockDb.calls[key];

    await getUserFavorites(USER_B);
    const getEqs = eqCalls("user_id").map((c) => c[2]);
    expect(getEqs).toEqual([USER_B]);
    expect(getEqs).not.toContain(USER_A);
  });

  // keep prior behavioral coverage with UUID fixtures
  it("upserts favorites with a user/link uniqueness conflict target", async () => {
    mockDb.setResponse("user_favorites", {
      data: [{ link_id: LINK_A }],
      error: null,
    });
    const result = await addUserFavorites(
      mockDb as unknown as Parameters<typeof addUserFavorites>[0],
      USER_A,
      [LINK_A]
    );

    expect(result).toEqual({ added: 1 });
    expect(mockDb.calls.user_favorites).toContainEqual([
      "upsert",
      [{ user_id: USER_A, link_id: LINK_A }],
      { onConflict: "user_id,link_id", ignoreDuplicates: true },
    ]);
  });
});
