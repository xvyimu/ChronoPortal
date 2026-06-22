"use client";

import { useState, useMemo, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { type Category, type NavLink } from "@/lib/types";
import Fuse from "fuse.js";
import { motion } from "motion/react";
import { SearchBar } from "./SearchBar";
import { LinkCard } from "./LinkCard";
import { ModelRanking, type ModelRanking as ModelRankingType } from "./ModelRanking";
import { staggerContainer, fadeInUp, slideDown } from "@/lib/animations";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { useShell } from "./Shell";

// ── Fuse.js fuzzy search options ──
function createFuse<T>(list: T[], keys: { name: string; weight: number }[]) {
  return new Fuse(list, {
    keys,
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 1,
    includeScore: true,
  });
}

// ── Section label mapping ──
const sectionLabels: Record<string, string> = {
  "big-tech": "官方 API",
  "free-relay": "中转服务站",
  "model-ranking": "模型排行榜",
};

export function Navigation({
  categories,
  links,
  modelRankings = [],
}: {
  categories: Category[];
  links: NavLink[];
  modelRankings?: ModelRankingType[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const { sidebarOpen, closeSidebar } = useShell();

  // ── Debounce: 150ms ──
  useEffect(() => {
    const timer = setTimeout(() => setSearch(rawSearch), 150);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  // ── Tab keys for sidebar ──
  const tabKeys = useMemo(
    () => [
      { key: "all", label: "全部" },
      ...categories.map((c) => ({ key: c.slug, label: sectionLabels[c.slug] || c.name })),
    ],
    [categories],
  );

  // Compute counts per category
  const tabCounts = useMemo(() => {
    return tabKeys.map((tab) => ({
      ...tab,
      count: tab.key === "all" ? links.length : links.filter((l) => l.category_slug === tab.key).length,
    }));
  }, [tabKeys, links]);

  // ── ⌘1-4: switch categories ──
  useEffect(() => {
    const handle = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 9 && digit <= tabKeys.length) {
        e.preventDefault();
        setActiveCategory(tabKeys[digit - 1].key);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [tabKeys]);

  const q = search.trim().toLowerCase();

  // ── Fuse.js fuzzy search ──
  const fuse = useMemo(
    () =>
      createFuse(links, [
        { name: "title", weight: 2 },
        { name: "description", weight: 1 },
        { name: "category_name", weight: 0.8 },
      ]),
    [links],
  );

  // ── Category filter + fuzzy search ──
  const filtered = useMemo(() => {
    let pool = activeCategory === "all" ? links : links.filter((l) => l.category_slug === activeCategory);
    if (q) {
      const raw = fuse.search(q);
      const fuzzyIds = new Set(raw.map((r) => r.item.id));
      pool = pool.filter((l) => fuzzyIds.has(l.id));
    }
    return pool;
  }, [links, activeCategory, search, fuse, q]);

  // ── Featured items (only in "all" view) ──
  const featured = useMemo(
    () =>
      activeCategory === "all" && !q
        ? filtered.filter((l) => l.featured || l.paid).sort((a) => (a.category_slug === "big-tech" ? 0 : 1))
        : [],
    [filtered, activeCategory, q],
  );

  const officialLinks = useMemo(() => filtered.filter((l) => l.category_slug === "big-tech"), [filtered]);
  const relayLinks = useMemo(() => filtered.filter((l) => l.category_slug === "free-relay"), [filtered]);

  // ── Model ranking fuzzy search ──
  const filteredRankings = useMemo(() => {
    if (!q) return modelRankings;
    const fuseR = createFuse(modelRankings, [
      { name: "model_name", weight: 2 },
      { name: "description", weight: 1 },
      { name: "source", weight: 0.5 },
    ]);
    return fuseR.search(q).map((r) => r.item);
  }, [modelRankings, q]);

  const showNonFeatured = (items: NavLink[]) =>
    activeCategory === "all" && !q ? items.filter((l) => !l.featured && !l.paid) : items;

  const linkSections = [
    { key: "big-tech", links: showNonFeatured(officialLinks), label: "官方 API", accent: "text-primary" },
    { key: "free-relay", links: showNonFeatured(relayLinks), label: "中转服务站", accent: "text-amber-600/70" },
  ];

  const showRankings =
    (activeCategory === "all" || activeCategory === "model-ranking") && filteredRankings.length > 0;
  const showLinks = activeCategory !== "model-ranking";

  // ── Flat results list for keyboard navigation ──
  const flatResults = useMemo(() => {
    const items: { type: "link"; link: NavLink }[] = [];
    if (showLinks) {
      if (featured.length > 0) featured.forEach((l) => items.push({ type: "link", link: l }));
      for (const section of linkSections) {
        if (section.links.length > 0 && (activeCategory === "all" || activeCategory === section.key)) {
          section.links.forEach((l) => items.push({ type: "link", link: l }));
        }
      }
    }
    return items;
  }, [showLinks, featured, linkSections, activeCategory]);

  const totalResults = flatResults.length + (showRankings ? filteredRankings.length : 0);
  const hasResults = totalResults > 0;

  // ── Keyboard navigation ──
  const resetFocus = useCallback(() => setFocusedIndex(-1), []);

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (flatResults.length > 0) {
            setFocusedIndex(0);
            resultsRef.current?.querySelector<HTMLElement>('[data-result-index="0"]')?.scrollIntoView({ block: "nearest" });
          }
          break;
        case "Escape":
          if (rawSearch) { setRawSearch(""); setSearch(""); }
          else inputRef.current?.blur();
          resetFocus();
          break;
      }
    },
    [flatResults.length, rawSearch, resetFocus],
  );

  const handleResultKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, index: number) => {
      const link = flatResults[index]?.link;
      if (!link) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (index < flatResults.length - 1) {
            setFocusedIndex(index + 1);
            resultsRef.current?.querySelector<HTMLElement>(`[data-result-index="${index + 1}"]`)?.scrollIntoView({ block: "nearest" });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0) {
            setFocusedIndex(index - 1);
            resultsRef.current?.querySelector<HTMLElement>(`[data-result-index="${index - 1}"]`)?.scrollIntoView({ block: "nearest" });
          } else {
            setFocusedIndex(-1);
            inputRef.current?.focus();
          }
          break;
        case "Enter":
          e.preventDefault();
          window.open(link.url, "_blank", "noopener,noreferrer");
          fetch("/api/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link.url }) }).catch(() => {});
          break;
      }
    },
    [flatResults],
  );

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { resetFocus(); }, [search, activeCategory, resetFocus]);

  useEffect(() => {
    if (announceRef.current && q) announceRef.current.textContent = `找到 ${totalResults} 个结果`;
  }, [totalResults, q]);

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* ─── Sidebar ─── */}
      <Sidebar
        tabs={tabCounts}
        activeKey={activeCategory}
        onSelect={setActiveCategory}
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* ─── Main content area ─── */}
      <div className="flex-1 min-w-0">
        <motion.div
          className="px-4 py-6 md:px-6 max-w-6xl mx-auto space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* ─── Search ─── */}
          <motion.div variants={slideDown}>
            <SearchBar
              value={rawSearch}
              onChange={setRawSearch}
              onKeyDown={handleSearchKeyDown}
              inputRef={inputRef}
            />
          </motion.div>

          {/* ─── Screen reader announce ─── */}
          <div ref={announceRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

          {/* ─── Results container ─── */}
          <div ref={resultsRef} className="space-y-6">
            {/* Featured */}
            {featured.length > 0 && (
              <motion.section variants={fadeInUp}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-primary/40" />
                  推荐
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {featured.map((link, i) => (
                    <div key={link.id}
                      data-result-index={i}
                      data-focused={focusedIndex === i ? "true" : undefined}
                      onMouseEnter={() => setFocusedIndex(i)}
                      onMouseLeave={() => setFocusedIndex(-1)}
                      onKeyDown={(e) => handleResultKeyDown(e, i)}
                      tabIndex={focusedIndex === i ? 0 : -1}
                      className="outline-none rounded-xl transition-all duration-150"
                    >
                      <LinkCard link={link} index={i} />
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Link sections */}
            {showLinks && linkSections.map((section) => {
              const sectionOffset = featured.length;
              return (
                section.links.length > 0 && (activeCategory === "all" || activeCategory === section.key) && (
                  <motion.section key={section.key} variants={fadeInUp}>
                    {activeCategory === "all" && (
                      <h2 className={`mb-3 text-xs font-medium uppercase tracking-widest ${section.accent} flex items-center gap-2`}>
                        <span className="inline-block w-4 h-px bg-current opacity-40" />
                        {section.label}
                        <span className="text-muted-foreground/40 font-normal">({section.links.length})</span>
                      </h2>
                    )}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {section.links.map((link, i) => {
                        const resultIndex = sectionOffset + i;
                        return (
                          <div key={link.id}
                            data-result-index={resultIndex}
                            data-focused={focusedIndex === resultIndex ? "true" : undefined}
                            onMouseEnter={() => setFocusedIndex(resultIndex)}
                            onMouseLeave={() => setFocusedIndex(-1)}
                            onKeyDown={(e) => handleResultKeyDown(e, resultIndex)}
                            tabIndex={focusedIndex === resultIndex ? 0 : -1}
                            className="outline-none rounded-xl transition-all duration-150"
                          >
                            <LinkCard link={link} index={resultIndex} />
                          </div>
                        );
                      })}
                    </div>
                  </motion.section>
                )
              );
            })}

            {/* Model rankings */}
            {showRankings && (
              <motion.section variants={fadeInUp}>
                {activeCategory === "all" && (
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-purple-600/70 flex items-center gap-2">
                    <span className="inline-block w-4 h-px bg-purple-400" />
                    模型排行榜
                  </h2>
                )}
                <ModelRanking data={filteredRankings} />
              </motion.section>
            )}
          </div>

          {/* Empty state */}
          {mounted && !hasResults && (
            <motion.div className="flex flex-col items-center gap-3 py-20 text-muted-foreground/40" variants={fadeInUp}>
              <span className="text-3xl" role="img" aria-hidden="true">🔍</span>
              <p className="text-sm">没有找到匹配的内容</p>
              <button onClick={() => { setRawSearch(""); setSearch(""); setActiveCategory("all"); inputRef.current?.focus(); }}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground/80 underline-offset-2 underline transition-colors">
                清除筛选
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Mobile bottom nav */}
        <MobileNav tabs={tabKeys} activeCategory={activeCategory} onSelect={setActiveCategory} />
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}