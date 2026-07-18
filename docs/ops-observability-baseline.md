# 可观测性基线（RUM / Sentry）— 2026-07-18

> 状态：基线文档已固化；告警渠道与值守人待负责人填空  
> 生产：`https://yuanjia1314.ccwu.cc`

## 1. 已接线能力

| 信号 | 路径 | 说明 |
|---|---|---|
| 健康 | `GET /api/health` | database / env / embedding / resourceLibrarySearch |
| 构建身份 | `GET /build-info.json` | commit / branch / deployId |
| Web Vitals → Sentry | 客户端 `WebVitals` → `POST /api/web-vitals` | 采样：`SENTRY_WEB_VITALS_SAMPLE_RATE`（生产默认 0.1） |
| Sentry SDK | `@sentry/nextjs` | client/server/edge；release 随构建 |
| 生产探针 | `pnpm run verify:production` | 主域 commit-aware |
| Lighthouse 抽检 | `node scripts/probe-lighthouse-production.mjs` | 写入 `docs/perf/lighthouse-*-production*` |

## 2. 建议阈值（首版 · 可改）

| 指标 | 黄 | 红 | 动作 |
|---|---|---|---|
| `/api/health` status | degraded 连续 2 次 | 5 分钟内 ≥3 次失败 | 查 embedding / DB / 环境变量 |
| 主域 probe 失败 | 1 次 | 连续 2 次 | 查 CF / Vercel / build-info 漂移 |
| LCP p75（Sentry） | >2500ms | >4000ms | 查首屏预算 / favicon 扇出 |
| INP p75 | >200ms | >500ms | 查分类切换 / 长任务 |
| 5xx 率 | >1% | >5% | 回滚上一 Production deployment |

## 3. 值守清单（发布后 1h）

1. `pnpm run verify:production -- --base-url https://yuanjia1314.ccwu.cc --expect-commit <HEAD>`  
2. 打开 Sentry：错误流 + web-vital 消息  
3. 抽查 `/admin` 登录与一条链接读写  
4. 抽查首页图标：破图应为 0  

## 4. 值守人与告警（已填默认）

详见 **[oncall-and-alerts.md](./oncall-and-alerts.md)**。

| 项 | 值 |
|---|---|
| 值守人 | 仓库 owner（yuanjia / aijiai520） |
| 告警 | Sentry 邮件 + Vercel Deployment Failed 通知 |
| GA | `NEXT_PUBLIC_GA_MEASUREMENT_ID`（若已配置） |
| Embed 本机自启 | 计划任务 `nav-site-embed-stack` |

## 5. 非目标

- 不自建时序库  
- 不把 Web Vitals 写 Postgres（仅 Sentry）  
- 不把 secret 写进本文  
