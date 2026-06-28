"use client";

import { type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { fadeInUp } from "@/lib/animations";
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
}: DualTrackSectionProps) {
  return (
    <>
      {featured.length > 0 && (
        <motion.section variants={fadeInUp}>
          <h2 className="atlas-section-label text-emerald-100">推荐</h2>
          <ResultGrid
            links={featured}
            baseIndex={featuredOffset}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
          />
        </motion.section>
      )}

      {latest.length > 0 && (
        <motion.section variants={fadeInUp}>
          <h2 className="atlas-section-label text-white/68">最新添加</h2>
          <ResultGrid
            links={latest}
            baseIndex={featuredOffset + featured.length}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
          />
        </motion.section>
      )}

      {popular.length > 0 && (
        <motion.section variants={fadeInUp}>
          <h2 className="atlas-section-label text-white/68">
            <Flame className="h-3.5 w-3.5 text-amber-200/80" />
            热门访问
          </h2>
          <ResultGrid
            links={popular}
            baseIndex={featuredOffset + featured.length + latest.length}
            focusedIndex={focusedIndex}
            onFocusChange={onFocusChange}
            onKeyDown={onKeyDown}
            searchQuery={searchQuery}
          />
        </motion.section>
      )}
    </>
  );
}
