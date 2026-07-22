# ChronoPortal · stack matrix · 2026-07

> W1 baseline → W2 → W3 预备窗 → **W4 收口**。  
> **PROD CSP/RLS FLIP: NOT EXECUTED.**  
> Sources: `package.json` lock (pnpm 11.5.0), CI workflows, portfolio card `repos/cp.md`, W0–W3 reports.

## Identity

| Field | Value |
| --- | --- |
| Captured at | 2026-07-23 (W1–W3) · **W4 same calendar day** |
| Branch (W4) | `xvyimu/w4-cp-claude` |
| HEAD (W4 worktree tip) | `49f73a2d08b7f62aa9b75b422cd1308314df5beb` (+ local W4 docs if any) |
| Worktree | `C:\Users\yuanjia\orca\workspaces\ChronoPortal\w4-cp-claude` |
| Production `/build-info.json` | commit `46e71ec38e3828b892058f7e059f88478807434b` (behind tip; read-only rechecked W4) |
| packageManager | `pnpm@11.5.0` |
| Local Node (agent host) | `v24.x` (CI pins **22** — see engines row) |
| Portfolio progress tip (CP) | `49f73a2d` (`docs/orca-closed-loop/state/progress.json`) |

## Matrix

| Item | Current (repo) | Target (H2) | W1 | W2 | W3 | **W4 收口** |
| --- | --- | --- | --- | --- | --- | --- |
| **Next.js** | `16.2.9` (pin) | Patch line only; no major framework swap | Doc | — | — | **维持 pin**；H2 目标=跟补丁线 · **完成**（无大版本漂移） |
| **React / react-dom** | `19.2.4` (pin) | Patch line | Doc | — | — | **维持 pin** · **完成** |
| **eslint-config-next** | `16.2.9` | Track Next pin | Aligned | — | — | Aligned · **完成** |
| **Tailwind CSS** | `^4` → resolved `4.3.1` | Stay on TW4 line | Doc | — | — | TW4 · **完成** |
| **@supabase/ssr** | `0.12.0` (pin) | Follow security line | Doc | No flip | 只读 inventory | Pin 维持；**无** prod RLS flip |
| **@supabase/supabase-js** | `2.108.2` (pin) | Follow security line | Doc | — | — | Pin 维持 |
| **next-auth** | `5.0.0-beta.31` | Stable **or** written risk + path | Risk | ADR-007 accept | 仍 accept | **仍 pin beta.31**；npm `latest=4.24.15` · `beta=5.0.0-beta.32` · **无 stable 5.x** → H2 策略目标 **完成**（书面风险，非 silent） |
| **@sentry/nextjs** | `^10.x` | CSP report linkage | Present | — | 指标入 dossier | RO + `/api/csp-report` 路径文档化 · **完成**（联动文档，非 prod DYNAMIC） |
| **TypeScript** | `^5.1.0` → `5.1.3` | Maintain | OK | — | — | OK |
| **Vitest** | `^4.1.9` | Maintain | CSP green | 22/0 | 22/0 | **W4 re-run 见报告** |
| **Playwright** | `^1.61.0` | Maintain | Not full e2e | — | — | Not full e2e（H2 非阻塞） |
| **Node (CI)** | `22` in workflows | 22 LTS CI | Doc | — | — | **完成** |
| **pnpm** | `11.5.0` | 11.5 | Aligned | — | — | **完成** |

## H2 完成度（半年卡 · 截至 W4 收口）

| 北极星 / 卡项 | 完成度 | 证据 / 缺口 |
| --- | ---: | --- |
| S1 栈矩阵 + 依赖审计 | **100%** | 本文件 W1–W4；`pnpm audit` 记录（不 lock churn） |
| S2 架构里程碑合入默认分支 | **部分** | tip `49f73a2d` 含 W1–W3 文档/契约；**生产 env 未变** |
| S4 生产 CSP 路径 | **文档 100% · flip 0%** | canary + Stage A 阻断 + `w3-csp-prod-gate-dossier` · **PROD FLIP NOT EXECUTED** |
| S4 生产 RLS | **矩阵 100% · flip 0%** | `w3-rls-prod-matrix-prep` + 只读 inventory · **PROD FLIP NOT EXECUTED** |
| next-auth 策略 | **100%** | ADR-007 风险接受 + W3/W4 复验无 stable 5 |
| headers 单源 | **设计 100% · 生产一致 0%** | DRIFT 仍在（XFO/Referrer）；申请单模板就绪 |
| ingest/embedding 出请求路径 | **0% 实现** | 仅 backlog；题单未强制 W1–W3 |
| **组合判断（CP H2 架构卡）** | **~70% 文档/预备 · ~30% 生产落地** | 生产 flip 全靠人 gate；网络阻断 Preview |

## Dependency audit (W1 evidence · still baseline)

Command: `pnpm audit --registry=https://registry.npmjs.org --audit-level moderate`

| Result | Detail |
| --- | --- |
| Exit | **1** (findings above threshold) |
| Counts | 3 high · 1 moderate · 0 critical (metadata totalDependencies ~977) |
| High (sample) | `fast-uri` via `@sentry/nextjs` path (GHSA-4c8g-83qw-93j6) |
| Moderate | `@hono/node-server` via `shadcn` → MCP SDK — **dev tooling** |

**W1–W4 action:** record only. No lockfile churn without dedicated PR.

## Architecture posture (终态 / W4)

| Concern | Repo state | W1 | W2 | W3 | **W4 收口** |
| --- | --- | --- | --- | --- | --- |
| Security headers single source | `next.config` contract; live **DRIFT** XFO/Referrer | Trace | 平台处置 | 申请单模板 | **索引页**链齐；**未**改 CF/Vercel · DRIFT 仍在 |
| CSP static + Report-Only | defaults; `CSP_DYNAMIC` off | Preflight | Stage A 阻断 + 本地 DYNAMIC | 生产 gate 卷宗 | **Stage A 仍阻断**（W4 复测 curl exit **28**）· **PROD FLIP NOT EXECUTED** |
| RLS | Non-prod audit + prod matrix prep | — | 不碰 | 只读 inventory · model_rankings 高风险书面 | **索引页**；**PROD FLIP NOT EXECUTED** |
| Ingest / embedding boundary | scripts + API coupled | — | — | 未强制 | **下半年 backlog #3** |
| next-auth | beta.31 pin | Risk | ADR-007 | accept | **仍 accept** · 无 stable 5 |

## 下半年 backlog（3 条 · 钉死）

| # | 项 | Owner 意图 | 前置 | 人 gate |
|---|-----|------------|------|---------|
| **B1** | **CSP 闭环**：恢复 `*.vercel.app` 可达 → Preview Stage A（及建议 Stage B）→ 生产 Prod-A/B 观察窗 | App + platform | 执行机可 curl Preview；卷宗 P1–P9 | **是**（生产 env） |
| **B2** | **RLS 收紧**：优先 DROP `model_rankings` public 写 policy；收 GRANT / 复核无 policy 表与 SECURITY DEFINER | DB + app | 非生产演练 + `w3-rls-prod-matrix-prep` 变更草案 | **是**（schema/policy） |
| **B3** | **headers 单源 + ingest 边界**：P1 可达后一层修复 XFO/Referrer DRIFT；ingest/embedding 出请求路径（队列/job） | Platform + app arch | 申请单批准；ADR 若改写路径 | headers 生产变更 · **是**；ingest 设计可先文档 |

> 三条均为 **书面债务**，禁止沉默 DEFER。W4 **不**执行生产 flip / CF 变更 / migration。

## Explicit non-goals (W1–W4)

- Production `CSP_DYNAMIC` / strip `unsafe-inline` **without** user flip 原文
- Production RLS policy / schema changes without human gate
- Blind Next edit to “fix” live DRIFT
- next-auth bump without ADR-007 triggers
- Framework swap or monorepo merge
- push / merge default branch (total-control)

## Related

- `docs/ops/w4-prod-security-index.md` — **W4 生产安全索引**
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
- `docs/ops/w4-arch-upgrade-chronoportal-claude.md`
- Portfolio: `D:\orca\.planning\portfolio-arch-upgrade-2026h2\repos\cp.md`
