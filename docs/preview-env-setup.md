# Preview 环境 Supabase 配置 — 2026-07-18

> 目标：让 Vercel Preview 能做功能探针，而不是只证明“构建成功”  
> **2026-07-18 已执行**：`scripts/sync-preview-env.ps1` 写入 Preview 公共 nav-dev 变量

## 1. 现状

| 环境 | Supabase | 功能探针 |
|---|---|---|
| Production | 生产库全量 env | 主域 `verify:production` **可用** |
| Preview | **nav-dev** 公共 URL/anon + AUTH/Sentry/embed Worker 等 | 需 Deployment Protection 可匿名或 bypass |

## 2. 已同步到 Preview 的变量（无值明文）

由 `powershell -NoProfile -File D:\nav-site\scripts\sync-preview-env.ps1`：

- `NEXT_PUBLIC_SUPABASE_URL` → nav-dev（`nzaocqwumlmbewoddysd`）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → nav-dev anon
- `AUTH_SECRET`、`NEXT_PUBLIC_SITE_URL`
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- `EMBED_SERVER_URL` → **Worker** `https://nav-site-embed-proxy.xiej4352.workers.dev`（勿用本机 loopback）
- Resource Library 相关（若本地有）
- `ADMIN_PASSWORD_HASH`（`node scripts/set-preview-admin-hash.mjs`）

**故意未写：**

- 生产 `SUPABASE_SERVICE_ROLE_KEY` / `_PROD`（防 Preview 写生产）
- 本地若只有生产 service role，脚本会拒绝挂到 Preview

## 3. 仍缺 / 负责人补一刀

| 项 | 说明 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY_DEV` | 在 `.env.local` 增加 **nav-dev** service_role，再跑 sync；admin E2E 才完整 |
| Deployment Protection | Dashboard → Project → Settings → Deployment Protection → **Preview**：私有仓库建议 **Disabled**（CLI 无稳定开关） |
| 重新部署 Preview | env 变更后 `vercel redeploy <preview-url> --scope aijiai520 --yes` |

## 4. 验收

```powershell
pnpm run verify:production -- --base-url https://<preview>.vercel.app --expect-commit <sha>
# 仍 HTML 登录墙 → Protection 未关
```

## 5. 命令速查

```powershell
powershell -NoProfile -File D:\nav-site\scripts\sync-preview-env.ps1
node scripts/set-preview-admin-hash.mjs
vercel env ls --scope aijiai520
vercel ls nav-site --scope aijiai520
vercel redeploy <preview-url> --scope aijiai520 --yes
```

## 6. 安全边界

- Preview **只**连 nav-dev  
- 禁止 Preview 挂生产 service role  
- NEXT_PUBLIC_* 对访客可见：仅放可公开的 anon / site URL / Sentry DSN  
