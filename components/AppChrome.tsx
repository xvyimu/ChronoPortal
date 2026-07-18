"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { Header } from "@/components/Header";
import { PanguSpacing } from "@/components/PanguSpacing";
import { Shell } from "@/components/Shell";

/** 判断路由是否使用独立壳（登录/管理后台），避免与页面内 main landmark 嵌套。 */
function usesStandaloneChrome(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/admin");
}

/**
 * 公开页提供 Header/Footer/收藏与 main 主内容区；
 * 登录与管理后台只透传 children，由各路由自己提供唯一 main landmark。
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (usesStandaloneChrome(pathname)) {
    return <>{children}</>;
  }

  return (
    <FavoritesProvider>
      <PanguSpacing />
      <Shell>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </Shell>
      <Footer />
    </FavoritesProvider>
  );
}
