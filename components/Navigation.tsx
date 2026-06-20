"use client";

import { useState, useMemo } from "react";
import { type Category, type NavLink } from "@/lib/types";
import { motion } from "motion/react";
import { CategoryFilter } from "./CategoryFilter";
import { SearchBar } from "./SearchBar";
import { LinkCard } from "./LinkCard";
import { staggerContainer, fadeInUp, slideDown } from "@/lib/animations";

export function Navigation({
  categories,
  links,
}: {
  categories: Category[];
  links: NavLink[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = links;

    if (activeCategory !== "all") {
      result = result.filter((l) => l.category_slug === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.category_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [links, activeCategory, search]);

  const featured = filtered.filter((l) => l.featured || l.paid);
  const regular = filtered.filter((l) => !l.featured && !l.paid);

  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Search */}
      <motion.div variants={slideDown}>
        <SearchBar value={search} onChange={setSearch} />
      </motion.div>

      {/* Categories */}
      <motion.div variants={fadeInUp}>
        <CategoryFilter
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      </motion.div>

      {/* Results count */}
      <motion.p className="text-xs text-muted-foreground/40" variants={fadeInUp}>
        {filtered.length === 0
          ? "没有找到匹配的工具"
          : `${filtered.length} 个`}
      </motion.p>

      {/* Featured */}
      {featured.length > 0 && (
        <motion.section variants={fadeInUp}>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
            推荐
          </h2>
          <div className="grid gap-px bg-white/[0.06] rounded-lg border border-white/[0.06] overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((link, i) => (
              <LinkCard key={link.id} link={link} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Regular */}
      {regular.length > 0 && (
        <motion.section variants={fadeInUp}>
          {featured.length > 0 && (
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
              全部
            </h2>
          )}
          <div className="grid gap-px bg-white/[0.06] rounded-lg border border-white/[0.06] overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
            {regular.map((link, i) => (
              <LinkCard key={link.id} link={link} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          className="flex flex-col items-center gap-3 py-20 text-muted-foreground/40"
          variants={fadeInUp}
        >
          <span className="text-3xl">🔍</span>
          <p className="text-sm">没有找到匹配的工具</p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground/80 underline-offset-2 underline transition-colors"
          >
            清除筛选
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}