"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </SessionProvider>
  );
}
