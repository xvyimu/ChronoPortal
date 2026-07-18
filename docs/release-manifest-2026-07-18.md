# Release Manifest — 2026-07-18 优化候选

> 状态：候选形成中（本地 commit 绑定；未 push、未部署、未对生产迁库）
> 主计划：`docs/optimization-and-release-plan-2026-07-18.md`
> ADR：`docs/adr-009-admin-frontend-backend-interface.md`

## 1. 版本绑定

| 项 | 值 |
|---|---|
| 分支 | `master` |
| 基线 SHA | `9733897d8d417e36cb293e94fff11cde4215ec76` |
| 候选 SHA | `PENDING`（本文件纳入首次候选 commit 后由绑定 commit 回填） |
| 形成日期 | 2026-07-18 |
| 是否已 push | **否** |
| 是否已部署 | **否** |
| 是否已对生产迁库 | **否** |

## 2. Release scope 冻结

### 2.1 纳入本候选（全部当前工作树改动）

**管理后台 interface / UI**

- `lib/admin/client.ts`、`lib/admin/contracts.ts`
- `components/admin/*`（含 `AdminWorkspace`、`AdminNav`、`AdminQueryProvider`、`FadeContent`、`admin-queries` 等）
- `app/admin/*`、`app/api/admin/*`、`lib/with-admin.ts`、`components/admin/useAdminLinks.ts`

**壳层 / 登录 / a11y**

- `components/AppChrome.tsx`、`components/Providers.tsx`、`app/layout.tsx`、`app/login/page.tsx`、`app/globals.css`

**分类 / 链接 / 标签 / 限流 / 安全**

- `lib/category-tree.ts`、`lib/repositories/*`、`lib/rate-limit*.ts`、`lib/csrf.ts`、`lib/auth.ts`
- 相关 API：`favorites`、`submit`、`health`、`resource-*`

**Resource Library / 搜索契约**

- `lib/resource-library/client.ts`、`lib/search/response-schema.ts`、`components/navigation/useServerSearch.ts`

**ToolQuickView / 前台**

- `components/ToolQuickView.tsx`、`ResultGrid.tsx` 及对应测试

**CI / 依赖**

- `.github/workflows/ci.yml`（移除 PR 高权限 RL 凭据）
- `package.json`、`pnpm-lock.yaml`（`@tanstack/react-query` 等）

**数据库脚本（仅入库，不执行）**

1. `scripts/migration-category-hierarchy.sql`
2. `scripts/migration-nav-category-cycle-guard.sql`（+ rollback）
3. `scripts/migration-tags.sql`
4. `scripts/migration-admin-link-tags-transaction.sql`（+ rollback）
5. `scripts/migration-nav-access-hardening.sql`
6. `scripts/migration-rate-limit-runtime.sql`
7. `scripts/migration-nav-runtime.rollback.sql`（保留 `consume_rate_limit` 签名）

**测试 / E2E / 运维脚本**

- `tests/*`（admin boundary/client/login/workspace、category-tree、production-runbook 等）
- `e2e/*`、`scripts/run-admin-playwright.mjs`、`scripts/check-launch-readiness.mjs`

**文档**

- `docs/optimization-and-release-plan-2026-07-18.md`
- `docs/adr-009-admin-frontend-backend-interface.md`
- `docs/admin-optimization-closeout-2026-07-17.md`
- `docs/perf/*-2026-07-17.json`
- `THIRD_PARTY_NOTICES.md`
- `findings.md` / `progress.md` / `task_plan.md`（会话过程记录，纳入以免 scope 漂移）
- 本文件

### 2.2 明确排除

| 路径 | 原因 |
|---|---|
| `public/build-info.json` | `.gitignore`；构建产物，运行时由 `write-build-info.mjs` 生成 |
| `.env*` / 本地 secret 文件 | 永不入库 |
| `node_modules/`、`coverage/`、`.next/` | 生成物 |

### 2.3 架构不可变约束（候选内保持）

1. 不拆微服务；无浅 service 转发层。
2. RSC 继续直连 repository；Client UI → `lib/admin/client.ts` → Route Handler → repository。
3. API URL / method / JSON envelope / Auth / CSRF / Cookie 语义不变。
4. 不读取或提交 secret 值。

## 3. 代码门禁（工作树预检 → 候选后复跑）

| 命令 | 预检结果（脏工作树，2026-07-18） | 候选 SHA 绑定结果 |
|---|---|---|
| `pnpm test`（目标 3 文件） | 21/21 pass | PENDING |
| `pnpm run lint` | pass | PENDING |
| `pnpm run typecheck` | pass | PENDING |
| `pnpm test` | 525 pass / 6 skip | PENDING |
| `pnpm run test:coverage` | pass（stmt 63.5%） | PENDING |
| `pnpm run build` | Next 16.2.9 webpack pass | PENDING |
| `pnpm run audit:security` | no known vulns | PENDING |
| `node scripts/pre-commit-secret-scan.mjs` | pass | PENDING |
| `git diff --check` | pass | PENDING |

## 4. 数据库兼容矩阵

| 迁移 | 应用依赖 | Staging | Production |
|---|---|---|---|
| category-hierarchy | 分类树 parent_id | 未在本候选验证完成 | **禁止** |
| category-cycle-guard | 防环触发器 | 未在本候选验证完成 | **禁止** |
| tags | 标签字典与关联 | 未在本候选验证完成 | **禁止** |
| admin-link-tags-transaction | 原子 RPC | 未在本候选验证完成 | **禁止** |
| nav-access-hardening | GRANT/RLS | 未在本候选验证完成 | **禁止** |
| rate-limit-runtime | `consume_rate_limit` + buckets | 未在本候选验证完成 | **禁止** |

目标 staging 候选：`supabase-nav-dev`（`nzaocqwumlmbewoddysd`）。**禁止** `supabase-nav-prod`（`vyqqbypwrbdcafanzwmj`）。

备注：nav-dev 为共享开发库（含 cat_memories 等非 nav 对象）；迁库前必须 preflight，已存在对象跳过或改用幂等脚本，禁止对 prod 执行。

## 5. 已知限制（发布阻断保留）

| ID | 状态 |
|---|---|
| R0 候选 SHA | 本轮形成中 |
| DB0 staging 迁移验收 | 未完成 |
| QA0 E2E 绑定候选 | 未完成 |
| CD0 Vercel 后验探针 | 未完成 |
| OBS0 生产基线 | 未完成 |

## 6. Go/No-Go

**当前：No-Go。**

仅完成 scope 冻结与本地代码门禁预检；候选 commit 形成后须复跑门禁并回填本表。DB / E2E / 部署均未通过。

## 7. 回滚要点

- 应用：Vercel 回退上一稳定 deployment（发布后）。
- 数据库：优先保留加法式对象与安全收紧；`migration-nav-runtime.rollback.sql` **不得** DROP `consume_rate_limit`（已按此修复）。
- 专用 rollback：`migration-nav-category-cycle-guard.rollback.sql`、`migration-admin-link-tags-transaction.rollback.sql`。
