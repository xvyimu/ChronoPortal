# Preview 环境 Supabase 配置 — 2026-07-18

> 目标：让 Vercel Preview 能做功能探针，而不是只证明“构建成功”  
> 当前阻断：项目 env 主要挂在 **Production**；Preview 常缺 Supabase / Auth；Deployment Protection 返回登录墙

## 1. 现状

| 环境 | Supabase | 功能探针 |
|---|---|---|
| Production | 已挂全 | 主域 `verify:production` **可用** |
| Preview | 常缺失 / 不全 | Deployment Protection → HTML 登录墙 |

## 2. 推荐配置（Preview → nav-dev）

在 Vercel 项目 `nav-site` → Settings → Environment Variables，对 **Preview** 单独设置（值不写入仓库）：

| 变量 | 指向 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **nav-dev** project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nav-dev anon |
| `SUPABASE_SERVICE_ROLE_KEY` | nav-dev service role |
| `AUTH_SECRET` | 独立 Preview secret（勿复用生产若可避免） |
| `ADMIN_PASSWORD_HASH` | 可用 dev 哈希 |
| `NEXT_PUBLIC_SITE_URL` | 对应 preview 部署 URL 或占位 |
| `EMBED_SERVER_URL` / `EMBED_SERVER_API_KEY` | 可选；没有则语义降级 FTS |

**禁止**：Preview 挂生产 service role。

## 3. Deployment Protection

二选一：

1. 对 Preview 关闭 Protection（仅私有仓库 + 可信协作者时）  
2. 保留 Protection，功能探针改用 **主域** 或 bypass token（Vercel automation bypass）

## 4. 验收命令

```powershell
# 用具体 preview URL（需可匿名访问）
pnpm run verify:production -- --base-url https://<preview>.vercel.app --expect-commit <sha>
```

若仍返回 HTML 登录墙 → 记为环境阻断，不改代码硬绕。

## 5. 执行门槛

改 Vercel env / Protection 需负责人在 Dashboard 操作或明确授权 CLI。  
Agent 默认可交付本文 + 检查清单，不擅自改云端 env。
