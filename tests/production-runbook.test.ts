import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** 读取仓库文档，供发布 contract 测试复用。 */
function readDoc(fileName: string) {
  return readFileSync(join(process.cwd(), "docs", fileName), "utf8");
}

/** 读取数据库或运维脚本，供静态安全断言复用。 */
function readScript(fileName: string) {
  return readFileSync(join(process.cwd(), "scripts", fileName), "utf8");
}

/** 按仓库相对路径读取任意项目文件。 */
function readProjectFile(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

describe("production runbook", () => {
  it("keeps the public API docs aligned with the Vercel domain and route contracts", () => {
    const apiDocs = readProjectFile("app", "api-docs", "page.tsx");

    expect(apiDocs).toContain("https://yuanjia1314.ccwu.cc/api/tools");
    expect(apiDocs).toContain("/api/reviews?link_id=uuid");
    expect(apiDocs).toContain("每 IP 每分钟 60 次");
    expect(apiDocs).toContain('"tools": [');
    expect(apiDocs).not.toContain("nav-site.netlify.app");
    expect(apiDocs).not.toContain("— 无限制");
  });

  it("keeps launch checklist linked to the production runbook", () => {
    const checklist = readDoc("LAUNCH-CHECKLIST.md");

    expect(checklist).toContain("[生产运行手册](./PRODUCTION-RUNBOOK.md)");
    expect(checklist).toContain("checks.resourceLibrarySearch.status");
  });

  it("documents the Vercel production and emergency Netlify contracts", () => {
    const runbook = readDoc("PRODUCTION-RUNBOOK.md");
    const checklist = readDoc("LAUNCH-CHECKLIST.md");

    expect(runbook).toContain("当前生产 = Vercel");
    expect(runbook).toContain("Netlify account credit");
    expect(runbook).toContain("resourceLibrarySearch");
    expect(runbook).toContain("resource_search_health");
    expect(runbook).toContain("不要在 handoff、日志、commit message、README 中写入任何 secret");
    expect(checklist).toContain("Vercel 主轨");
    expect(checklist).toContain("ALLOW_NETLIFY_MIRROR=1");
    expect(checklist).toContain("[Emergency] Netlify mirror");
    expect(checklist).toContain("https://yuanjia1314.ccwu.cc");
  });

  it("documents the Cloudflare 1024-d embedding cutover contract", () => {
    const runbook = readDoc("PRODUCTION-RUNBOOK.md");

    expect(runbook).toContain("EMBED_PROVIDER=cloudflare");
    expect(runbook).toContain("EMBED_SEMANTIC_RPC=search_links_semantic_v2");
    expect(runbook).toContain("batch_update_embeddings_v2");
    expect(runbook).toContain("--provider cloudflare");
    expect(runbook).toContain("--require-embedding");
  });
});

describe("S0 audit migration", () => {
  it("contains the 1024-d pgvector objects required by the Cloudflare cutover", () => {
    const migration = readScript("migration-audit-s0-constraints.sql");

    expect(migration).toContain("embedding_1024 vector(1024)");
    expect(migration).toContain("idx_nav_links_embedding_1024");
    expect(migration).toContain("search_links_semantic_v2");
    expect(migration).toContain("query_embedding vector(1024)");
    expect(migration).toContain("batch_update_embeddings_v2");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ");
    expect(migration).toContain("DROP FUNCTION IF EXISTS batch_update_embeddings(jsonb)");
    expect(migration).toContain("SET search_path = public, extensions");
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION batch_update_embeddings_v2(jsonb) FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION batch_update_embeddings_v2(jsonb) TO service_role");
    expect(migration).toContain("USING hnsw (embedding_1024 vector_cosine_ops)");
    expect(migration).not.toContain("USING ivfflat (embedding_1024 vector_cosine_ops)");
  });

  it("contains the filtered public tools RPC with explicit grants", () => {
    const migration = readScript("migration-audit-s0-constraints.sql");

    expect(migration).toContain("FUNCTION list_public_tools(");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("COUNT(*) OVER() AS total_count");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION list_public_tools(TEXT, UUID[], TEXT, INTEGER) TO anon, authenticated, service_role"
    );
  });

  it("ships an explicit rollback script for all added objects", () => {
    const rollback = readScript("migration-audit-s0-constraints.rollback.sql");

    expect(rollback).toContain("DROP FUNCTION IF EXISTS list_public_tools");
    expect(rollback).toContain("DROP FUNCTION IF EXISTS consume_rate_limit");
    expect(rollback).toContain("DROP INDEX IF EXISTS idx_nav_links_embedding_1024");
    expect(rollback).toContain("BEGIN;");
    expect(rollback).toContain("COMMIT;");
  });
});

describe("admin link and tag transaction migration", () => {
  it("keeps link fields and tag associations in service-role-only RPC transactions", () => {
    const migration = readScript("migration-admin-link-tags-transaction.sql");

    expect(migration).toContain("FUNCTION public.create_nav_link_with_tags(");
    expect(migration).toContain("FUNCTION public.update_nav_link_with_tags(");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("SET search_path = public, pg_temp");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.create_nav_link_with_tags");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.update_nav_link_with_tags");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.create_nav_link_with_tags");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.update_nav_link_with_tags");
    expect(migration).toContain("TO service_role");
  });

  it("ships an explicit rollback for both transaction RPCs", () => {
    const rollback = readScript("migration-admin-link-tags-transaction.rollback.sql");

    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.create_nav_link_with_tags");
    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.update_nav_link_with_tags");
    expect(rollback).toContain("BEGIN;");
    expect(rollback).toContain("COMMIT;");
  });
});

describe("category hierarchy cycle guard migration", () => {
  it("rejects existing and concurrent category-parent cycles before writes commit", () => {
    const migration = readScript("migration-nav-category-cycle-guard.sql");

    expect(migration).toContain("Category hierarchy contains a cycle");
    expect(migration).toContain("nav_categories_parent_not_self");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("FUNCTION public.prevent_nav_category_cycle()");
    expect(migration).toContain("CREATE TRIGGER prevent_nav_category_cycle");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.prevent_nav_category_cycle()");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.prevent_nav_category_cycle() TO service_role");
  });

  it("ships a rollback that removes the category cycle guard objects", () => {
    const rollback = readScript("migration-nav-category-cycle-guard.rollback.sql");

    expect(rollback).toContain("DROP TRIGGER IF EXISTS prevent_nav_category_cycle");
    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.prevent_nav_category_cycle()");
    expect(rollback).toContain("DROP CONSTRAINT IF EXISTS nav_categories_parent_not_self");
  });
});

describe("release migration safety", () => {
  it("keeps tag seeds idempotent across both unique constraints", () => {
    const migration = readScript("migration-tags.sql");

    expect(migration).toContain("ON CONFLICT DO NOTHING");
    expect(migration).not.toContain("ON CONFLICT (name) DO NOTHING");
  });

  it("discovers attempt-table sequences instead of assuming generated names", () => {
    const migration = readScript("migration-rate-limit-runtime.sql");

    expect(migration).toContain("pg_get_serial_sequence");
    expect(migration).not.toContain("public.login_attempts_id_seq");
    expect(migration).not.toContain("public.submit_attempts_id_seq");
  });

  it("preserves the rate-limit RPC signature during application rollback", () => {
    const rollback = readScript("migration-nav-runtime.rollback.sql");

    expect(rollback).toContain(
      "CREATE OR REPLACE FUNCTION public.consume_rate_limit("
    );
    expect(rollback).not.toContain(
      "DROP FUNCTION IF EXISTS public.consume_rate_limit"
    );
    expect(rollback).toContain("GRANT EXECUTE ON FUNCTION public.consume_rate_limit");
  });
});
