import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createStaticClient: vi.fn(),
  getAllApprovedLinkSlugs: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createStaticClient: mocks.createStaticClient,
}));

vi.mock("@/lib/repositories", () => ({
  getAllApprovedLinkSlugs: mocks.getAllApprovedLinkSlugs,
  getCategories: mocks.getCategories,
}));

describe("sitemap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("falls back to static pages when public Supabase config is absent", async () => {
    const { default: sitemap } = await import("@/app/sitemap");

    const result = await sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      "https://example.com",
      "https://example.com/submit",
      "https://example.com/about",
    ]);
    expect(mocks.createStaticClient).not.toHaveBeenCalled();
    expect(mocks.getAllApprovedLinkSlugs).not.toHaveBeenCalled();
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });

  it("includes dynamic pages only when public Supabase config is present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const client = {};
    mocks.createStaticClient.mockReturnValue(client);
    mocks.getAllApprovedLinkSlugs.mockResolvedValue(["alpha"]);
    mocks.getCategories.mockResolvedValue([{ slug: "ai" }, { slug: "design" }]);

    const { default: sitemap } = await import("@/app/sitemap");

    const result = await sitemap();

    expect(mocks.createStaticClient).toHaveBeenCalledTimes(1);
    expect(mocks.getAllApprovedLinkSlugs).toHaveBeenCalledWith(client);
    expect(mocks.getCategories).toHaveBeenCalledWith(client);
    expect(result.map((entry) => entry.url)).toEqual([
      "https://example.com",
      "https://example.com/submit",
      "https://example.com/about",
      "https://example.com/tool/alpha",
      "https://example.com/?cat=ai",
      "https://example.com/?cat=design",
    ]);
  });
});
