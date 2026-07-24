import { revalidatePath } from "next/cache";

/**
 * Admin 导航内容写后的失效原因。
 * 决定扫哪些公开 ISR 路径，避免「一律 home+sitemap」的多余 path 扫。
 */
export type PublicNavRevalidateReason = "link" | "category" | "tag";

export type RevalidatePublicNavOptions = {
  /** 变更类型；缺省按 link（最宽：home+sitemap，有 slug 再加详情） */
  reason?: PublicNavRevalidateReason;
  /** 工具详情 slug；仅 reason=link 且有值时失效 /tool/:slug */
  slug?: string | null;
  /**
   * 是否失效首页。默认 true。
   * 仅在明确不需要刷列表时设 false（极少用）。
   */
  includeHome?: boolean;
};

/**
 * 按 reason 推导应失效的公开 path 列表（纯函数，便于契约测）。
 *
 * 矩阵：
 * | reason   | / | /tool/:slug | /sitemap.xml |
 * | link     | ✓ | slug 时 ✓  | ✓            |
 * | category | ✓ | —          | ✓            |
 * | tag      | ✓ | —          | —            |  tags 不进 sitemap
 *
 * 不使用 revalidateTag：公开页当前仅为 path ISR（revalidate=N），
 * 无 unstable_cache/tag 契约；乱扩 tag 面无收益。
 */
export function resolvePublicNavRevalidatePaths(
  options?: RevalidatePublicNavOptions
): string[] {
  const reason: PublicNavRevalidateReason = options?.reason ?? "link";
  const includeHome = options?.includeHome !== false;
  const paths: string[] = [];

  if (includeHome) {
    paths.push("/");
  }

  if (reason === "link") {
    const slug = options?.slug?.trim();
    if (slug) {
      paths.push(`/tool/${slug}`);
    }
  }

  // sitemap 含工具详情与 ?cat= 分类入口；纯标签 CRUD 不改变 sitemap URL 集合
  if (reason === "link" || reason === "category") {
    paths.push("/sitemap.xml");
  }

  return paths;
}

/**
 * 管理端导航内容写成功后，主动失效公开 ISR 页面，避免干等 revalidate=60/3600。
 * 仅路径级 revalidatePath；范围由 {@link resolvePublicNavRevalidatePaths} 决定。
 */
export function revalidatePublicNavContent(
  options?: RevalidatePublicNavOptions
): void {
  for (const path of resolvePublicNavRevalidatePaths(options)) {
    revalidatePath(path);
  }
}
