"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarTab {
  key: string;
  label: string;
  count: number;
}

interface SidebarProps {
  tabs: SidebarTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ tabs, activeKey, onSelect, open, onClose }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handle = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  // Close on click outside (desktop)
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (open && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links: ReactNode = (
    <nav className="flex flex-col gap-1 px-3 py-2" aria-label="导航分类">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => {
            onSelect(tab.key);
            // close on mobile after selecting
            if (window.innerWidth < 768) onClose();
          }}
          className={`sidebar-link ${activeKey === tab.key ? "active" : ""}`}
          aria-current={activeKey === tab.key ? "page" : undefined}
        >
          <span>{tab.label}</span>
          {tab.count > 0 && <span className="sidebar-badge">{tab.count}</span>}
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar (slide-in) */}
      <AnimatePresence>
        {open && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-background md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="导航分类"
          >
            <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <span className="text-lg text-primary">⬡</span>
                公益API导航站
              </span>
              <button
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors text-sm"
                aria-label="关闭侧边栏"
              >
                ✕
              </button>
            </div>
            {links}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-border/50 bg-background/80 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
        <div className="px-4 py-4">
          {links}
        </div>
      </aside>
    </>
  );
}