# ChronoPortal · cp-opt-perf-p0 · Evidence (2026-07-26)

**模块 ID：** M-CP-perf-p0
**wt：** `C:/Users/yuanjia/orca/workspaces/ChronoPortal/cp-opt-perf-p0`
**分支：** `xvyimu/cp-opt-perf-p0` · base `df11a2f2` · **tip `9f36c530`**（evidence 自身）· 代码 tip `0c45ccfe`
**push：** 未推（按任务要求本地留存）
**栈锁遵守：** Next 16 + webpack · React 19 · Supabase + RLS · Auth.js · **未换栈 / 未去 webpack / 未改 CSP 语义**

---

## 1. 完成范围（vs `cp-perf-wave/DEBT-BACKLOG.md`）

| 债 id | 目标 | 结论 | commit |
|-------|------|------|--------|
| **D-04** | `pnpm typecheck` 由 exit 2 → 0（`tests/probe-security-headers.test.ts` ProcessEnv / headers 索引类型） | **完成** | `990b1203` |
| **D-01** | 首页 `getCategories` 默认 client 与 links 的 `createStaticClient` 对齐，不破坏 auth cookie 语义 | **完成** | `bbb48621` |
| **额外（build 门闩）** | Next 16 route 类型收紧后 `next build --webpack` 因 `csp-report/route.ts` named export `toPathOnlyUri` 失败 —— 抽 helper 到 `lib/csp-report-uri.ts`，语义零变更 | **完成** | `0c45ccfe` |
| D-02 links-pool | 只读 | 未动（保持 P0 精简，不做 fuse pool / RPC 重构） |
| D-03 admin auth 去重 | 未动 | 无 admin smoke 环境，避免碰鉴权语义 |
| D-07 CSP prod flip | **明确不做** | 遵守 `~/CLAUDE.md` §5 / 任务 no-list |

---

## 2. 门闩实跑

Windows PowerShell · pnpm 11.5.0 · Next 16.2.11。

### 2.1 `pnpm typecheck`

- **改前（base `df11a2f2`）：** exit **2**
  - `tests/probe-security-headers.test.ts` 4 处 `ProcessEnv` 缺 `NODE_ENV`、1 处 `Record<string,string>|{}` 索引 `x-frame-options` 隐式 any
- **改后（tip `0c45ccfe`）：** exit **0**
- **修法（`990b1203`）：** 测试内构造 `env` 使用 `Partial<NodeJS.ProcessEnv>`，`headers` 断言前用 `if (…)` 收窄，或改为 `expect(x['x-frame-options']).toBe(...)` 前显式类型；生产代码 `scripts/probe-security-headers.mjs` **未改**。

### 2.2 `pnpm test`

- 62 passed / 1 skipped test files · **614 passed / 6 skipped** tests · ~11 s
- exit **0**
- 相关：`tests/api-csp-report.test.ts` 中原 `import { POST, toPathOnlyUri } from route` 改为 `POST` 走 route、`toPathOnlyUri` 走 `@/lib/csp-report-uri`。行为断言未变。

### 2.3 `pnpm build`（webpack 锁）

- **改前（含 D-04+D-01，但未拆 helper）：** ❌ exit 1
  - `Failed to type check. .next/types/app/api/csp-report/route.ts:14 — Property 'toPathOnlyUri' is incompatible with index signature. Type '(value: unknown) => string' is not assignable to type 'never'.`
  - master `df11a2f2` 独立 build 复现同一错误 → **pre-existing regression**，与本波 D-04 / D-01 改动**无关**。
- **改后（tip `0c45ccfe`）：** ✅ exit 0
  - webpack 编译 21–22 s，静态生成 28 页；`/submit` 由 `ƒ (Dynamic)` → **`○ (Static)`**（D-01 副作用：分类默认走 `createStaticClient`，无 `cookies()` 触发动态）；`/` 仍为 `ƒ`（`searchParams` 决定，符合 App Router 语义）。

---

## 3. D-04 影响面（`990b1203`）

- 文件：`tests/probe-security-headers.test.ts` **仅测试文件**
- 生产脚本 `scripts/probe-security-headers.mjs` 未动 → `pnpm run probe:headers` 契约不变
- 修复类型收窄，未改任何断言语义
- Risk：无

---

## 4. D-01 影响面（`bbb48621`）

### 变更

`lib/repositories/categories.ts`：`getCategoriesImpl` 默认 client 由 `await createClient()`（cookie 感知）→ `createStaticClient()`（无 cookie，anon key + RLS）。

### 调用点扫描（`app/**` + `tests/**` 全量 grep）

| 调用点 | 影响 | 说明 |
|--------|------|------|
| `app/page.tsx` — Home | ✅ 优化 | 与 `getApprovedLinks` 同走 static client；ISR `revalidate=60` 语义不变；`searchParams` 已使 `/` 动态，不涉及静态化回归 |
| `app/sitemap.ts` | ✅ 中性 | 显式传 `createStaticClient()` 实参 → 走 options.client 分支，行为不变 |
| `app/submit/page.tsx` | ✅ 优化 | 无 `cookies()` 触发点，build 已确认由 ƒ → ○ |
| `app/tool/[slug]/page.tsx` | ✅ 中性 | 显式传 `staticClient` |
| `lib/repositories.ts` re-export | ✅ | 签名不变 |
| `tests/repositories.test.ts` | ✅ | 均以显式 client 传入，`freshMocks` 同时 mock `createClient`/`createStaticClient`/`createServiceRoleClient` |
| `tests/sitemap.test.ts` / `tests/tool-slug.test.tsx` | ✅ | 显式 client 断言 |

### RSC 动态/静态边界与 auth 语义

- 分类是**公开数据**（`nav_categories` 的 anon RLS 已允许 `select`；写路径继续走 `createAdminClient` service role），无用户维度差异。
- Auth cookie 语义：`getCategories` 从未做 auth 判断（只读列表）；`createStaticClient` 不读 `next/headers` cookies，Auth.js/Supabase session 不受影响。
- 若未来某分类页想按用户折叠，`options.client` 分支仍可显式传 cookie-aware client（`createClient()`）。

### 影响面文档

`.planning/cp-opt-perf-p0-2026-07-26/d01-impact-analysis.md`

---

## 5. build 门闩修复（`0c45ccfe`）

### 现象

Next 16 patch 后，`.next/types/app/**/route.ts` 用 `Diff<...>` 校验 route 文件的**所有 named export**必须属于 handler / config 白名单；任何自定义 helper 都会被判为 `type never` 冲突。

### 修法

- 新增 `lib/csp-report-uri.ts`：搬移 `toPathOnlyUri`（**逐字复制**注释与实现，无逻辑变更）
- `app/api/csp-report/route.ts`：删除 `export`，改为 `import { toPathOnlyUri } from "@/lib/csp-report-uri"`
- `tests/api-csp-report.test.ts`：`toPathOnlyUri` 从 `@/lib/csp-report-uri` 导入；`POST` 仍从 route 导入
- 采样 hash / documentUri / blockedUri 脱敏时机、rate-limit 60s×60 阈值、Sentry `captureMessage` fingerprint —— **全部未改**
- CSP 头部策略、`CSP_DYNAMIC` flip、report-only endpoint 契约 —— **未触及**

### Risk

- 语义零变更；纯模块划分。
- `docs/ops/cp-preview-stage-a-prep-2026-07-24.md:307` 提到「代码 → `app/api/csp-report/route.ts` → `toPathOnlyUri`」的运维文档指针需要在下次运维梳理时更新到 `lib/csp-report-uri.ts`（**信息级**，不阻塞）。

---

## 6. commit 序列

```
9f36c530 docs(ops): cp-opt-perf-p0 evidence (D-04, D-01, build helper extract)
0c45ccfe fix(build): extract toPathOnlyUri to lib/csp-report-uri (Next 16 route export)
bbb48621 perf(home-data): getCategories default client -> createStaticClient
990b1203 fix(types): probe-security-headers test ProcessEnv stub + headers narrowing
df11a2f2 (base) test: stabilize search/favicon/resource-library mocks
```

---

## 7. 明确未做（no-list 遵守）

- ❌ 生产 CSP 打开 / `CSP_DYNAMIC` prod flip
- ❌ 绕 RLS / 改 Auth 安全语义为"更快"
- ❌ `git push origin`
- ❌ 动 Chronicle / 其他仓
- ❌ D-02 links-pool 大重构（保留只读地图 P1 由后续 wave 承接）
- ❌ D-03 admin auth 去重（缺 admin smoke 环境）
- ❌ 换 Astro/Remix、去 webpack、无 ADR 换栈

---

## 8. DONE

`DONE M-CP-perf-p0 tip=9f36c530 evidence=docs/ops/cp-opt-perf-p0-evidence-2026-07-26.md`
