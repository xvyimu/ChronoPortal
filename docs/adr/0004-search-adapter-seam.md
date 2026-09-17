# ADR-004: 搜索编排显式化 adapter seam

Status: Accepted
Date: 2026-07-05
Deciders: nav-site maintainers

## Context

`app/api/search/route.ts` 已经很薄，`lib/search/use-case.ts` 承担搜索编排：参数、facets、suggestions、Fuse、embedding、semantic RPC、merge、decorator、日志。这个 module 有深度，调用方只需要 `executeSearch()`。

剩余问题是 seam 仍然隐式：测试通过 `vi.mock` 替换 repositories、Supabase、logger 和 fetch。随着 RRF、语义阈值、fallback、telemetry 增加，隐式 mock 会让测试更难定位真实 interface。

## Decision

引入 `SearchAdapters` interface，并让 `executeSearch` 接受可选 adapters。

生产调用保持 `executeSearch({ params, requestId, startedAt })` 不变；没有显式传入
adapter 时使用 `defaultSearchAdapters`。测试可以传入 in-memory adapter，避免在
use-case 层 mock repositories、Supabase、fetch 或 logger module。

最终 interface：

```ts
interface SearchAdapters {
  getSearchPool: typeof getSearchPool;
  getEmbedding: typeof getEmbedding;
  searchSemantic: typeof searchSemantic;
  logger: Pick<typeof logger, "info" | "warn" | "error" | "debug">;
  now: () => number;
}
```

生产默认 adapter 继续使用现有 implementation；测试传入 in-memory adapter，减少跨 module mock。

## Implementation Notes

- `lib/search/use-case.ts` 导出 `SearchAdapters` 和 `defaultSearchAdapters`。
- `executeSearch` 只通过 adapter 访问搜索池、embedding、semantic RPC、logger 和 clock。
- `tests/search-use-case.test.ts` 使用 adapter 注入测试搜索编排，不再 mock
  repositories、Supabase 或 fetch。
- `tests/api-search.test.ts` 和 `tests/search-optimization.test.ts` 继续覆盖默认 adapter
  集成行为，包括 loopback embedding 保护、RRF 合并、语义 fallback 和日志脱敏。

## Considered Alternatives

- 维持直接 import：当前可用，但每新增 fallback 或外部依赖都会扩大 mock 面。
- 把搜索拆成更多小函数：可能让 interface 更宽，不能解决 seam 未命名的问题。
- 引入独立搜索服务：当前规模不需要跨进程 seam，运维成本过高。

## Consequences

- 正面：测试 surface 更清晰，fallback 行为更容易通过 adapter 组合验证。
- 负面：`executeSearch` 参数会略增，需要避免把太多 implementation 泄漏进 interface。
- 风险：adapter 过早泛化。只有存在生产 adapter 和测试 adapter 两个使用者时，seam 才成立。

## Revisit triggers

- 搜索测试继续依赖 3 个以上 `vi.mock`。
- 新增搜索数据源或 embedding provider。
- 语义服务健康状态需要与搜索 fallback 共享。
