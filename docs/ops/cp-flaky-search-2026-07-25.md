# CP flaky search / favicon / resource-library mocks · 2026-07-25

> **模块：** `M-CP-flaky-search`  
> **分支：** `xvyimu/cp-flaky-search`  
> **基线 tip：** `e551d2c0`（next-auth beta.32 族）  
> **禁止已守：** push · 生产/默认 CSP flag · 再升 next-auth · Stage A 外 env 真值

## 0. 一句话

主机 shell 注入了真实 `UPSTASH_REDIS_REST_*` → 公开端点限流走 Upstash pipeline → 污染测试里的 `fetch` mock 调用计数。**4 个既有失败文件**在测试 `beforeEach` 中清掉 Upstash env，强制 memory 后端；**0 产品逻辑改动**。

## 1. 复现（修前）

```text
pnpm exec vitest run \
  tests/api-favicon.test.ts \
  tests/api-search.test.ts \
  tests/api-resource-library.test.ts \
  tests/search-optimization.test.ts
# → 9 failed / 46 passed
```

| 文件 | fail | 表象 |
|------|------|------|
| `tests/api-favicon.test.ts` | 2 | `expect(fetch).not.toHaveBeenCalled()` 被 Upstash `/pipeline` 打穿 |
| `tests/api-search.test.ts` | 1 | 同上（`rl:search:sem:…`） |
| `tests/api-resource-library.test.ts` | 5 | `fetchMock` 次数 +1 / `requestBodyFromFetchMock` 读到 INCR body |
| `tests/search-optimization.test.ts` | 1 | OPT#6 outage cache：`toHaveBeenCalledTimes(1)` 实际 3 |

stderr 佐证：

```text
[WARN] Distributed rate limit fell back to memory
  bucketKey=favicon:unknown
  error=Unexpected token 'x' … is not valid JSON  # mock 的 image body 被当 pipeline JSON 解析
```

## 2. 根因

`lib/rate-limit-distributed.ts`：`UPSTASH_REDIS_REST_URL` + `TOKEN` 齐全时走 Redis REST pipeline（`fetch(`${url}/pipeline`)`）。  
本 worktree **无** `.env` / `.env.local`，但 **进程环境**（Orca/系统）注入了真实 Upstash 凭据，与 `api-health` 等已显式 `delete` 的测试不同，上述 4 文件未隔离。

非 next-auth 回归：主 tip `e551d2c0` 文档已记「9 fail 既有」。

## 3. 修复（最小 diff）

仅测试文件，模式对齐 `tests/api-health.test.ts`：

```ts
// beforeEach
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
// afterEach（有 env 清理块的文件）同样 delete
```

| 文件 | 改动 |
|------|------|
| `tests/api-favicon.test.ts` | beforeEach 清 Upstash |
| `tests/api-search.test.ts` | beforeEach + afterEach |
| `tests/api-resource-library.test.ts` | beforeEach + afterEach |
| `tests/search-optimization.test.ts` | beforeEach + afterEach |

**未改：** `lib/rate-limit-distributed.ts`、search/favicon/resource 产品路由、CSP flag、next-auth。

## 4. 验收

| 命令 | 结果 |
|------|------|
| 上述 4 文件 + `tests/api-csp-report.test.ts` | **5 files · 61 tests · 0 fail** · exit **0** |

```powershell
pnpm exec vitest run `
  tests/api-favicon.test.ts `
  tests/api-search.test.ts `
  tests/api-resource-library.test.ts `
  tests/search-optimization.test.ts `
  tests/api-csp-report.test.ts
# EXIT=0
```

## 5. 红线

| 项 | 状态 |
|----|------|
| push | **未做** |
| 生产 CSP / 默认 flag | **未触** |
| next-auth 再升 | **未做** |
| Stage A 外 env 真值 | **未改**（仅测内 delete 进程 env 键） |
| 搜索产品逻辑 | **未改** |

## 6. 后续（非本刀）

- 可选：`vitest.setup.ts` 全局清 Upstash，避免同类泄漏（需确认 rate-limit-distributed 自身测仍可显式注入 env）  
- 可选：CI 矩阵无 Upstash 时再跑一轮确认  
