# ChronoPortal · service_role 写路径纪律清单 · 2026-07-24

> **模块：** `M-CP-cr-service-role-checklist` · findings **CP-CR-004**  
> **目标：** 新 API / repository 使用 service_role 时强制 session 绑定，禁止客户端 `userId` 注入  
> **红线：** 未扩大 service_role 面 · 未绕 RLS 改政策 · 未 push master

---

## 0. 背景

多处写/语义路径用 **service_role** 绕过 RLS（favorites 注释：NextAuth 无 Supabase JWT → RLS `sub` 恒 null）。  
**正确性依赖应用层：** `session.user.id` 永不被客户端 body/query 覆盖。

权威模式：`lib/repositories/favorites.ts`（「调用方必须传入 session.user.id；禁止客户端 userId」）。

---

## 1. 新 API 检查单（PR / 模块开工前勾）

```text
[ ] 是否必须 service_role？（能 user client + JWT/RPC 则优先）
[ ] 鉴权：requireAdmin / session 在 handler 入口已失败关闭
[ ] 身份：user_id / owner 字段仅来自 session.user.id（或 admin 显式服务端参数）
[ ] 请求体 Zod：若含 userId 字段 → 忽略或拒绝，不得传入 repository
[ ] CSRF：浏览器写路径（submit/favorites 类）已接 Origin/Referer 策略
[ ] 限流：公开写有 IP/用户桶；Admin 写有 with-admin
[ ] 测：至少 1 例「客户端伪造 userId 不影响落库身份」或 admin 边界测
[ ] 日志：不打印 service_role key；错误不回显内部身份
[ ] 文档：repository 文件头注释写明「禁止客户端 userId」
```

---

## 2. 反模式（禁止）

| 反模式 | 后果 |
|--------|------|
| `body.userId` → `getUserFavorites(body.userId)` | IDOR / 横向越权 |
| 公开 Route 直接 `createServiceRoleClient()` 无 session | 任意读写 |
| 仅靠「前端不传」无 Zod/服务端剥离 | 脚本可伪造 |
| 新表 RLS 仍 always-true + service_role 双开无审计 | 审查 P0 级 |

---

## 3. 最小测模板（Vitest 意图）

```ts
// 伪代码：handler 忽略 body.userId
it("ignores client userId and uses session.user.id", async () => {
  // mock session.user.id = "user-A"
  // POST body { userId: "user-B", ... }
  // expect repository called with "user-A" only
});
```

本 wt **可选**加真实测；清单优先落地。现有 favorites / admin-boundary 测应保持绿。

---

## 4. 与 Admin

Admin 写路径：`with-admin` / `role===admin` + repository；仍勿把客户端 id 当授权源。  
`getAdminSession`（W4 feature 支）仅去重 session 读，不替代上述纪律。

---

## 5. 风险一句

清单不能阻止未读文档的 PR；合并前靠 review + 至少一条伪造 userId 测。
