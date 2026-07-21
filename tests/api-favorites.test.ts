import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const LINK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getClientIp: vi.fn(),
  getUserFavorites: vi.fn(),
  getUserFavoriteLinks: vi.fn(),
  addUserFavorites: vi.fn(),
  removeUserFavorite: vi.fn(),
  clearUserFavorites: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return {
    ...actual,
    getClientIp: mocks.getClientIp,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  recordAttempt: mocks.recordAttempt,
}));

vi.mock("@/lib/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories")>(
    "@/lib/repositories"
  );
  return {
    ...actual,
    getUserFavorites: mocks.getUserFavorites,
    getUserFavoriteLinks: mocks.getUserFavoriteLinks,
    addUserFavorites: mocks.addUserFavorites,
    removeUserFavorite: mocks.removeUserFavorite,
    clearUserFavorites: mocks.clearUserFavorites,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

async function importFresh<T>(path: string): Promise<T> {
  vi.resetModules();
  return import(path) as Promise<T>;
}

function writeHeaders(extra: Record<string, string> = {}) {
  return {
    origin: "http://localhost",
    host: "localhost",
    "content-type": "application/json",
    ...extra,
  };
}

function asNextRequest(input: Request): NextRequest {
  const url = new URL(input.url);
  // Route GET reads request.nextUrl; plain Request lacks it.
  Object.defineProperty(input, "nextUrl", {
    value: url,
    configurable: true,
  });
  return input as NextRequest;
}

function sessionUser(id: string) {
  return { user: { id } };
}

function oversizeUuids(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i + 1).toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${n}`;
  });
}

describe("API /api/favorites — auth, UUID, IDOR isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(sessionUser(USER_A));
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, count: 0 });
    mocks.createServiceRoleClient.mockReturnValue({ __mock: "service-role" });
    mocks.getUserFavorites.mockResolvedValue([LINK_A]);
    mocks.getUserFavoriteLinks.mockResolvedValue([{ id: LINK_A, title: "A" }]);
    mocks.addUserFavorites.mockResolvedValue({ added: 1 });
    mocks.removeUserFavorite.mockResolvedValue({ ok: true });
    mocks.clearUserFavorites.mockResolvedValue({ ok: true, cleared: true });
  });

  // #1 unauth GET
  it("returns 401 for unauthenticated GET and does not call repo", async () => {
    mocks.auth.mockResolvedValue(null);
    const { GET } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await GET(
      asNextRequest(new Request("http://localhost/api/favorites", { method: "GET" }))
    );

    expect(response.status).toBe(401);
    expect(mocks.getUserFavorites).not.toHaveBeenCalled();
    expect(mocks.getUserFavoriteLinks).not.toHaveBeenCalled();
  });

  // #2 unauth POST
  it("returns 401 for unauthenticated POST and skips rate limit / upsert", async () => {
    mocks.auth.mockResolvedValue(null);
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: [LINK_A] }),
        })
      )
    );

    expect(response.status).toBe(401);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
  });

  // #3 unauth DELETE
  it("returns 401 for unauthenticated DELETE", async () => {
    mocks.auth.mockResolvedValue(null);
    const { DELETE } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await DELETE(
      asNextRequest(
        new Request(`http://localhost/api/favorites?linkId=${LINK_A}`, {
          method: "DELETE",
          headers: writeHeaders(),
        })
      )
    );

    expect(response.status).toBe(401);
    expect(mocks.removeUserFavorite).not.toHaveBeenCalled();
    expect(mocks.clearUserFavorites).not.toHaveBeenCalled();
  });

  // #4 bad UUID DELETE
  it("returns 400 for non-UUID DELETE linkId before rate limit or remove", async () => {
    const { DELETE } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await DELETE(
      asNextRequest(
        new Request("http://localhost/api/favorites?linkId=not-a-uuid", {
          method: "DELETE",
          headers: writeHeaders(),
        })
      )
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.removeUserFavorite).not.toHaveBeenCalled();
  });

  // #5 empty POST batch
  it("returns 400 for empty POST linkIds and skips rate limit / add", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: [] }),
        })
      )
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
  });

  // #6 non-UUID POST batch
  it("returns 400 for non-UUID POST batch and skips rate limit / add", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: ["nope"] }),
        })
      )
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
  });

  // #7 oversize POST
  it("returns 400 for oversize POST batch (101 UUIDs) and skips add", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: oversizeUuids(101) }),
        })
      )
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
  });

  // #8 GET isolation
  it("GET calls getUserFavorites with session user only", async () => {
    const { GET } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await GET(
      asNextRequest(new Request("http://localhost/api/favorites", { method: "GET" }))
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getUserFavorites).toHaveBeenCalledTimes(1);
    expect(mocks.getUserFavorites).toHaveBeenCalledWith(USER_A);
    expect(mocks.getUserFavorites).not.toHaveBeenCalledWith(USER_B);
    expect(body.favorites).toEqual([LINK_A]);
    expect(JSON.stringify(body)).not.toContain(USER_B);
  });

  // #9 GET detail=links
  it("GET ?detail=links calls getUserFavoriteLinks with session user only", async () => {
    const { GET } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await GET(
      asNextRequest(
        new Request("http://localhost/api/favorites?detail=links", { method: "GET" })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getUserFavoriteLinks).toHaveBeenCalledTimes(1);
    expect(mocks.getUserFavoriteLinks).toHaveBeenCalledWith(USER_A);
    expect(mocks.getUserFavoriteLinks).not.toHaveBeenCalledWith(USER_B);
    expect(mocks.getUserFavorites).not.toHaveBeenCalled();
    expect(body.links).toEqual([{ id: LINK_A, title: "A" }]);
  });

  // #10 POST isolation
  it("POST uses session user id even when body targets another user's link", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: [LINK_B] }),
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, added: 1 });
    expect(mocks.addUserFavorites).toHaveBeenCalledTimes(1);
    expect(mocks.addUserFavorites).toHaveBeenCalledWith(
      expect.anything(),
      USER_A,
      [LINK_B]
    );
    const callArgs = mocks.addUserFavorites.mock.calls[0];
    expect(callArgs).not.toContain(USER_B);
    expect(JSON.stringify(callArgs)).not.toMatch(new RegExp(USER_B));
  });

  // #11 DELETE one isolation
  it("DELETE one favorite uses session user and parsed UUID", async () => {
    const { DELETE } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await DELETE(
      asNextRequest(
        new Request(`http://localhost/api/favorites?linkId=${LINK_B}`, {
          method: "DELETE",
          headers: writeHeaders(),
        })
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.removeUserFavorite).toHaveBeenCalledTimes(1);
    expect(mocks.removeUserFavorite).toHaveBeenCalledWith(USER_A, LINK_B);
    expect(mocks.removeUserFavorite).not.toHaveBeenCalledWith(USER_B, expect.anything());
    expect(mocks.clearUserFavorites).not.toHaveBeenCalled();
  });

  // #12 DELETE all isolation
  it("DELETE all=true clears only session user favorites", async () => {
    const { DELETE } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await DELETE(
      asNextRequest(
        new Request("http://localhost/api/favorites?all=true", {
          method: "DELETE",
          headers: writeHeaders(),
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, cleared: true });
    expect(mocks.clearUserFavorites).toHaveBeenCalledTimes(1);
    expect(mocks.clearUserFavorites).toHaveBeenCalledWith(USER_A);
    expect(mocks.clearUserFavorites).not.toHaveBeenCalledWith(USER_B);
    expect(mocks.removeUserFavorite).not.toHaveBeenCalled();
  });

  // edge: all=true + invalid linkId keeps all path
  it("DELETE all=true ignores invalid linkId and still clears session user only", async () => {
    const { DELETE } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await DELETE(
      asNextRequest(
        new Request("http://localhost/api/favorites?all=true&linkId=not-a-uuid", {
          method: "DELETE",
          headers: writeHeaders(),
        })
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.clearUserFavorites).toHaveBeenCalledWith(USER_A);
    expect(mocks.removeUserFavorite).not.toHaveBeenCalled();
  });

  // #13 client-supplied userId ignored
  it("ignores client-supplied body.userId and still scopes to session user", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: [LINK_A], userId: USER_B }),
        })
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.addUserFavorites).toHaveBeenCalledWith(
      expect.anything(),
      USER_A,
      [LINK_A]
    );
    const [, userArg] = mocks.addUserFavorites.mock.calls[0];
    expect(userArg).toBe(USER_A);
    expect(userArg).not.toBe(USER_B);
  });

  // #14 CSRF reject write
  it("returns 403 when cookie write lacks same-origin proof and does not add", async () => {
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: {
            host: "localhost",
            "content-type": "application/json",
            cookie: "session=x",
            // no origin / referer / sec-fetch-site=same-origin
          },
          body: JSON.stringify({ linkIds: [LINK_A] }),
        })
      )
    );

    expect(response.status).toBe(403);
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  // #15 rate limit deny
  it("returns 429 when rate limit denies and does not add", async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, count: 30 });
    const { POST } = await importFresh<typeof import("@/app/api/favorites/route")>(
      "@/app/api/favorites/route"
    );

    const response = await POST(
      asNextRequest(
        new Request("http://localhost/api/favorites", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ linkIds: [LINK_A] }),
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toMatch(/频繁|15/);
    expect(mocks.addUserFavorites).not.toHaveBeenCalled();
  });
});
