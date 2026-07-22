# W3 · ChronoPortal · Claude · arch/stack upgrade

> # PROD CSP/RLS FLIP: NOT EXECUTED
>
> 生产 `CSP_DYNAMIC` / 去 `unsafe-inline` / 生产 RLS schema · **本会话零执行**。  
> 用户题单与 `w3-shared` 硬禁止一致；无「flip 现在」授权。

---

## Worktree identity

| Field | Value |
| --- | --- |
| Start HEAD / tip | `2e8cead1c242701457b80883534e5e0f34d3bb75` |
| Branch | `xvyimu/w3-cp-claude` |
| Worktree (absolute) | `C:\Users\yuanjia\orca\workspaces\ChronoPortal\w3-cp-claude` |
| Agent | claude (solo) |
| Plan | `D:\orca\.planning\portfolio-arch-upgrade-2026h2` · `prompts/w3-shared.md` + `prompts/w3-cp.md` |
| Date | 2026-07-23 |
| Production `/build-info.json` | `46e71ec38e3828b892058f7e059f88478807434b`（只读；落后 tip） |

---

## Scope delivered

1. **生产 CSP gate 卷宗**  
   - `docs/ops/w3-csp-prod-gate-dossier.md`  
   - Preview Stage A：W2 阻断 **仍在**（`*.vercel.app` TCP timeout）→ **更新阻断结论**；**未**写 Preview/Prod env  
   - 生产 enforce 检查表：前置 · csp-report 观察指标 · 回滚 env · **执行勾选全空**

2. **RLS 生产矩阵预备**  
   - `docs/ops/w3-rls-prod-matrix-prep.md`  
   - 角色/表意图矩阵  
   - **只读** inventory（`pg_policies` / privileges / FORCE / security advisors）  
   - 发现：**`model_rankings` public INSERT/UPDATE/DELETE policy always-true** + anon GRANT 写  
   - **无** CREATE/ALTER/DROP POLICY

3. **headers 单源 · 生产变更申请单模板**  
   - DRIFT 复测仍在（XFO SAMEORIGIN / Referrer same-origin）  
   - 新模板：`docs/ops/headers-prod-change-request-template.md`  
   - **未**改 CF / Vercel Production / Next

4. **next-auth ADR-007 W3 跟进**  
   - 仍 **风险接受 · pin `5.0.0-beta.31`**  
   - npm：`latest=4.24.15` · `beta=5.0.0-beta.32` · 无稳定 5.x  
   - 触发条件未满足 → **不 bump**

5. **stack-matrix W3 列**  
   - `docs/ops/stack-matrix-2026-07.md`

6. **本报告**（文首 **NOT EXECUTED**）

---

## Verification (commands + exit codes)

| Command | Exit | Notes |
| --- | ---: | --- |
| `pnpm install`（fresh worktree 依赖落地） | **0** | lock 一致 |
| `pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts tests/probe-security-headers.test.ts` | **0** | 3 files / **22** tests |
| `node --experimental-strip-types` · `createDynamicCspAttachment({CSP_DYNAMIC:'1',…},{nonce:'w3localnonce01'})` | **0** | dynamic + nonce + Stage-A unsafe-inline 形状 |
| `node scripts/audit-edge-scripts.mjs` | **0** | mangled 0 · rocketLoaderHints false |
| `pnpm run probe:headers -- --base-url https://yuanjia1314.ccwu.cc --allow-production --compare-repo --json` | **0** | XFO/Referrer **DRIFT** 仍在；HTTP 200 |
| `pnpm run probe:headers -- --base-url https://nav-site-lk16isapm-aijiai520.vercel.app --compare-repo --json` | **1** | `fetch failed` / 网络 |
| `curl.exe` Preview `*.vercel.app` | **28** | Connection timed out |
| `curl.exe` 生产 `/build-info.json` | **0** | commit `46e71ec…` |
| `npm view next-auth dist-tags` | **0** | latest 4.24.15 · beta 5.0.0-beta.32 |
| Supabase MCP SQL inventory + `get_advisors(security)` | **0**（工具成功） | **只读**；无 DDL |
| Production `CSP_*` env write | n/a | **NOT EXECUTED** |
| Production RLS policy change | n/a | **NOT EXECUTED** |

---

## Canary / prod gate status

| Item | Status |
| --- | --- |
| Preview Stage A | **NOT RUN** — 阻断仍在（见 W2 blocker + W3 dossier §1） |
| Preview Stage B | **NOT RUN** |
| Production CSP Prod-A / Prod-B | **NOT EXECUTED**（卷宗检查表未勾） |
| Production RLS flip | **NOT EXECUTED**（矩阵预备 + 风险书面） |
| Headers platform fix | **NOT EXECUTED**（仅申请单模板） |

---

## Headers DRIFT (W3)

| Header | Repo | Live custom domain | W3 |
| --- | --- | --- | --- |
| X-Frame-Options | DENY | SAMEORIGIN | DRIFT 仍在 |
| Referrer-Policy | strict-origin-when-cross-origin | same-origin | 同上 |

P1 Preview 对比：**仍不可达** → 不得盲目改 CF/Vercel。

---

## RLS inventory highlights (read-only)

| Finding | Severity | Action this wave |
| --- | --- | --- |
| `model_rankings` policies allow public INSERT/UPDATE/DELETE (`true`) | **High** | Documented in matrix prep；**no** DDL |
| Multiple tables RLS on, zero policies | Info | Documented（deny-by-default for non-bypass roles） |
| anon GRANT write on pages/resources/dedup_registry | Medium (mitigated by no policy) | Documented；未来收 GRANT |
| SECURITY DEFINER executable by anon (`increment_click`, `get_cat_memories`) | Warn | Documented；非本波 revoke |
| nav_links approved-only SELECT | OK | Matches intent |

---

## Files written (this wave)

| Path | Kind |
| --- | --- |
| `docs/ops/w3-csp-prod-gate-dossier.md` | **new** |
| `docs/ops/w3-rls-prod-matrix-prep.md` | **new** |
| `docs/ops/headers-prod-change-request-template.md` | **new** |
| `docs/ops/stack-matrix-2026-07.md` | **updated** (W3 columns) |
| `docs/adr-007-next-auth-v5-strategy.md` | **updated** (W3 跟进段) |
| `docs/ops/w3-arch-upgrade-chronoportal-claude.md` | **this report** |

No application runtime code. No production env. No CF console. No push.

---

## Explicit non-actions (W3 bans)

| Not done | Why |
| --- | --- |
| push / merge default branch | Total-control |
| Production `CSP_DYNAMIC=1` | 人 gate + 题单 **NOT EXECUTED** |
| Production strip script `'unsafe-inline'` | 同上 |
| Preview `CSP_DYNAMIC=1` | 网络阻断；避免无验证开关 |
| Production RLS schema / policy | 人 gate；仅 inventory |
| CF / Vercel headers 修改 | 无 P1 证明 + 需申请单批准 |
| next-auth bump | ADR-007 触发未满足 |
| asar / ISS / framework swap | Portfolio red lines |

---

## DEFER / owners（书面 · 禁沉默）

| Item | Owner | Wave / condition |
| --- | --- | --- |
| Restore path to `*.vercel.app` then Preview Stage A | Platform + app op | ASAP / W3 residual |
| Production CSP flip | Human gate | 用户「flip 现在」+ dossier 前置全勾 |
| Production RLS 收紧（尤其 model_rankings） | DB owner + app · human gate | 独立变更单；可与 CSP 错开 |
| CF vs Vercel headers 一层修复 | Platform op | P1 可达 + 申请单批准 |
| next-auth 至 stable 5.x 或安全补丁 | App owner | ADR-007 触发 |
| Ingest out of request path | App arch | W4 backlog |
| Merge this branch | Total-control | — |

### 延期书摘要（CSP 生产 enforce）

**延期对象：** 生产 CSP_DYNAMIC / 去 unsafe-inline。  
**原因：** (1) 无用户 flip 授权；(2) Preview Stage A 因边缘网络不可达 **未完成**；(3) 生产 deploy commit 落后 tip，nonce 路径是否已在生产二进制未在本会话验证部署。  
**证据：** vitest 22/22 green；edge audit green；preview curl 28；dossier 检查表 P2/P9 未满足。  
**不是** 无限 DEFER：网络恢复 → Stage A → 人 gate 可按卷宗执行。

### 延期书摘要（RLS 生产收紧）

**延期对象：** 生产 DROP/CREATE policy。  
**原因：** 题单仅预备；高风险 `model_rankings` 需独立变更单 + 回滚 DDL 快照 + 前台/Admin 回归。  
**证据：** 只读 inventory + advisor WARN 已落卷。  
**下一步：** 填 matrix prep §5 申请 → 非生产演练 → 人 gate。

---

## Acceptance vs `w3-cp.md`

| Criterion | Status |
| --- | --- |
| `w3-csp-prod-gate-dossier.md` | **Met** |
| `w3-rls-prod-matrix-prep.md` | **Met** |
| headers 生产变更申请单（DRIFT 仍在） | **Met**（template） |
| next-auth W3 跟进 | **Met**（ADR-007 段 · 仍 accept risk） |
| 文首 PROD FLIP NOT EXECUTED | **Met** |
| vitest CSP 相关仍绿 | **Met**（22 · exit 0） |
| 报告本路径 | **Met** |
| 无 prod CSP/RLS / 无 push | **Met** |

---

## Stop

W3 Claude cut complete in this worktree. Docs-only delta until optional local commit. **No push. PROD CSP/RLS FLIP: NOT EXECUTED.**
