"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Adapted from React Bits FadeContent, copyright (c) 2026 David Haz.
/** 管理后台内容入场淡入；尊重 prefers-reduced-motion。 */
export function FadeContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = element.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }
    );

    return () => animation.cancel();
  }, []);

  return <div ref={ref} className={cn(className)}>{children}</div>;
}
