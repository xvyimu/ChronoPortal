# Release Manifest — 2026-07-18（最终收口）

> 状态：**ENDED / Released Go（主域）** · 运维三项已尽量落地  
> 主计划：`docs/optimization-and-release-plan-2026-07-18.md`  
> 前台性能：`docs/frontend-perf-optimization-2026-07-18.md`  
> Preview：`docs/preview-env-setup.md` · 值守：`docs/oncall-and-alerts.md` · Embed：`docs/embed-fly-deploy.md`

## 1. 版本绑定

| 项 | 值 |
|---|---|
| 分支 | `master` = `origin/master` = **`50db5afc`**（含 ops 文档/脚本） |
| **生产运行时 HEAD** | **`ee5a047b`**（T1–T10 代码） |
| 生产 deploy | `dpl_A9WHnXUYn3CXantjJpXKaaJAJmnb` → https://yuanjia1314.ccwu.cc |
| 基线 SHA | `9733897d…` |
| 运行时主候选（admin+迁库） | `78369801…` |
| 形成日期 | 2026-07-18 |
| 生产迁库 | **是**（supabase-nav-prod） |

### 1.1 关键时间线（同日）

| 阶段 | HEAD | 说明 |
|---|---|---|
| Favicon 恢复 | `46981a1a` | monogram + redirect |
| 文档收口 | `727e2711` | release docs + chrome 证据 |
| T1–T10 代码 | **`ee5a047b`** | icon 回填客户端 + backlog |
| Ops 脚本/文档 | `f00cc7e9`→`c6357a59`→**`50db5afc`** | Preview env/SSO/on-call/embed 同步 |

**口径：** 运行时事实源 = 主域 `/build-info.json`（`ee5a047b`）；仓库事实源 = `origin/master`（`50db5afc`）。ops-only 不必再 prod 部署。

## 2. 验收（2026-07-18 终检）

| 检查 | 结果 |
|---|---|
| 主域 `verify:production` expect `ee5a047b` | **PASS** |
| Preview `nav-site-c44z6np3k…` expect `ee5a047b` | **PASS** |
| Preview/Production health embedding | **ok** |
| Vercel `ssoProtection` | **null**（已关） |
| 本机 embed 18003 + Worker | **ok** |
| 登录自启 `nav-site-embed-stack` | **Ready** |
| 生产 icon preferred | **512/512** |

## 3. Preview

| 项 | 值 |
|---|---|
| 例 URL | https://nav-site-c44z6np3k-aijiai520.vercel.app |
| Supabase | **nav-dev** `nzaocqwumlmbewoddysd` |
| service_role | User env `SUPABASE_DEV_SERVICE_ROLE` → Preview |
| embed | Worker + `.embed-api-key.local` |
| SSO Protection | 关闭（私有仓） |
| 同步脚本 | `scripts/sync-preview-env.ps1` |

## 4. 生产数据库

候选迁移（幂等，早先已应用）：hierarchy / cycle guard / tags / link-tags RPC / access hardening / rate-limit runtime。  
T1：`nav_links.icon` 回填为 `/api/favicon?domain=…&v=2`（512 approved）。

## 5. Go/No-Go

**Go · 项目收口。**

- 主域功能与探针绿  
- Preview 可匿名功能探针  
- 值守默认已文档化  
- Embedding：本机路径常开（Fly/VPS 待绑卡，不阻断）

## 6. 回滚

- 应用：Vercel 回退上一 Production Ready deployment  
- DB：保留加法式对象；勿 DROP `consume_rate_limit`  
- Preview SSO 复开：`PATCH` `ssoProtection: { deploymentType: "all_except_custom_domains" }`  
- Embed：本机 `ensure-embed-stack` / 卸载自启见 scripts

## 7. Backlog T1–T10

| ID | 结果 |
|---|---|
| T1 icon 回填 | ✅ prod 512/512 + 前端 `isPreferredIcon` |
| T2 E2E scrollY | ✅ |
| T3 Lighthouse | ✅ Perf 0.97 |
| T4 Preview env | ✅ 已挂 + 探针 PASS |
| T5 embed 上云 | ⏳ Fly 需绑卡；本机路径 ✅ |
| T6 RUM/Sentry | ✅ 文档 + 值守默认 |
| T7 虚拟列表 | 不引入（有触发条件） |
| T8 OpenAPI | ✅ `docs/openapi.json` |
| T9 CSP | 小步 img-src |
| T10 搜索解耦 | 保持 + 触发条件 |

## 8. 值守（首小时 / 日常）

见 `docs/oncall-and-alerts.md`：主值守 = owner；Sentry 邮件 + Vercel 失败通知。

```powershell
pnpm run verify:production -- --base-url https://yuanjia1314.ccwu.cc --expect-commit ee5a047b29e030afc60e75e57b0be913e6b2fd00
powershell -NoProfile -File D:\nav-site\scripts\bootstrap-embed-always-on.ps1
```

## 9. 明确不做 / 硬阻塞

| 项 | 状态 |
|---|---|
| Fly `nav-site-embed` | 需 https://fly.io/dashboard/xihg/billing 绑卡 |
| 本机 Docker | 未装 |
| 为 ops 文档再 prod 部署 | 不做 |
| User `EMBEDDING_API_KEY`(51) 当 embed key | 禁止（worker 401） |
