import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import type { Category, NavLink } from "@/lib/types";

const category: Category = {
  id: "0194b64d-5cb6-7330-a273-1ab8f926e169",
  name: "开发工具",
  slug: "developer-tools",
  description: null,
  icon: null,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
};

function link(id: string, title: string): NavLink {
  return {
    id,
    title,
    url: `https://${id}.example.com`,
    description: null,
    icon: null,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    approved: true,
    paid: false,
    featured: false,
    click_count: 0,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function renderWorkspace(initialLinks: NavLink[]) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <AdminWorkspace
        initialPage={{
          links: initialLinks,
          total: initialLinks.length,
          page: 1,
          pageSize: 20,
        }}
        initialCategories={[category]}
      />
    </QueryClientProvider>
  );
}

describe("AdminWorkspace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders server-provided data without an initial client request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWorkspace([link("alpha", "Alpha")]);

    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText("1 条记录")).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the paginated API when search filters change", async () => {
    const result = link("chat", "Chat Console");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ links: [result], total: 1, page: 1, pageSize: 20 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWorkspace([link("alpha", "Alpha")]);
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索链接" }), {
      target: { value: "chat" },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=chat");
    expect((await screen.findAllByText("Chat Console")).length).toBeGreaterThan(0);
  });
});
