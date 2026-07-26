# D-01 影响面分析 · 首页 categories 静态 client 对齐

**日期：** 2026-07-26 · **模块：** M-CP-perf-p0 · **base：** `df11a2f2`（本 commit 前 tip `990b1203` = D-04）

## 现状

`lib/repositories/categories.ts` → `getCategoriesImpl`：

```ts
const supabase = options.client ?? await createClient(); // cookie 客户端
```

而 `lib/repositories/links.ts` 全部公开读路径均用 `createStaticClient()`（无 cookie）。

## 问题

`createClient()` 内部 `await cookies()`（next/headers）。在 RSC 数据路径中调用会把路由标记为动态，
与 `app/page.tsx` 的 `export const revalidate = 60`（ISR）意图冲突——首页数据侧唯一的
cookie 依赖就是这条 categories 默认分支。scout 债 D-01 定位一致。

## 调用点清单（4 个）

| 调用点 | 传参 | 改动后行为 |
|--------|------|-----------|
| `app/page.tsx:63` | `{ signal }` 无 client | 默认走 `createStaticClient()`（**目标改善点**） |
| `app/submit/page.tsx:11` | 无参 | 同上；submit 页 categories 亦为公开数据 |
| `app/sitemap.ts:54` | 显式 `createStaticClient()` | 不变 |
| `app/tool/[slug]/page.tsx:117` | 显式 `createStaticClient()` | 不变 |

Admin 路径（`getAllCategoriesForAdmin` / create / update / delete）全部走 `createAdminClient()`
（service_role），不经默认分支，不受影响。

## Auth / RLS 语义确认

- `nav_categories` 公开读走 anon key + RLS 公共读策略；读取结果不随用户会话变化 → 换静态 client 无数据语义差异。
- `createStaticClient` 的 cookies `getAll → []` / `setAll → no-op`：不读不写 auth cookie。
  categories 读路径原本也不应刷新 session（那是 proxy / Auth.js 的职责），故 auth cookie 刷新语义不受损。
- 不绕 RLS：仍是 anon key，RLS 全程生效。

## RSC 动态/静态边界确认

- `app/page.tsx` 数据侧移除唯一 `cookies()` 依赖后，动态性只剩 `getCspNonce()`——其注释明确
  「Only hits headers() when CSP_DYNAMIC=1」，生产默认 static CSP 不触发 → ISR 生效路径打通。
- `searchParams` 为 Promise 惰性读取；`?cat=` 场景本就按需渲染，不受影响。

## 变更内容

`lib/repositories/categories.ts`：
1. 默认 client `await createClient()` → `createStaticClient()`；
2. import 对应替换；函数不再有 await 依赖差异（createStaticClient 同步）。

不改：`resolveQueryOptions` 签名、显式传 client 的调用方、admin 写路径、tests 的 mock 结构
（`freshMocks` 已同时 mock `createStaticClient`）。

## 回归面

- `tests/repositories.test.ts` getCategories 3 例：均显式传 client / options，不触默认分支 → 预期不变。
- `tests/tool-slug.test.tsx:184` 断言 `getCategories` 收到 static client mock → 不变。
- 门闩：`pnpm typecheck` · `pnpm test` · `pnpm build`（webpack）。
