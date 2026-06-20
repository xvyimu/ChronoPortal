"use client";

import { type Category } from "@/lib/types";

export function CategoryFilter({
  categories,
  active,
  onChange,
}: {
  categories: Category[];
  active: string;
  onChange: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          active === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onChange(cat.slug)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === cat.slug
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}
