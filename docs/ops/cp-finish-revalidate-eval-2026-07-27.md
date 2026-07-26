# CP 收尾波 · D-04 / D-05 评估记录

> 2026-07-27 · wt `cp-finish` · base `master`  
> 债单：`.planning/portfolio-stack-policy-2026-07-24/cp-perf-wave/DEBT-BACKLOG.md`

## 门闩基线（本机实跑）

| 命令 | Exit | 摘要 |
|------|------|------|
| Node | — | v24.16.0 |
| `pnpm typecheck` | **0** | 已绿 |
| `pnpm test` | **0** | 616 pass / 6 skip / 63 files |
| `pnpm build --webpack` | **0** | 成功（webpack 锁保持） |

---

## D-04 · typecheck probe-headers —— 已在本分支落地（verify-only）

`tests/probe-security-headers.test.ts` 的 `ProcessEnv` / headers 索引类型问题，
已由本分支既有提交 `990b1203 fix(types): probe-security-headers test ProcessEnv stub + headers narrowing` 修复：
用 `stubEnv(): NodeJS.ProcessEnv` 窄断言构造 env 桩，绕开 Next 把 `ProcessEnv.NODE_ENV` 变必填的增强。

本波复跑 `pnpm typecheck` = **EXIT 0**，无需再改。scout 债单记录的 EXIT 2 已消解。

---

## D-05 · revalidate tags —— 评估结论：保持 `revalidatePath`，不引入 tag

### 现状
`lib/admin/revalidate-public.ts` 仅 `revalidatePath("/")` / `/tool/{slug}` / `/sitemap.xml`，
由全部 5 类 admin 写路由（categories/links/tags）在写成功后调用。搜索 API 全局 `no-store`。

### 为什么 tag 在当前架构下无落点
- 公开读路径（`getCategories` / `getApprovedLinks` 等）用的是 **React `cache()`**（`react` 包，
  **请求级**去重），**不是** Next Data Cache（`fetch` cache / `unstable_cache`）。
- 因此持久缓存的唯一载体是 **ISR 页面产物**（`app/page.tsx` `revalidate=60`、`/tool/[slug]` SSG），
  其失效键就是**路径**。`revalidateTag` 只对带 `next.tags` 的 fetch/`unstable_cache` 生效，
  当前代码里**没有任何 tag 挂载点**。
- 首页是单张 ISR 页渲染全部分类+链接，路径级已是**最细可用粒度**——没有可被 tag 进一步细分的独立缓存单元。

### 结论
- **不补 tag**：引入 `revalidateTag` 需先把 repository 从 `cache()` 迁到 `unstable_cache` 并全链路挂 tag，
  属架构改动，对 P2「写后可见性」无净收益（`revalidatePath` 已即时失效），判定为**过度工程**，defer。
- **搜索 `no-store` 保持不收窄**：`app/api/search` 与 `app/api/resource-search` 均 `force-dynamic`
  （限流 + 每请求个性化），no-store 是正确语义；收窄无收益（路由本就动态、不进 CDN 缓存）。
- 若未来把首页数据迁入 Next Data Cache 以降 DB 负载（另见 D-02 方向），届时再一并设计 tag 命名空间。

> 净变更：本波 D-05 不改运行时代码；结论落此文档。D-04 verify-only。D-06 见 `cp-embed-unify-map-2026-07-27.md`。
