"use client";

import { type KeyboardEvent, type RefObject } from "react";
import { ArrowDown, Compass, Layers3, Search, Sparkles } from "lucide-react";
import { SearchBar } from "./SearchBar";

interface HeroTab {
  key: string;
  label: string;
  count: number;
}

interface HomeHeroProps {
  totalLinks: number;
  categoryCount: number;
  featuredCount: number;
  topTabs: HeroTab[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  searchLoading: boolean;
  semanticSearch: boolean;
  onSemanticSearchChange: (value: boolean) => void;
  activeCategory: string;
  onCategorySelect: (key: string) => void;
}

export function HomeHero({
  totalLinks,
  categoryCount,
  featuredCount,
  topTabs,
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  inputRef,
  searchLoading,
  semanticSearch,
  onSemanticSearchChange,
  activeCategory,
  onCategorySelect,
}: HomeHeroProps) {
  return (
    <section className="nav-hero-bg relative isolate overflow-hidden px-4 pb-8 pt-8 md:px-8 md:pb-12">
      <div className="nav-hero-grain" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[76svh] max-w-[1480px] flex-col justify-between gap-10 py-8 md:min-h-[78svh] md:py-12">
        <div className="flex items-start justify-between gap-6">
          <div className="hidden max-w-[18rem] text-xs font-mono uppercase leading-relaxed text-white/70 md:block">
            Curated atlas for builders working across AI, cloud, design, open source, and operations.
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-mono uppercase text-white/80 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />
            Hybrid search
          </div>
        </div>

        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-8">
            <div className="space-y-2 text-white">
              <p className="flex items-center gap-2 text-xs font-mono uppercase text-white/70">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                Nav Atlas
              </p>
              <h1 className="nav-display max-w-6xl text-6xl leading-[0.96] text-white sm:text-7xl md:text-8xl lg:text-9xl">
                Find the
                <span className="block pl-[12%] italic text-white/90">signal.</span>
                <span className="block text-right text-white/95">In the tool wild.</span>
              </h1>
            </div>

            <div className="grid max-w-5xl gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
                inputRef={inputRef}
                loading={searchLoading}
                semantic={semanticSearch}
                onSemanticChange={onSemanticSearchChange}
                placeholder="Search tools, categories, tags..."
                variant="hero"
              />
              <a
                href="#atlas"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:border-emerald-200/50 hover:bg-white/15 focus-visible:outline-white"
              >
                Explore atlas
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <aside className="nav-glass space-y-5 p-4 text-white md:p-5" aria-label="Atlas summary">
            <div className="grid grid-cols-3 gap-3">
              <Metric value={totalLinks} label="tools" />
              <Metric value={categoryCount} label="groups" />
              <Metric value={featuredCount} label="picked" />
            </div>
            <p className="text-sm leading-6 text-white/72">
              A quieter surface for finding useful services without scanning a noisy link wall.
            </p>
            <div className="flex flex-wrap gap-2">
              {topTabs.slice(0, 5).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onCategorySelect(activeCategory === tab.key ? "all" : tab.key)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-mono uppercase transition ${
                    activeCategory === tab.key
                      ? "border-emerald-200/60 bg-emerald-200/15 text-emerald-50"
                      : "border-white/15 bg-white/[0.06] text-white/72 hover:border-white/35 hover:text-white"
                  }`}
                  aria-pressed={activeCategory === tab.key}
                >
                  <Layers3 className="h-3 w-3" aria-hidden="true" />
                  {tab.label}
                  <span className="tabular-nums text-white/45">{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-mono uppercase text-white/58">
              <span>Cmd / Ctrl + K</span>
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </aside>
        </div>

        <div className="grid gap-4 text-xs font-mono uppercase leading-relaxed text-white/60 md:grid-cols-[180px_minmax(0,1fr)_260px]">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur">
            Curated daily
          </div>
          <div className="hidden md:block" />
          <p>
            Search first. Browse second. Keep what matters close enough to act on.
          </p>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <div className="text-2xl font-semibold tabular-nums text-white">{value}</div>
      <div className="text-xs font-mono uppercase text-white/55">{label}</div>
    </div>
  );
}
