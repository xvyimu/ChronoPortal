"use client";

import { useEffect, useState } from "react";

/**
 * useFavicon — 域名 favicon 加载（带兜底链 + 进程内去重）
 *
 * 抽自 LinkCard.tsx 原内联逻辑。加载顺序：
 *   1. /api/favicon?domain=xxx&v=2  （服务端代理 + 多源尝试，见 app/api/favicon/route.ts）
 *   2. https://www.google.com/s2/favicons?domain=xxx&sz=64  （客户端兜底）
 *   3. null → 调用方渲染 Globe 占位图标
 *
 * 同一 domain 在页面生命周期内只发一次主请求（模块级 Map）。
 *
 * @param domain 由 extractDomain() 提取的主域名，传 null 时直接返回 null
 */

const faviconCache = new Map<string, string | null>();
const faviconInflight = new Map<string, Promise<string | null>>();

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function resolveFavicon(domain: string): Promise<string | null> {
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain) ?? null;
  }

  const existing = faviconInflight.get(domain);
  if (existing) return existing;

  const task = (async () => {
    const proxyUrl = `/api/favicon?domain=${encodeURIComponent(domain)}&v=2`;
    if (await loadImage(proxyUrl)) {
      faviconCache.set(domain, proxyUrl);
      return proxyUrl;
    }

    const fallbackUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    if (await loadImage(fallbackUrl)) {
      faviconCache.set(domain, fallbackUrl);
      return fallbackUrl;
    }

    faviconCache.set(domain, null);
    return null;
  })().finally(() => {
    faviconInflight.delete(domain);
  });

  faviconInflight.set(domain, task);
  return task;
}

export function useFavicon(domain: string | null): string | null {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(() =>
    domain && faviconCache.has(domain) ? (faviconCache.get(domain) ?? null) : null
  );

  useEffect(() => {
    if (!domain) {
      setFaviconUrl(null);
      return;
    }

    if (faviconCache.has(domain)) {
      setFaviconUrl(faviconCache.get(domain) ?? null);
      return;
    }

    let cancelled = false;
    resolveFavicon(domain).then((url) => {
      if (!cancelled) setFaviconUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return faviconUrl;
}
