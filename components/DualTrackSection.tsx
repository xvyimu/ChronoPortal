import { type KeyboardEvent } from "react";
import { Flame } from "lucide-react";
import { type NavLink } from "@/lib/types";
import { ResultGrid } from "./ResultGrid";

interface DualTrackSectionProps {
  featured: NavLink[];
  latest: NavLink[];
  popular: NavLink[];
  featuredOffset: number;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>, index: number) => void;
  searchQuery?: string;
  onPreview?: (link: NavLink) => void;
  /** 与分类区共享的首屏挂载配额（featured/latest/popular 依次消耗） */
  initialVisibleByTrack?: {
    featured: number;
    latest: number;
    popular: number;
  };
}

export function DualTrackSection({
  featured,
  latest,
  popular,
  featuredOffset,
  focusedIndex,
  onFocusChange,
  onKeyDown,
  searchQuery = "",
  onPreview,
  initialVisibleByTrack,
}: DualTrackSectionProps) {
  return (
    <>
      {featured.length > 0 && (
        <section>
          <h2 className="atlas-section-label text-[var(--paper-accent)]">推荐</h2>
          <ResultGrid
            links={featured}
            baseIndex={featuredOffset}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
            onPreview={onPreview}
            initialVisible={initialVisibleByTrack?.featured}
          />
        </section>
      )}

      {latest.length > 0 && (
        <section>
          <h2 className="atlas-section-label text-[var(--paper-muted)]">最新添加</h2>
          <ResultGrid
            links={latest}
            baseIndex={featuredOffset + featured.length}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
            onPreview={onPreview}
            initialVisible={initialVisibleByTrack?.latest}
          />
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <h2 className="atlas-section-label text-[var(--paper-muted)]">
            <Flame className="h-3.5 w-3.5 text-[#b58157]" />
            热门访问
          </h2>
          <ResultGrid
            links={popular}
            baseIndex={featuredOffset + featured.length + latest.length}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
            onPreview={onPreview}
            initialVisible={initialVisibleByTrack?.popular}
          />
        </section>
      )}
    </>
  );
}
