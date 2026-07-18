# Release Manifest — 2026-07-18 优化候选

> 状态：**生产已部署并完成主域 commit 探针**；preview 受 Deployment Protection 限制未完成功能探针
> 主计划：`docs/optimization-and-release-plan-2026-07-18.md`
> ADR：`docs/adr-009-admin-frontend-backend-interface.md`

## 1. 版本绑定

| 项 | 值 |
|---|---|
| 分支 | `master` |
| 基线 SHA | `9733897d8d417e36cb293e94fff11cde4215ec76` |
| 运行时主候选 | `78369801db5b1c2e7314b8bdfa337be5412faeeb` |
| 公开 HEAD / 部署 commit | `d23a5c4636ad0f9bf4ef7183983cd8be0e163d95` |
| 形成日期 | 2026-07-18 |
| 是否已 push | **是**（`origin/master` = `d23a5c46`） |
| 是否已部署 | **是（Production）** `dpl_J7MCS6QY3VqtdizzSCuv1hz6xtWd` → `https://yuanjia1314.ccwu.cc` |
| 是否已对生产迁库 | **是（2026-07-18，MCP supabase-nav-prod）** |

## 2. E2E 结果（nav-dev only）

| 套件 | 结果 |
|---|---|
| chromium home+admin | **32/32 pass** |
| mobile-chrome home+admin | **32/32 pass** |
| admin-performance | **pass**（需 nav-dev 重建 `.next`；产物 `docs/perf/admin-baseline-2026-07-18.json`） |

进程覆盖：URL/anon→DEV；`SERVICE_ROLE` 与 `_PROD` 均强制 nav-dev。

## 3. Preview 部署

| 项 | 值 |
|---|---|
| URL | `https://nav-site-hwujbkm1x-aijiai520.vercel.app` |
| id | `dpl_3UvQzks1Yc8Q8rNTK1bFsP1T7TMp` |
| status | Ready / target=preview |
| 功能探针 | **未通过**（Deployment Protection 返回 HTML 登录墙） |
| 环境变量 | 项目 env 当前仅挂 **Production**；Preview 无完整 Supabase 配置 |

结论：preview 仅证明构建成功，**不能**作为功能验收。

## 4. 生产数据库（supabase-nav-prod / `vyqqbypwrbdcafanzwmj`）

按序应用（幂等）：

1. `nav_category_hierarchy`（parent_id）
2. `nav_category_cycle_guard`
3. `create_nav_tags`
4. `admin_link_tags_transaction_rpcs`
5. `nav_access_hardening`
6. `rate_limit_runtime_and_attempt_tables`（含缺失的 `login_attempts`/`submit_attempts`）

对象验收：parent_id / tags / RPCs / cycle guard / buckets / attempts 均存在。  
行为验收：自指 parent 拒绝；坏 tag create 不落残 link；RPC 仅 service_role 可执行；`consume_rate_limit` smoke ok。

## 5. 生产部署与探针

| 项 | 值 |
|---|---|
| Production deployment | `https://nav-site-758cwcdxr-aijiai520.vercel.app` |
| id | `dpl_J7MCS6QY3VqtdizzSCuv1hz6xtWd` |
| 主域 | `https://yuanjia1314.ccwu.cc` |
| `/build-info.json` | `commit=d23a5c4636ad0f9bf4ef7183983cd8be0e163d95` |
| 主域探针 | **PASS**（home/health/search/tool-detail/sitemap/robots/build-info） |
| 部署 URL 探针 | 受 Protection 影响返回 HTML（与 preview 同类限制） |

偶发：`/tool/figma` 可能被 Cloudflare “Just a moment…” 403；复探针通过。

## 6. Go/No-Go

**条件 Go（主域）。**

- 代码：`d23a5c46` 已 push 并作为生产 build-info commit  
- DB：生产候选迁移已应用且关键行为验收通过  
- 主域探针：退出码 0 且 commit 匹配  
- 限制：preview 功能探针未完成；部署直链受 Protection；生产 SSG 期间曾出现 tags 读取瞬时失败日志  

## 7. 回滚

- 应用：Vercel 回退上一 Production Ready deployment  
- 数据库：保留加法式对象与安全收紧；勿 DROP `consume_rate_limit`  
- 专用 rollback：`migration-nav-category-cycle-guard.rollback.sql`、`migration-admin-link-tags-transaction.rollback.sql`（仅必要时）

## 8. 值守建议（首小时）

1. 盯 `/api/health` 与错误率  
2. 抽查 `/admin` 登录与链接/分类读写  
3. 若 Cloudflare 对 `/tool/*` 拦截升高，放行主域探针 UA 或调 WAF  
