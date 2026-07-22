# ChronoPortal · stack matrix · 2026-07

> W1 baseline + W2 + **W3 预备窗**。  
> **PROD CSP/RLS FLIP: NOT EXECUTED.**  
> Sources: `package.json` lock (pnpm 11.5.0), CI workflows, portfolio card `repos/cp.md`.

## Identity

| Field | Value |
| --- | --- |
| Captured at | 2026-07-23 (W1) · W2 same day · **W3 same calendar day** |
| Branch (W3) | `xvyimu/w3-cp-claude` |
| HEAD (W3 worktree tip) | `2e8cead1c242701457b80883534e5e0f34d3bb75` (+ local docs if any) |
| Worktree | `C:\Users\yuanjia\orca\workspaces\ChronoPortal\w3-cp-claude` |
| Production `/build-info.json` | commit `46e71ec38e3828b892058f7e059f88478807434b` (behind tip; read-only rechecked W3) |
| packageManager | `pnpm@11.5.0` |
| Local Node (agent host) | `v24.x` (CI pins **22** — see engines row) |

## Matrix

| Item | Current (repo) | Target (H2) | W1 status | W2 已做 | **W3 已做** |
| --- | --- | --- | --- | --- | --- |
| **Next.js** | `16.2.9` (pin) | Patch line only; no major framework swap | Documented | No bump | No bump |
| **React / react-dom** | `19.2.4` (pin) | Patch line | Documented | No bump | No bump |
| **eslint-config-next** | `16.2.9` | Track Next pin | Aligned | — | — |
| **Tailwind CSS** | `^4` → resolved `4.3.1` | Stay on TW4 line | Documented | — | — |
| **@supabase/ssr** | `0.12.0` (pin) | Follow security line | Documented | No RLS/prod flip | **RLS inventory 只读**；**无** schema flip |
| **@supabase/supabase-js** | `2.108.2` (pin) | Follow security line | Documented | — | — |
| **next-auth** | `5.0.0-beta.31` | Stable **or** written risk + path | Risk noted | ADR-007 accept pin | **W3 仍 accept risk**；npm 仍无 stable 5.x（latest=4.24.15 · beta=5.0.0-beta.32） |
| **@sentry/nextjs** | `^10.x` | CSP report linkage | Present | No major bump | 观察指标写入 CSP gate 卷宗 |
| **TypeScript** | `^5.1.0` → `5.1.3` | Maintain | OK | — | — |
| **Vitest** | `^4.1.9` | Maintain | CSP + probe green | 22 tests exit 0 | **W3 re-run 22 tests exit 0** |
| **Playwright** | `^1.61.0` | Maintain | Not full e2e | Not full e2e | Not full e2e |
| **Node (CI)** | `22` in workflows | 22 LTS CI | Documented | — | — |
| **pnpm** | `11.5.0` | 11.5 | Aligned | — | — |

## Dependency audit (W1 evidence)

Command: `pnpm audit --registry=https://registry.npmjs.org --audit-level moderate`

| Result | Detail |
| --- | --- |
| Exit | **1** (findings above threshold) |
| Counts | 3 high · 1 moderate · 0 critical (metadata totalDependencies ~977) |
| High (sample) | `fast-uri` via `@sentry/nextjs` path (GHSA-4c8g-83qw-93j6) |
| Moderate | `@hono/node-server` via `shadcn` → MCP SDK — **dev tooling** |

**W1–W3 action:** record only. No lockfile churn without dedicated PR.

## Architecture posture

| Concern | Repo state | W1 | W2 | **W3** | Later |
| --- | --- | --- | --- | --- | --- |
| Security headers single source | `next.config` contract; live **DRIFT** XFO/Referrer | Trace | 平台处置建议 | **生产变更申请单模板** `headers-prod-change-request-template.md`；DRIFT 复测仍在；**未**改 CF/Vercel | P1 可达后一层变更 |
| CSP static + Report-Only | defaults; `CSP_DYNAMIC` off | Preflight | Stage A 阻断 + 本地 DYNAMIC 证据 | **生产 gate 卷宗** `w3-csp-prod-gate-dossier.md`；Stage A **仍阻断**；**PROD FLIP NOT EXECUTED** | Preview A when network OK · prod 人 gate |
| RLS | Non-prod audit docs | — | 不碰 | **生产矩阵预备** `w3-rls-prod-matrix-prep.md` + 只读 inventory；**model_rankings 过宽写** 书面；**PROD FLIP NOT EXECUTED** | 人 gate 收紧 policy |
| Ingest / embedding boundary | scripts + API coupled | — | 题单未强制 | 本 W3 题单未强制 | W4 backlog |
| next-auth | beta.31 pin | Risk note | ADR-007 | **仍 pin / accept risk** | Stable 5.x 或安全触发 |

## Explicit non-goals (W1–W3)

- Production `CSP_DYNAMIC` / strip `unsafe-inline` **without** user flip 原文
- Production RLS policy / schema changes without human gate
- Blind Next edit to “fix” live DRIFT
- next-auth bump without ADR-007 triggers
- Framework swap or monorepo merge
- push / merge default branch (total-control)

## Related

- `docs/ops/headers-drift-trace-2026-07.md`
- `docs/ops/headers-drift-platform-remediation-2026-07.md`
- `docs/ops/headers-prod-change-request-template.md`
- `docs/ops/csp-dynamic-preview-canary-2026-07-22.md`
- `docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`
- `docs/ops/w3-csp-prod-gate-dossier.md`
- `docs/ops/w3-rls-prod-matrix-prep.md`
- `docs/adr-007-next-auth-v5-strategy.md`
- `docs/ops/w1-arch-upgrade-chronoportal-claude.md`
- `docs/ops/w2-arch-upgrade-chronoportal-claude.md`
- `docs/ops/w3-arch-upgrade-chronoportal-claude.md`
- Portfolio: `D:\orca\.planning\portfolio-arch-upgrade-2026h2\repos\cp.md`
