"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/client";
import type { AdminLinksPage } from "@/lib/admin/contracts";
import {
  type AdminLinkFilters,
  adminQueryKeys,
} from "@/components/admin/admin-queries";

/** 判断当前筛选是否可安全复用服务端首屏分页。 */
function isInitialFilter(filters: AdminLinkFilters): boolean {
  return (
    filters.page === 1 &&
    filters.query === "" &&
    filters.category === "all" &&
    filters.status === "all"
  );
}

/** 读取管理链接分页，并在筛选切换时保留上一页避免布局闪烁。 */
export function useAdminLinks(
  initialPage: AdminLinksPage,
  filters: AdminLinkFilters
) {
  return useQuery<AdminLinksPage, Error>({
    queryKey: [...adminQueryKeys.links, filters],
    // 通过浏览器 adapter 隐藏 URL、HTTP method 与响应解析。
    queryFn: ({ signal }) => adminApi.links.list(filters, signal),
    initialData: isInitialFilter(filters) ? initialPage : undefined,
    placeholderData: keepPreviousData,
  });
}
