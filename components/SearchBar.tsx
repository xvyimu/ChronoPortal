"use client";

import { motion } from "motion/react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        placeholder="搜索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-8 text-sm text-foreground/80 placeholder:text-muted-foreground/30 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.04]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}