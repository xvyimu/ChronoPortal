import type { NavLink } from "@/lib/types";

export class MissingDatabaseMigrationError extends Error {
  constructor(feature: string, options?: { cause?: unknown }) {
    super(`${feature} database objects are missing`, options);
    this.name = "MissingDatabaseMigrationError";
  }
}

export function isMissingRelationError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table|relation .* does not exist/i.test(error.message ?? "")
  );
}

export interface RawLinkRow {
  nav_categories?: { name: string; slug: string } | null;
  updated_at?: string | null;
  created_at: string;
  [key: string]: unknown;
}

/** 将 Supabase 返回的链接行映射为 NavLink（含分类名） */
export function mapLinkRow(l: RawLinkRow): NavLink {
  return {
    ...(l as unknown as NavLink),
    category_name: l.nav_categories?.name,
    category_slug: l.nav_categories?.slug,
    updated_at: l.updated_at ?? l.created_at,
    tags: (l as unknown as NavLink).tags ?? [],
  };
}
