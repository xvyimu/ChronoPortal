# W4 · 生产 CSP/RLS 安全索引 · ChronoPortal

> **PROD CSP/RLS FLIP: NOT EXECUTED**  
> **PROD `CSP_DYNAMIC` / 去 `unsafe-inline`: NOT EXECUTED**  
> **PROD RLS policy / schema: NOT EXECUTED**  
> 波次：portfolio W4 收口 · 2026-07-23 · agent：claude (solo)  
> Worktree：`C:\Users\yuanjia\orca\workspaces\ChronoPortal\w4-cp-claude` · tip 基线：`49f73a2d`

---

## 0. 一句话

本页是 **生产安全门闩的导航索引**，不替代 W3 卷宗正文。  
**下一步仅人 gate**（用户原文「flip 现在」+ 范围）。W4 会话 **零** Production env / RLS DDL。

---

## 1. 现状快照（W4 复测）

| 面 | 状态 | 证据 |
|----|------|------|
| 生产自定义域 | 可达 | `https://yuanjia1314.ccwu.cc/build-info.json` → commit **`46e71ec…`**（落后 tip） |
| Preview `*.vercel.app` | **TCP 不可达** | curl exit **28**（W2 阻断书仍有效；W4 再确认） |
| 生产 CSP 行为 | 静态默认 · **无** DYNAMIC nonce | 与 `readCspFlags` 默认 off 一致 |
| 生产 RLS | inventory 已知 · **未**收紧 | `model_rankings` public 写仍为高风险书面项 |
| Headers | **DRIFT** 仍在 | XFO SAMEORIGIN vs DENY · Referrer same-origin vs strict-origin-when-cross-origin |
| next-auth | pin `5.0.0-beta.31` · 风险接受 | [ADR-007](../adr-007-next-auth-v5-strategy.md) |

---

## 2. 权威文档链（只读导航）

### 2.1 CSP

| 文档 | 角色 |
|------|------|
| [`w3-csp-prod-gate-dossier.md`](./w3-csp-prod-gate-dossier.md) | **生产 enforce 检查表 · 回滚 · 观察指标**（执行勾选全空） |
| [`csp-dynamic-preview-canary-2026-07-22.md`](./csp-dynamic-preview-canary-2026-07-22.md) | Preview canary runbook |
| [`csp-dynamic-preview-stage-a-blocker-2026-07-23.md`](./csp-dynamic-preview-stage-a-blocker-2026-07-23.md) | **Stage A 阻断书**（网络；故意不写 Preview env） |
| [`security-headers-as-is-target-2026-07-22.md`](./security-headers-as-is-target-2026-07-22.md) | 头目标态 |
| 生产门闩协议 | `D:\orca\.planning\portfolio-arch-upgrade-2026h2\task_plan.md` §6 |

### 2.2 RLS

| 文档 | 角色 |
|------|------|
| [`w3-rls-prod-matrix-prep.md`](./w3-rls-prod-matrix-prep.md) | **角色/表意图 · 只读 inventory · model_rankings 高风险 · 变更草案（未提交）** |
| [`rls-audit-nonproduction-2026-07-22.md`](./rls-audit-nonproduction-2026-07-22.md) | 非生产 runbook |
| `scripts/rls-audit.sql` | SELECT-only 清单 |

### 2.3 Headers / Auth

| 文档 | 角色 |
|------|------|
| [`headers-drift-trace-2026-07.md`](./headers-drift-trace-2026-07.md) | DRIFT 溯源 |
| [`headers-drift-platform-remediation-2026-07.md`](./headers-drift-platform-remediation-2026-07.md) | 平台处置建议 |
| [`headers-prod-change-request-template.md`](./headers-prod-change-request-template.md) | 生产变更申请单模板 |
| [`../adr-007-next-auth-v5-strategy.md`](../adr-007-next-auth-v5-strategy.md) | next-auth v5 beta **风险接受**（无 stable 5 不 bump） |

### 2.4 波次报告

| 波 | 报告 |
|----|------|
| W1 | [`w1-arch-upgrade-chronoportal-claude.md`](./w1-arch-upgrade-chronoportal-claude.md) |
| W2 | [`w2-arch-upgrade-chronoportal-claude.md`](./w2-arch-upgrade-chronoportal-claude.md) |
| W3 | [`w3-arch-upgrade-chronoportal-claude.md`](./w3-arch-upgrade-chronoportal-claude.md) |
| W4 | [`w4-arch-upgrade-chronoportal-claude.md`](./w4-arch-upgrade-chronoportal-claude.md) |
| 矩阵 | [`stack-matrix-2026-07.md`](./stack-matrix-2026-07.md) |

---

## 3. 阻断（刷新 · W4）

| ID | 阻断 | 解除条件 | 本会话 |
|----|------|----------|--------|
| **BLK-A** | 本机/`agent` 主机 → `*.vercel.app` **connect timeout** | 执行机 `curl -sI https://<preview>.vercel.app/` 得 HTTP 头 | **仍在**（curl exit 28） |
| **BLK-B** | 生产 tip 落后 · 未部署 W1–W3 文档提交 | 合入 + 生产 deploy 至目标 commit | 生产仍 `46e71ec`；**未**部署 |
| **BLK-C** | 无人 gate 授权 | 用户原文：「生产 CSP flip 现在」和/或「RLS flip 现在」+ 范围 | **无** → NOT EXECUTED |
| **BLK-D** | CSP 前置 P2（Stage A 全绿）未满足 | 先解除 BLK-A 并跑完 canary §8 | 仍未满足 |

**策略（不变）：** 阻断下 **不写** Preview/Production `CSP_*`；不跑生产 RLS DDL。

---

## 4. 人 gate 最小路径（仅操作人）

### 4.1 生产 CSP

1. 解除 **BLK-A** → Preview Stage A（建议再 Stage B）全绿。  
2. 勾满 [`w3-csp-prod-gate-dossier.md`](./w3-csp-prod-gate-dossier.md) §2.1 前置 P1–P9。  
3. 用户授权 → **仅 Production** 设 `CSP_DYNAMIC=1`（Prod-A；勿直接 Prod-B）。  
4. Redeploy · 观察窗 ≥48h · 与 TH D7 错开 48h。  
5. 回滚：同卷宗 §4（R1/R2/R3）。

### 4.2 生产 RLS

1. 非生产按 [`rls-audit-nonproduction-2026-07-22.md`](./rls-audit-nonproduction-2026-07-22.md) 演练。  
2. 按 [`w3-rls-prod-matrix-prep.md`](./w3-rls-prod-matrix-prep.md) §5 草案（优先 `model_rankings` 去 public 写）。  
3. 用户授权「RLS flip 现在」→ 变更单 + 回滚 DDL 快照。  
4. **勿**与 CSP flip 同会话无授权并行。

### 4.3 Headers（正交）

1. 填 [`headers-prod-change-request-template.md`](./headers-prod-change-request-template.md)。  
2. P1 Preview 对比可达后再改 CF/Vercel 一层。  
3. **不**靠盲改 Next 假装消除 DRIFT。

---

## 5. 明确不做（本索引边界）

| 动作 | 状态 |
|------|------|
| 生产 / Preview `CSP_*` env 写入 | **NOT EXECUTED** |
| 生产 RLS CREATE/ALTER/DROP POLICY | **NOT EXECUTED** |
| CF / Vercel 生产头修改 | **NOT EXECUTED** |
| next-auth bump | **未做**（ADR-007） |
| push / 合默认分支 | **未做**（总控） |

---

## 6. 下半年（链到矩阵 backlog）

见 [`stack-matrix-2026-07.md`](./stack-matrix-2026-07.md) **B1 / B2 / B3**（CSP 闭环 · RLS 收紧 · headers+ingest）。
