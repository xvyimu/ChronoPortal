# cp-long-verify Evidence — 2026-07-24

- Module: M-CP-long-verify-re
- WEEK: W11 重跑
- Branch: `xvyimu/cp-long-verify`
- 前置修复: cherry-pick `a8eb537a`（`fix(csp-report): move toPathOnlyUri out of route module`）→ 本地 commit `67d8c494`，EXIT=0
  - `toPathOnlyUri` 已移出 `app/api/csp-report/route.ts`（route 仅剩 `dynamic` / `POST` / `GET` 导出），纯函数落 `lib/csp-report-uri.ts`；满足 Next 16 route type-check 禁非 handler 具名导出。

## 环境

```
export CI=true
unset UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN
```

## 命令与 exit code

| 步骤 | 命令 | exit |
|------|------|------|
| typecheck | `pnpm typecheck` (`tsc --noEmit --incremental false`) | **2** |
| test | `pnpm exec vitest run` | **0** |
| build | `pnpm run build` (`next build --webpack`) | **0** |

## typecheck 红（W5 feature · 非本次范围）

`TYPECHECK_EXIT=2`，全部集中在 `tests/probe-security-headers.test.ts`（W5 headers probe feature，未合入的探针测试）：

```
tests/probe-security-headers.test.ts(31,35): TS2345 Argument of type '{}' is not assignable to parameter of type 'ProcessEnv'. Property 'NODE_ENV' is missing ...
tests/probe-security-headers.test.ts(65,7): TS2345 同上
tests/probe-security-headers.test.ts(73,36): TS2345 '{ HEADERS_PROBE_BASE_URL; HEADERS_PROBE_ALLOW_PRODUCTION }' 缺 NODE_ENV
tests/probe-security-headers.test.ts(132,12): TS7053 index '"x-frame-options"' on Record<string,string> | {}
tests/probe-security-headers.test.ts(155,7): TS2345 缺 NODE_ENV
```

判定：属 W5 security-headers probe feature 遗留，与本次 CSP-report route type-fix 无关；业务范围未动。

## test

```
Test Files  62 passed | 1 skipped (63)
     Tests  614 passed | 6 skipped (620)
VITEST_EXIT=0
```

## build

`next build --webpack` 完成，所有路由（含 `/api/csp-report`）编译通过，`BUILD_EXIT=0`。

## 结论

- test / build 绿（exit 0）。
- typecheck 红仅限 `probe-security-headers.test.ts`（W5 feature），业务代码 type-check 无阻塞。
- 未 push master；未放宽 CSP；未去 webpack。
