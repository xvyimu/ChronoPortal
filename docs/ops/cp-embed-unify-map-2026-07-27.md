# CP · Embed / 语义检索 统一映射（D-06）

> 只读地图 · 2026-07-27 · wt `cp-finish`  
> 目的：把 **nav 语义**（1024-d CF / 512-d embed-server）与 **resource 资源库**（固定 512-d）的
> provider / 维度 / RPC / env 分叉画在一张表上。**改配置需 ops**，本文默认只出图。  
> 相关：`adr-004`（search adapter seam）· `adr-008`（远程 embed 端点）

---

## 1. 两条语义链路（互不共享向量）

| 链路 | 入口 | 查询 embed 来源 | 维度 | 下游检索 | 向量表 |
|------|------|-----------------|------|----------|--------|
| **nav 语义**（工具站内搜索） | `app/api/search` → `lib/search/use-case.ts` → `lib/search/semantic.ts` | `generateEmbedding`（按 `EMBED_PROVIDER` 分派） | **1024**（CF）或 **512**（embed-server） | Supabase RPC（本仓 DB）`service_role` | `nav_links.embedding` / `embedding_1024` |
| **resource 资源库** | `app/api/resource-search` → `generateResourceEmbedding` | **始终** embed-server（忽略 `EMBED_PROVIDER`） | **512（锁死）** | 外部 RL Edge Function `search-api-v3` | RL 项目 `pages.embedding`（512，仓外） |

关键结论：**resource 侧维度与 provider 与 nav 侧解耦**。nav 即使切到 Cloudflare 1024-d，resource 仍必须 512-d，
否则 query 向量与 RL 库维度不一致、检索全断（见 `embed-provider.ts` `generateResourceEmbedding` 注释）。

---

## 2. Env 分叉总表

| env | 作用域 | 取值 | 影响 | 解析处 |
|-----|--------|------|------|--------|
| `EMBED_PROVIDER` | nav | `cloudflare` \| `embed-server`（默认） | 决定 nav 查询 embed 后端与维度 | `resolveEmbedProvider` |
| `EMBED_DIM` | nav | 正整数（可选，显式覆盖） | 期望维度校验；未设时按 provider 推断（CF=1024/其它=512） | `resolveExpectedDim` |
| `EMBED_SEMANTIC_RPC` | nav | RPC 名（可选，显式覆盖） | 未设时 CF→`search_links_semantic_v2`，否则→`search_links_semantic` | `getSemanticRpcName` |
| `CF_ACCOUNT_ID` / `CF_AI_API_TOKEN` | nav | CF 凭据 | `EMBED_PROVIDER=cloudflare` 必填（缺失即降级 null→Fuse） | `embedViaCloudflare` |
| `EMBED_SERVER_URL` | nav + resource | HTTPS 远程 或 loopback | embed-server 端点；resource 恒用此路径 | `resolveEmbedEndpoint` |
| `EMBED_SERVER_API_KEY` | nav + resource | Bearer | 远程 HTTPS 必填、loopback 可选（ADR-008） | `buildEmbedRequestHeaders` |
| `EMBED_SERVER_LOOPBACK_ENABLED` | — | 不设 | serverless 无本机进程；生产禁设（ADR-008） | `embedding-runtime` |
| `RESOURCE_LIBRARY_API_KEY` | resource | apikey | RL Edge Function `search-api-v3` 鉴权；缺失→503 | `resource-search/route.ts` |
| `RESOURCE_LIBRARY_(SUPABASE_)URL` | resource | RL 项目 URL | 未设回落默认 RL 项目 | `resource-library/client.ts` |

---

## 3. Provider × 维度 × RPC 一致性矩阵（nav）

| `EMBED_PROVIDER` | 默认维度 | 默认 RPC | 需匹配的 DB 列/函数 | 备注 |
|------------------|----------|----------|----------------------|------|
| `embed-server`（默认） | 512 | `search_links_semantic` | `nav_links.embedding`(512) | 本机/Worker 反代 BGE-small-zh-v1.5 |
| `cloudflare` | 1024 | `search_links_semantic_v2` | `embedding_1024` | `@cf/baai/bge-m3` 多语言，常开无本机依赖 |

**分叉风险点：** 手动只改了 `EMBED_DIM` 或 `EMBED_SEMANTIC_RPC` 之一而与 `EMBED_PROVIDER` 不一致
→ 维度/RPC 错配。默认路径（三者都不显式设、只切 `EMBED_PROVIDER`）由 `getSemanticRpcName` +
`resolveExpectedDim` 自洽推导，**推荐只切 `EMBED_PROVIDER` 一个开关**，避免手工三处对齐。

安全基线（历史审计）：v2 RPC 仅 `service_role` grant；旧 `search_links_semantic` 曾对 PUBLIC 可 EXECUTE
（见 `full-stack-audit-2026-07-16.md` BE-2）——切 provider 时留意 grantee。

---

## 4. 降级语义（两链路一致：失败即回退，不抛 5xx）

- nav：embed 失败 → `getEmbedding` 返回 null → `use-case` 走纯 Fuse；RPC 失败 → `searchSemantic` 返回 `[]`。
  另有 30s「临时不可用」缓存（`markTemporarilyUnavailable`）避免打爆下游。
- resource：`vector`/`hybrid` 请求时 embed 维度非 512 → 记 warn 并降级 `fts`；上游 502 → `资源搜索失败`。
- 可观测：`/api/resource-search-status` 探针要求 embed `/health` 返回 `dim=512`（否则 `embed_invalid`）。

---

## 5. 统一化建议（**仅建议 · 需 ops 决策，本波不改配置/代码**）

1. **单开关约束**：生产文档化「只允许切 `EMBED_PROVIDER`，禁止单独手改 `EMBED_DIM`/`EMBED_SEMANTIC_RPC`」，
   或加启动期自检（provider↔dim↔rpc 三元组一致性断言）——留待后续 wt，非本波。
2. **命名去歧义**：resource 侧 512 锁死可考虑独立 env 前缀（如 `RESOURCE_EMBED_*`）与 nav 彻底分家，
   降低「切 nav 到 1024 会不会连带 resource」的运维心智负担。
3. 现状**无需**改代码即自洽：`getSemanticRpcName`/`resolveExpectedDim` 已按 provider 推导默认值。

> 结论：分叉是**有意的**（nav 可升 1024，resource 必须锁 512）。当前默认路径自洽，
> 收益点在「文档 + 可选启动自检」，不在改运行时。
