"use client";

import { useState, useMemo } from "react";
import { type Category, type NavLink } from "@/lib/types";
import { CategoryFilter } from "./CategoryFilter";
import { SearchBar } from "./SearchBar";
import { LinkCard } from "./LinkCard";

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
    <div className="space-y-6">
      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Categories */}
      <CategoryFilter
        categories={categories}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length === 0
          ? "没有找到匹配的工具"
          : `共 ${filtered.length} 个工具`}
      </p>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            ⭐ 推荐
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        </section>
      )}

      {/* Regular */}
      {regular.length > 0 && (
        <section>
          {featured.length > 0 && (
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              全部工具
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regular.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <span className="text-4xl">🔍</span>
          <p>没有找到匹配的工具</p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="text-sm underline hover:text-foreground transition-colors"
          >
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}
