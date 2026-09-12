@AGENTS.md

## 快速入口
- 栈：**Next 16**（webpack）+ **React 19** + shadcn + TW v4 · **Supabase**+RLS · **Auth.js**
- 测试：`pnpm typecheck` · `pnpm test` · `pnpm build --webpack`（webpack 锁，禁去 webpack 无 ADR）
- 红线：不生产 CSP flip · 不绕 RLS · 不换 Astro/Remix · 不 push master 未经授权
- 先读：`docs/PROJECT.md`（形态与栈 SSOT）· `docs/ops/` 现有审计卡片

## 常用命令（真实 npm scripts）
- install: `pnpm install`（worktree 由 `orca.yaml → scripts.setup` 自动跑）
- dev: `pnpm dev`
- lint/format: `pnpm lint` · `pnpm format`（format:check 见 CI）
- test: `pnpm test` · `pnpm test:coverage` · `pnpm test:quality` · `pnpm typecheck`
- e2e: `pnpm e2e`（admin: `pnpm e2e:admin`，UI: `pnpm e2e:ui`）
- build: `pnpm build --webpack`（webpack 锁）
- security: `pnpm audit:security` · `probe:headers`（CI 门）
- commit: commitlint 已接入（conventional 前缀 + 中文 body 可用）
- 其他：`pnpm check:links` · `verify:production` · `db:reviews:*`（写 DB 前先确认）
