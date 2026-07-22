# CSP_DYNAMIC · Preview 金丝雀 Runbook

> **范围：仅 Vercel Preview（或本机）**  
> **禁止：生产 env 打开 `CSP_DYNAMIC` / 去掉 `CSP_SCRIPT_UNSAFE_INLINE`**  
> 任务：T-CP-002 · 日期：2026-07-22 · tip 依赖：T-CP-001（`80e12388` 及以后）

人工操作清单。不改 `next.config` / `proxy` 默认 flag；不宣称生产 cutover。

> **环境 guard：** `$BASE` 必须是这次 Preview deployment 的 `*.vercel.app` URL（或显式本机 URL），绝不能是 `yuanjia1314.ccwu.cc`。在 Vercel 设置变量时，截图/记录中必须能证明只选择了 **Preview**，不选择 Production；不要在 runbook、日志或记录中写入任何密钥。

---

## 0. 目的

在 **preview** 验证 T9″ 接线：

1. `CSP_DYNAMIC=1` → proxy 发带 nonce 的 CSP + `x-nonce`；layout / 首页 / tool JSON-LD / `Analytics` 挂 nonce。  
2. 冒烟通过后再 **可选** 设 `CSP_SCRIPT_UNSAFE_INLINE=0`，观察脚本是否仍可执行。  
3. 失败则按 §回滚 恢复；**生产保持默认**（DYNAMIC off、unsafe-inline on）。

---

## 1. 前置（全部满足再动手）

| # | 条件 | 如何确认 |
|---|------|----------|
| 1 | T9″ 代码已合入 master | `git log -1 --oneline` 含 T-CP-001 / `getCspNonce` 相关提交（≥ `80e12388`） |
| 2 | 单元测试绿 | `pnpm exec vitest run tests/csp.test.ts` |
| 3 | Rocket Loader / 边缘 mangled type 已清 | `node scripts/audit-edge-scripts.mjs` → `mangledScriptTypeCount=0` · `rocketLoaderHints=false`（生产 host；见 `docs/cloudflare-edge-csp-hardening-2026-07-22.md`） |
| 4 | Preview 可部署 | Vercel 项目 `nav-site`（或当前 ChronoPortal 绑定项目）；scope 与 `docs/preview-env-setup.md` 一致 |
| 5 | 操作对象是 **Preview** env | Vercel → Project → Settings → Environment Variables → 目标选 **Preview**，**不要**勾 Production |
| 6 | 目标 URL 不是生产域 | `$BASE` 为本次部署生成的 `*.vercel.app` URL（或 `localhost`），不等于 `https://yuanjia1314.ccwu.cc` |

代码路径（只读确认，本 runbook 不改）：

- `lib/csp.ts` — flags / builders / `createDynamicCspAttachment`
- `lib/csp-server.ts` — `getCspNonce()`（仅 dynamic 时读 `headers()`）
- `proxy.ts` — `CSP_DYNAMIC=1` 时写 CSP + `x-nonce`
- `next.config.ts` — dynamic 时跳过静态 CSP 头
- `components/Analytics.tsx` — 外置 gtag + `/api/ga`，可接 nonce

---

## 2. 阶段 A — Preview 打开 `CSP_DYNAMIC=1`

### 2.1 设 env（Preview only）

Vercel Dashboard **或** CLI（示例；按实际 project/scope 调整）：

```powershell
# 确认当前默认：生产/仓库默认 CSP_DYNAMIC 为 off，不要改 Production
cd D:\ChronoPortal

# 推荐 Dashboard：Environment Variables → Preview → 新增
#   CSP_DYNAMIC = 1
# 不要勾选 Production

# CLI 示例（interactive / 按 vercel 当前语法）：
# vercel env add CSP_DYNAMIC preview
# 值填：1
```

本机对照（可选，**勿**把 preview 专用值写进提交）：

```powershell
# .env.local（仅本机）
# CSP_DYNAMIC=1
# CSP_SCRIPT_UNSAFE_INLINE=1   # 阶段 A 保持默认 on
```

### 2.2 触发 Preview 部署

- 推已含 T9″ 的分支开 PR → 等 Preview URL，**或**
- `vercel redeploy <existing-preview-url> --scope <your-scope>`（需重新读 env）

记下：

| 项 | 值 |
|----|-----|
| Preview base URL | `https://….vercel.app` |
| `/build-info.json` commit | （部署后填写） |

### 2.3 头与 nonce 冒烟

对 **Preview URL**（把 `$BASE` 换成实际地址）：

```powershell
$BASE = "https://<preview>.vercel.app"

if ($BASE -eq "https://yuanjia1314.ccwu.cc") { throw "Refusing to run the Preview canary against production." }

# 应出现 Content-Security-Policy，且含 nonce- 与（阶段 A）'unsafe-inline'
curl.exe -sI "$BASE/" | findstr /I "content-security-policy x-nonce"

# HTML：script 上应有 nonce=（layout / next/script 路径）
curl.exe -s "$BASE/" | findstr /I "nonce="
```

期望（阶段 A）：

| 检查 | 期望 |
|------|------|
| 响应头 `Content-Security-Policy` | 存在；含 `'nonce-…'`；仍可含 `'unsafe-inline'`（迁移期浏览器会忽略 inline 当 nonce 在场） |
| 响应头 `Content-Security-Policy-Report-Only` | 默认仍在（`CSP_REPORT_ONLY` 未关时）；`script-src` 无 unsafe-inline |
| `x-nonce` | 可有（proxy 写出；客户端不依赖此名，以 CSP 与 script nonce 为准） |
| HTML | 关键 `<script>` / next script 带匹配 nonce |

以下任一情况都判定阶段 A 失败：生产域被用作 `$BASE`、响应中没有 enforcing CSP、没有 `'nonce-'`、首页出现 enforcing CSP block，或部署 commit 与记录的 Preview commit 不一致。失败时只执行 §4 的 **Preview** 回滚，不进入阶段 B。

若 **无** CSP 或 **无** nonce：确认 Preview env 真是 `CSP_DYNAMIC=1` 且该部署已 redeploy；再查 Vercel Runtime Logs。

### 2.4 功能冒烟（阶段 A 必做）

浏览器打开 Preview（无扩展干扰更佳；可开无痕）：

| # | 路径 / 动作 | 通过标准 |
|---|-------------|---------|
| A1 | 首页 `/` | 渲染完整；控制台无 CSP **blocked** 红错（Report-Only 的 report 可有，记下即可） |
| A2 | 搜索（关键词 + 若有语义开关） | 结果返回；`/api/search` 非 5xx |
| A3 | Admin：`/login` → `/admin` | 可登录；后台页可加载（需 Preview 已配 admin hash，见 preview-env-setup） |
| A4 | GA Network | DevTools → Network：出现 `googletagmanager.com/gtag/js` 与同源 `/api/ga?id=`（若 Preview 配置了有效 `NEXT_PUBLIC_GA_MEASUREMENT_ID`；未配则跳过并注明） |
| A5 | 任一 tool 页 `/tool/<slug>` | 页可开；JSON-LD 不导致脚本阻断 |
| A6 | 健康 | `GET $BASE/api/health` → 业务 checks 不因 CSP 变 error |

可选自动化：

```powershell
pnpm run verify:production -- --base-url $BASE --expect-commit <preview-sha>
# 或：
node scripts/probe-production.mjs --no-proxy --base-url $BASE
```

阶段 A **失败** → 不要做阶段 B；直接 §4 回滚 DYNAMIC。

---

## 3. 阶段 B — 可选：Preview `CSP_SCRIPT_UNSAFE_INLINE=0`

**仅当阶段 A 全部勾选通过** 后再做。仍只改 **Preview**。

### 3.1 设 env

```text
Preview:
  CSP_DYNAMIC=1
  CSP_SCRIPT_UNSAFE_INLINE=0
```

Redeploy Preview。

### 3.2 再验

| # | 检查 | 通过标准 |
|---|------|---------|
| B1 | CSP 头 | Enforcing `script-src` **无** `'unsafe-inline'`（可有 `'nonce-…'` + `'strict-dynamic'`） |
| B2 | 首页 / 搜索 / Admin | 同 A1–A3，无脚本被 CSP **enforcing** 阻断 |
| B3 | GA | 同 A4；若 gtag 被拦 → 记 Network + console，回滚 B |
| B4 | Sentry / 日志 | 若有 `source:csp-report` 或 `message:"csp-report:"`，聚类是否可解释（RO 仍可能上报） |

阶段 B 失败 → §4 先恢复 `CSP_SCRIPT_UNSAFE_INLINE`（不设或 `1`），必要时再关 DYNAMIC。

---

## 4. 回滚（Preview）

按严重程度从轻到重：

| 步骤 | 操作 | 何时 |
|------|------|------|
| R1 | Preview：`CSP_SCRIPT_UNSAFE_INLINE` 删变量或设 `1` → redeploy | 阶段 B 脚本被拦 |
| R2 | Preview：`CSP_DYNAMIC` 删变量或设 `0` → redeploy | 阶段 A 头/页面异常；回到 next.config 静态 CSP |
| R3 | 回退部署到金丝雀前 Preview deployment | env 回滚仍坏时 |

生产：**不要**为本次实验改 Production 的上述变量。若误改 Production：

1. Production：`CSP_DYNAMIC` → 删除或 `0`  
2. Production：`CSP_SCRIPT_UNSAFE_INLINE` → 删除或 `1`  
3. 立即 redeploy Production  
4. `node scripts/probe-production.mjs --no-proxy` + 浏览器抽检首页

---

## 5. 验收勾选表

### 5.1 前置

- [ ] tip ≥ T-CP-001 / `getCspNonce` 已在部署分支  
- [ ] `tests/csp.test.ts` 绿  
- [ ] 边缘：`mangledScriptTypeCount=0`，Rocket Loader off  
- [ ] 变更仅 Preview env（生产未动）

### 5.2 阶段 A（`CSP_DYNAMIC=1`，unsafe-inline 仍 on）

- [ ] Preview redeploy 完成，commit 已记录  
- [ ] 响应 CSP 含 nonce  
- [ ] 首页 OK  
- [ ] 搜索 OK  
- [ ] Admin 登录/后台 OK  
- [ ] GA 外置脚本 OK 或明确 N/A（无 measurement id）  
- [ ] tool 页 OK  

### 5.3 阶段 B（可选）

- [ ] Preview `CSP_SCRIPT_UNSAFE_INLINE=0`  
- [ ] Enforcing 无 script unsafe-inline  
- [ ] 首页 / 搜索 / Admin / GA 仍 OK  
- [ ] 已知 CSP report 可解释  

### 5.4 收尾

- [ ] 实验结束：Preview 按需保留 DYNAMIC 作观察，**或** R1/R2 关回默认  
- [ ] **生产** 仍为：`CSP_DYNAMIC` off · `CSP_SCRIPT_UNSAFE_INLINE` on  
- [ ] 未在文档/聊天声称「生产已 cutover」

---

## 6. 明确不做

- 不在本 runbook 执行中改 `next.config.ts` / `proxy.ts` 默认逻辑  
- 不在 mangled type >0 或未 nonce 时对生产设 `CSP_SCRIPT_UNSAFE_INLINE=0`  
- 不把 Preview 金丝雀结果等同生产验收  
- 不关 style-src 的 `'unsafe-inline'`（本任务范围外）

---

## 7. 相关文档与代码

| 资源 | 路径 |
|------|------|
| T9 决策 | `docs/csp-t9-decision-2026-07-22.md` |
| 边缘关闭清单 | `docs/cloudflare-edge-csp-hardening-2026-07-22.md` |
| L2 P0 board | `docs/ops/L2-P0-action-board-2026-07-22.md` |
| Preview env | `docs/preview-env-setup.md` |
| Env 模板 | `.env.local.example`（CSP 段） |
| 生产探针 | `scripts/probe-production.mjs` |
| 边缘审计 | `scripts/audit-edge-scripts.mjs` |

---

## 8. 执行记录（操作人填写）

| 字段 | 内容 |
|------|------|
| 日期 | |
| 操作人 | |
| Preview URL | |
| Preview-only 环境选择证据（不含密钥） | |
| commit | |
| 阶段 A CSP/nonce 观察（nonce 值可打码） | |
| 阶段 A | 通过 / 失败 / 跳过 |
| 阶段 B | 通过 / 失败 / 未做 |
| 回滚 | 无 / R1 / R2 / R3 |
| 备注 | |
