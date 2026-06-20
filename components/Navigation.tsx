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

  // Group: featured first, then regular
  const featured = filtered.filter((l) => l.featured || l.paid);
  const regular = filtered.filter((l) => !l.featured && !l.paid);

  return (
    <motion.div
      className="space-y-6"
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
      <motion.p
        className="text-sm text-muted-foreground/60"
        variants={fadeInUp}
      >
        {filtered.length === 0
          ? "没有找到匹配的工具"
          : `共 ${filtered.length} 个工具`}
      </motion.p>

      {/* Featured */}
      {featured.length > 0 && (
        <motion.section variants={fadeInUp}>
          <h2 className="mb-3 text-sm font-medium text-primary/70 flex items-center gap-1.5">
            <span className="inline-block w-1 h-3 rounded-full bg-primary/50" />
            ⭐ 推荐
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="mb-3 text-sm font-medium text-muted-foreground/50 flex items-center gap-1.5">
              <span className="inline-block w-1 h-3 rounded-full bg-muted-foreground/30" />
              全部工具
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regular.map((link, i) => (
              <LinkCard key={link.id} link={link} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          className="flex flex-col items-center gap-2 py-16 text-muted-foreground/50"
          variants={fadeInUp}
        >
          <span className="text-4xl">🔍</span>
          <p>没有找到匹配的工具</p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="text-sm text-primary/60 hover:text-primary underline-offset-2 hover:underline transition-colors"
          >
            清除筛选
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}