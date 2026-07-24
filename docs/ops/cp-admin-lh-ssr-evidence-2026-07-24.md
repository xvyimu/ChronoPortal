# M-CP-admin-lh-ssr · evidence · 2026-07-24

> **wt：** `cp-admin-lh-ssr` · branch `xvyimu/cp-admin-lh-ssr`  
> **base：** `df11a2f2`  
> **模块：** Admin `/admin/link-health` SSR 预取 · 去首屏 client 瀑布  
> **红线：** 未去 webpack · 未放宽 CSP · 未绕 RLS · 未改生产 env · 未 push master

---

## 0. 一句话

RSC `page.tsx` 经 `listOpenLinkHealthFindings()` 预取 open findings，`LinkHealthPanel` 以 `initialFindings`/`initialMeta` 首屏渲染；去掉 mount `useEffect` 冷拉。刷新/resolve 仍走 `GET|POST /api/admin/link-health`（ADR-009）。

## 1. 变更文件

| 文件 | 改动 |
|------|------|
| `app/admin/link-health/page.tsx` | auth 后 `listOpenLinkHealthFindings` → 传 initial props |
| `components/admin/LinkHealthPanel.tsx` | 必填 initial props · `loading` 默认 false · 无 mount 自动 fetch · 手动刷新保留 |

## 2. 验收

| # | 项 | 结果 |
|---|-----|------|
| A1 | 首屏不依赖 mount fetch 才有表/空态 | **代码路径** · loading 默认 false + SSR data |
| A2 | RSC 直调 repository · 浏览器写仍 API | **是** · page 注释 + resolve/load fetch |
| A3 | 表缺失 unavailable 契约 | **保留** · initialMeta.unavailable |
| A4 | 无 CSP/RLS/生产 env | **NOT_TOUCHED** |

## 3. 验证命令 + exit code（本会话实跑）

| 命令 | exit | 备注 |
|------|------|------|
| `pnpm typecheck` | **2** | 仅 `tests/probe-security-headers.test.ts` 既有 `ProcessEnv` 类型红；过滤无 link-health 命中 |
| `pnpm exec vitest run tests/api-admin-link-health.test.ts tests/repositories-link-health.test.ts tests/admin-boundary.test.ts` | **0** | 3 files · 23 tests |

```text
pnpm typecheck
# TYPECHECK_EXIT=2  (pre-existing probe-security-headers.test.ts only)

pnpm exec vitest run tests/api-admin-link-health.test.ts tests/repositories-link-health.test.ts tests/admin-boundary.test.ts
# VITEST_EXIT=0
```

## 4. 风险一句

`auth()` 仍在 layout + page 各一次（W4 去重）；service_role 列表与 API 同源，未新开写路径。

## 5. 状态

```text
module: M-CP-admin-lh-ssr
status: DONE
workspace-status: in-review
prod_csp_flip: NOT_EXECUTED
rls_flip: NOT_EXECUTED
push_master: NOT_DONE
```
