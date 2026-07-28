# ChronoPortal · 结构化架构设计（v2）

| 项 | 值 |
|----|-----|
| 产品 | 综合导航 + Admin |
| GitHub | [xvyimu/ChronoPortal](https://github.com/xvyimu/ChronoPortal) |
| 路径 | `D:\projects\ChronoPortal` · https://yuanjia1314.ccwu.cc |
| 文档版本 | **v2 · 2026-07-29** |
| **栈权威** | **[`PROJECT.md`](./PROJECT.md)** |
| 许可 | MIT |

> 方法：[arc42](https://docs.arc42.org/home/) · [C4](https://c4model.com/) · 组合优化说明  

---

## 0. 五问

| # | 答 |
|---|----|
| 是什么？ | 可管理的导航门户（公开站+后台） |
| 为谁？ | 访客检索 · 站长运营 |
| 不做？ | 桌面壳 · 平行 Vue Admin · 绕 RLS · 乱扩写 API |
| 验收？ | typecheck · vitest · playwright（按面） |
| 协作？ | 公有 Issue/PR |

---

## 1. 背景与目标

外链治理（分类/搜索/死链/图标）+ Admin CRUD；数据 **Supabase+RLS**；鉴权 **Auth.js v5 @ β.32**（GHSA ≤β.31 已钉死）。

| 质量属性 | 表述 | 验证 |
|----------|------|------|
| 机密性 | RLS+服务端写路径 | 审 repository · 手测 |
| 完整性 | 鉴权会话正确 | admin-login/security 测 |
| 可用性 | 限流 fail 策略明确 | Upstash 配置审 |
| 安全依赖 | next-auth 单版本 β.32 | pnpm why · Dependabot |

---

## 2. 总体架构（C4）

### Context

```text
 [访客] → 公开站
 [站长] → Admin ──Auth.js──► 会话
              │
              ▼
         Supabase PG + RLS
              │
         嵌入/搜索基础设施
```

### Container

```text
 Next16 (webpack) App Router + Route Handlers
   ├─ UI React19 + shadcn + TW
   ├─ Auth.js
   ├─ Domain/Repository
   └─ Fuse + pgvector 客户端路径
         │
         ▼
   Supabase · Upstash · Sentry · Vercel
```

---

## 3. 选型理由

| 选 | 因 | 不选 |
|----|----|------|
| 同仓 Admin | 降双仓成本 | 第二 Admin 框架 |
| webpack 固定 | 现网兼容 | 擅自改 bundler |
| Supabase+RLS | 行级安全 | 裸库 |
| Fuse+pgvector | 模糊+语义 | 自建向量中台 v1 |
| Auth β.32 | 已修 advisory | 当未修告警长期 open |

---

## 4. 核心模块

| 模块 | 要点 |
|------|------|
| 导航 IA | 分类/条目/图标/死链 |
| 搜索 | Fuse + 向量 |
| Auth | Credentials/OAuth；β.32 地板 |
| 写路径 | repository；禁浏览器 service role |
| 限流/CSP | Upstash；csp-report |

---

## 5. 资产复用

nav-site 谱系文档化；Supabase 项目经迁移记录演进；shadcn 续用；Dependabot dismiss 必须有证据。

---

## 6. 信任边界与风险

| 边界 | 风险 | 缓解 |
|------|------|------|
| Browser→API | 越权写 | RLS+鉴权 |
| Admin 会话 | 固定会话攻击 | Auth 配置·CSP |
| 嵌入供应商 | 数据外送 | 模型/区域文档化 |
| 限流 | fail-open | 配置审 fail-closed 策略 |

---

## 7. 14 天计划

| 日 | 主题 | DoD |
|----|------|-----|
| 1–2 | 文档/auth 证据 | 与 dismiss 证据一致 |
| 3–4 | Dependabot 复验 | gh state |
| 5–7 | 搜索回归 | vitest |
| 8–9 | Admin 写路径 | RLS 清单 |
| 10–11 | perf | 抽查 |
| 12–14 | e2e+收口 | CI · 人闸 |

---

## 8. 验收命令（L4）

| 命令 | 用途 |
|------|------|
| `pnpm typecheck` | 类型 |
| `pnpm test` | vitest（含 security/admin） |
| Playwright 按改动 | e2e |
| `pnpm why next-auth` | 单版本证明 |

---

## 9. 相关文档

`PROJECT.md` · `ops/cp-deps-dismiss-evidence-2026-07-28.md` · `AGENT-CONTINUE-*.md` · `adr-*`

---

*v2 · 2026-07-29*
