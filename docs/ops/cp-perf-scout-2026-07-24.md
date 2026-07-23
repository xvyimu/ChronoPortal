# ChronoPortal · Phase 0 性能/架构只读测绘 · 2026-07-24

> **Worktree / 分支：** `xvyimu/cp-perf-scout`  
> **角色：** 只读 scout · **不实现优化** · **不改业务行为** · **不 push**  
> **真路径：** `D:\ChronoPortal`（本 wt 检出）· 生产只读对照：https://yuanjia1314.ccwu.cc  
> **互指：** 工作区根 [`findings.md`](../../findings.md)（摘要 + 结构化债表）

---

## 0. 一句话

| 项 | 结果 |
|----|------|
| 栈 SSOT | `docs/PROJECT.md` · Next 16 App Router + **webpack 硬锁** · Supabase/RLS · Auth.js v5 · Fuse+pgvector |
| 前台数据 | 首页 ISR `revalidate=60` · `getCategories`+`getApprovedLinks` 并行 · 服务端预计算 nav 派生数据 |
| Admin | `proxy.ts` 鉴权门 + `admin/layout` 二次 `auth()` + 各 page 再 `auth()` · API `withAdmin*` |
| 搜索 | `/api/search` → `executeSearch` · Fuse 池 60s 内存 · 语义：embed + service_role RPC |
| revalidate | **仅 `revalidatePath`**（`/`、`/tool/[slug]`、`/sitemap.xml`）· **无 `revalidateTag`** |
| 门闩 | `pnpm typecheck` **exit 2** · `pnpm test` **exit 0**（614 pass / 6 skip） |
| 本轮 | 只写 docs · 无行为改动 · 无 push |

---

## 1. 前台 vs Admin · 路由与数据入口

### 1.1 目录 / layout 边界

| 层 | 路径 | 职责 |
|----|------|------|
| Root layout | `app/layout.tsx` | Theme / WebVitals / Providers / AppChrome / Analytics / dynamic Shortcut+Toaster · CSP nonce via `getCspNonce()` |
| Public shell | `components/AppChrome` + `Providers` | 前台 chrome；`/login` 与 `/admin*` **跳过** `SessionProvider`（`components/Providers.tsx`） |
| Admin layout | `app/admin/layout.tsx` | `await auth()` · `role!==admin` → `/login` · `AdminQueryProvider` · 独立侧栏壳 |
| Edge/proxy | `proxy.ts`（Next 16 proxy 入口） | Admin/API-admin/login **session 门**；可选 `CSP_DYNAMIC` nonce CSP |

### 1.2 前台页面入口（数据）

| 路由 | 文件 | 数据入口 | 缓存 |
|------|------|----------|------|
| `/` | `app/page.tsx` | `getCategories` + `getApprovedLinks`（15s AbortSignal 降级空）→ `lib/nav-derived-data` 预计算 | `export const revalidate = 60` |
| `/tool/[slug]` | `app/tool/[slug]/page.tsx` | `getApprovedLinkBySlug` · `getRelatedLinks` · `getCategories` | `revalidate = 60` · `generateStaticParams=[]`（按需 ISR） |
| `/resources` | `app/resources/page.tsx` | `browseResources`（resource-library） | `revalidate = 300` |
| `/resources/[id]` | `app/resources/[id]/page.tsx` | resource 详情 | （见文件） |
| `/favorites` | `app/favorites/page.tsx` | 客户端 `FavoritesView` | `revalidate = 0` |
| `/submit` · `/about` · `/api-docs` · `/login` | 各 `page.tsx` | 表单/静态/Auth 登录 | 按页 |

### 1.3 Admin 页面入口

| 路由 | 文件 | 数据 |
|------|------|------|
| `/admin` | `app/admin/page.tsx` | **再** `auth()` · `getAdminLinksPage` + `getAllCategoriesForAdmin` → `AdminWorkspace` |
| `/admin/categories` | `app/admin/categories/page.tsx` | **再** `auth()` · `getAllCategoriesForAdmin` → `CategoryManager` |
| `/admin/link-health` | `app/admin/link-health/page.tsx` | **再** `auth()` · 客户端 `LinkHealthPanel` 拉 API |

### 1.4 关键 API 入口（非穷尽）

| 前缀 | 代表 | 边界 |
|------|------|------|
| 公开搜索 | `GET /api/search` | 限流 → Zod → `executeSearch` · `force-dynamic` · no-store |
| 资源库搜索 | `GET /api/resource-search` | 独立 FTS/vector/hybrid · 512-d embed 路径 |
| Admin CRUD | `/api/admin/{links,categories,tags,link-health}` | `withAdminGet/Write/Delete` · repository domain |
| 观测 | `POST /api/web-vitals` · `POST /api/csp-report` | Sentry + 采样 + 分布式限流 |
| Auth | `/api/auth/[...nextauth]` | Auth.js v5 handlers |
| 其它 | favorites / reviews / click / submit / favicon / tools / health / ga | 各自 rate-limit / origin 策略 |

**数据写路径纪律（ADR-003/006）：** 页面与 Route Handler 经 `@/lib/repositories` facade → `lib/repositories/*` domain modules；禁止 Route 直连业务表（service_role 仅 repository/语义层）。

---

## 2. webpack 固定点（禁止默默切换 bundler）

摘自 `package.json` scripts：

```json
"dev": "next dev -p 3264 --webpack",
"build": "node scripts/write-build-info.mjs && next build --webpack",
"start": "next start",
"typecheck": "tsc --noEmit --incremental false",
"test": "vitest run",
"analyze": "node scripts/analyze.mjs"
```

`next.config.ts` 注释（NTFS reparse / Turbopack 不可用）：

- Turbopack **禁用原因**：`node_modules` 顶层 pnpm junction reparse 导致 Turbopack 无法遍历。  
- **硬约束：** 任何 `dev`/`build` **必须**带 `--webpack`；禁止默默改默认 bundler 或去掉 flag。换 Turbopack 须单独验证门闩 + 改 `docs/PROJECT.md` ADR 后才可。

Sentry 包装：`withSentryConfig(nextConfig, …)` · bundleSizeOptimizations 排除 Replay 相关。

---

## 3. Supabase 查询热点 · revalidate · repository/domain

### 3.1 热点查询

| 热点 | 实现 | 客户端 | 备注 |
|------|------|--------|------|
| 全量已批准链接 | `getApprovedLinks` · `lib/repositories/links.ts` | **`createStaticClient`**（无 cookie） | `cache()` · 3 次重试 · 后 `attachTagsToLinks` **二次查询** |
| 分类列表 | `getCategories` · `categories.ts` | 默认 **`await createClient()`（读 cookies）** | `cache()` · parent_id 缺列降级 |
| 详情 slug | `getApprovedLinkBySlug` | static | 仅 DB slug 列 |
| Admin 链接分页 | `getAdminLinksPage` | service_role via `createAdminClient` | 管理台首页 + API |
| 语义 RPC | `searchSemantic` | **`createServiceRoleClient`** | `search_links_semantic` 或 `_v2`（CF 1024-d） |
| 搜索池 | `getSearchPool` | 复用 `getApprovedLinks` | **进程内 60s TTL** + in-flight 去重 · filtered Fuse LRU 32 |

### 3.2 revalidate 标签现状

- **无 `revalidateTag` / `cacheTag` 体系**（`lib/admin/revalidate-public.ts` 明示）。  
- Admin 写成功后：`revalidatePath("/")` · 可选 `revalidatePath("/tool/"+slug)` · `revalidatePath("/sitemap.xml")`。  
- 页面级：`/` 与 `/tool/[slug]` → 60s；`/resources` → 300s；`/favorites` → 0。  
- 搜索 API：**强制 dynamic + 全链路 no-store**（应用层 + `next.config` headers）。

### 3.3 repository / domain 边界（ADR）

| ADR | 状态 | 要点 |
|-----|------|------|
| adr-003 | Proposed→落地中 | facade + 域 modules |
| adr-006 | **Accepted** | 已拆：shared / links / categories / tags / admin-links / submissions / reviews / favorites / link-health |
| adr-004 | Accepted | `SearchAdapters` · `executeSearch` |
| adr-009 | （admin FE/BE 接口） | admin contracts / client seam |

Facade：`lib/repositories.ts` **仅 re-export**。

### 3.4 测绘级风险（只记不改）

1. **首页 `getCategories` 走 cookie client**：与 `getApprovedLinks` 的 static 路径不一致；`cookies()` 可能把本可 ISR 的请求推成动态或扩大动态边界（需后续实测确认 RSC 动态标记）。  
2. **首页全量 links + tags join**：卡片规模历史约 500+；服务端预计算已减 client 派生，但 **TTFB 仍绑定全表读 + tags**。  
3. **搜索冷启动**：池 miss → 再打 `getApprovedLinks`（8s timeout）· 与首页查询重叠但缓存隔离（React `cache` vs 进程 fuseCache）。  
4. **语义路径 service_role + 外嵌 embed**：失败降级 Fuse，但延迟与限流（semantic 20/min）需单独观测。

---

## 4. 搜索调用链（Fuse / pgvector）

```
[Client] Navigation / useServerSearch
    │  GET /api/search?q&category&limit&semantic&filters…
    ▼
app/api/search/route.ts
    │  Upstash/分布式限流 · Zod · parseSearchParams
    ▼
lib/search/use-case.ts · executeSearch
    ├─ expandQueryTerms / facets / suggestions
    ├─ Promise.all:
    │     getSearchPool ──► getApprovedLinks (+ 60s fuseCache) ──► Fuse.js
    │     getEmbedding   ──► embed-provider (CF bge-m3 1024 | embed-server 512)
    ├─ searchFuseTerms → toFuseResults
    ├─ (semantic) searchSemantic(embedding) ──► supabase.rpc(EMBED_SEMANTIC_RPC)
    └─ mergeResults / decorateResults → JSON no-store
```

**资源库平行链：** `GET /api/resource-search` · `generateResourceEmbedding`（期望 512-d）· FTS/vector/hybrid merge · **不与 nav Fuse 池共享**。

**客户端：** `components/navigation/useServerSearch.ts` 有 query 时 fetch API；空 query 本地 facets。

---

## 5. CSP / Sentry / web-vitals / csp-report

| 面 | 路径 | 行为 |
|----|------|------|
| CSP 构建 | `lib/csp.ts` | Enforcing + 默认 Report-Only；`report-uri /api/csp-report` |
| 静态头 | `next.config.ts` `headers()` | 默认生产；`CSP_DYNAMIC=1` 时跳过 CSP 头 |
| 动态 nonce | `proxy.ts` + `createDynamicCspAttachment` | **Preview 路径**；生产默认 off（T9 文档） |
| Nonce 读 | `lib/csp-server.ts` · layout/page | 仅 dynamic 时有效 |
| 收集 | `POST /api/csp-report` | 限流 60/min · body cap · path-only URI sanitize · 采样 → logger + Sentry |
| Web Vitals | `app/_components/web-vitals.tsx` → `POST /api/web-vitals` | sendBeacon · same-origin · Zod · 采样写 Sentry |
| Sentry 初始化 | `instrumentation.ts` + `instrumentation-client.ts` + `sentry.shared.config.ts` | server/edge shared · `onRequestError` |

**纪律：** 不放宽生产 CSP、不 flip `CSP_DYNAMIC` 于生产（已有 ops 债单）。

---

## 6. Auth 是否在 admin 路径造成额外瀑布（只记录）

| 阶 | 位置 | 调用 |
|----|------|------|
| 1 | `proxy.ts` `adminAuthProxy = auth(...)` | matcher：`/admin/*` · `/api/admin/*` · `/login` |
| 2 | `app/admin/layout.tsx` | `await auth()` 二次 role 校验 |
| 3 | 各 admin page | **再次** `await auth()`（layout 已保证 admin） |
| 4 | Admin API | `withAdmin*` → `requireAdmin()` → 又一次 `auth()` |

**结论（测绘）：** Admin **HTML 路径至少 2–3 次 session 解析**（proxy + layout + page）；**API 至少 2 次**（proxy + withAdmin）。公开 HTML 在 `CSP_DYNAMIC=0` 时 proxy 仍可能匹配 document matcher，但 **不做 session 工作**（`withDynamicCsp` no-op）。前台 Header 用客户端 `useSession`（SessionProvider），不增加 RSC auth 瀑布。

**不做：** 本 scout 不合并 auth 调用。

---

## 7. 债 Top N + 模块切片（目录互斥 · 建议 wt 名）

| # | 债 | 模块切片（互斥目录） | 建议 wt | P |
|---|----|----------------------|---------|---|
| 1 | Admin auth 多层重复 `auth()` | `proxy.ts` · `app/admin/**` · `lib/with-admin.ts` · `lib/auth.ts` | `cp-perf-admin-auth-dedupe` | P1 |
| 2 | 首页 categories cookie client vs links static · ISR 边界不清 | `lib/repositories/categories.ts` · `app/page.tsx` · `lib/supabase/server.ts` | `cp-perf-home-static-client` | P0 |
| 3 | 首页/搜索全量 links+tags 热点 · 池与 RSC cache 双轨 | `lib/repositories/links.ts` · `lib/search/fuse.ts` · `app/page.tsx` | `cp-perf-links-pool` | P0 |
| 4 | 无 tag revalidate · 仅 path · 搜索 no-store 粗粒度 | `lib/admin/revalidate-public.ts` · admin write routes · search headers | `cp-perf-revalidate-tags` | P2 |
| 5 | typecheck 红：`tests/probe-security-headers.test.ts` ProcessEnv | `tests/probe-security-headers.test.ts` · 相关 scripts types | `cp-perf-typecheck-probe-headers` | P1 |
| 6 | Sentry client 体积残留（历史 H7） | `next.config.ts` Sentry opts · instrumentation-client | `cp-perf-sentry-bundle` | P3 |
| 7 | 语义/embed 双维度（512 vs 1024）与 resource 平行栈复杂度 | `lib/search/**` · `app/api/resource-search/**` · embed env | `cp-perf-embed-unify-map` | P2 |
| 8 | CSP Stage A / 去 unsafe-inline 未 flip（安全+可观测债，非本轮实现） | `lib/csp.ts` · `proxy.ts` · ops docs | 已有 `cp-preview-stage-a` 线 | P2 |

详细字段表见根 `findings.md` §结构化债表。

---

## 8. 门闩实跑

| 命令 | Exit | 摘要 |
|------|------|------|
| `pnpm typecheck`（`tsc --noEmit --incremental false`） | **2** | `tests/probe-security-headers.test.ts`：`ProcessEnv` 缺 `NODE_ENV`；headers 索引 `Record|{}` |
| `pnpm test`（`vitest run`） | **0** | 62 files passed · 1 skipped · **614** tests passed · 6 skipped · ~17s |

> 本 scout **不修** typecheck（避免越权改测试/类型）；记入债 `D-05`。

---

## 9. 残留风险（一句）

**最大残留：** 首页数据面（categories cookie 客户端 + 全量 links/tags）与 Admin 多层 auth 瀑布未改，TTFB/管理台首包仍可能被静默拖累；typecheck 红会挡 CI 严格门若未与 vitest 分轨。

---

## 10. 交付清单对照

- [x] 前台 vs Admin 路由与数据入口  
- [x] webpack scripts 摘录 + 禁止默默切 bundler  
- [x] Supabase 热点 / revalidate / repository 边界  
- [x] 搜索 Fuse/pgvector 链  
- [x] CSP / Sentry / web-vitals / csp-report  
- [x] Auth admin 瀑布（只记）  
- [x] 债 Top N + 模块切片 / wt 名  
- [x] typecheck + test exit code  
- [x] 结构化债表 → `findings.md`（供总控合并 `DEBT-BACKLOG.md`）  
- [x] 无 push · 无优化实现  
