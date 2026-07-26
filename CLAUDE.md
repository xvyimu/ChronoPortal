@AGENTS.md

## 快速入口
- 栈：**Next 16**（webpack）+ **React 19** + shadcn + TW v4 · **Supabase**+RLS · **Auth.js**
- 测试：`pnpm typecheck` · `pnpm test` · `pnpm build --webpack`（webpack 锁，禁去 webpack 无 ADR）
- 红线：不生产 CSP flip · 不绕 RLS · 不换 Astro/Remix · 不 push master 未经授权
- 先读：`docs/PROJECT.md`（形态与栈 SSOT）· `docs/ops/` 现有审计卡片