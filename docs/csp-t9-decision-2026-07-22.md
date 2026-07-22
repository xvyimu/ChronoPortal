# CSP T9 评估 · 2026-07-22

> 结论：**暂不**从 Enforcing CSP 去掉 `script-src 'unsafe-inline'`。  
> 生产 tip：`a1e5c7f6` · deploy `dpl_EwZKkesa…` · 主域 `https://yuanjia1314.ccwu.cc`

## 1. 样本通道状态

| 通道 | 状态 | 说明 |
|------|------|------|
| Report-Only 头 | **在线** | `script-src` **无** `'unsafe-inline'`；`report-uri /api/csp-report` |
| Enforcing 头 | **在线** | `script-src` **含** `'self' 'unsafe-inline' GTM/GA` |
| `/api/csp-report` | **204** | 限流 + 1/20 采样；采样后 `logger.warn` + **Sentry `captureMessage`**（`a1e5c7f6`） |
| Vercel Runtime Logs | 可见 `POST /api/csp-report` 204 | 探针与真实请求均到达；日志摘要无 body |
| Sentry Issues API | **本机无 `SENTRY_AUTH_TOKEN` / sentry-cli 登录** | 无法 CLI 拉 Issues；UI 过滤见下 |

**Sentry UI 过滤（人工）：**

- message 前缀：`csp-report:`
- 或 tag：`source:csp-report`
- org/project（构建配置）：`yuanjia-m0` / `javascript-nextjs`
- ingest：`*.ingest.us.sentry.io`（DSN 已在 Production env）

> 即使 Issues 里暂时 0 条，**结构阻断已足够否决立刻去 inline**（见 §2）。采样率 1/20 + 流量低时，Issues 空窗不等于「无违规」。

## 2. 生产 HTML 结构审计（决定性）

对 `GET /` 实测（2026-07-22）：

| 指标 | 值 |
|------|-----|
| HTML 体积 | ~819 KB |
| 无 `src` 的 `<script>` | **17** |
| 类型分布 | `*-text/javascript` **15**（边缘/改写痕迹）· `application/ld+json` **1** · 无 type **1** |
| `/_next/` chunk scripts | 21 |
| GTM/GA 痕迹 | **有**（`Analytics.tsx` 使用 `next/script` **inline** config） |
| JSON-LD | layout 内联 `application/ld+json` |

Enforcing 摘录：

```text
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com
```

Report-Only 摘录：

```text
script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com
```

### 若现在去掉 Enforcing 的 `'unsafe-inline'`

1. **GA inline bootstrap**（`components/Analytics.tsx`）会在 RO/Enforcing 下违规或静默失效。  
2. **~15+ 个 inline JS script**（含边缘改写 type）会在浏览器侧触发大量 report / 功能损坏。  
3. JSON-LD 虽多为 data 类型，仍以 `<script>` 元素存在，部分环境与策略组合会噪声。  
4. 无 **nonce / hash / strict-dynamic** 迁移时，无法安全收紧。

## 3. 决策

| 问题 | 答案 |
|------|------|
| 现在能否去掉 Enforcing `script-src 'unsafe-inline'`？ | **否** |
| 原因类型 | **结构阻断**（非「缺样本」） |
| Report-Only 是否继续？ | **是** — 继续采；Sentry 有 `source:csp-report` 后便于聚类 |
| 下一步前置 | 见 §4 |

## 4. T9 可动条件（全部满足再开 PR）

1. **Nonce 或 hash 管道**  
   - Next 对 inline 引导脚本 / GA 使用 nonce 或外置纯 `src`。  
   - 同步把 Enforcing + RO 的 `script-src` 改为 `'nonce-…'` 和/或 `'strict-dynamic'`。  
2. **GA**  
   - 去掉 `next/script` 子节点 inline；改为外部文件或带 nonce 的 bootstrap。  
3. **边缘改写**  
   - 确认 Cloudflare/中间层是否改写 script `type`；必要时关 Rocket Loader / 类似特性，避免幽灵 inline。  
4. **样本窗口**  
   - Sentry 上 `csp-report` 聚类稳定 **≥ 1–2 天真实流量**；已知类（GA、JSON-LD、第三方）有处置方案。  
5. **回滚**  
   - 一键恢复 `'unsafe-inline'` 的 config 开关（已有 `CSP_REPORT_ONLY=0` 先例；Enforcing 侧建议对称 env）。

## 5. 明确不做

- 不在无 nonce 时盲删 `'unsafe-inline'`。  
- 不为了「Sentry 暂时 0 条」宣布 T9 完成。  
- 不把 style-src 的 `'unsafe-inline'` 与 script 混为一谈（style 收紧另立项）。

## 6. 相关代码

- `next.config.ts` — Enforcing / Report-Only CSP  
- `app/api/csp-report/route.ts` — 采样 + Sentry  
- `components/Analytics.tsx` — GA inline  
- `app/layout.tsx` — JSON-LD inline  

## 7. 审计命令（可复跑）

```powershell
node scripts/probe-production.mjs --no-proxy --expect-commit a1e5c7f6
# 结构审计（一次性脚本，可不入库）
# 打开 Sentry：message:"csp-report:" OR tag source:csp-report
```
