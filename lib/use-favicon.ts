"use client";

import { useEffect, useState } from "react";

/**
 * useFavicon — 域名 favicon 加载（带兜底链）
 *
 * 抽自 LinkCard.tsx 原内联逻辑。加载顺序：
 *   1. /api/favicon?domain=xxx&v=2  （服务端代理 + 多源尝试，见 app/api/favicon/route.ts）
 *   2. https://www.google.com/s2/favicons?domain=xxx&sz=64  （客户端兜底）
 *   3. null → 调用方渲染 Globe 占位图标
 *
 * 使用 Image 对象预加载以避免渲染抖动；域名变化时取消上一次请求。
 *
 * @param domain 由 extractDomain() 提取的主域名，传 null 时直接返回 null
 */
export function useFavicon(domain: string | null): string | null {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;

    let cancelled = false;
    const proxyUrl = `/api/favicon?domain=${encodeURIComponent(domain)}&v=2`;

    const primary = new Image();
    primary.onload = () => {
      if (!cancelled) setFaviconUrl(proxyUrl);
    };
    primary.onerror = () => {
      if (cancelled) return;
      // 客户端兜底：Google s2 favicon 服务
      const fallbackUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      const secondary = new Image();
      secondary.onload = () => {
        if (!cancelled) setFaviconUrl(fallbackUrl);
      };
      secondary.src = fallbackUrl;
    };
    primary.src = proxyUrl;

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return faviconUrl;
}
