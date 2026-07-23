# CP next-auth security bump · 2026-07-24

> **范围：** Dependabot critical/high · `next-auth` / `@auth/core` 最小补丁。  
> **基线：** `origin/master` @ **`4ead4d91`**。  
> **禁止已守：** 生产 CSP flip · 业务功能改动 · 编造 CVE。

## 变更

| 包 | 前 | 后 |
|----|----|----|
| `next-auth` | 5.0.0-beta.31 | **5.0.0-beta.32** |
| `@auth/core`（传递） | 0.41.2 | **0.41.3** |

仅 `package.json` + `pnpm-lock.yaml`（key 排序无功能 diff）。

## 测试

| 命令 | 结果 |
|------|------|
| `vitest run tests/api-csp-report.test.ts` | **6/6 pass** |
| `vitest run` 全量 | 605 pass · **9 fail**（search/favicon/resource-library） |
| 同 9 fail 在 **`4ead4d91` 主 tip 复现** | **既有** · 非本支回归 |

## 红线

| 项 | 状态 |
|----|------|
| 生产 CSP | **未触** |
| D7 / asar | n/a |
| secrets | 无 |

## 后续

- push 后等 Dependabot 再扫；期望 next-auth / @auth/core open 下降  
- 既有 9 测失败另刀（mock/网络）
