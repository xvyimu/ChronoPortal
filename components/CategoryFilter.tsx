"use client";

import { type Category } from "@/lib/types";
import { motion } from "motion/react";

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
    <div className="flex flex-wrap gap-1.5">
      <motion.button
        layout
        onClick={() => onChange("all")}
        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          active === "all"
            ? "bg-foreground/[0.08] text-foreground/80"
            : "text-muted-foreground/50 hover:text-foreground/70"
        }`}
        whileTap={{ scale: 0.97 }}
      >
        全部
      </motion.button>
      {categories.map((cat) => (
        <motion.button
          key={cat.slug}
          layout
          onClick={() => onChange(cat.slug)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            active === cat.slug
              ? "bg-foreground/[0.08] text-foreground/80"
              : "text-muted-foreground/50 hover:text-foreground/70"
          }`}
          whileTap={{ scale: 0.97 }}
        >
          {cat.icon} {cat.name}
        </motion.button>
      ))}
    </div>
  );
}