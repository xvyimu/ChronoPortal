"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ variant = "default" }: { variant?: "default" | "cinematic" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isCinematic = variant === "cinematic";

  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect

  if (!mounted) {
    return (
      <div
        className={`h-8 w-8 animate-pulse ${
          isCinematic ? "rounded-full bg-[var(--paper-surface-soft)]" : "rounded-md bg-muted/30"
        }`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={
        isCinematic
          ? "inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--paper-muted)] transition-colors hover:bg-[var(--paper-accent-soft)] hover:text-[var(--paper-accent)]"
          : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
      }
      aria-label="切换主题"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
