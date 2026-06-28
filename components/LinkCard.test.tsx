import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinkCard } from "./LinkCard";
import type { NavLink } from "@/lib/types";

vi.mock("@/components/FavoritesProvider", () => ({
  useFavoritesContext: () => ({
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
  }),
}));

function makeLink(overrides: Partial<NavLink> = {}): NavLink {
  return {
    id: "tool-1",
    title: "Figma",
    url: "https://figma.com",
    description: "Design collaboration",
    icon: null,
    category_id: null,
    approved: true,
    paid: false,
    featured: false,
    click_count: 7,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("LinkCard", () => {
  it("calls preview callback from the preview button", () => {
    const link = makeLink();
    const onPreview = vi.fn();

    render(<LinkCard link={link} onPreview={onPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "预览 Figma" }));

    expect(onPreview).toHaveBeenCalledWith(link);
  });
});
