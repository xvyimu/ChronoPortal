# 架构债落地说明 — 2026-07-18

关联：release-manifest §9 · T7–T10

## T7 虚拟列表

| 项 | 内容 |
|---|---|
| 现状 | `ResultGrid` 渐进挂载（initialVisible + 加载更多），首屏预算 ~24 |
| 决策 | **本轮不引入 react-window** |
| 原因 | 全量 ~500 卡；键盘导航 / 焦点 / 预览弹层与虚拟列表耦合成本高 |
| 触发 | 单分类可见 >800 或 INP p75 >200ms 且 profiling 指向列表挂载 |
| 若启动 | 仅虚拟化「全部」长列表；保留 LinkCard 外层 API；E2E 覆盖焦点与加载更多 |

## T8 OpenAPI / contract

| 项 | 内容 |
|---|---|
| 本轮交付 | `scripts/generate-openapi.mjs` → `docs/openapi.json` |
| 用法 | `pnpm run docs:openapi` |
| 边界 | 骨架与 `app/api` 对齐；详细语义仍以 `docs/API.md` 为准 |
| 后续 | CI 可 diff openapi.json 防路径漂移 |

## T9 CSP 收紧

| 项 | 内容 |
|---|---|
| 现状 | `script-src` / `style-src` 含 `'unsafe-inline'`（Next 内联与 GA） |
| 本轮 | 保持可用；**不**在无 nonce 流水线时硬删 unsafe-inline（会炸 hydration / GA） |
| 可做的小步 | 已限制 `object-src 'none'`、`frame-ancestors 'none'`、`base-uri 'self'` |
| 下一步 | 引入 nonce/hash CSP 需改 `next.config` + middleware，单独立项 |

## T10 搜索与全量 links 解耦

| 项 | 内容 |
|---|---|
| 现状 | Fuse 全量池 60s 缓存 + 并发去重（`lib/search/fuse.ts`） |
| 本轮 | 保持；冷启动单次投影查询，成本可接受 |
| 触发 | 链接 >2k 或搜索 p95 / 内存上升 |
| 方向 | 分类分片索引 / RPC 预过滤 / 边缘缓存；不在本轮拆服务 |

## 总结

T8 有代码产物；T7/T9/T10 给触发条件与最小下一步，避免无指标重构。
