# M-CP-long-verify · W11 · evidence · 2026-07-24

> **分支：** `xvyimu/cp-long-verify`
> **base：** `df11a2f2` + cherry-pick `a8eb537a`(CR-BUILD csp-report export) + `6015f650`(W5 probe types)
> **红线：** 未 push master · 未去 webpack · 未 CSP/RLS flip · 未 D7/asar

## 0. 一句话

长波收口验证：typecheck / test / build(**webpack**) 三门全绿。W11 首跑暴露的 `next build` 红（csp-report route 非 handler 导出）已由 CR-BUILD 修复并合入本验证支。

## 1. 三门 exit（本 wt 实跑）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm typecheck`（`tsc --noEmit`） | **0** | 含 W5 probe 类型修 |
| `pnpm test`（vitest run） | **0** | 62 files · 614 pass / 6 skip |
| `pnpm run build`（`next build --webpack`） | **0** | 全路由编译通过 · webpack bundler |

## 2. 合入的修复

| commit | 作用 |
|--------|------|
| `a8eb537a` | `toPathOnlyUri` 移出 route → `lib/csp-report-uri.ts`（解 build 红） |
| `6015f650` | probe-security-headers JSDoc 类型对齐（解 typecheck 2→0） |

## 3. 风险一句

验证支为集成快照；真实合入 master 仍需人 gate 逐支 ff（总控不 merge）。build 绿依赖 CR-BUILD + W5 两支先落 master。
