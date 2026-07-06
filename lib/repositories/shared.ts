import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { NavLink } from "@/lib/types";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type SupabaseAdminClient = ReturnType<typeof createServiceRoleClient>;
export type SupabaseDataClient = SupabaseServerClient | SupabaseAdminClient;

export interface RepositoryQueryOptions {
  client?: SupabaseServerClient;
  signal?: AbortSignal;
}

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

export function createAdminClient(): SupabaseAdminClient {
  return createServiceRoleClient();
}

function isClientOption(input: unknown): input is SupabaseServerClient {
  return typeof input === "object" && input !== null && "from" in input;
}

export function resolveQueryOptions(
  input?: SupabaseServerClient | RepositoryQueryOptions
): RepositoryQueryOptions {
  if (isClientOption(input)) return { client: input };
  return input ?? {};
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
