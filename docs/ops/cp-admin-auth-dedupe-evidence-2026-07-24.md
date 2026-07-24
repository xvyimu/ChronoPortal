# CP admin auth dedupe · evidence · 2026-07-24

> **Module：** `M-CP-admin-auth-dedupe` · W4  
> **Branch：** `xvyimu/cp-admin-auth-dedupe`  
> **红线：** 未改登录产品逻辑 · 未放宽鉴权 · 未 push master · 未动 CSP/RLS/生产 env

## 变更

| 文件 | 作用 |
|------|------|
| `lib/auth.ts` | 新增 `getAdminSession = cache(async () => auth())`（React.cache 同请求去重） |
| `app/admin/layout.tsx` | `auth()` → `getAdminSession()`；仍 `role !== "admin"` → `/login` |
| `app/admin/page.tsx` | 同上 |
| `app/admin/categories/page.tsx` | 同上 |
| `app/admin/link-health/page.tsx` | 同上 |
| `tests/admin-boundary.test.ts` | 静态锁：RSC 用 getAdminSession、禁裸 `await auth()`、保留 admin gate |

**明确未改：** Credentials authorize · rate-limit · proxy/`requireAdmin` 裸 `auth()` · 登录页 · 生产 env。

## 验证（本条消息实跑）

| 命令 | Exit | 备注 |
|------|-----:|------|
| `pnpm run typecheck` | _pending_ | `tsc --noEmit` |
| `pnpm exec vitest run tests/admin-boundary.test.ts tests/security.test.ts tests/admin-login.test.tsx` | _pending_ | admin 边界 + requireAdmin + 登录 |

## 风险（一句）

`React.cache` 仅同请求 memo；跨请求 / Route Handler / middleware 仍走裸 `auth()`，不构成会话放宽。
