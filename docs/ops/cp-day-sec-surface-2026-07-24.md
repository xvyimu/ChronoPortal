# ChronoPortal · DAY 安全面 + CI 巩固 · 2026-07-24

> **Worktree / 分支：** `xvyimu/cp-day-sec-surface`  
> **base tip 起点：** `e028483e`（`ci(security): add pnpm audit high gate aligned with Chronicle`）  
> **红线：** **未 push** · **生产 CSP 未 flip** · `CP_CSP_prod` 仍人 gate · 未提交 `.env*` / embed 本地密钥 · 无 exploit PoC

---

## 0. 一句话

| 项 | 结果 |
|----|------|
| CI `pnpm audit --audit-level=high` | **在** · 本地 exit **0** · 契约测锁定防静默弱化 |
| 安全面高置信审查 | **完成** · 1 条 FIX_NOW 已修（csp-report 限流参数对调） |
| Preview Stage A | **未执行** · 文档加深；网络阻断仍有效 |
| 生产 CSP enforce / 去 `unsafe-inline` | **未执行** · `CP_CSP_prod` DEFER |
| push | **未做** |

---

## 1. P0 继承

| 源 | 状态 |
|----|------|
| `docs/ops/cp-ci-audit-and-preview-prep-2026-07-23.md` | 已读 · CI 门已落地 |
| `.github/workflows/ci.yml` quality | install → **Dependency audit (high+)** → lint → typecheck → coverage |
| `SECURITY.md` | admin `requireAdmin` / 限流 / scrypt / CSP 清单仍有效 |
| `git log -8` tip | 含 `e028483e` audit 门 |

---

## 2. P1 CI 巩固

### 2.1 本地 audit

```powershell
pnpm audit --registry=https://registry.npmjs.org --audit-level=high
# → No known vulnerabilities found · EXIT=0
```

| 级别 | 数量 |
|------|------|
| critical | 0 |
| high | 0 |

> 无 registry 时（镜像）仍会 `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS` — CI 必须显式 `registry.npmjs.org`。

### 2.2 契约测（本轮）

**文件：** `tests/ci-workflow.test.ts`  
**commit：** `b4865cbb` `test(ci): lock audit-high gate against silent weaken`

断言：

- quality 中 `pnpm install --frozen-lockfile` 后出现 `Dependency audit (high+)` 与  
  `pnpm audit --registry=https://registry.npmjs.org --audit-level=high`
- **禁止**该步骤 `continue-on-error: true`
- **禁止** `--audit-level=critical` 静默降级

本地：`pnpm exec vitest run tests/ci-workflow.test.ts` → **5 passed · exit 0**

### 2.3 未改 CI 拓扑

未动 build / e2e / deploy / link-check；未加 `continue-on-error`；未放宽 audit-level。

---

## 3. P2 安全面审查（高置信 only）

### 3.1 范围

| 面 | 路径 |
|----|------|
| Admin API | `app/api/admin/**` + `lib/with-admin.ts` + `proxy.ts` auth gate |
| Auth | `lib/auth.ts` · `lib/admin-password.ts` · Credentials 限流 deny |
| Checkout / Webhook | `app/api/checkout` · `app/api/webhook`（`ENABLE_PAYMENTS_API` 桩） |
| Submit / Favorites | `app/api/submit` · `app/api/favorites` |
| 相关 | click / reviews / resource-ratings / csp-report / favicon / search / rate-limit |

### 3.2 发现表

| # | 等级 | 位置 | 原理 | 利用前提 | 测保护 | 本轮 |
|---|------|------|------|----------|--------|------|
| 1 | **High** | `app/api/csp-report/route.ts` `checkDistributedRateLimit` | 参数顺序写成 `(key, max=60, windowMs=60000)`，与 API `(bucketKey, windowMs, maxAttempts)` 相反 → 实际约 **60ms 窗、60000 次**，限流几乎失效，CSP report / Sentry 可被刷爆 | 公开 POST `/api/csp-report`；无 auth | 否 → **本轮补测** | **FIX_NOW** |
| 2 | Medium | `checkRateLimit` 默认 `failurePolicy="allow"` | 敏感路径若漏传 policy 会 fail-open | 新路由误用默认 | 部分（atomic 测有 allow 路径） | **DEBT** |
| 3 | Medium | `checkClickRateLimit` DB 错时 `allowed: true` | 废弃路径 fail-open；现行 `tryRecordClick` 写失败不 increment（更安全） | 调用废弃 API | 弱 | **DEBT**（标 deprecated 已有） |
| 4 | Low | 分布式限流默认 memory 回退 | 多实例配额 ×N；生产可 `DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED=1` | 未配 Upstash 或未 fail-closed | 有 distributed 测 | **DEBT / ACCEPT**（文档已说明） |
| 5 | Info | favorites service_role 绕过 RLS | 应用层 session.user.id 隔离；客户端 userId 忽略 | 需破 NextAuth session | 有 IDOR 测 | **ACCEPT**（已知架构债，注释 follow-up JWT/RPC） |
| 6 | Info | checkout/webhook 501 桩 | flag off → 404；on → 501 无签名实现 | `ENABLE_PAYMENTS_API=1` 误开 | `api-disabled-features` | **ACCEPT** 至真实支付实现前保持 0 |

### 3.3 FIX_NOW 落地

| 文件 | 变更 |
|------|------|
| `app/api/csp-report/route.ts` | `checkDistributedRateLimit(key, 60_000, 60)` |
| `tests/api-csp-report.test.ts` | 断言参数顺序 60s / 60 次 |

### 3.4 已有控制摘要（做得好）

- **Admin 双闸：** `proxy.ts` role===admin + `withAdmin*` 二次 `requireAdmin`；写路径 `checkOrigin` CSRF + Zod
- **登录：** `login_attempts` + `failurePolicy: "deny"` + 恒定延迟 + scrypt / 生产禁明文
- **Submit / favorites / resource-ratings / reviews：** 写路径 deny 限流 + CSRF + Zod
- **Favorites IDOR：** session userId only；`tests/api-favorites.test.ts` 覆盖
- **Favicon SSRF：** 仅白名单 CDN 模板 + `isBlockedOutboundHost` + body 上限
- **Click：** `tryRecordClick` 原子 UNIQUE，写失败不 +1
- **Payments：** 默认 404 隐藏
- **getClientIp：** Vercel 取 XFF 最右 / `x-vercel-forwarded-for`，防客户端轮换伪造

### 3.5 债表候选（不本轮修）

1. 将 `checkRateLimit` 默认改为要求显式 policy（或 lint/测试扫所有 call sites）  
2. 删除或硬 fail `checkClickRateLimit` 废弃路径  
3. 生产确认 Upstash + 评估 `DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED`  
4. favorites：SECURITY DEFINER RPC / Supabase JWT sub 对齐（注释已记）  
5. 真实 Stripe webhook 签名校验（启用支付前硬门槛）

---

## 4. P3 Preview / CSP 预备（文档 only）

权威加深见：

- 本文 §4.1–4.3  
- 扩展：`docs/ops/cp-ci-audit-and-preview-prep-2026-07-23.md` §2（本轮补丁）  
- 阻断书仍有效：`docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`  
- Runbook：`docs/ops/csp-dynamic-preview-canary-2026-07-22.md`

### 4.1 Env 名（**仅 Preview 可写；本会话未写**）

| 变量 | Stage A | Stage B | Production |
|------|---------|---------|------------|
| `CSP_DYNAMIC` | `1` | `1` | **禁止本轮写** · 默认 off |
| `CSP_SCRIPT_UNSAFE_INLINE` | 保持默认 on（`1`/unset） | 仅 Preview 可试 `0` | **禁止** |
| `CSP_REPORT_ONLY` | 默认 on 可留 | 同左 | 不本轮改 |

### 4.2 Stage A 探针命令（网络恢复后 · 操作人）

```powershell
# 拒绝生产域
$BASE = "https://<preview-deployment>.vercel.app"
if ($BASE -eq "https://yuanjia1314.ccwu.cc") { throw "Refusing production base." }

# 连通
curl.exe -sI "$BASE/" | findstr /I "HTTP content-security-policy x-nonce"

# 仓库契约对照
pnpm run probe:headers -- --base-url $BASE --compare-repo --json

# 边缘只读（生产 host 可，不等于 Preview Stage A）
node scripts/audit-edge-scripts.mjs
```

**本机历史：** `*.vercel.app` connect timeout；**故意不**写 Preview env。

### 4.3 明确未执行

| 动作 | 状态 |
|------|------|
| Preview `CSP_DYNAMIC=1` | **未写** |
| Production 任何 `CSP_*` | **未写** |
| 代码默认改为生产 enforcing 终态 | **未改** |
| `CP_CSP_prod` | **仍 DEFER · 人 gate** |

---

## 5. P4 验证

| 命令 | Exit | 备注 |
|------|------|------|
| `pnpm audit --registry=https://registry.npmjs.org --audit-level=high` | **0** | 0 high / 0 critical |
| `pnpm exec vitest run tests/ci-workflow.test.ts` | **0** | 5 passed |
| `pnpm exec vitest run tests/api-csp-report.test.ts`（+ 相关安全测，**无** `UPSTASH_*`） | **0** | 11 files / 208 tests |
| `pnpm test`（本机 shell 带 `UPSTASH_REDIS_REST_*`） | **1** | 9 fail：fetch mock 被 Upstash pipeline 抢占（favicon/search/resource-library/search-opt）— **环境泄漏，非本 diff 回归** |
| `pnpm run typecheck` | **2** | 既有：`tests/probe-security-headers.test.ts` `ProcessEnv`/`NODE_ENV` 类型 — **非本 diff** |
| `pnpm run lint` | **2** | 既有：`minimatch` `expand is not a function`（eslint/minimatch 栈）— **非本 diff** |

**CI 侧：** quality 无本机 `UPSTASH_*` 注入；audit 门 + 契约测可绿。本 wt 不修 typecheck/lint 预存债。

---

## 6. 完成定义对照

| 定义 | 状态 |
|------|------|
| 安全审查表 | **有**（§3） |
| CI 巩固 | **有**（audit 绿 + 契约测 commit） |
| Preview 文档加深 | **有**（§4 + prep 扩展） |
| 无 CSP 生产 flip | **是** |
| 未 push | **是** |

---

## 7. 交叉引用

- 昨日预备：`docs/ops/cp-ci-audit-and-preview-prep-2026-07-23.md`  
- Stage A 阻断：`docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`  
- 生产 CSP 卷宗：`docs/ops/w3-csp-prod-gate-dossier.md`  
- 安全策略：`SECURITY.md`  
- 形态栈：`docs/PROJECT.md`
