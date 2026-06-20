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
    <div className="flex flex-wrap gap-2">
      <motion.button
        layout
        onClick={() => onChange("all")}
        className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
          active === "all"
            ? "text-primary-foreground"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06]"
        }`}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        {active === "all" && (
          <motion.span
            layoutId="active-cat"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent/80"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10">全部</span>
      </motion.button>
      {categories.map((cat) => (
        <motion.button
          key={cat.slug}
          layout
          onClick={() => onChange(cat.slug)}
          className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
            active === cat.slug
              ? "text-primary-foreground"
              : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06]"
          }`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {active === cat.slug && (
            <motion.span
              layoutId="active-cat"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent/80"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            {cat.icon} {cat.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
