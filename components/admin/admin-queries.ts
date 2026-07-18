"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/client";
import type { Category } from "@/lib/types";

export type { AdminLinkFilters } from "@/lib/admin/contracts";

/** 管理后台 React Query key 的单一来源。 */
export const adminQueryKeys = {
  links: ["admin", "links"] as const,
  categories: ["admin", "categories"] as const,
  tags: ["admin", "tags"] as const,
};

/** 读取并缓存管理分类，服务端首屏数据作为稳定初值。 */
export function useAdminCategories(initialCategories: Category[]) {
  return useQuery<Category[], Error>({
    queryKey: adminQueryKeys.categories,
    // 跨前端 HTTP seam 只调用类型化 adapter，不在 hook 中感知 URL。
    queryFn: ({ signal }) => adminApi.categories.list(signal),
    initialData: initialCategories,
    staleTime: 5 * 60_000,
  });
}
