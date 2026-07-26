# M-CP3-perf-p2-revalidate · 审计与实现证据

**日期：** 2026-07-26  
**分支：** `xvyimu/cp-opt-perf-p2-revalidate` (base `master@df11a2f2`)  
**模块：** M-CP3-perf-p2-revalidate (DEBT-BACKLOG D-05)

---

## 1. 写路径失效矩阵（Before）

| 写路径 | 操作 | 原来 revalidate 面 | 缺口 |
|--------|------|--------------------|------|
| `POST /api/admin/links` | 创建链接 | `/` + `/tool/{slug}` + `/sitemap.xml` | — |
| `PUT /api/admin/links/[id]` | 更新链接 | `/` + `/tool/{slug}` + `/sitemap.xml` | — |
| `DELETE /api/admin/links/[id]` | **删除链接** | `/` + `/sitemap.xml` **（无 slug）** | **`/tool/{slug}` 未失效** |
| `POST /api/admin/categories` | 创建分类 | `/` + `/sitemap.xml` | 分类详情页无独立路由 |
| `PUT /api/admin/categories/[id]` | 更新分类 | `/` + `/sitemap.xml` | 同上 |
| `DELETE /api/admin/categories/[id]` | 删除分类 | `/` + `/sitemap.xml` | 同上 |
| `POST /api/admin/tags` | 创建标签 | `/` + `/sitemap.xml` | 标签间接影响 tool 详情页 |
| `PUT /api/admin/tags/[id]` | 更新标签 | `/` + `/sitemap.xml` | 同上 |
| `DELETE /api/admin/tags/[id]` | 删除标签 | `/` + `/sitemap.xml` | 同上 |

**关键缺口：** DELETE 链接时没有 slug，`/tool/{slug}` 详情页留下 60s ISR 过期窗口，期间已删除 tool 可被访问。

---

## 2. 缓存架构现状（Why tag 迁移无法独立落地）

```mermaid
flowchart LR
    A[Admin Write] --> B[revalidatePath]
    B --> C[ISR: /]
    B --> D[ISR: /tool/{slug}]
    B --> E[ISR: /sitemap.xml]

    F[Public Read] --> G[repository fn]
    G --> H[React cache\(\) per-request memo]
    G --> I[Supabase JS client]
    G --> J[export const revalidate = 60]
```

**关键事实：**
- 读侧全局无 `revalidateTag` / `cacheTag` / `unstable_cache` / `fetch({next.tags})` 调用
- `next.config.ts` 未开启 `cacheComponents: true`
- 所有数据通过 Supabase JS client 读取（非 `fetch`），无法用 `next.tags` 标记
- React `cache()` 只做 per-request 去重，不跨请求缓存
- 页面缓存由 `export const revalidate = 60` ISR 控制

**结论：** 当前架构下 `revalidateTag` 不会命中任何缓存条目。要落地 tag 化，需要先做读侧基础设施（`unstable_cache` + tag 命名，或 `cacheComponents: true` + `'use cache'` + `cacheTag`），这属于 P2 边界外的读侧改造。

---

## 3. 提议 Tag 命名表（待读侧基础设施落地后启用）

| Tag | 关联数据 | 建议挂载点 |
|-----|----------|-----------|
| `nav:links:all` | 全部已批准链接 | `getApprovedLinks` |
| `nav:links:slug:{slug}` | 单条链接详情 | `getApprovedLinkBySlug` |
| `nav:links:slugs` | 全部已批准链接 slug | `getAllApprovedLinkSlugs` |
| `nav:categories:all` | 全部分类 | `getCategories` |
| `nav:tags:all` | 全部标签 | `getAllTagsForAdmin` 读侧 |

**注意：** 以上 tag 待读侧迁移后方可产生效果，当前不可引入 `revalidateTag` 调用。

---

## 4. 实现变更：DELETE 链接 slug 修复

### 修改文件

| 文件 | 变更 |
|------|------|
| `lib/repositories/admin-links.ts` | `deleteLink()` 删除前先查 slug，返回 `{ slug }` |
| `app/api/admin/links/[id]/route.ts` | 将返回的 slug 传给 `revalidatePublicNavContent({ slug })` |
| `tests/repositories.test.ts` | 更新 `deleteLink` 测试断言 |

### 效果（After）

```
DELETE /api/admin/links/[id]
  → deleteLink(id) 返回 { slug: "chatgpt" }
  → revalidatePublicNavContent({ slug: "chatgpt" })
  → revalidatePath("/") + revalidatePath("/tool/chatgpt") + revalidatePath("/sitemap.xml")
```

**修复前：** 删除后 `/tool/chatgpt` 继续缓存 60s，可看到已删除 tool  
**修复后：** 删除后 `/tool/chatgpt` 立即失效，下次访问走 DB

### 覆盖率验证

- `deleteLink` 测试：检查返回 `{ slug: "chatgpt" }`
- `revalidatePublicNavContent` 测试：已覆盖有 slug 时调用 `revalidatePath("/tool/{slug}")`

---

## 5. 搜索缓存 Defer 论证

**现状：** `/api/search` 使用 `export const dynamic = "force-dynamic"` + `Cache-Control: no-store`

**论证：** 搜索查询参数矩阵极大（q, category, limit, semantic, filters），admin 写入后需立即反映。若加 short-TTL cache（如 `s-maxage=30`），写入后 30s 内用户仍搜到旧结果。搜索频率已由限流保护（60 req/min/IP），压力面可控。**不启用搜索缓存。**

---

## 6. 门闩结果

| 门闩 | 结果 |
|------|------|
| `pnpm typecheck` | 4 errors（已知 baseline，`tests/probe-security-headers.test.ts`，master@38d296ac 引入，与本波无关） |
| `pnpm test` | 614 passed, 6 skipped（不降级） |
| 基线对比 | 62 test files passed, 614 passed, 6 skipped（与波前一致） |

---

## 7. 提交记录

```
<commit-hash-1> fix: deleteLink 返回 slug 以修复删除后详情页 ISR 失效缺口
  - deleteLink 删除前查 slug 并返回 { slug }
  - route DELETE handler 将 slug 传给 revalidatePublicNavContent
  - 更新测试断言
```