# ChronoPortal · M-CP-csp-sentry-vitals · W9 证据 · 2026-07-24

> **Worktree / 分支：** `xvyimu/cp-csp-sentry-vitals`  
> **模块：** 观测完善（csp-report / Sentry / web-vitals）  
> **红线：** **未放宽生产 CSP** · **未写 Production `CSP_*`** · **未 push master** · 声明 **NOT_RELAXED**

---

## 0. 一句话

| 项 | 结果 |
|----|------|
| csp-report residual sanitize | **做** · `data:`/`blob:` 折叠 · URI 200 字截断 · 停发 `original-policy` |
| web-vitals 可测性 | **做** · 成功/采样/校验/413 路径测全 · body 4KiB 上限 · sample rate 0/1 短路 |
| 生产 CSP flip | **未做** · `CP_CSP_prod` 仍人 gate |
| CSP 策略放宽 | **NOT_RELAXED** · 未改 `lib/csp.ts` 默认 flag / next.config CSP |
| push master | **未做** · 仅 feature 分支可 push |

---

## 1. 变更清单（最小 diff）

| 文件 | 变更 |
|------|------|
| `app/api/csp-report/route.ts` | `toPathOnlyUri`：`data:`/`blob:` → scheme only；path-only 后 **200** 字 cap；log/Sentry **不再**带 `originalPolicy`；directive/disposition 切片与 emit 对齐 |
| `tests/api-csp-report.test.ts` | 覆盖 data/blob/cap + 断言无 `originalPolicy` |
| `app/api/web-vitals/route.ts` | body **4_096** 上限（413）；`shouldSample` rate≤0 / ≥1 短路；emit 字段长度守卫 |
| `tests/api-web-vitals.test.ts` | 成功路径、CLS unit、400/403/413、sample=0、限流参数序 |

**未改：** `lib/csp.ts` · `next.config` CSP · proxy 默认 · Production env · webpack 策略。

---

## 2. 声明 NOT_RELAXED

| 检查 | 状态 |
|------|------|
| Enforcing 默认仍含 script `'unsafe-inline'`（除非 env 关） | **保持** |
| `CSP_DYNAMIC` 默认 off | **保持** |
| 本 diff 无 CSP header 字符串放宽 | **是** |
| 生产 cutover / Preview Stage A 写 env | **本模块未执行** |

权威：`docs/csp-t9-decision-2026-07-22.md` · `docs/ops/w3-csp-prod-gate-dossier.md` · `docs/ops/cp-preview-stage-a-prep-2026-07-24.md`。

---

## 3. 验证（本会话实跑）

```text
pnpm exec vitest run tests/api-csp-report.test.ts tests/api-web-vitals.test.ts tests/csp.test.ts
→ 3 files / 30 tests · EXIT=0
```

| 命令 | Exit | 备注 |
|------|------|------|
| vitest（上） | **0** | 3 files / 30 tests · csp-report + web-vitals + csp |
| `pnpm run typecheck` | **2** | **residual 非本 diff**：`tests/probe-security-headers.test.ts` `ProcessEnv`/`NODE_ENV`（W5 债；`xvyimu/cp-typecheck-probe-headers` 另轨） |

---

## 4. 风险一句

公开 POST sink 仍可被刷配额（已有限流 + 采样）；脱敏 residual 降低日志/Sentry 泄漏面，**不**改变 CSP 拦截强度；多实例未配 Upstash 时配额仍 ×N（fail-open residual，不本轮改默认）。

---

## 5. 完成定义

| 定义 | 状态 |
|------|------|
| 观测路径更可测 / 更干净 | **是** |
| 采样脱敏 residual | **是** |
| NOT_RELAXED | **声明** |
| evidence + exit | **本文** |
| feature push | tip 推 `origin/xvyimu/cp-csp-sentry-vitals`（非 master） |
