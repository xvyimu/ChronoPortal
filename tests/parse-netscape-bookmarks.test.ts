import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isNetscapeBookmarkHtml,
  parseNetscapeBookmarks,
} from "../scripts/lib/parse-netscape-bookmarks.mjs";

const fixturePath = join(
  process.cwd(),
  "tests",
  "fixtures",
  "sample-bookmarks.html",
);

describe("parseNetscapeBookmarks", () => {
  it("returns [] for empty / non-string input", () => {
    expect(parseNetscapeBookmarks("")).toEqual([]);
    expect(parseNetscapeBookmarks("   ")).toEqual([]);
    // @ts-expect-error intentional invalid input
    expect(parseNetscapeBookmarks(null)).toEqual([]);
    // @ts-expect-error intentional invalid input
    expect(parseNetscapeBookmarks(undefined)).toEqual([]);
  });

  it("parses fixture: http(s) links, folder, ignores js/empty/ftp, dedupes url", () => {
    const html = readFileSync(fixturePath, "utf8");
    expect(isNetscapeBookmarkHtml(html)).toBe(true);

    const items = parseNetscapeBookmarks(html);
    expect(items).toHaveLength(3);

    expect(items[0]).toMatchObject({
      title: "GitHub",
      url: "https://github.com/",
      folder: "Dev Tools",
    });
    expect(items[1]).toMatchObject({
      title: "Vercel",
      url: "https://vercel.com/",
      folder: "Dev Tools",
    });
    expect(items[2]).toMatchObject({
      title: "Example Docs",
      url: "https://example.com/docs",
    });
    expect(items[2].folder).toBeUndefined();

    // Duplicate github kept first title only
    expect(items.filter((i) => i.url === "https://github.com/")).toHaveLength(
      1,
    );
    expect(items.some((i) => /javascript:/i.test(i.url))).toBe(false);
    expect(items.some((i) => i.title === "Ignore Me JS")).toBe(false);
  });

  it("truncates title to 200 chars", () => {
    const long = "x".repeat(250);
    const html = `<DL><A HREF="https://long.example/">${long}</A></DL>`;
    const items = parseNetscapeBookmarks(html);
    expect(items).toHaveLength(1);
    expect(items[0].title).toHaveLength(200);
  });

  it("detects Netscape doctype and DL+A patterns", () => {
    expect(
      isNetscapeBookmarkHtml("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<html>"),
    ).toBe(true);
    expect(
      isNetscapeBookmarkHtml(
        '<html><DL><A HREF="https://a.example/">a</A></DL></html>',
      ),
    ).toBe(true);
    expect(isNetscapeBookmarkHtml('{"title":"x"}')).toBe(false);
    expect(isNetscapeBookmarkHtml("")).toBe(false);
  });

  it("decodes valid entities and does not crash on out-of-range code points", () => {
    const html = [
      "<DL>",
      '<A HREF="https://ok.example/">Hello &#x1F310; World</A>',
      '<A HREF="https://bad.example/">Bad &#1114112; entity</A>',
      "</DL>",
    ].join("");
    expect(() => parseNetscapeBookmarks(html)).not.toThrow();
    const items = parseNetscapeBookmarks(html);
    expect(items).toHaveLength(2);
    expect(items[0].title).toContain("Hello");
    expect(items[0].title).toContain("World");
    // valid globe emoji U+1F310
    expect(items[0].title).toMatch(/\u{1F310}/u);
    // invalid numeric entity → U+FFFD, still a usable title
    expect(items[1].title).toContain("Bad");
    expect(items[1].title).toContain("�");
    expect(items[1].url).toBe("https://bad.example/");
  });
});
