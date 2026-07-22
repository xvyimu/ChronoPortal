# W4 · ChronoPortal · Claude · arch/stack upgrade closeout

> # PROD CSP/RLS FLIP: NOT EXECUTED
>
> 生产 `CSP_DYNAMIC` / 去 `unsafe-inline` / 生产 RLS schema · **本会话零执行**。  
> 用户题单与 `w4-shared` 硬禁止一致；无「flip 现在」授权。

---

## Worktree identity

| Field | Value |
| --- | --- |
| Start HEAD / tip (pre-local docs) | `49f73a2d08b7f62aa9b75b422cd1308314df5beb` |
| Branch | `xvyimu/w4-cp-claude` |
| Worktree (absolute) | `C:\Users\yuanjia\orca\workspaces\ChronoPortal\w4-cp-claude` |
| Agent | claude (solo) |
| Plan | `D:\orca\.planning\portfolio-arch-upgrade-2026h2` · `prompts/w4-shared.md` + `prompts/w4-cp.md` |
| Date | 2026-07-23 |
| Portfolio progress tip (CP) | `49f73a2d` |
| Production `/build-info.json` | `46e71ec38e3828b892058f7e059f88478807434b`（只读；落后 tip） |

---

## Scope delivered

1. **stack-matrix W4 收口**  
   - `docs/ops/stack-matrix-2026-07.md`  
   - 终态/W4 列 · H2 完成度表 · **下半年 backlog 3 条**（B1 CSP 闭环 · B2 RLS 收紧 · B3 headers+ingest）

2. **生产 CSP/RLS 卷宗索引页**  
   - `docs/ops/w4-prod-security-index.md`  
   - 链到 W3 dossier / Stage A 阻断 / ADR-007 / headers 申请单  
   - **下一步仅人 gate**；本会话无 env / DDL

3. **Preview Stage A（可选）**  
   - W4 复测：`*.vercel.app` curl exit **28** → **阻断仍在**（刷新索引 §3）  
   - **未**写 Preview `CSP_DYNAMIC`  
   - 本地替代：vitest CSP 三文件 **22/22 exit 0**

4. **本报告**（文首 **NOT EXECUTED**）

无应用运行时代码变更。无 push。

---

## Verification (commands + exit codes)

| Command | Exit | Notes |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | **0** | fresh worktree 依赖 |
| `pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts tests/probe-security-headers.test.ts` | **0** | 3 files / **22** tests |
| `node scripts/audit-edge-scripts.mjs` | **0** | mangled 0 · rocketLoaderHints false |
| `pnpm run probe:headers -- --base-url https://yuanjia1314.ccwu.cc --allow-production --compare-repo --json` | **0** | `ok:true`；XFO/Referrer **DRIFT** 仍在 |
| `curl.exe -sI --connect-timeout 12` Preview `*.vercel.app` | **28** | Stage A **仍阻断** |
| `curl.exe` 生产 `/build-info.json` | **0** | commit `46e71ec…` |
| `npm view next-auth dist-tags` | **0** | latest `4.24.15` · beta `5.0.0-beta.32` · **无 stable 5** |
| Production `CSP_*` env write | n/a | **NOT EXECUTED** |
| Production RLS policy change | n/a | **NOT EXECUTED** |

---

## Canary / prod gate status

| Item | Status |
| --- | --- |
| Preview Stage A | **NOT RUN** — 网络阻断仍在（W2 blocker + 索引 §3） |
| Preview Stage B | **NOT RUN** |
| Production CSP Prod-A / Prod-B | **NOT EXECUTED**（W3 dossier 勾选仍空） |
| Production RLS flip | **NOT EXECUTED**（矩阵预备仅） |
| Headers platform fix | **NOT EXECUTED** |
| W4 索引页 | **已写** · 导航用 |

---

## Headers DRIFT (W4 recheck)

| Header | Repo | Live custom domain | W4 |
| --- | --- | --- | --- |
| X-Frame-Options | DENY | SAMEORIGIN | DRIFT 仍在 |
| Referrer-Policy | strict-origin-when-cross-origin | same-origin | 同上 |

P1 Preview 对比：**仍不可达** → 不得盲目改 CF/Vercel。

---

## H2 closeout summary (CP)

| 目标 | W4 判定 |
| --- | --- |
| 栈矩阵文档化 | **Done**（W1–W4 列齐） |
| next-auth 策略书面 | **Done**（ADR-007 · 仍 pin beta.31） |
| CSP 生产路径可执行 | **Docs ready · flip 0%** |
| RLS 生产矩阵 | **Docs ready · flip 0%** |
| headers 单源生产一致 | **未落地**（DRIFT + 申请单） |
| ingest 出请求路径 | **Backlog B3** |

下半年三条（钉在 matrix）：**B1 CSP 闭环 · B2 RLS 收紧 · B3 headers+ingest**。

---

## Files written (this wave)

| Path | Kind |
| --- | --- |
| `docs/ops/stack-matrix-2026-07.md` | **updated**（W4 收口列 · H2 完成度 · backlog 3） |
| `docs/ops/w4-prod-security-index.md` | **new** |
| `docs/ops/w4-arch-upgrade-chronoportal-claude.md` | **this report** |

No application runtime code. No production env. No CF console. No push.

---

## Explicit non-actions (W4 bans)

| Not done | Why |
| --- | --- |
| push / merge default branch | Total-control |
| Production `CSP_DYNAMIC=1` | 人 gate + 题单 **NOT EXECUTED** |
| Production strip script `'unsafe-inline'` | 同上 |
| Preview `CSP_DYNAMIC=1` | 网络阻断；避免无验证开关 |
| Production RLS schema / policy | 人 gate；仅索引 |
| CF / Vercel headers 修改 | 无 P1 证明 + 需申请单批准 |
| next-auth bump | ADR-007 触发未满足 |
| asar / ISS / framework swap | Portfolio red lines |

---

## DEFER / owners（书面 · 禁沉默）

| Item | Owner | Wave / condition |
| --- | --- | --- |
| Restore path to `*.vercel.app` then Preview Stage A | Platform + app op | **B1** · ASAP |
| Production CSP flip | Human gate | 用户「flip 现在」+ dossier 前置全勾 |
| Production RLS 收紧（尤其 model_rankings） | DB owner + app · human gate | **B2** · 独立变更单 |
| CF vs Vercel headers 一层修复 | Platform op | **B3** · P1 可达 + 申请单批准 |
| ingest/embedding 出请求路径 | App arch | **B3** |
| next-auth 至 stable 5.x 或安全补丁 | App owner | ADR-007 触发 |
| Merge this branch | Total-control | — |
