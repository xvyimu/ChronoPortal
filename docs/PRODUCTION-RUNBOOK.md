# 生产运行手册

> 最后更新：2026-07-09
> 适用项目：nav-site
> 生产入口：`https://nav-site.netlify.app`

## 目标

这份手册用于生产发布、故障处理、账号额度恢复、健康检查和跨代理交接。任何涉及生产数据库、部署平台 secret、GitHub secret、Netlify 账单和域名 DNS 的操作，都先按本手册确认影响范围，再执行。

## 日常发布流程

1. 本地确认工作树只包含预期改动：

```powershell
rtk git status --short --branch
```

2. 运行本地质量门禁：

```powershell
rtk pnpm run lint
rtk pnpm run typecheck
rtk pnpm test
rtk pnpm run build
rtk pnpm run audit:security
rtk node scripts/pre-commit-secret-scan.mjs
```

3. 推送到 `origin/master` 后，GitHub Actions 会自动运行 quality/build/E2E。`master` push 不会自动消耗 Netlify deploy credits。

4. 生产部署只通过 GitHub Actions 手动运行：

- Workflow：`CI 检查 / 手动 Netlify 部署`
- 条件：Netlify account credit/账单额度可用
- 结果：同步 `master` 到 Netlify 监听的 `main`，等待 Netlify Git deploy，然后运行 deploy 后探针和 link check

5. 部署后复验：

```powershell
rtk pnpm run verify:production:latest -- --expect-commit <commit-sha>
rtk pnpm run verify:launch-readiness
```

## Netlify Credit 问题

### 现象

GitHub Actions deploy job 在 preflight 或 Netlify trigger 阶段失败，并出现类似：

```text
Netlify account credit usage exceeded
```

### 永久处理策略

- 保持 `master` push 只做代码验证，不自动触发生产 deploy。
- 保持 `netlify.toml` 的 `build.ignore` 门禁，仅允许 Netlify 生产监听分支继续构建。
- 生产部署必须手动触发，避免每次 push 消耗 credits。
- 额度恢复前不要重复触发 deploy job；先跑本地和 GitHub quality/build/E2E。
- 额度恢复后只触发一次 `CI 检查 / 手动 Netlify 部署`，并等待 `link-check` 完成。

### 验证

```powershell
rtk pnpm test tests/wait-netlify-deploy.test.ts tests/ci-workflow.test.ts
rtk pnpm run verify:launch-readiness -- --skip-network
```

## 健康检查语义

生产健康入口：

```text
/api/health
```

核心字段：

| 检查项 | 期望 | 是否阻断主站健康 | 说明 |
|---|---:|---:|---|
| `database` | `ok` | 是 | 主 Supabase 分类表连通性 |
| `env` | `ok` | 是 | 必需公开 Supabase env 是否存在，不暴露值 |
| `sentry` | `ok` 或 `skipped` | 否 | Sentry 是可选观测项 |
| `embedding` | `ok`、`skipped` 或 `error` | 否 | 语义搜索可降级到 Fuse；Netlify/serverless 默认跳过 loopback |
| `resourceLibrarySearch` | `ok` 或 `skipped` | 否 | 资源库公开搜索 RPC；`error` 会被生产探针标红 |

资源库搜索健康检查只使用 `RESOURCE_LIBRARY_ANON_KEY` 或 `RESOURCE_LIBRARY_SUPABASE_ANON_KEY` 调用公开 RPC `resource_search_health`。缺 key 时标记 `skipped`，不会回退到 service role。

## 生产探针

当前生产可用性：

```powershell
rtk pnpm run verify:production
```

最新 commit 是否部署：

```powershell
rtk pnpm run verify:production:latest -- --expect-commit <commit-sha>
```

上线总门禁：

```powershell
rtk pnpm run verify:launch-readiness
```

如果生产探针失败，先看失败 endpoint：

- `home`：主站不可访问或返回非 HTML。
- `health`：健康 JSON 结构或关键检查异常。
- `search`：主搜索接口异常。
- `tool-detail`：详情页渲染异常。
- `sitemap` / `robots`：SEO 基础文件异常。
- `build-info`：线上 commit 与预期不一致。

## Resource Library 操作边界

本项目只保留公开读路径的配置和验证，不在普通发布中直接操作资源库生产库。

上线前确认：

- Resource Library 项目已执行 `scripts/migration-resource-library-public-read.sql`。
- 部署环境配置了 `RESOURCE_LIBRARY_ANON_KEY` 或 `RESOURCE_LIBRARY_SUPABASE_ANON_KEY`。
- `/api/resource-search-status` 返回 `{ "available": true }` 或在未启用资源库时返回可解释的 unavailable reason。
- `/api/health` 的 `checks.resourceLibrarySearch.status` 为 `ok` 或 `skipped`。

生产 SQL、secret 配置、远程数据库写入应交给有凭据的操作者或 Claude Code 执行，并在执行前确认目标项目、SQL 文件、回滚方案和验证命令。

## 回滚

优先使用 revert commit，不重写历史：

```powershell
rtk git revert <release-commit> --no-edit
rtk git push origin master
```

回滚后：

1. 等待 GitHub quality/build/E2E 通过。
2. 手动运行 `CI 检查 / 手动 Netlify 部署`。
3. 运行 `pnpm run verify:production:latest -- --expect-commit <rollback-commit-sha>`。
4. 检查首页、搜索、详情页、`/api/health`、`/build-info.json`。

## 故障分级

| 等级 | 场景 | 处理 |
|---|---|---|
| P0 | 首页无法访问、`database`/`env` 失败、最新 deploy 明显损坏 | 暂停继续部署，准备 revert，保留日志和 Actions run 链接 |
| P1 | 搜索接口失败、详情页失败、资源库健康 `error` | 禁止继续功能发布，先定位接口或配置 |
| P2 | embedding `error`、Sentry `skipped`、link check 局部失败 | 记录风险，可按业务影响决定是否发布 |
| P3 | 文档、非关键视觉、性能分数波动 | 排入后续优化 |

## Claude Code 交接

生成或读取交接：

```powershell
python C:\Users\yuanjia\agent-memory\scripts\handoff.py latest --project nav-site --to-agent codex
python C:\Users\yuanjia\agent-memory\scripts\handoff.py add --project nav-site --from-agent codex --to-agent claude-code --summary "<当前状态>" --next-step "<下一步>"
```

交接时必须说明：

- 当前 commit、分支、是否已 push。
- 本地验证结果。
- 生产 deploy 是否已触发。
- Netlify credit 是否恢复。
- 是否需要生产 Supabase/Resource Library 操作。
- 不要在 handoff、日志、commit message、README 中写入任何 secret。
