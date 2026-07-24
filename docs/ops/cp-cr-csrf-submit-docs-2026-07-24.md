# ChronoPortal · 公开 submit CSRF / 脚本面威胁模型 · 2026-07-24

> **模块：** `M-CP-cr-csrf-submit-docs` · findings **CP-CR-005**  
> **性质：** **仅文档** · 不改 `lib/csrf.ts` / submit 默认行为  
> **红线：** 未 push master · 未放宽 CSP · 未改鉴权

---

## 0. 审查原话（CP-CR-005）

CSRF：有 Origin/Referer/Fetch-Site 校验；**无 Cookie 且无同源证明**的客户端可过。  
设计允许非浏览器客户端；公开 `submit` 仍靠 IP 限流（3/15min deny）。扫站/脚本提交面仍在，依赖限流 + 审核 `approved=false`。

---

## 1. 代码路径（as-is）

| 层 | 实现 |
|----|------|
| 入口 | `POST /api/submit` · `app/api/submit/route.ts` |
| CSRF | `checkOrigin(request, "submit-api")` · `lib/csrf.ts` |
| 限流 | `checkRateLimit("submit_attempts", ip, 15min, 3, "deny")` · DB 故障 **deny** |
| 输入 | Zod `submitLinkSchema` |
| 去重 | `findExistingLinkByUrl`（含 pending） |
| 写入 | `submitLink(...)` · 公开收录须 Admin 审核（pending / 未 approved 语义） |

### CSRF 决策树（`checkOrigin`）

```text
1. Origin 存在 → 必须同 host，否则 403
2. Sec-Fetch-Site=cross-site → 403
3. Referer 存在 → 必须同 host，否则 403
4. Sec-Fetch-Site=same-origin → 放行
5. 请求带 Cookie 且仍无同源证明 → 403（cookie_without_same_origin_proof）
6. 无 Cookie、无 Origin/Referer 证明 → **放行**（非浏览器客户端路径）
```

**含义：** 浏览器 cookie 会话写路径被 CSRF 拦住；**无 Cookie 的脚本/curl** 可到达限流与业务逻辑。

---

## 2. 威胁模型

| 攻击者 | 能力 | 缓解 | 残余风险 |
|--------|------|------|----------|
| 经典 CSRF（受害者已登录浏览器） | 跨站带 Cookie POST | Origin/Referer/Fetch-Site + Cookie 无证明拒绝 | 低（同源证明失败即 403） |
| 匿名脚本扫站提交 | 无 Cookie 批量 POST | IP 限流 3/15min **deny**；重复 URL 409；Zod | **中**：换 IP / 分布式源可放大；内容进审核队列 |
| 伪造 Origin | 任意 Origin 头 | 与 Host 比对，非同源 403 | 低 |
| 撞库式垃圾站 | 高基数 URL | 去重 + 限流 + **人工审核** 才上前台 | 中：审核人力 |

**明确非目标（本威胁模型）：** 把公开 submit 改成必须登录；上 Captcha（产品决策另开）。

---

## 3. Ops 勾选（审核队列）

```text
[ ] 监控：submit 429 / 403 比例（Vercel logs / Sentry）
[ ] 审核：Admin 待审链接节奏（pending / approved=false）
[ ] 异常：短时海量 409 重复 URL → 可能脚本探测
[ ] 限流：submit_attempts 表/RPC 生产可用（与登录桶类似 deny 语义）
[ ] 事故：确认不会静默把 pending 自动 approved
```

---

## 4. 与限流 findings 交叉

公开 **search** 依赖 Upstash 跨实例（CP-CR-002）；**submit** 走 DB 桶 `deny`。  
submit 在无 Upstash 时仍受 DB 限流约束，但多实例下 DB 桶行为依赖 Supabase 可用性（故障 → 拒绝写，偏安全）。

---

## 5. 明确不做

- 改 CSRF 默认允许/拒绝矩阵  
- 生产 env flip  
- Captcha / 登录墙（产品）  

## 6. 风险一句

无 Cookie 脚本面是**有意的 API 形态**；残余垃圾提交靠 3/15min deny + 审核，而非 CSP 或浏览器 CSRF。
