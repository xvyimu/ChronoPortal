# ADR-009: 管理后台前后端 interface 分离

Status: Accepted
Date: 2026-07-18
Deciders: nav-site maintainers

## Context

管理后台已经使用 Next.js Route Handler、Auth/CSRF 包装器和按域 repository，但浏览器调用仍有两类耦合：

1. React module 从 `lib/repositories` 导入后端分页类型。
2. 链接与分类组件各自拼装 `/api/admin/*` URL、HTTP method、JSON envelope 和错误解析。

这些耦合降低 locality：API 错误 contract 或 URL 变化时，需要同时修改多个 UI module；测试也只能通过替换全局 `fetch` 间接覆盖调用规则。

现有 ADR-006 已把 Supabase 访问拆到 links/categories/tags domain repositories。再增加一个只转发 repository 的 service module 无法通过 deletion test，因此不采用。

## Decision

保持单一 Next.js 部署，采用 contract-first 的模块化单体：

```text
React UI -> admin client adapter -> HTTP Route adapter -> domain repository -> Supabase
    |              |                       |                    |
    +------ shared serializable contracts -+                    |
                           Auth / CSRF / Zod                     |
```

- `lib/admin/contracts.ts`：前后端共享的可序列化 interface，只暴露 DTO、筛选和保存命令。
- `lib/admin/client.ts`：浏览器 HTTP adapter，隐藏 URL、method、JSON envelope、错误解析和取消信号。
- `components/admin/admin-queries.ts`：React Query interface，集中 query key 和分类缓存策略。
- `lib/with-admin.ts`：Route Handler adapter，集中 Auth、CSRF、body schema、UUID 和错误响应。
- `lib/repositories/admin-links.ts`、`categories.ts`、`tags.ts`：保留为后端 deep modules，隐藏 service-role、Supabase query、RPC、迁移降级和日志。

Server Components 继续直接调用后端 repository，不通过自身 Route Handler 发起 HTTP 请求。该约束来自 Next.js 16.2.9 本地 BFF 指南，可避免构建期不可达和运行时额外网络往返。

## Interface invariants

1. 有资源 ID 的保存命令使用 `PUT`；无 ID 使用 `POST`。
2. 现有 `/api/admin/links|categories|tags` URL、HTTP method 和 JSON envelope 保持不变。
3. 浏览器 adapter 使用同源 Cookie；不新增跨域 CORS、Bearer token 或独立鉴权体系。
4. Route Handler 继续负责 Auth、CSRF 和 Zod；UI 不可信，repository 不接收原始 `Request`。
5. 客户端对分页、集合、实体和删除确认做最小运行时校验，避免 HTTP 200 被静默解释为成功。
6. 新增或实质修改的自定义导出类型、函数、hook、业务回调和跨 interface 调用使用中文职责注释；不机械注释库函数的每次调用。

## Considered alternatives

- **独立前后端部署：** 当前没有独立扩缩容、团队所有权或 SLA 证据；会新增 CORS、token、部署和可观测成本，不采用。
- **通用泛型 CRUD client：** interface 更短，但条件类型和 envelope 分支降低常用 caller 可读性，不采用。
- **新增 application service：** 当前只会转发 repository，没有额外业务 depth；等跨 repository 用例出现后再评估。
- **组件继续直接 fetch：** 文件少，但 URL、错误和缓存规则继续分散，不采用。

## Consequences

- 正面：UI 不再依赖后端 repository；HTTP 变化集中在一个 adapter；Route Handler 重复 UUID 逻辑被消除。
- 正面：production fetch 与测试 fetch 构成真实 seam，client interface 可独立验证。
- 正面：repository 更新输入由共享 contract 约束，不再使用无界 `Record<string, unknown>`。
- 负面：增加 contracts/client 两个 module，并需要维护最小运行时响应校验。
- 风险：未来若把 tags/categories/links 强行泛化，interface 可能重新变浅；应保持显式资源能力。

## Verification

- `tests/admin-client.test.ts` 固定浏览器 adapter 的查询、保存、错误和 envelope contract。
- `tests/admin-id-route-wrapper.test.ts` 固定动态 UUID Route Handler adapter。
- `tests/admin-boundary.test.ts` 禁止管理组件重新导入 repository 或直接包含 `/api/admin` URL。
- 全项目 lint、typecheck、unit/integration test 和 production build 必须通过。

## Revisit triggers

- 前后端需要独立部署、独立扩缩容或由不同团队拥有。
- 出现跨 links/categories/tags 的真实事务用例，需要新的 application module。
- Auth 从同源 Cookie 迁移到外部 API token，改变浏览器与后端 seam。

