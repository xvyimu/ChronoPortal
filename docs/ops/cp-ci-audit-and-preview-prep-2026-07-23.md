# ChronoPortal · CI 依赖审计门 + Preview/CSP 预备 · 2026-07-23

> **Worktree：** `xvyimu/cp-ci-audit-prep` · **base tip：** `ae296729`  
> **范围：** P1 CI audit 与 CH 对齐 + Preview Stage A / 生产 CSP **只出清单**  
> **硬红线：** **未 push** · **生产 CSP 未 flip** · `CP_CSP_prod` 仍人 gate · 未提交 `.env*` / embed 本地密钥

---

## 0. 一句话

| 项 | 结果 |
|----|------|
| CI `pnpm audit --audit-level=high` | **已落地**（quality job · 显式 `registry.npmjs.org`） |
| 本地 audit（同命令） | **exit 0** · `No known vulnerabilities found`（0 high / 0 critical） |
| Preview Stage A | **未执行** · 沿用阻断书（`*.vercel.app` 网络） |
| 生产 CSP enforce / 去 `unsafe-inline` | **未执行** · `CP_CSP_prod` DEFER |
| push | **未做** |

---

## 1. CI diff 说明

### 1.1 对照

| 仓 | 步骤 | 备注 |
|----|------|------|
| Chronicle | `pnpm audit --registry=https://registry.npmjs.org --audit-level=high` | quality 内、install 后 |
| ChronoPortal（本轮前） | **无** audit 门 | oss-gap L2 **P1** |
| ChronoPortal（本轮） | 与 CH **同级** high+；**未**放宽到 `critical` | 见下 |

### 1.2 变更点

**文件：** `.github/workflows/ci.yml` · job `quality`

在 `pnpm install --frozen-lockfile` 之后、`ESLint` 之前增加：

```yaml
- name: Dependency audit (high+)
  run: pnpm audit --registry=https://registry.npmjs.org --audit-level=high
```

**为何显式 registry：**

- 本机 `pnpm config get registry` 可能指向 `https://registry.npmmirror.com`（用户/镜像配置）。
- 对 npmmirror 直接 `pnpm audit` → `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`（无 bulk advisories API）。
- GitHub Actions 默认通常是 npmjs；显式 registry 与 Chronicle 一致，避免 runner/镜像漂移导致假失败或假绿。

**未改：** build / e2e / deploy / link-check 拓扑；未改 `audit-level` 为 critical；未加 `continue-on-error`。

### 1.3 本地验证（本 worktree · 2026-07-23）

```powershell
# 镜像无 audit 端点（对照）
pnpm audit --audit-level=high
# → ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS · exit 1

# 与 CI 同命令
pnpm audit --registry=https://registry.npmjs.org --audit-level=high
# → No known vulnerabilities found · exit 0
```

| 级别 | 数量（本轮） |
|------|----------------|
| critical | 0 |
| high | 0 |
| 门闩结果 | **绿** · 无需 patch 债 / 无需 DEFER 漏洞清单 |

> 若未来 CI 红：先 `pnpm audit --registry=https://registry.npmjs.org` 分类；**可修 patch** 走 Dependabot/锁文件最小 bump；**major 债** 记 productDebt，**不要**为过门把 `--audit-level` 偷偷改成 `critical`（除非 CH 同步且有证据）。

### 1.4 可选 P2（本 wt 一并落地）

| 文件 | 说明 |
|------|------|
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 精简 · 与 CH 同形；conduct ≠ security |
| `.editorconfig` | utf-8 / lf / space 2 · md 不 trim 尾空格 |

---

## 2. Preview Stage A · 前置清单（**不执行写 env**）

> 权威 runbook：`docs/ops/csp-dynamic-preview-canary-2026-07-22.md`  
> 阻断书：`docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`（W2/W3 仍有效）  
> 生产卷宗：`docs/ops/w3-csp-prod-gate-dossier.md`（**PROD FLIP NOT EXECUTED**）

### 2.1 必须全部为真再动手

| # | 条件 | 如何确认 |
|---|------|----------|
| 1 | T9″ 代码在目标 tip（nonce / proxy / layout） | ≥ 含 `getCspNonce` / `CSP_DYNAMIC` 接线的 commit |
| 2 | CSP 单元绿 | `pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts` |
| 3 | 边缘 mangled / Rocket Loader 清 | `node scripts/audit-edge-scripts.mjs` → mangled=0 · rocketLoaderHints=false |
| 4 | **执行机**可达 `*.vercel.app` | `curl -sI https://<preview>.vercel.app/` 非 timeout（exit ≠ 28） |
| 5 | Vercel 项目 / scope | `nav-site` · scope 与 `docs/preview-env-setup.md` 一致；`vercel whoami` 可用 |
| 6 | 目标 env **仅 Preview** | Dashboard 不勾 Production；CLI 用 `preview` 环境 |
| 7 | `$BASE` ≠ 生产域 | **禁止** `https://yuanjia1314.ccwu.cc` |

### 2.2 网络 / 环境探针（恢复连通后）

```powershell
# 1) 连通性（任选一个现有 Preview deployment）
$BASE = "https://<preview-deployment>.vercel.app"
if ($BASE -eq "https://yuanjia1314.ccwu.cc") { throw "Refusing production base." }
curl.exe -sI "$BASE/" | findstr /I "HTTP content-security-policy"

# 2) 对照：生产自定义域应仍可达（不等于 Preview 通）
curl.exe -sS "https://yuanjia1314.ccwu.cc/build-info.json"

# 3) 仓库头探针（需 Preview 可达）
pnpm run probe:headers -- --base-url $BASE --compare-repo --json
```

**历史阻断（本机 · 2026-07-23）：** DNS 可解析，但 TCP 到 Vercel Preview 边缘 **connect timeout / reset**；生产 `yuanjia1314.ccwu.cc` 可达。因此 **故意不**写 Preview `CSP_DYNAMIC=1`。

### 2.3 Stage A 最短路径（操作人 · 网络恢复后）

1. **仅 Preview：** `CSP_DYNAMIC=1`（Dashboard 或 `vercel env add CSP_DYNAMIC preview …`）。**不要** Production。  
2. Redeploy 某一 Preview。  
3. `$BASE` = 该次 `*.vercel.app`。  
4. 按 canary runbook §2.3–2.4：头含 nonce CSP；阶段 A 仍可含 `'unsafe-inline'`；功能冒烟。  
5. 失败只做 Preview 回滚（R1/R2）。  
6. 填 runbook §8 执行记录。  
7. Stage B（`CSP_SCRIPT_UNSAFE_INLINE=0`）**仅 Preview**，且须 Stage A 全绿。

### 2.3.1 Stage A 操作核对表（2026-07-24 加深 · 仍不执行写 env）

| 步 | 动作 | 验收 | 回滚 |
|----|------|------|------|
| A0 | 执行机 `curl -sI https://<preview>.vercel.app/` 非 timeout | HTTP 有状态行 | 不通则 **停止**，不写 env |
| A1 | Dashboard/CLI **仅 Preview** 设 `CSP_DYNAMIC=1` | env 列表可见 Preview；Production 无该项 | 删 Preview 变量 |
| A2 | Redeploy 该 Preview | `/build-info.json` commit 与 tip 一致 | Redeploy 旧 deployment |
| A3 | `$BASE` 守卫 ≠ 生产域 | 脚本 `throw` 若等于 `yuanjia1314.ccwu.cc` | — |
| A4 | 头：`Content-Security-Policy` 含 `nonce-`；阶段 A 可含 `'unsafe-inline'` | `curl -sI` / `probe:headers` | Preview R1：关 `CSP_DYNAMIC` |
| A5 | HTML script 带匹配 nonce | `curl -s` 含 `nonce=` | 同 R1 |
| A6 | 功能冒烟 A1–A3（首页/搜索/admin 登录） | 无 enforcing CSP block 红错 | 同 R1 |
| A7 | （可选）Stage B 仅 Preview `CSP_SCRIPT_UNSAFE_INLINE=0` | A 全绿后才做 | R2：恢复 unsafe-inline |

**Env 名 SSOT（勿写密钥）：**

| 名 | Preview Stage A | Preview Stage B | Production（本预备 **禁止**） |
|----|-----------------|-----------------|------------------------------|
| `CSP_DYNAMIC` | `1` | `1` | 不写 |
| `CSP_SCRIPT_UNSAFE_INLINE` | 默认 on | 可试 `0` | 不写 |
| `CSP_REPORT_ONLY` | 默认 | 默认 | 不写 |

**探针命令块（复制用）：**

```powershell
$PROD = "https://yuanjia1314.ccwu.cc"
$BASE = "https://<preview-deployment>.vercel.app"  # 必填真实 Preview
if ($BASE -eq $PROD) { throw "Refusing production base." }

# 连通 + CSP 头
curl.exe -sI --max-time 20 "$BASE/" | findstr /I "HTTP content-security-policy x-nonce"
if ($LASTEXITCODE -ne 0) { throw "Preview unreachable or headers missing." }

# 仓库对照探针
pnpm run probe:headers -- --base-url $BASE --compare-repo --json

# 对照：生产可达 ≠ Preview 通
curl.exe -sS --max-time 15 "$PROD/build-info.json"
```

**明确：`CP_CSP_prod` 未执行。** 本表与 §3 均不授权 Production env 或默认策略变更。全日审查见 `docs/ops/cp-day-sec-surface-2026-07-24.md`。

### 2.4 本地替代证据（**不能**代替 Preview E2E）

| 检查 | 命令 |
|------|------|
| CSP 契约 | `pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts tests/probe-security-headers.test.ts` |
| 动态 attachment 形状 | import `createDynamicCspAttachment` with `CSP_DYNAMIC:'1'` → `dynamic:true` + nonce + Stage-A `unsafe-inline` |
| 生产边缘只读 | `node scripts/audit-edge-scripts.mjs` |

---

## 3. 生产 CSP · **明确未执行**

| 动作 | 本会话 |
|------|--------|
| Production `CSP_DYNAMIC=1` | **未写** |
| Production `CSP_SCRIPT_UNSAFE_INLINE=0` | **未写** |
| 代码默认 flag 改为生产 enforcing 终态 | **未改** |
| 宣称生产 cutover / 上线 | **无** |
| portfolio gate `CP_CSP_prod` | **仍 DEFER · 人 gate** |

默认生产路径（代码现状摘要，非本轮改动）：

- `CSP_DYNAMIC` 默认 off  
- `CSP_SCRIPT_UNSAFE_INLINE` 默认 on（enforcing 仍含 script `'unsafe-inline'`）  
- Report-Only / nonce builder / proxy 接线已存在，**挂载默认关闭**

权威决策与卷宗：

- `docs/csp-t9-decision-2026-07-22.md`
- `docs/ops/w3-csp-prod-gate-dossier.md`
- `docs/ops/L2-hygiene-checklist.md` §1.3 红线

**本预备文档不授权任何 Production env 或生产 CSP 默认策略变更。**

---

## 4. 完成定义对照

| 定义 | 状态 |
|------|------|
| CI audit 门落地或明确阻断 | **落地** · 本地 exit 0 |
| Preview/CSP 只有预备文档，无生产 flip | **是**（本文 + 既有阻断书/卷宗） |
| 未 push | **是**（commit 仅 local） |

---

## 5. 交叉引用

- OSS 矩阵：`D:\orca\.planning\oss-portfolio-gate-2026-07-23\chronoportal-oss-gap-2026-07-23.md`（L2 P1）  
- Chronicle CI 对齐源：`Chronicle/.github/workflows/ci.yml` quality · `pnpm audit --registry=https://registry.npmjs.org --audit-level=high`  
- Preview canary：`docs/ops/csp-dynamic-preview-canary-2026-07-22.md`  
- Stage A 阻断：`docs/ops/csp-dynamic-preview-stage-a-blocker-2026-07-23.md`  
- 生产 CSP 卷宗：`docs/ops/w3-csp-prod-gate-dossier.md`  
- 形态栈 SSOT：`docs/PROJECT.md` · 安全：`SECURITY.md`
