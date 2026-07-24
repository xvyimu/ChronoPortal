# ChronoPortal · W5 typecheck 债 · probe-security-headers · 2026-07-24

> **模块：** `M-CP-typecheck-probe-headers`  
> **分支 / worktree：** `xvyimu/cp-typecheck-probe-headers`  
> **红线：** 未 push master · 未改生产 CSP/头 · 未放宽 canary · 未去 webpack · 未动 next.config/proxy/env

---

## 0. 一句话

| 项 | 结果 |
|----|------|
| 根因 | JSDoc 把 `env` 标成 `NodeJS.ProcessEnv`（强制 `NODE_ENV`）；失败路径 `headers: {}` 被推断为 `{}` 而非 `Record<string, string>` |
| 修复 | 仅类型对齐：`ProbeEnv = NodeJS.Dict<string>` + `ProbeResult`；运行时零行为变更 |
| `pnpm typecheck` | **exit 0** |
| 单元测 | **6/6 pass · exit 0** |
| 生产 CSP / 头 | **未 flip** |

---

## 1. 失败面（修前）

`pnpm typecheck` → exit **2**：

```
tests/probe-security-headers.test.ts(31,35): error TS2345: Argument of type '{}' is not assignable to parameter of type 'ProcessEnv'.
  Property 'NODE_ENV' is missing in type '{}' but required in type 'ProcessEnv'.
tests/probe-security-headers.test.ts(65,7): error TS2345: ... ProcessEnv / NODE_ENV
tests/probe-security-headers.test.ts(73,36): error TS2345: ... HEADERS_PROBE_* stub missing NODE_ENV
tests/probe-security-headers.test.ts(132,12): error TS7053: Element implicitly has an 'any' type because expression of type '"x-frame-options"' can't be used to index type 'Record<string, string> | {}'.
tests/probe-security-headers.test.ts(155,7): error TS2345: ... ProcessEnv / NODE_ENV
```

测试侧传 `{}` / 部分 env stub 是正确写法；债在脚本 JSDoc 过严。

---

## 2. 变更

**文件：** `scripts/probe-security-headers.mjs`（仅类型注释）

- `@typedef ProbeEnv = NodeJS.Dict<string>` — 可注入 partial env，无需 `NODE_ENV`
- `@typedef ProbeResult` — `headers: Record<string, string>` 固定
- `readConfig` / `main` 的 `env` 参数：`ProcessEnv` → `ProbeEnv`
- `probeSecurityHeaders` 标注 `@returns {Promise<ProbeResult>}`；失败路径 `headers: {}` 加 `/** @type {Record<string, string>} */`
- `opts.baseUrl` 保持可选（与 `= {}` 默认解构一致）

**未改：** 测试断言、生产 canary 黑名单、`REPO_HEADER_CONTRACT`、next.config / proxy / 环境变量 / CSP。

---

## 3. 验证（本条消息实跑）

| 命令 | Exit | 说明 |
|------|-----:|------|
| `pnpm typecheck` | **0** | 全仓 tsc 清零（本债面） |
| `pnpm exec vitest run tests/probe-security-headers.test.ts` | **0** | 1 file / 6 tests |
| `pnpm run probe:headers -- --base-url http://127.0.0.1:3264 --json` | **1** | 本地 dev 未起 → `fetch failed`（可跑；非类型回归） |
| `pnpm run probe:headers -- --base-url https://yuanjia1314.ccwu.cc --json` | **1** | 生产 host 默认 **blocked**（canary 策略保持） |

本地 HTTP 200 需先 `pnpm dev`（`--webpack` · 3264），再：

```powershell
pnpm run probe:headers -- --base-url http://127.0.0.1:3264 --compare-repo
```

---

## 4. 风险（一句）

仅 JSDoc/类型收窄，运行时路径不变；若将来把 `ProbeEnv` 再收紧为必填 `NODE_ENV` 的 `ProcessEnv`，测试 stub 会再次红。

---

## 5. DEFER / 禁做（本模块）

| 项 | 状态 |
|----|------|
| 生产 CSP enforce / 去 `unsafe-inline` | DEFER · 未触 |
| 修 live XFO/Referrer-Policy drift | 平台/配置债 · 本模块只观察 |
| push master | 禁 |
| 去掉 webpack | 禁 |
