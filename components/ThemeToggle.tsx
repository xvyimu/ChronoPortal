"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ThemeToggle({ variant = "default" }: { variant?: "default" | "cinematic" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isCinematic = variant === "cinematic";

  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect

  if (!mounted) {
    return (
      <Skeleton
        className={`h-8 w-8 ${isCinematic ? "rounded-full bg-[var(--paper-surface-soft)]" : "rounded-md"}`}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={
        isCinematic
          ? "text-[var(--paper-muted)]"
          : "text-muted-foreground/50 hover:bg-muted hover:text-foreground"
      }
      aria-label="切换主题"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
