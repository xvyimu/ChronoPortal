"use client";

import { getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  tabs: { key: string; label: string }[];
  activeCategory: string;
  onSelect: (key: string) => void;
}

export function MobileNav({ tabs, activeCategory, onSelect }: MobileNavProps) {
  return (
    <nav
      className="cp-chrome-blur fixed inset-x-3 bottom-2 z-40 overflow-hidden rounded-md border border-[var(--paper-line)] bg-[var(--paper-surface)]/90 text-[var(--paper-ink)] shadow-[0_10px_30px_rgba(61,74,90,0.12)] [contain:layout_paint] md:hidden"
      role="tablist"
      aria-label="移动端导航分类"
    >
      <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#5f84b2]/45 to-transparent" />

      <div className="mx-auto flex w-full max-w-lg min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain px-2 py-0.5 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = getCategoryIcon(tab.key);
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              title={tab.label}
              className={cn(
                "relative flex min-w-[4.75rem] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-all duration-150",
                isActive
                  ? "bg-[var(--paper-accent-soft)] text-[var(--paper-accent)]"
                  : "text-[var(--paper-muted)] hover:bg-[var(--paper-accent-soft)] hover:text-[var(--paper-accent)]"
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span
                data-mobile-nav-label=""
                className="grid h-7 w-full place-items-center whitespace-normal break-words text-center text-[11px] font-medium leading-[0.85rem]"
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full bg-[var(--paper-accent)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="h-safe-area-bottom" />
    </nav>
  );
}
