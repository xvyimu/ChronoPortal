# W3 · 生产 CSP gate 卷宗 · ChronoPortal

> **PROD CSP FLIP: NOT EXECUTED**  
> **PROD `CSP_DYNAMIC` / 去 `unsafe-inline`: NOT EXECUTED**  
> 波次：portfolio W3 · 日期：2026-07-23 · agent：claude (solo)  
> Worktree：`C:\Users\yuanjia\orca\workspaces\ChronoPortal\w3-cp-claude` · tip：`2e8cead1`

---

## 0. 一句话

本卷宗把 **生产 CSP enforce** 做成可执行检查表与回滚剧本；**本会话未勾选、未执行任何 Production env 变更**。Preview Stage A 因 `*.vercel.app` 本机 TCP 超时 **仍阻断**（沿用并刷新 W2 阻断书）。

---

## 1. Preview Stage A 状态（W3 复测）

| 项 | W2 | **W3 复测** |
| --- | --- | --- |
| Runbook | `docs/ops/csp-dynamic-preview-canary-2026-07-22.md` | 同左 |
| 阻断书 | `docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md` | **仍有效** |
| 代码 / vitest CSP | 22 tests green | **再跑 22/22 exit 0** |
| 边缘 mangled / Rocket Loader | 0 / false | **再跑 exit 0** |
| 生产自定义域 HTTP | 可达 | 可达（`/build-info.json` commit **`46e71ec…`**） |
| `*.vercel.app` HTTP | connect timeout | **仍 timeout**（curl exit **28** · probe exit **1** `fetch failed`） |
| Preview `CSP_DYNAMIC=1` 写入 | **未写** | **仍未写**（不可验证） |
| 生产 `CSP_*` env | 无 / 默认 off | **未触碰** |

### 1.1 阻断结论（更新）

**Stage A 仍未执行。** 原因与 W2 相同：agent 主机到 Vercel Preview 边缘 **TCP 不可达**，无法完成 runbook §2.3–2.4；因此 **故意不** 写 Preview env，避免无验证开关。

解除条件（操作人，非本会话）：

1. 执行机可 `curl -sI https://<preview>.vercel.app/` 拿到 HTTP 头。  
2. **仅 Preview** 设 `CSP_DYNAMIC=1` → redeploy → 填 runbook §8。  
3. Stage A 全绿后，方可讨论 Stage B（仍仅 Preview）。  
4. **生产仍保持** `CSP_DYNAMIC` off · `CSP_SCRIPT_UNSAFE_INLINE` on（默认）。

本地替代证据（非 E2E Stage A）：

```text
pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts tests/probe-security-headers.test.ts
→ 3 files / 22 tests · exit 0

node --experimental-strip-types · createDynamicCspAttachment({CSP_DYNAMIC:'1',…}, {nonce:'w3localnonce01'})
→ flags.dynamic=true · enforcing script-src 含 'nonce-…' + Stage-A 形状 'unsafe-inline' · exit 0
```

---

## 2. 生产 enforce 检查表（**全部未勾选执行**）

> 人 gate 原文「flip 现在」+ 范围后，操作人按序勾选。**本文件打印时全部为空。**

### 2.1 前置（必须全部为真再请求 flip）

| # | 前置 | 证据路径 | 本会话 |
|---|------|----------|--------|
| P1 | tip ≥ T-CP-001（nonce 路径）已在 **将部署的** 生产 commit | `/build-info.json` vs git | 生产仍 `46e71ec`（**落后** tip `2e8cead1`）；**未**部署 |
| P2 | Preview Stage A 全绿（nonce CSP + 功能冒烟） | canary §5.2 + §8 | **未做**（网络阻断） |
| P3 | Preview Stage B 建议通过（可选但强烈推荐）：enforcing 无 script `unsafe-inline` | canary §5.3 | **未做** |
| P4 | 边缘：`mangledScriptTypeCount=0` · Rocket Loader off | `audit-edge-scripts.mjs` | **PASS**（只读生产） |
| P5 | CSP 单测绿 | vitest CSP 三文件 | **PASS** 22 tests |
| P6 | Sentry / 日志可观测 `csp-report`（或 `/api/csp-report` 可达） | RO 已 `report-uri /api/csp-report` | 生产 RO **已在**；未改 |
| P7 | headers DRIFT 已知且 **正交**（XFO/Referrer 不阻塞 CSP flip，但应单独立案） | probe + remediation | DRIFT **仍在** |
| P8 | 回滚负责人 + 观察窗时长书面确认 | 本卷宗 §3–4 | 仅文档 |
| P9 | 用户原文授权：「生产 CSP flip 现在」+ 阶段（A-only 或 A+去 unsafe-inline） | 聊天/工单 | **无** → **NOT EXECUTED** |

### 2.2 建议生产阶段（与 Preview 对齐）

| 阶段 | Production env | 期望 | 勾选执行 |
|------|----------------|------|----------|
| **Prod-A** | `CSP_DYNAMIC=1`；`CSP_SCRIPT_UNSAFE_INLINE` 保持默认 **on/1** 或不设 | enforcing 含 nonce + 仍可有 unsafe-inline；首页/搜索/Admin/GA 无红 CSP block | ☐ **未执行** |
| **Prod-B**（仅 Prod-A 观察窗通过后） | 另设 `CSP_SCRIPT_UNSAFE_INLINE=0` | enforcing `script-src` **无** unsafe-inline | ☐ **未执行** |

**禁止：** 跳过 Prod-A 直接 Prod-B；与 TH D7 等同日撞车（至少错开 **48h** 观察）；无 redeploy 只改 env 却不验证。

### 2.3 生产执行步骤（剧本 · 未跑）

```text
1. 确认 P1–P9
2. Vercel → nav-site → Environment Variables → **仅勾选 Production**
   - CSP_DYNAMIC = 1
   - （Prod-A 不要设 CSP_SCRIPT_UNSAFE_INLINE=0）
3. Redeploy Production（Git 合入路径优先；记录 deployId + commit）
4. 验证：
   - curl -sI https://yuanjia1314.ccwu.cc/ | 查 Content-Security-Policy 含 nonce-
   - 浏览器：/ · 搜索 · /login→/admin · tool 页 · GA
   - Sentry / 服务端：csp-report 聚类
5. 观察窗（建议 ≥48h）后决定 Prod-B 或保持 A
6. 全程填 §5 执行记录
```

---

## 3. 观察指标（csp-report / 运行）

| 指标 | 来源 | 告警建议（草案） | 本会话 |
|------|------|------------------|--------|
| Enforcing CSP **blocked** 用户可见故障 | 浏览器控制台 / 客诉 / Sentry | 任一关键路径（首页/Admin/搜索）红 block → 立即回滚 | 未开 DYNAMIC |
| `POST /api/csp-report` 速率与聚类 | app route + Sentry `source:csp-report` | 新 directive 簇突增、或 GA/Admin 相关 spike | RO 基线已存在 |
| Report-Only 报告量 | 同上（RO 默认 on） | 用于预判 Prod-B；不单独触发回滚 | 维持 |
| `/api/health` | probe | checks 非因 CSP 变 error | 未因本波变更 |
| Admin 登录成功率 | 人工 / 日志 | 骤降 → 回滚 | 未测 e2e |
| 边缘 mangled type | `audit-edge-scripts.mjs` | ≠0 → 禁止 Prod-B | **0** |

生产当前（只读探针摘要，2026-07-23 W3）：

- Enforcing CSP：静态默认（含 script `'unsafe-inline'`，**无** nonce）  
- Report-Only：script **无** unsafe-inline · `report-uri /api/csp-report`  
- **无** `CSP_DYNAMIC` 生产行为迹象（与代码默认 `readCspFlags.dynamic=false` 一致）

---

## 4. 回滚 env 步骤（生产 · 未演练写回）

按严重度从轻到重（**仅在已 flip 后**）：

| 步骤 | 操作 | 何时 |
|------|------|------|
| **R1** | Production：`CSP_SCRIPT_UNSAFE_INLINE` 删除或设 `1` → **立即 redeploy** | Prod-B 后脚本被拦 |
| **R2** | Production：`CSP_DYNAMIC` 删除或设 `0` → **立即 redeploy** | Prod-A 头/页面异常；回到 next.config 静态 CSP |
| **R3** | Vercel 回滚到 flip 前 deployment | env 回滚后仍坏 |
| **R4** | 通知：边缘/CF 若误改规则一并还原（CSP 与 XFO 分层） | 平台误操作 |

验证回滚：

```powershell
pnpm run probe:headers -- --base-url https://yuanjia1314.ccwu.cc --allow-production --compare-repo --json
# 浏览器抽检首页 + /login；确认 enforcing 恢复预期（静态或 A 形状）
node scripts/audit-edge-scripts.mjs
```

**误触 Production 时的最小动作（与 canary §4 一致）：** R2 + 必要时 R1 → redeploy → 探针。

---

## 5. 执行记录（操作人 · 本波为空）

| 字段 | 内容 |
|------|------|
| 日期 | — |
| 操作人 | — |
| 用户授权摘录 | **无（W3 默认 NOT EXECUTED）** |
| Production deployId / commit | — |
| 阶段 | Prod-A / Prod-B / **未执行** |
| CSP/nonce 观察 | — |
| csp-report 观察窗 | — |
| 回滚 | 无 / R1 / R2 / R3 |
| 备注 | W3 仅建卷宗 |

---

## 6. 明确不做（本卷宗边界）

| 动作 | 状态 |
|------|------|
| 生产 `CSP_DYNAMIC=1` | **NOT EXECUTED** |
| 生产 `CSP_SCRIPT_UNSAFE_INLINE=0` | **NOT EXECUTED** |
| Preview `CSP_DYNAMIC=1` | **未写**（阻断） |
| 改 `next.config.ts` / `proxy.ts` 默认 | **未改** |
| push / 合默认分支 | **未做** |

---

## 7. 交叉引用

- Canary：`docs/ops/csp-dynamic-preview-canary-2026-07-22.md`
- Stage A 阻断：`docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`
- T9：`docs/csp-t9-decision-2026-07-22.md`
- Headers DRIFT：`docs/ops/headers-drift-platform-remediation-2026-07.md`
- W3 报告：`docs/ops/w3-arch-upgrade-chronoportal-claude.md`
- 生产门闩协议：`D:\orca\.planning\portfolio-arch-upgrade-2026h2\task_plan.md` §6
