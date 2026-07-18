import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="public-header" />,
}));

vi.mock("@/components/Footer", () => ({
  Footer: () => <div data-testid="public-footer" />,
}));

vi.mock("@/components/FavoritesProvider", () => ({
  FavoritesProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="favorites-provider">{children}</div>
  ),
}));

vi.mock("@/components/PanguSpacing", () => ({
  PanguSpacing: () => <div data-testid="pangu-spacing" />,
}));

vi.mock("@/components/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AppChrome } from "@/components/AppChrome";

describe("AppChrome", () => {
  beforeEach(() => {
    state.pathname = "/";
  });

  it("keeps the public header and footer on public routes", () => {
    render(<AppChrome><div>public content</div></AppChrome>);

    expect(screen.getByTestId("public-header")).not.toBeNull();
    expect(screen.getByTestId("public-footer")).not.toBeNull();
    expect(screen.getByTestId("favorites-provider")).not.toBeNull();
    expect(screen.getByTestId("pangu-spacing")).not.toBeNull();
  });

  it.each(["/login", "/admin", "/admin/categories"])(
    "uses standalone chrome on %s",
    (pathname) => {
      state.pathname = pathname;
      render(<AppChrome><div>standalone content</div></AppChrome>);

      expect(screen.queryByTestId("public-header")).toBeNull();
      expect(screen.queryByTestId("public-footer")).toBeNull();
      expect(screen.queryByTestId("favorites-provider")).toBeNull();
      expect(screen.queryByTestId("pangu-spacing")).toBeNull();
      expect(screen.getByText("standalone content")).not.toBeNull();
    }
  );

  it("does not add a second main landmark around standalone routes", () => {
    state.pathname = "/admin";
    render(
      <AppChrome>
        <main>admin content</main>
      </AppChrome>
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
