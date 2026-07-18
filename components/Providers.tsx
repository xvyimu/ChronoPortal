"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * 根级客户端 Provider：公开页挂 SessionProvider；
 * 登录/管理后台跳过 SessionProvider，避免与独立壳重复会话订阅。
 */
export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandaloneRoute = pathname === "/login" || pathname.startsWith("/admin");

  if (isStandaloneRoute) {
    return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>;
  }

  return (
    <SessionProvider>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </SessionProvider>
  );
}
