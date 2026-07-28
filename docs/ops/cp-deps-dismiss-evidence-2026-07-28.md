# ChronoPortal · M-CP-deps-dismiss · Evidence (2026-07-28)

**任务 ID：** M-CP-deps-dismiss · WAVE-DEBT-LONG 2026-07-28  
**wt：** `C:/Users/yuanjia/orca/workspaces/ChronoPortal/cp-deps-dismiss-2026-07-28`  
**分支：** `cp-deps-dismiss-2026-07-28` · base tip `governance-cleanup-2026-07-28` @ `3d3c8b3d`  
**push：** 未推（本地 commit 文档即可）  
**栈锁遵守：** Next 16 + webpack · React 19 · Supabase + RLS · Auth.js · **未换栈 / 未去 webpack / 未放宽 CSP / 未改 next-auth 业务逻辑**

---

## 1. 目标与结论

| 项 | 结果 |
|----|------|
| 证明 `next-auth` 已在 fixed 版本 **5.0.0-beta.32** | **通过**（package.json 钉死 + lock 解析 + `pnpm why` 单版本） |
| 关闭 Dependabot open 告警 **#10–#13** | **已 dismissed**（`tolerable_risk`，API exit 0） |
| 最小门 typecheck + auth 相关 test | **exit 0** |

**根因：** 告警滞后。GHSA 范围 `<= 5.0.0-beta.31`，first_patched = `5.0.0-beta.32`；本仓在基线 tip 已钉 beta.32，无需再升包。

---

## 2. 版本证据

### 2.1 `package.json`

```json
"next-auth": "5.0.0-beta.32"
```

（`dependencies`，精确版本钉，非 range。）

### 2.2 `pnpm-lock.yaml`

```
next-auth@5.0.0-beta.32:
next-auth@5.0.0-beta.32(next@16.2.11…)(react@19.2.8):
```

仅 **beta.32** 条目；无 beta.31 及以下残留。

### 2.3 `pnpm why next-auth`（exit **0**）

```
next-auth@5.0.0-beta.32
└── nav-site@0.1.0 (dependencies)

Found 1 version of next-auth
```

### 2.4 `pnpm install` 日志摘录

```
+ next-auth 5.0.0-beta.32
```

---

## 3. Dependabot 告警处置

**仓库：** `xvyimu/ChronoPortal`  
**API：** `PATCH /repos/xvyimu/ChronoPortal/dependabot/alerts/{n}`  
**字段：** `state=dismissed` · `dismissed_reason=tolerable_risk`  
**comment（统一）：**

> next-auth pinned 5.0.0-beta.32 on governance-cleanup-2026-07-28; lock verified (pnpm why: single version 5.0.0-beta.32)

| # | severity | summary（短） | vulnerable | patched | 处置前 | 处置后 | dismissed_at (UTC) |
|---|----------|---------------|------------|---------|--------|--------|--------------------|
| 10 | medium | OAuth state/nonce/PKCE cookies 未绑定 provider | `>=5.0.0-beta.1, <=beta.31` | **beta.32** | open | **dismissed** | 2026-07-28T15:44:01Z |
| 11 | critical | Email normalizer 同形字 `@` 绕过 | `>=5.0.0-beta.1, <=beta.31` | **beta.32** | open | **dismissed** | 2026-07-28T15:44:02Z |
| 12 | high | `getToken()` 畸形 Bearer 未捕获异常 | `>=5.0.0-beta.0, <=beta.31` | **beta.32** | open | **dismissed** | 2026-07-28T15:44:03Z |
| 13 | critical | 配置错误可导致存在性鉴权 fail-open | `>=5.0.0-beta.0, <=beta.31` | **beta.32** | open | **dismissed** | 2026-07-28T15:44:04Z |

**API 阻塞：** 无。四条均 `EXIT=0`，无需人闸 UI。

**选用 `tolerable_risk` 的说明：** 代码/lock 已达 first_patched；告警仍 open 属 Dependabot 滞后。`fix_started` 语义不匹配（fix 已落地），`inaccurate` 不准确（advisory 本身正确）。`tolerable_risk` + 注释写明已 pin beta.32 为最贴切可写字段。

---

## 4. 门闩实跑

环境：Windows · Git Bash 包装 · pnpm **11.5.0** · tip `3d3c8b3d` 工作树。

### 4.1 `pnpm typecheck`

```
$ tsc --noEmit --incremental false
TYPECHECK_EXIT=0
```

### 4.2 测试（auth 相关 + 全量回归）

意图：`tests/admin-login.test.tsx` + `tests/security.test.ts`；Vitest CLI 在本环境仍跑了全量 suite（参数透传差异），结果更强：

```
Test Files  62 passed | 1 skipped (63)
     Tests  616 passed | 6 skipped (622)
Duration  ~11 s
TEST_EXIT=0
```

含 `tests/admin-login.test.tsx`、`tests/security.test.ts` 等 auth/security 面。

---

## 5. 不做（遵守）

- CSP production flip  
- 改 next-auth 业务逻辑 / Credentials 流  
- 升无关 major  
- push master  

---

## 6. 交付清单

- [x] beta.32 在 package + lock + why  
- [x] #10–#13 dismissed（API）  
- [x] typecheck exit 0 · test exit 0  
- [x] 本证据文档  
- [ ] 本地 commit（docs only；见 git log）  
- [x] 无人闸待办（API 成功）

---

## 7. 复验命令（后人）

```bash
rg -n 'next-auth' package.json
rg -n 'next-auth@' pnpm-lock.yaml
pnpm why next-auth
gh api repos/xvyimu/ChronoPortal/dependabot/alerts --jq '.[] | select(.number>=10 and .number<=13) | {number,state,dismissed_reason}'
```

期望：why 单版本 beta.32；四条 `state=dismissed`。
