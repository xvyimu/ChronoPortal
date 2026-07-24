import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

describe("resolvePublicNavRevalidatePaths", () => {
  it("link (default): home + sitemap", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(resolvePublicNavRevalidatePaths()).toEqual(["/", "/sitemap.xml"]);
    expect(resolvePublicNavRevalidatePaths({ reason: "link" })).toEqual([
      "/",
      "/sitemap.xml",
    ]);
  });

  it("link + slug: home + tool detail + sitemap", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(
      resolvePublicNavRevalidatePaths({ reason: "link", slug: "chatgpt" })
    ).toEqual(["/", "/tool/chatgpt", "/sitemap.xml"]);
  });

  it("category: home + sitemap, never tool detail", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(resolvePublicNavRevalidatePaths({ reason: "category" })).toEqual([
      "/",
      "/sitemap.xml",
    ]);
    // slug 对 category 无意义，不得误刷详情
    expect(
      resolvePublicNavRevalidatePaths({
        reason: "category",
        slug: "should-ignore",
      })
    ).toEqual(["/", "/sitemap.xml"]);
  });

  it("tag: home only — no sitemap path sweep", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(resolvePublicNavRevalidatePaths({ reason: "tag" })).toEqual(["/"]);
  });

  it("includeHome=false skips home", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(
      resolvePublicNavRevalidatePaths({
        reason: "link",
        slug: "x",
        includeHome: false,
      })
    ).toEqual(["/tool/x", "/sitemap.xml"]);
  });

  it("trims slug and ignores blank", async () => {
    const { resolvePublicNavRevalidatePaths } = await import(
      "@/lib/admin/revalidate-public"
    );
    expect(
      resolvePublicNavRevalidatePaths({ reason: "link", slug: "  foo  " })
    ).toEqual(["/", "/tool/foo", "/sitemap.xml"]);
    expect(
      resolvePublicNavRevalidatePaths({ reason: "link", slug: "   " })
    ).toEqual(["/", "/sitemap.xml"]);
  });
});

describe("revalidatePublicNavContent", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it("revalidates home and sitemap by default (link reason)", async () => {
    const { revalidatePublicNavContent } = await import(
      "@/lib/admin/revalidate-public"
    );
    revalidatePublicNavContent();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("also revalidates tool detail when slug is provided", async () => {
    vi.resetModules();
    const { revalidatePublicNavContent } = await import(
      "@/lib/admin/revalidate-public"
    );
    revalidatePublicNavContent({ reason: "link", slug: "chatgpt" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/tool/chatgpt");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("tag reason does not touch sitemap", async () => {
    vi.resetModules();
    const { revalidatePublicNavContent } = await import(
      "@/lib/admin/revalidate-public"
    );
    revalidatePublicNavContent({ reason: "tag" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).not.toHaveBeenCalledWith("/sitemap.xml");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
