# ADR-003: 数据访问按域拆出 deep modules

Status: Proposed
Date: 2026-07-05
Deciders: nav-site maintainers

## Context

`lib/repositories.ts` 当前承担公开导航数据、详情页、评价、admin CRUD、标签、提交、点击、用户收藏等多种职责。它让页面和 API 不直接调用 Supabase，这是有价值的 seam；但该 module 的 interface 已经接近 implementation，维护者需要在一个大文件里理解不同的权限、缓存、RLS 绕过、可选迁移和错误处理规则。

近期评价系统隐私加固、收藏 RLS 注释、标签表可选降级都集中在同一文件中，说明 locality 不够。继续在同一个 module 上增加功能，会让测试和审查成本继续上升。

## Decision

保留 `lib/repositories.ts` 作为兼容 facade，逐步把 implementation 迁移到按域 deep modules。

建议目标形态：

- `lib/repositories/links.ts`：公开链接读取、slug、相关链接
- `lib/repositories/reviews.ts`：评价读取、创建、限流、迁移缺失错误
- `lib/repositories/admin.ts`：admin 链接/分类/标签 CRUD
- `lib/repositories/favorites.ts`：用户收藏，集中说明 NextAuth 与 Supabase RLS 的 seam
- `lib/repositories/categories.ts`：分类读取
- `lib/repositories/supabase-adapter.ts`：client 创建、缺表判断、日志错误转换等共享 adapter

## Considered Alternatives

- 维持单文件：短期无迁移成本，但每次修改都会扩大审查范围，interface 继续变浅。
- 一次性重写所有 repository 调用方：可快速得到新结构，但风险和 diff 过大，不适合生产收尾阶段。
- 直接引入 ORM：当前 Supabase query builder 已满足需求，新依赖不会降低主要复杂度。

## Consequences

- 正面：业务域 locality 提升，测试可以按域聚焦，隐私和权限语义更容易审查。
- 负面：迁移期间 facade 和域 modules 会短期共存。
- 风险：如果没有迁移顺序，可能形成重复实现。每次只迁移一个域，并保持 facade 导出不变。

## Revisit triggers

- `lib/repositories.ts` 删除 facade 后仍有跨域共享逻辑增长。
- 某个域 module 的 interface 又接近 implementation。
- Supabase 表结构或认证模型发生大变化。
