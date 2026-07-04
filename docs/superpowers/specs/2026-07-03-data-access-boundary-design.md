# 数据访问层边界设计

> 日期：2026-07-03
> 状态：已实施（commit `b1fae067`）
> 范围：生产稳定性收尾中的 Supabase 数据访问边界、Admin CRUD、超时、slug、输入错误边界和搜索召回

---

## 一、背景

本轮全面复查发现，项目的主要剩余风险不在单个查询，而在 Supabase client 的使用边界不够明确：

- Admin CRUD 部分路径仍使用 `createClient()`，与 RLS 设计中“业务表写入由服务端受控路径执行”的原则不一致。
- public read、admin write、internal service 三类数据访问混在同一个 repository 文件里，调用方不容易看出权限语义。
- 部分 API 路由直接 `request.json()`，无效 JSON 会落入 500。
- 资源库接口使用 `withTimeout(Promise.race)`，但没有取消底层 Supabase 请求。
- 工具详情 slug 部分位置使用 `slugify(title)`，没有优先使用数据库 `slug`。
- 分类语义搜索先全局 RPC 再本地过滤，分类候选可能被全局高分结果挤掉。

方案 B 的目标是先把数据访问层边界立清楚，再顺手修掉已确认的生产稳定性问题。实现已在 `b1fae067 fix: harden data access boundaries` 落地：Admin 写路径收口到 service role、无效 JSON 返回 400、资源库 Supabase 查询使用 `abortSignal`、详情 slug 优先使用数据库 slug、分类语义搜索扩大候选池。

## 二、目标

1. 让 Supabase client 的权限语义在代码层面可见，减少误用。
2. 让 Admin CRUD 与 RLS/service_role 设计一致。
3. 保持现有业务行为和 API 响应形状尽量稳定。
4. 用小步测试证明关键边界生效，而不是只靠人工审查。
5. 不做数据库 schema 迁移，不引入新依赖，不扩大视觉设计范围。

## 三、非目标

- 不拆分整个 repository 目录结构为多个大模块。
- 不重写 Supabase RLS 策略。
- 不改 public API 的字段命名或成功响应形状。
- 不处理后续视觉 redesign。
- 不引入新的 ORM、查询封装库或后台权限系统。

## 四、边界契约

### 4.1 Public Read

用于公开页面、公开 API、静态渲染和 sitemap 读取公开数据。

允许：

- 使用 anon key + RLS。
- 使用 `createClient()` 或 `createStaticClient()`。
- 读取 `approved=true` 的公开导航数据、分类、公开视图。
- 传入 `AbortSignal` 取消慢查询。

禁止：

- 写入业务表。
- 读取未审核或内部管理数据。
- 绕过 RLS。

典型调用：

- 首页分类和链接列表
- `/api/tools`
- sitemap
- 工具详情页公开数据

### 4.2 Admin Write

用于后台管理已鉴权后的 CRUD。

允许：

- 使用 `createServiceRoleClient()`。
- 由 `withAdminWrite` 或等价 admin route 保护后调用。
- 写入 `nav_links`、`nav_categories`、`tags`、`nav_links_tags` 等管理表。

禁止：

- 在客户端组件、公开 API、未鉴权 route 中创建 service_role client。
- 将 service_role client 作为公共参数暴露到非 admin 调用链。
- 把 service_role key 写入日志、文档、handoff 或测试输出。

设计方向：

- repository 内部提供 admin client helper 或明确的 `SupabaseAdminClient` 类型。
- Admin CRUD 函数内部选择 admin client，调用方不再临时传普通 SSR client。
- 测试通过 mock `createServiceRoleClient()` 验证边界。

### 4.3 Internal Service

用于服务端内部能力，例如语义搜索、评价写入、收藏辅助和需要绕过 RLS 的服务端逻辑。

允许：

- 在服务端模块内使用 `createServiceRoleClient()`。
- 对输入先在 API 边界完成校验，再进入 repository/service。
- 对外返回稳定错误，不暴露数据库细节。

禁止：

- 将内部服务能力挂到未鉴权、未校验的公开写接口。
- 在日志中记录 IP 之外的敏感凭证或 Authorization 值。

## 五、实施设计

### 5.1 Admin CRUD service_role 收口

修改点：

- `lib/repositories.ts`
- `app/api/admin/links/route.ts`
- 必要的 repository 测试

策略：

- 将 `getAllLinksForAdmin`、`updateLink`、`deleteLink`、`createCategory`、`updateCategory`、`deleteCategory`、`createTag`、`updateTag`、`deleteTag` 改为 admin client。
- `createLink` 从“外部传 client”逐步收口。为了降低改动风险，可以先兼容现有测试参数，再由 admin route 传 `createServiceRoleClient()`；最终目标是 repository 内部拿 admin client。
- `syncLinkTags`、`fetchLinkWithTags` 接受 read/admin 两类 Supabase client 的联合类型，避免类型绕路。

验收：

- Admin 写路径不再调用 `createClient()`。
- 相关测试能断言 `createServiceRoleClient()` 被调用。
- 公开读路径不受影响。

### 5.2 Slug 一致性

修改点：

- `app/api/tools/route.ts`
- `app/tool/[slug]/page.tsx`
- 必要时补充测试

策略：

- 统一使用 `link.slug || slugify(link.title)`。
- API 返回的 `slug` 和 `detail_page` 使用同一个 `detailSlug`。
- 相关工具链接也优先使用数据库 slug。

验收：

- 标题变更或自定义 slug 后，详情链接仍指向数据库 slug。
- sitemap、详情页、API slug 规则一致。

### 5.3 API JSON 错误边界

修改点：

- `app/api/favorites/route.ts`
- `app/api/submit/route.ts`
- `app/api/click/route.ts`
- `app/api/reviews/route.ts`

策略：

- 在 API 边界捕获 `request.json()` 异常。
- 无效 JSON 返回 400。
- 不改变合法请求和 schema 校验的既有行为。

验收：

- malformed JSON 不再返回 500。
- 日志中不记录原始 body。

### 5.4 Supabase timeout 真实取消

修改点：

- `app/api/resource-browse/route.ts`
- `app/api/resource-ratings/route.ts`
- `app/resources/[id]/page.tsx`
- 相关 resource library 测试

策略：

- 对 Supabase query builder 使用 `.abortSignal(AbortSignal.timeout(ms))`。
- 保留现有 fallback 行为和日志语义。
- `withTimeout` 可继续用于非 Supabase Promise，但不再包装可取消 query builder。

验收：

- 测试 mock 能观察到 `abortSignal` 调用。
- 慢查询会取消底层 fetch，而不是只让外层 Promise 先返回。

### 5.5 分类语义搜索召回

修改点：

- `lib/search/semantic.ts`
- `tests/search-optimization.test.ts`

策略：

- 在 RPC 尚未支持 category 参数前，扩大分类搜索候选池。
- 推荐候选数：`Math.min(Math.max(limit * 10, 50), 200)`。
- 继续在本地过滤 `category_slug`，保持当前 RPC 契约不变。

验收：

- 分类搜索不会因为全局 top-N 挤占而返回空结果。
- 候选池有上限，避免一次请求过大。

## 六、测试计划

最小测试集：

- `tests/repositories.test.ts`
  - Admin 写操作使用 service_role。
  - 公开读操作仍可用普通 client/static client。
- API route 测试
  - malformed JSON 返回 400。
- resource library 测试
  - Supabase query builder 收到 `abortSignal`。
- search optimization 测试
  - 分类语义搜索候选池扩大后能召回目标分类结果。
- slug 测试
  - 数据库 slug 优先于 `slugify(title)`。

最终验证命令：

```powershell
rtk pnpm lint
rtk pnpm typecheck
rtk pnpm test
rtk git diff --check
rtk node scripts/pre-commit-secret-scan.mjs
```

如果 `typecheck` 生成 `tsconfig.tsbuildinfo`，验证后删除该生成物。

## 七、风险与回滚

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Admin CRUD client 切换后测试 mock 类型不匹配 | 中 | 先定义联合类型或局部 helper，测试跟随边界语义更新 |
| service_role 被误用于公开路径 | 高 | 只在 admin/internal server 模块中引入，测试断言公开搜索不调用 service_role |
| JSON 错误响应文案变化影响测试 | 低 | 保持简短稳定的 `{ error: "Invalid JSON" }` 风格 |
| 分类语义候选池扩大增加 RPC 成本 | 中 | 设置 200 上限，只在 category 非 `all` 时启用 |
| abortSignal mock 链式调用不完整 | 低 | 扩展现有 MockDB chain，不改变生产代码语义 |

回滚策略：

- 每类修改保持局部提交，可单独 revert。
- 不涉及数据库迁移，因此回滚只需要代码回退。
- 若 admin 写路径上线后异常，优先回滚 repository/admin route 相关提交。

## 八、实施顺序

1. Admin CRUD service_role 收口。
2. Slug 一致性修复。
3. API JSON 400 边界。
4. Resource Supabase abortSignal。
5. Semantic category recall。
6. 全量验证与清理生成文件。
7. 如需要交接 Claude Code，写入 handoff checkpoint。

这个顺序先处理权限边界，再处理用户可见的一致性和稳定性，最后处理搜索召回。

## 九、自检

- Placeholder scan：无 TODO、TBD、占位内容。
- 一致性检查：边界契约、实施顺序、测试计划一致，均不要求数据库迁移。
- Scope 检查：只覆盖生产稳定性收尾，不包含视觉 redesign。
- 歧义检查：service_role 使用范围限定为 admin/internal server 路径；public read 保持 anon + RLS。
