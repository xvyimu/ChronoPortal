# CP search payload / timeout degrade · 2026-07-24

> **模块：** `M-CP-search-payload` · WEEK W7  
> **分支：** `xvyimu/cp-search-payload`  
> **边界：** `lib/search/**` · `app/api/search/**` · 相关 tests · 本文  
> **红线已守：** 未 push master · 未去 webpack · 未绕 RLS · 未放宽 CSP · 未上 Meili/ES · 未拆全量池

## 0. 一句话

Fuse `search({ limit })` 提前截断 + semantic `match_count` 上限 80 + RPC 2.5s 软超时 → `fallbackReason=semantic_timeout` 降级 Fuse；契约测绿。

## 1. 改动

| 文件 | 变更 |
|------|------|
| `lib/search/fuse.ts` | `fuse.search(term, { limit })` 替代全量 scan 再 `slice` |
| `lib/search/semantic.ts` | `resolveSemanticMatchCount`（全量=limit、分类=`max(limit*4,20)`、硬顶 80）；`withTimeout(RPC, 2500)`；超时抛 `SemanticSearchTimeoutError` |
| `lib/search/use-case.ts` | 捕获 timeout → `fallbackReason: "semantic_timeout"` + warn；200 + Fuse 结果 |
| `lib/search/types.ts` | `SemanticFallbackReason` 增 `semantic_timeout` |
| `lib/search/response-schema.ts` | Zod 同步 |
| `tests/search-semantic.test.ts` | match_count 上限 + timeout 抛错 |
| `tests/search-use-case.test.ts` | timeout 降级契约 |
| `tests/search-optimization.test.ts` | 分类 `match_count: 20`（原 50） |

**未改：** `getApprovedLinks` 全量池、Meili/ES、CSP、webpack、repository 写路径。

## 2. 行为契约

| 路径 | 期望 |
|------|------|
| semantic 正常 | 200 · mode=semantic · 无 fallback / empty 时 `semantic_empty` |
| embed 不可用 | 200 · `embedding_unavailable` · Fuse 结果 |
| 短 query | 200 · `short_query` · 不调 embed |
| **RPC 超时** | **200 · `semantic_timeout` · Fuse 结果 · 非 5xx** |
| 分类 semantic | `match_count ≤ 80`（limit=5 → 20） |
| Fuse 池大 | 每 term 最多 `limit` 候选（调用方 `limit*2`） |

## 3. 验证（本消息实跑）

| 命令 | Exit |
|------|------|
| `pnpm exec vitest run tests/search-semantic.test.ts tests/search-use-case.test.ts tests/search-fuse.test.ts tests/search-optimization.test.ts tests/api-search.test.ts` | **0** · 5 files · **42** passed |
| `pnpm typecheck` | **2** · **仅**既有 `tests/probe-security-headers.test.ts`（W5/`cp-typecheck-probe-headers` 债）；**本模块 0 新增 TS 错** |

```text
# search vitest
Test Files  5 passed (5)
     Tests  42 passed (42)
EXIT=0

# typecheck（边界外 residual）
tests/probe-security-headers.test.ts … ProcessEnv / headers index
ELIFECYCLE exit 2
```

## 4. 风险一句

分类 semantic 召回从 `min(max(limit*10,50),200)` 收到 `min(max(limit*4,20),80)`，极冷门类目可能少候选；超时 2.5s 在慢 DB 上会更常走 Fuse-only。
