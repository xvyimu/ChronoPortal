"use client";

import { type Category } from "@/lib/types";

interface MobileNavProps {
  tabs: { key: string; label: string }[];
  activeCategory: string;
  onSelect: (key: string) => void;
}

const sectionIcons: Record<string, string> = {
  all: "◈",
  "big-tech": "◎",
  "free-relay": "◉",
  "model-ranking": "◆",
};

export function MobileNav({ tabs, activeCategory, onSelect }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="tablist"
      aria-label="导航分类（移动端）"
    >
      {/* 顶部光晕 */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        {tabs.slice(0, 4).map((tab) => {
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              role="tab"
              aria-selected={isActive}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all duration-150 min-w-0 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/40 hover:text-muted-foreground/70"
              }`}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {sectionIcons[tab.key] || "○"}
              </span>
              <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* iOS safe area padding */}
      <div className="h-safe-area-bottom" />
    </nav>
  );
}
