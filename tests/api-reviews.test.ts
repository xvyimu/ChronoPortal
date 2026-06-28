import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

interface ReviewResponseFixture {
  id: string;
  link_id: string;
  ip?: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

const checkReviewRateLimit = vi.fn(async () => true);
const getToolReviews = vi.fn<() => Promise<ReviewResponseFixture[]>>(async () => []);
const getReviewStats = vi.fn(async () => null);
const hasUserReviewed = vi.fn(async () => false);
const createReview = vi.fn();
const recordReviewAttempt = vi.fn(async () => undefined);

vi.mock("@/lib/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories")>(
    "@/lib/repositories"
  );
  return {
    ...actual,
    checkReviewRateLimit,
    getToolReviews,
    getReviewStats,
    hasUserReviewed,
    createReview,
    recordReviewAttempt,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("/api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose stored IP addresses in review responses", async () => {
    const { GET } = await import("@/app/api/reviews/route");
    getToolReviews.mockResolvedValueOnce([
      {
        id: "review-1",
        link_id: "550e8400-e29b-41d4-a716-446655440000",
        ip: "203.0.113.10",
        rating: 5,
        comment: "good",
        approved: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost/api/reviews?link_id=550e8400-e29b-41d4-a716-446655440000"
      ) as NextRequest
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews[0]).not.toHaveProperty("ip");
    expect(JSON.stringify(body)).not.toContain("203.0.113.10");
  });

  it("returns 503 when review tables have not been migrated", async () => {
    const { POST } = await import("@/app/api/reviews/route");
    const { MissingDatabaseMigrationError } = await import("@/lib/repositories");
    createReview.mockRejectedValueOnce(new MissingDatabaseMigrationError("reviews"));

    const request = new Request("http://localhost/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        link_id: "550e8400-e29b-41d4-a716-446655440000",
        rating: 5,
        comment: "good",
      }),
    }) as NextRequest;
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/migration/i);
    expect(recordReviewAttempt).not.toHaveBeenCalled();
  });
});
