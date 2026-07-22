# W3 · RLS 生产矩阵预备 · ChronoPortal

> **PROD RLS FLIP / schema 变更: NOT EXECUTED**  
> **无** `CREATE/ALTER/DROP POLICY` · **无** migration apply · **无** service_role 写库  
> 波次：portfolio W3 · 2026-07-23 · tip：`2e8cead1`  
> Worktree：`C:\Users\yuanjia\orca\workspaces\ChronoPortal\w3-cp-claude`

---

## 0. 边界

| 允许（本波） | 禁止（本波） |
|--------------|--------------|
| 角色/表 **意图矩阵**（文档） | 生产 RLS policy 修改 |
| **只读** catalog / `pg_policies` / privilege 清单 | 用 service_role 改数据 |
| 记录顾问 linter 发现 | 自动「修复」策略 |
| 引用 `scripts/rls-audit.sql` 与非生产 runbook | 宣称生产 RLS 已 harden 完成 |

非生产 runbook：`docs/ops/rls-audit-nonproduction-2026-07-22.md`  
SQL 清单：`scripts/rls-audit.sql`（SELECT only）

---

## 1. 角色与访问意图（产品）

| 角色 | 含义 | 写路径意图 |
|------|------|------------|
| **anon** | 浏览器 / 公开客户端 JWT | **读**公开导航数据；**不得**写业务表；限流/提交若走服务端应 **service role 或 Route Handler**，不靠宽松 anon policy |
| **authenticated** | Supabase Auth 登录用户（若启用） | 本产品 admin 主路径是 **Auth.js**，**不是**广泛的 Supabase end-user CRUD；authenticated 不应获得业务表全写 |
| **service_role / server** | Next Route Handlers · repository · 定时任务 | **唯一**写 nav_links / categories / settings / 限流桶等的正规路径（绕过 RLS） |
| **Auth.js admin** | Credentials 会话 · `proxy` 门闩 | 经 **server** 调 repository；DB 层不依赖「authenticated = admin」 |

**架构对齐：** 写路径经 repository / domain（`docs/PROJECT.md` · ADR-003/006）；RLS 是纵深，不是 Admin UI 的唯一授权。

---

## 2. 表级意图矩阵（目标态 · 文档）

图例：R=SELECT · C=INSERT · U=UPDATE · D=DELETE · —=应拒绝 · S=仅 service/server

| 表 | 业务意图 | anon | authenticated | server | FORCE RLS 目标 | 备注 |
|----|----------|------|---------------|--------|----------------|------|
| `nav_links` | 公开导航链接 | R（`approved=true`） | R（同或更严） | CRUD | **on** | 核心 |
| `nav_categories` | 分类 | R | R | CRUD | **on** | 核心 |
| `nav_links_tags` / `tags` | 标签 | R | R | CRUD | **on** | |
| `model_rankings` | 模型榜 | R | R | CRUD | **on** | **现状过宽 · 见 §4** |
| `tools` | 工具库/搜索 | R | R | CRUD | 建议 on | 公开读 |
| `nav_settings` | 站点设置 | — | — | CRUD | on | 禁公开 |
| `admin_sessions` | 历史/旁路会话 | — | — | CRUD | on | 宜无 anon policy |
| `login_attempts` / `submit_attempts` / `click_rate_limits` / `rate_limit_buckets` | 限流 | — 或极窄 C | — | CUD | on | 现多靠 server |
| `pages` / `resources` / `dedup_registry` | 内容/去重 | 按产品定；默认 — 写 | — | CRUD | on | 现状：RLS on **无 policy** |
| `infra_redis_*` / `service_health_events` | 运维 | — | — | CRUD | on | 非公开 API |

---

## 3. 只读 inventory 复跑（W3）

### 3.1 方法

| 项 | 值 |
|----|-----|
| 方式 | Supabase MCP `execute_sql` · **SELECT-only** catalog / `pg_policies` / `has_table_privilege` / `pg_class.relrowsecurity` |
| 项目 URL（非密钥） | `https://nzaocqwumlmbewoddysd.supabase.co` |
| 顾问 | `get_advisors(type=security)` 只读 |
| 变更 | **无** DDL/DML |
| 说明 | 若该 MCP 绑定生产项目：仍仅为 **inventory**；**不**等同生产 flip；连接串未写入本仓 |

未使用本地 `psql` + `CHRONOPORTAL_RLS_AUDIT_DATABASE_URL`（本机无注入非生产 URL）；逻辑覆盖 `scripts/rls-audit.sql` 的 §1–§3 与策略列表。

### 3.2 RLS 启用（public 基表）

| table | rls_enabled | rls_forced |
|-------|:-----------:|:----------:|
| admin_sessions | true | false |
| click_rate_limits | true | false |
| dedup_registry | true | false |
| infra_redis_connections | true | false |
| infra_redis_operation_logs | true | false |
| login_attempts | true | **true** |
| model_rankings | true | false |
| nav_categories | true | **true** |
| nav_links | true | **true** |
| nav_links_tags | true | **true** |
| nav_settings | true | false |
| pages | true | false |
| rate_limit_buckets | true | **true** |
| resources | true | false |
| service_health_events | true | false |
| submit_attempts | true | **true** |
| tags | true | **true** |
| tools | true | false |

### 3.3 现存 policies（摘要）

| table | policy | cmd | roles | using / check 摘要 |
|-------|--------|-----|-------|-------------------|
| nav_links | Public read approved links | SELECT | anon, authenticated | `approved = true` |
| nav_categories | Public read categories | SELECT | anon, authenticated | `true` |
| tags | Anyone can read tags | SELECT | anon, authenticated | `true` |
| nav_links_tags | Anyone can read link-tag associations | SELECT | anon, authenticated | `true` |
| tools | tools_select_public | SELECT | public | `true` |
| model_rankings | Public read rankings | SELECT | public | `true` |
| model_rankings | **Anon insert rankings** | INSERT | public | check `true` |
| model_rankings | **Anon update rankings** | UPDATE | public | using/check `true` |
| model_rankings | **Anon delete rankings** | DELETE | public | using `true` |

其余表：RLS on、**零 policy**（linter `rls_enabled_no_policy`）。

### 3.4 anon table privilege（GRANT 层 · 非 RLS 最终判定）

> `has_table_privilege` 反映 GRANT；**RLS 无 policy 时** 非 bypass 角色仍 **行级拒绝**。  
> 危险组合：**GRANT 写 + policy USING/CHECK true**。

| 关注表 | anon INS/UPD/DEL | 解读 |
|--------|------------------|------|
| nav_links / nav_categories / tags / tools | NO / NO / NO（sel YES） | 与公开读意图一致 |
| **model_rankings** | **YES / YES / YES** | **与开放写 policy 叠加 → 高风险** |
| pages / resources / dedup_registry | YES/YES/YES | GRANT 宽，但 **无 policy** → RLS 挡行；仍应 **收 GRANT** 并明确意图 |
| login/submit/click rate 等 | NO | 依赖 server；无 policy + RLS = 客户端不可直写 |

### 3.5 Security advisor（摘录 · 只读）

| 级别 | 主题 | 对象 |
|------|------|------|
| WARN | `rls_policy_always_true` | **model_rankings** INSERT/UPDATE/DELETE |
| INFO | `rls_enabled_no_policy` | admin_sessions, click_rate_limits, dedup_registry, infra_*, login_attempts, nav_settings, pages, rate_limit_buckets, resources, service_health_events, submit_attempts 等 |
| WARN | `function_search_path_mutable` | 多函数（含 search/cleanup） |
| WARN | `anon_security_definer_function_executable` | `increment_click`, `get_cat_memories` |
| WARN | extension vector in public | 已知 |

---

## 4. 对照 `rls-audit.sql` 结论模板（inventory 结果）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 业务表 RLS 已启用 | **部分通过** | nav_* / tools / model_rankings 均 on |
| anon 无法写业务表 | **失败** | **model_rankings** 可写 |
| anon 仅 SELECT approved nav_links | **通过**（policy） | |
| anon 可写速率限制表 | **否**（与脚本旧预期不完全一致） | 现由 server + 无 client policy；**可接受**若 server-only |
| authenticated 完整 CRUD | **未以 policy 体现** | 依赖 service role；勿误加 authenticated 全开 |
| FORCE RLS | **部分** | nav_links/categories/tags 等 forced；model_rankings/tools **未** forced |

**结论：** 可重复 inventory **成功**；**姿态未达「可生产 flip 收紧」**。最大阻塞：**model_rankings 对 public 的开放写 policy**。次要：宽 GRANT 表、无 policy 表、SECURITY DEFINER 可被 anon 执行。

---

## 5. 未来生产变更申请（模板 · **未提交**）

```text
标题: [CP][RLS] 收紧 model_rankings 与公开写面
前置: 本文件 §3–4 inventory + 非生产演练通过
变更草案:
  1) DROP model_rankings 的 Anon insert/update/delete
  2) 保留 Public read；写仅 service_role / 明确 admin 路径
  3) 复核 pages/resources/dedup_registry：收 GRANT 或加最小 policy
  4) 评估 revoke anon EXECUTE on increment_click / get_cat_memories（若非故意公开 RPC）
回滚: 保存 policy DDL 快照；失败则 re-apply 旧 policy
验收: 再跑 rls-audit SELECT；anon 写 model_rankings 失败；前台读榜成功；Admin 写路径仍绿
禁止: 与 CSP 生产 flip 同会话无授权并行；无用户「RLS flip 现在」
状态: NOT FILED / NOT EXECUTED
```

---

## 6. 生产变更禁令（W3 硬）

| 禁令 | 状态 |
|------|------|
| 生产 CREATE/ALTER/DROP POLICY | **遵守 · 未执行** |
| 生产 migration / schema | **遵守** |
| 将 inventory 误标为「已 harden」 | **禁止** — 本文仅预备 |
| 静默 DEFER 高风险（model_rankings） | **否** — 已写入发现，owner= DB/app，波次 **W3 residual / W4** |

---

## 7. 交叉引用

- `docs/ops/rls-audit-nonproduction-2026-07-22.md`
- `scripts/rls-audit.sql`
- `docs/ops/L2-P0-action-board-2026-07-22.md`（P0-RLS）
- `docs/ops/w3-arch-upgrade-chronoportal-claude.md`
- Portfolio `repos/cp.md` · task_plan §6
