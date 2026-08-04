# 生产 smoke 门清债 — 2026-08-04

分支 `cp-debt-0804`。对象：issue #18（2026-07-16 起红，每 6h 刷新一次，累计 74 条评论）。

## 摘要

issue #18 里两条失败，**都不是资源库故障**：

| 失败项 | 结论 | 真因 |
|--------|------|------|
| `health … resourceLibrarySearch=error` | **真红，但根因不是凭证** | 探针超时阈值 1500ms 覆盖不住 Vercel 冷启动 |
| `home 403` | **假红** | Cloudflare 拦 GitHub Actions 出口网段 |

**需要用户手工做的事：0 项。不需要改任何 Vercel 环境变量。** 详见下节。

---

## 一、resourceLibrarySearch=error — 推翻"ANON_KEY 失效"假设

任务交办时的假设是「生产 `RESOURCE_LIBRARY_ANON_KEY` 失效/未配/写错，可能与 Supabase legacy JWT → publishable key 迁移有关」。
**实测证据否定了这个假设**，逐条列出。

### 证据 1 — 两种 key 都能正常调用该 RPC

```
POST /rest/v1/rpc/resource_search_health
  legacy anon JWT (…role":"anon"…)      -> 200  true
  sb_publishable_FO8_TPD1dSqIrjwtci4f4w -> 200  true
```

两把 key 都活着，迁移没有造成断裂。

### 证据 2 — 线上此刻自报 `ok`，不是 `error`

`GET /api/health` 实测（commit `46e71ec3`, deploy `dpl_rGFZxkqt2SoBoytDECx7oNBs9ceF`）：

```json
"resourceLibrarySearch": { "status": "ok", "latency_ms": 861,
                           "detail": "public resource search RPC reachable" }
```

若 key 失效，这里应当**恒定** `error`。连续探测 26 次（14 次背靠背 + 12 次间隔 45s），
**26/26 全部 `ok`**。凭证失效不会有这种表现。

### 证据 3 — 决定性：issue 历史是 PASS/FAIL **交替**

```
2026-07-26T03:54  FAIL      2026-07-28T19:51  PASS
2026-07-26T13:55  PASS      2026-07-29T03:37  FAIL
2026-07-27T04:02  PASS      2026-07-29T09:07  PASS
2026-07-27T15:12  FAIL      2026-07-30T03:27  PASS
…                           2026-08-02T19:33  PASS
```

**一把失效的 key 不会每隔几小时自己好一次。** 交替 = 时序/竞态，不是配置错误。

### 证据 4 — 因果链闭合

`app/api/health/route.ts` 用 `AbortSignal.timeout(1500)` 限制该 RPC。实测 supabase-js
在 abort 时的行为：

```
$ node  → sb.rpc("resource_search_health").abortSignal(AbortSignal.timeout(1))
超时→返回 error 对象: {"message":"TimeoutError: The operation was aborted due to timeout",
                      "details":"…","hint":"","code":""}
```

关键：超时**不抛异常**，而是返回 `error` 对象，于是落进 `if (error)` 分支，
产出 detail = `"public resource search RPC unavailable"` —— **与线上报错字符串逐字相同**。
「凭证失效」和「慢了 1.5 秒」在这段代码里产出完全一样的信号。

再看延迟分布（间隔 45s 采样 12 次，第一次命中冷启动）：

```
up=     3s  rl= 1285ms   ← 冷启动，距 1500ms 阈值余量仅 215ms
up=    52s  rl=  698ms
up=   244s  rl=  273ms
…热态区间 230–803ms
```

冷启动 1285ms，阈值 1500ms。**余量 215ms** —— 网络稍有抖动即超时。
CI 每 6h 跑一次，命中的往往是空闲后的冷启动实例，所以 FAIL 频率高但不是 100%。

### 结论

数据库侧正常（这点与交办前提一致），调用侧也正常——**取 key 的逻辑没有 bug，key 本身也没问题**。
故障是**阈值定得太紧**，把"慢"误报成了"坏"。

引入该阈值的 commit：`1056da36` (2026-07-09 `chore: tighten production health runbook`)，
与 issue 首次出现（2026-07-16）时间吻合。

### 修复（代码侧，已完成）

`app/api/health/route.ts`：

1. 阈值 `1500ms → 4000ms`：冷启动实测上界 1285ms，留 ~3x 余量。
2. 新增 `isAbortTimeoutError()`：把超时与真故障分开。
   - 超时（`code` 为空 + message 含 timeout/aborted）→ `skipped`，detail 写明超时毫秒数。
     语义：**没测出来 ≠ 坏了**。
   - 真故障（携带 PostgREST code，如 `42883` 函数不存在 / `401` 凭证失效 / `PGRST202`）
     → 仍然 `error`，仍然失败门禁。**凭证真失效时不会被这个改动掩盖。**

### 用户需要做什么

**不需要改任何环境变量。** `RESOURCE_LIBRARY_ANON_KEY` 当前配置是正确的、有效的。

供参考——若将来确需轮换，该项目（`ihnmfsfbfnctgkhxmghk`）两种 key 均可用：

| 类型 | 值 | 说明 |
|------|-----|------|
| legacy anon JWT | `eyJhbGciOiJIUzI1NiIs…` (exp 2036) | 当前生产在用，仍有效 |
| publishable | `sb_publishable_FO8_TPD1dSqIrjwtci4f4w_aFRbCMlu` | 新格式，实测同样可调用该 RPC |

轮换属于可选的现代化动作，**不是本次故障的修复项**，也不紧急。

---

## 二、home 403 — 假红，选方案 (a) 并说明为何不选 (b)

### 事实

- 本地实测首页 **200**，841701 bytes 正常页面。空 UA / node UA / 浏览器 UA / **探针原样 UA
  (`nav-site-production-probe`) 全部 200** —— 排除「按 UA 拦截」。
- 响应头确认 Cloudflare 在链路上：`Server: cloudflare`、`CF-RAY: …-SIN`、`cf-cache-status: HIT`，
  同时带 Vercel 源站标记 `x-vercel-id`、`x-matched-path`。
- 结论：Cloudflare 按**来源 IP 网段**拦 GitHub Actions，站点本身健康。

### 选 (a) 改探针，不选 (b) 加 WAF 豁免

理由：

1. **(b) 是拿生产安全姿态换 CI 绿灯。** 豁免 GitHub Actions 全网段等于对一大片公共云
   IP 开口子；换成 bypass token 则要把长期有效的凭证放进 CI secrets，泄露即等于 WAF 失效。
   为了修一条监控噪音去削弱生产防护，代价方向错了。
2. **(a) 修的是真正错的那一环。** 探针的职责是判断「应用是否健康」，而边缘在源站之前就
   拒绝了请求 —— 此时探针**什么都没测到**。把「没测到」报成「应用坏了」是探针的逻辑缺陷，
   跟 WAF 配置无关。
3. (b) 还需要用户去 Cloudflare 控制台操作；(a) 落在仓库里、可测试、可 review。

### 实现（`scripts/probe-production.mjs`）——如何避免一刀切吞掉真 403

新增 `classifyForbidden(headers)`，**按"谁回的 403"分流**，而不是按状态码：

| 判据 | 分类 | 处理 |
|------|------|------|
| 有源站标记（`x-vercel-id` / `x-matched-path` / `x-nextjs-*`） | `origin` | **FAIL** — 应用自己回的 403，是真故障 |
| 无源站标记 + `server: cloudflare` | `edge` | SKIP — 请求没到应用，无从判断健康 |
| 都不匹配 | `unknown` | **FAIL** — 不认识就不放过 |

三重收窄，确保不会瞎掉真故障：

1. **仅限白名单端点。** 只有 `home` / `tool-detail`（纯 HTML 页）标了 `wafTolerant`。
   `/api/health` 和 `/api/search` **故意不标** —— 它们承载真实信号，403 永远失败。
   已有测试钉住这条（"never tolerates a 403 on the health endpoint even behind Cloudflare"）。
2. **源站回的 403 依然 FAIL。** 鉴权回归、middleware 配错等真 403 会带 `x-vercel-id`，
   归为 `origin` → 失败，报错写明 `HTTP 403 issued by origin (not an edge block)`。
3. **防"全被挡"静默通过。** `assertProbePassed()` 新增：若**所有**端点都是 SKIP，
   抛 `Production probe inconclusive` 并失败。否则整站彻底宕机（边缘全拦）会和健康
   完全无法区分 —— 这是这类"容错"最危险的退化方向，必须堵住。

摘要输出新增 `SKIP` 标记，与 PASS 区分，CI 日志里一眼能看出「这项没测」而非「这项没问题」。

---

## 三、任务 C — ip-address medium 告警

依赖链：`@modelcontextprotocol/sdk → express-rate-limit@8.5.2 → ip-address`（传递依赖，
devDependency 侧），所以走 overrides。

`pnpm-workspace.yaml` 的 overrides 段（本仓 overrides 在此文件，不在 `package.json`）
按既有 SECURITY OVERRIDE POLICY 写**下界**，不写精确版本：

```yaml
  # Dependabot mediums 2026-08-04 — ip-address vulnerable <=10.2.1, first patched
  # 10.2.2. Transitive only: express-rate-limit@8.5.2 -> ip-address (chain enters
  # via @modelcontextprotocol/sdk, devDependency). Lower bound per the policy above.
  ip-address: '>=10.2.2 <11'
```

**按 lock 判据验证**（不看 manifest）：

```
改前  pnpm-lock.yaml:  ip-address@10.2.0
改后  pnpm-lock.yaml:  ip-address@10.4.0     ← 解析版本 >= 10.2.2 ✅
                       ip-address: 10.4.0    (express-rate-limit 的依赖项也已提升)
```

`pnpm audit` 中 ip-address 已无任何条目。

`tests/ci-workflow.test.ts` 的下界守卫（"keeps security overrides on lower-bound ranges"）通过。

### 遗留：audit 仍非零（预先存在，不在本次范围）

`pnpm audit --prod` exit=1，3 条（1 moderate + 2 high）。**已用 `git stash` 验证改前基线
同样是 3 条 / exit=1** —— 非本次引入。其中包含一条新出现的 postcss advisory
`GHSA-fxqj-rqcc-2cmp`（patched `>=8.5.23`，当前 override 为 `>=8.5.18 <9`）。

未擅自处理：超出本次交办范围（交办只提 ip-address 一项），且 postcss 属 Next 构建链，
提升需独立验证。建议另开一轮。

---

## 四、门禁实跑结果

本条交付内实跑，exit code 如实记录：

| 门 | 命令 | exit | 结果 |
|----|------|------|------|
| install | `pnpm install --no-frozen-lockfile` | **0** | lockfile 已重生成，+22/-22 |
| typecheck | `pnpm typecheck` | **0** | — |
| lint | `pnpm lint` | **0** | — |
| test | `pnpm test` | **0** | 620 passed, 6 skipped / 62 files |
| build | `pnpm build --webpack` | **0** | webpack 锁保持 |
| probe（生产实跑） | `node scripts/probe-production.mjs` | **0** | 6/6 PASS |
| audit | `pnpm audit --prod … moderate` | **1** | 3 条预先存在，见上节；基线同为 1 |

探针本地实跑 `home` 走的是真 200 路径（本地 IP 不被 WAF 拦），**SKIP 分支未在生产实跑中
被触发**，其行为由单元测试覆盖。下一次 CI 定时运行（cron `17 */6 * * *`）才会真正走到
SKIP 分支 —— 这是本次改动唯一未经生产实跑验证的路径，如实标注。

## 五、预期效果

- `home 403` 不再开假 issue；边缘拦截在日志显示为 `[SKIP] home 403 …`。
- `resourceLibrarySearch` 冷启动不再误报；真凭证/函数故障仍然失败门禁。
- issue #18 应在下一次 CI 运行（改动合并部署后）自动关闭 —— workflow 的
  "Close recovered outage issue" 步骤会处理。
