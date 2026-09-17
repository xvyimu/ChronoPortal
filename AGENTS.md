<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ChronoPortal — Agent 入口

| 项 | 值 |
|----|-----|
| GitHub | [xvyimu/ChronoPortal](https://github.com/xvyimu/ChronoPortal) |
| 本地 | `D:\projects\ChronoPortal` · 入口 `D:\projects\ChronoPortal` |
| 生产 | https://yuanjia1314.ccwu.cc |
| package name | private `nav-site`（≠ GitHub 身份） |

## 先读

1. **[`docs/PROJECT.md`](./docs/PROJECT.md)** — **形态与栈 SSOT**（Web 导航门户 + Next/Supabase 唯一栈）  
2. 续作：[`docs/HANDOFF.md`](./docs/HANDOFF.md)  
3. 根 [`README.md`](./README.md) · 身份 [`GITHUB_IDENTITY.md`](./GITHUB_IDENTITY.md)  
4. 全局门闩：形态/栈未入档 → 禁业务编码（`~/.claude/CLAUDE.md` §8）

## 硬约束（摘要）

- `pnpm dev` **必须**带 `--webpack`（端口 3264）  
- 数据写路径经 repository / domain（见 docs ADR）  
- 小修不重选型；换栈先 ADR + 改 PROJECT.md  

## Commands

```bash
# 开发（必须带 --webpack，见「环境陷阱」）
pnpm dev                # next dev -p 3264 --webpack
pnpm build              # 写 build-info 后 next build --webpack

# 提交前必跑
pnpm lint               # eslint
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest run（测前先 unset UPSTASH_* 防假失败）
pnpm e2e                # playwright

# 生产验证（本机代理常 down，用 --no-proxy）
pnpm verify:production  # scripts/probe-production.mjs

# 其它
pnpm check:links        # 死链检测
pnpm docs:openapi       # 重新生成 OpenAPI
```

> 命令以 `package.json` 的 `scripts` 为准。**改了 scripts 就回来同步本表。**

## Conventions

- **语言 / 运行时：** TypeScript · React 19 · Next 16（**webpack 模式**，非 Turbopack）
- **包管理：** `pnpm`（不用 npm / yarn）
- **默认分支：** `master`；功能分支 `feature/<kebab-slug>`；远程推送 `xvyimu/cp-<slug>`
- **提交：** Conventional Commits（husky + commitlint）
- **格式：** 交给 ESLint / Prettier，**本文件不重复它们的规则**
- **数据访问：** 一律经 `lib/repositories` facade → domain modules（ADR-003/006）
- **Admin 边界：** UI → `lib/admin/client.ts` → Route Handler → repository（ADR-009）
