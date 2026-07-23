# 发现与决策

## 需求
- 用户调用 `superpower`，需要用端到端研发流程推进 nav-site 下一阶段工作。
- 默认目标：性能 Phase 2 收尾，先解决文档状态与当前代码/提交历史不一致，再选择可量化优化点。

## 研究发现
- 项目根目录此前不存在 `task_plan.md`、`findings.md`、`progress.md`，因此本轮创建新的 Superpower 工作流文件。
- 当前 `git status --short` 为 clean。
- `docs/perf/findings.md` 是性能 Phase 2 的主要入口，顶部 H9/H10 仍写 "待提交"。
- `git log --grep` 显示 H9/H10 相关 commit 已存在：
  - `62261102 H9: sonner toast 动态 import 替代静态 import`
  - `bff0fed8 perf(H9+H10): CSS animations replace motion in ShortcutPanel/login/SubmitForm/Nav/Sidebar/LinkCard`
- 当前代码状态：
  - `components/ReviewSection.tsx` 已使用 `await import("sonner")`。
  - `components/ToasterWrapper.tsx` 通过 `dynamic(..., { ssr: false })` 懒加载 `components/ui/sonner`。
  - `components/ShortcutPanel.tsx`、`app/login/page.tsx`、`components/SubmitForm.tsx` 当前未命中 `motion/react` 运行时导入。
  - `lib/animations.ts` 仅有 `import { type Variants } from "motion/react"`，属于 type-only import。
  - `app/resources/_components/ResourceRating.tsx` 曾静态 `import { toast } from "sonner"`；本轮已改为提交路径内动态 import，并添加静态边界测试。

## 技术决策
| 决策 | 理由 |
|------|------|
| 第一项工作先修正文档状态 | H9/H10 已有历史 commit，文档仍写待提交，会误导后续 agent |
| 改 `ResourceRating.tsx` 为动态 toast import | 虽然不属于首页初始路径，但属于低风险 route-level 依赖瘦身，且可用静态测试防回退 |
| 下一项代码优化必须有 RED 测试或静态约束 | 遵守 Superpower 的 TDD 阶段要求 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 最新 handoff 查询返回较旧 Claude Code 状态 | 以当前 git 状态、`CLAUDE-HANDOFF.md` v11 和 `docs/PROGRESS.md` Phase 26 为准 |
| 第一次 RED 测试失败于 `import.meta.url` 不是 file URL | 改用 `join(process.cwd(), "...")` 读取源码文件后，失败原因变为预期的静态 sonner import |

## 资源
- `docs/perf/findings.md`
- `docs/perf/baseline-2026-06-29.md`
- `docs/superpowers/specs/2026-06-29-performance-optimization-design.md`
- `CLAUDE-HANDOFF.md`

## 视觉/浏览器发现
- 本轮尚未执行新的浏览器检查。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*

## 2026-07-18：优化与发布文档规划

### 已核验事实

- 当前分支仍为 `master`，Git 基线为 `9733897d8d417e36cb293e94fff11cde4215ec76`。
- 当前工作树包含跨前端、API、repository、CI、测试、迁移和文档的大量未提交改动，尚不存在可审计候选 SHA。
- ADR-009 已固定管理后台 interface：客户端组件通过 `lib/admin/client.ts` 调用 Route Handler，Server Component 继续直接调用 repository。
- 当前代码优化与数据库迁移必须分开陈述：SQL 文件存在不等于 staging 或 production 已执行。
- 现有 `task_plan.md`、`findings.md`、`progress.md` 是 2026-07-04 已完成性能专项，不能覆盖其历史，只追加新阶段。

### 文档决策

- 新增 `docs/optimization-and-release-plan-2026-07-18.md`，作为当前优化范围、依赖、授权门和完成定义的主入口。
- ADR 只记录长期决策；LAUNCH-CHECKLIST 保持短清单；PRODUCTION-RUNBOOK 保持操作与故障处理；每个候选另建 release manifest、migration ledger 和 validation report。
- 候选 SHA 存在前不创建空的 release 证据目录，避免模板被误读为已验证事实。
- README、PROGRESS、API 文档和运行手册中的生产声明，待候选或生产证据形成后再校准。

### 未确定事项

- staging/production 数据库 schema、迁移历史、RLS/GRANT 和备份能力不确定。
- disposable nav DB、Vercel deployment protection、GitHub required checks、生产监控基线和 canary 能力不确定。
- commit、push、数据库迁移、外部配置和部署均未获本轮执行授权。

---

## 2026-07-24 · Phase 0 cp-perf-scout（只读测绘）

> 全文：[`docs/ops/cp-perf-scout-2026-07-24.md`](./docs/ops/cp-perf-scout-2026-07-24.md)  
> 总控合并目标：`D:\orca\.planning\portfolio-stack-policy-2026-07-24\cp-perf-wave\DEBT-BACKLOG.md`  
> 本轮：**不实现优化** · **不改业务行为** · **不 push**

### 摘要

- **栈锁：** Next 16 App Router · **webpack 强制**（`dev`/`build` 均 `--webpack`）· React 19 · Tailwind v4 · Supabase+RLS · Auth.js v5 · Fuse + pgvector · Sentry · pnpm@11
- **前台：** `/` ISR 60s · `getCategories` + `getApprovedLinks` · 服务端 nav 预计算 · 搜索走 `/api/search`
- **Admin：** `proxy` auth 门 + layout/page 重复 `auth()` + API `withAdmin*`
- **缓存：** 仅 `revalidatePath` · **无 revalidateTag** · 搜索进程内 60s Fuse 池 + API no-store
- **门闩：** typecheck **2** · test **0**（614 pass）

### 结构化债表（合并用）

| id | 模块 | 症状 | 路径 | 影响面 | 优先级 | 预估 wt 名 | 依赖 |
|----|------|------|------|--------|--------|------------|------|
| D-01 | home-data | 首页 `getCategories` 默认 cookie `createClient`，与 links 的 `createStaticClient` 不一致，ISR/动态边界可疑 | `lib/repositories/categories.ts` · `app/page.tsx` · `lib/supabase/server.ts` | 首页 TTFB / 缓存命中 / 全站入口 | **P0** | `cp-perf-home-static-client` | 无；改前需确认 RSC 动态标记 |
| D-02 | links-pool | 全量 approved links + tags 二次查询；首页 RSC cache 与搜索 fuseCache 双轨，冷启动/大表压力 | `lib/repositories/links.ts` · `lib/search/fuse.ts` · `app/page.tsx` · `app/api/search/route.ts` | 首页 + 搜索延迟与 DB 负载 | **P0** | `cp-perf-links-pool` | 与 D-01 可并行但测 TTFB 时串 |
| D-03 | admin-auth | Admin 路径 `auth()` 2–3 层瀑布（proxy + layout + page；API proxy + withAdmin） | `proxy.ts` · `app/admin/**` · `lib/with-admin.ts` · `lib/auth.ts` | 管理台首包与每次 CRUD | **P1** | `cp-perf-admin-auth-dedupe` | 不改鉴权语义；需 e2e admin |
| D-04 | typecheck | `pnpm typecheck` 失败：`tests/probe-security-headers.test.ts` ProcessEnv / headers 索引类型 | `tests/probe-security-headers.test.ts` | CI typecheck 门 / 本地质量 | **P1** | `cp-perf-typecheck-probe-headers` | 无业务依赖 |
| D-05 | revalidate | 仅 path revalidate；无 tag；搜索全局 no-store 粗 | `lib/admin/revalidate-public.ts` · admin write routes · `next.config.ts` search headers | 写后可见性 vs CDN/缓存精细度 | **P2** | `cp-perf-revalidate-tags` | 宜在 D-01/D-02 稳态后 |
| D-06 | embed-dual | nav 语义 1024-d(CF)/512-d 与 resource 512-d 平行；RPC 名 env 分叉 | `lib/search/semantic.ts` · `lib/search/embed-provider.ts` · `app/api/resource-search/**` | 语义延迟/降级可观测性 · 运维心智 | **P2** | `cp-perf-embed-unify-map` | 只读地图可先；改配置需 ops |
| D-07 | csp-stage-a | 生产仍 static CSP + script unsafe-inline 默认；CSP_DYNAMIC 未 prod flip | `lib/csp.ts` · `proxy.ts` · `docs/ops/cp-preview-stage-a-*` | 安全与 inline 脚本债 | **P2** | 沿用 preview Stage A 线 | 人 gate · 不在本 perf 波默认实现 |
| D-08 | sentry-bundle | 历史 H7：Sentry client 仍占首屏 JS；tree-shake 部分完成 | `next.config.ts` · `instrumentation-client.ts` · `docs/perf/findings.md` | 首屏 JS / LCP 次要 | **P3** | `cp-perf-sentry-bundle` | 破坏性 entry 需单独验证 |

**TOP_DEBT_COUNT=8**（P0:2 · P1:2 · P2:3 · P3:1）

### 建议 worktree 切片（目录互斥）

1. `cp-perf-home-static-client` — 仅 categories/static client + 首页数据路径
2. `cp-perf-links-pool` — links repository + fuse 池（勿同时大改 admin）
3. `cp-perf-admin-auth-dedupe` — proxy/layout/page/with-admin 鉴权次数
4. `cp-perf-typecheck-probe-headers` — 测试类型 only
5. `cp-perf-revalidate-tags` — admin revalidate + 可选 tag
6. `cp-perf-embed-unify-map` — 文档/地图优先
7. `cp-perf-sentry-bundle` — Sentry 体积

### 门闩

```
pnpm typecheck  → EXIT=2
pnpm test       → EXIT=0  (614 passed, 6 skipped)
```

### 残留风险

首页数据面与 Admin auth 瀑布未动，生产 TTFB/管理台体感仍可能被静默拖累；typecheck 红若进严格 CI 会挡合入。
