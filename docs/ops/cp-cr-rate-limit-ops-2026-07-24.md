# ChronoPortal · 生产限流 / Upstash ops 清单 · 2026-07-24

> **模块：** `M-CP-cr-rate-limit-ops` · findings **CP-CR-002** / **CP-CR-003**  
> **性质：** **仅文档** · **不**写 Vercel Production env · **不**改默认 fail-closed 代码  
> **红线：** 未 push master · 未放宽 CSP · 未去 webpack

---

## 0. 一句话风险（审查原话）

未配 Upstash 时，公开 search/favicon/resource-search 的 distributed 限流回退**进程内桶**；Vercel 多 isolate 下有效配额 ≈ 阈值 × 实例数。`DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED` 仅 opt-in。

代码：`lib/rate-limit-distributed.ts`。

---

## 1. 生产必配（Vercel · Production）

| Env | 必填 | 说明 |
|-----|------|------|
| `UPSTASH_REDIS_REST_URL` | **是**（公开限流真生效） | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | **是** | 配对 token · **encrypted** |
| `DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED` | 可选 · 默认未设 | 设为 `1` 时：生产 + 未配 Upstash 或 Redis 故障 → **拒绝**（不回退 memory） |

### 确认步骤（人）

```text
[ ] Vercel → nav-site → Settings → Environment Variables → Production
[ ] 存在 UPSTASH_REDIS_REST_URL / TOKEN（非 Preview-only）
[ ]  redeploy 后 GET /api/health → checks 含 distributed / rate-limit 类 ok（以现网 health schema 为准）
[ ] 可选：短时压 search 确认 429/限流头行为跨实例一致
```

**本 wt 未执行**任何 Production env 写入。

---

## 2. `DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED` 决策表

| 场景 | 建议 | 原因 |
|------|------|------|
| 生产已配稳定 Upstash | 可保持 **未设**（故障时 memory 降级）或设 `1`（故障时硬拒绝） | 可用性 vs 配额真实性 |
| 生产**未**配 Upstash | **优先配 Upstash**；在未配前勿假设 60/min 全站生效 | 多 isolate 放大 |
| Preview / 本地 | 通常不设 fail-closed | 避免无 Redis 时整站 429 |
| 本仓默认代码 | **不改** · 保持 opt-in | 审查明确「仅文档不 flip」 |

人授权 flip Production 时：写变更记录 + 观察窗 + 回滚（删 env / 设回空）再 redeploy。

---

## 3. 登录限流（CP-CR-003 · ops 勾选）

登录走 `checkRateLimit(..., "deny")`（DB/RPC 路径），与公开 search 的 Upstash 路径**分离**。

| 项 | 勾选 |
|----|------|
| 生产 `login_attempts` 表 / RPC 可用 | [ ] 人确认 nav-prod |
| DB 故障时 deny（fail-closed）符合预期 | [ ] 已知 · 勿改为 allow |
| 15min / 5 次 + 800ms 延迟 | [ ] 代码既有 · 无需本 wt 改 |

---

## 4. 公开路径与阈值（参考 · 以代码为准）

| 面 | 说明 |
|----|------|
| search / semantic | distributed 桶 · 需 Upstash 才跨实例 |
| favicon / resource-search | 同上 |
| 单测 | 宿主注入 `UPSTASH_*` 时须在 beforeEach 清理（见 flaky-search 证据） |

---

## 5. 明确不做

- 改 `lib/rate-limit-distributed.ts` 默认 fail-closed  
- 生产 env 自动写入  
- 与 CSP 生产 cutover 同会话并行 flip  

## 6. 风险一句

文档无法替代 Vercel 实配；未勾选 §1 前，公开限流在多实例上仍可能偏松。
