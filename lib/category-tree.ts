/**
 * 分类层级工具函数
 *
 * 从扁平的分类列表计算某分类的所有后代 slug
 * （用于选中父分类时聚合显示子分类的链接）。
 */

import type { Category } from "@/lib/types";

export const MAX_CATEGORY_TREE_DEPTH = 32;

/**
 * 获取某分类的所有后代 slug（包括自身）
 *
 * 用于选中父分类时聚合显示：filter links where category_slug IN descendantSlugs
 *
 * @param categories 扁平分类列表
 * @param slug 目标分类 slug
 * @returns 包含自身及所有后代 slug 的数组
 */
export function getDescendantSlugs(categories: Category[], slug: string): string[] {
  const visited = new Set<string>();

  const collect = (currentSlug: string, depth: number): string[] => {
    if (depth >= MAX_CATEGORY_TREE_DEPTH) return [];

    const target = categories.find((c) => c.slug === currentSlug);
    if (!target) return [currentSlug];
    if (visited.has(target.id)) return [];

    visited.add(target.id);
    const result: string[] = [currentSlug];
    const children = categories.filter((c) => c.parent_id === target.id);

    for (const child of children) {
      result.push(...collect(child.slug, depth + 1));
    }

    return result;
  };

  return collect(slug, 0);
}
