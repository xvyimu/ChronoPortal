"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useShell } from "@/components/Shell";

export function Header() {
  const { toggleSidebar } = useShell();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* 玻璃底部光晕 */}
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Hamburger button (mobile only) */}
          <button
            onClick={toggleSidebar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors md:hidden"
            aria-label="打开导航菜单"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 font-medium text-foreground/80">
            <span className="text-lg text-primary">⬡</span>
            <span className="text-sm">公益API导航站</span>
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/submit"
            className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
          >
            提交
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
          >
            管理
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}