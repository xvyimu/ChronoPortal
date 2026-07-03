import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getApprovedLinksForApi: vi.fn(),
  getCategories: vi.fn(),
  getApprovedLinkBySlug: vi.fn(),
  getRelatedLinks: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  getApprovedLinksForApi: mocks.getApprovedLinksForApi,
  getCategories: mocks.getCategories,
  getApprovedLinkBySlug: mocks.getApprovedLinkBySlug,
  getRelatedLinks: mocks.getRelatedLinks,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const baseLink = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "OpenAI Platform Renamed",
  slug: "openai-platform",
  url: "https://platform.openai.com",
  description: "AI developer tools",
  icon: null,
  category_id: null,
  approved: true,
  paid: false,
  featured: false,
  click_count: 10,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  category_name: "AI",
  category_slug: "ai-tools",
  tags: [],
};

async function importFresh<T>(path: string): Promise<T> {
  vi.resetModules();
  return import(path) as Promise<T>;
}

describe("tool detail slugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue([]);
    mocks.getApprovedLinksForApi.mockResolvedValue([baseLink]);
    mocks.getApprovedLinkBySlug.mockResolvedValue(baseLink);
    mocks.getRelatedLinks.mockResolvedValue([]);
  });

  it("/api/tools prefers the database slug over the current title", async () => {
    const { GET } = await importFresh<typeof import("@/app/api/tools/route")>(
      "@/app/api/tools/route"
    );

    const response = await GET(new NextRequest("http://localhost/api/tools"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tools[0].slug).toBe("openai-platform");
    expect(body.tools[0].detail_page).toBe("/tool/openai-platform");
  });

  it("related tool links prefer the database slug over the current title", async () => {
    mocks.getRelatedLinks.mockResolvedValue([
      {
        ...baseLink,
        id: "550e8400-e29b-41d4-a716-446655440099",
        title: "Related Tool Renamed",
        slug: "related-tool",
        url: "https://related.example.com",
      },
    ]);

    const [mod, server] = await Promise.all([
      importFresh<typeof import("@/app/tool/[slug]/page")>("@/app/tool/[slug]/page"),
      import("react-dom/server"),
    ]);

    const element = await mod.default({
      params: Promise.resolve({ slug: "openai-platform" }),
    });
    const html = server.renderToStaticMarkup(element);

    expect(html).toContain('href="/tool/related-tool"');
    expect(html).not.toContain("/tool/related-tool-renamed");
  });
});

