# nav-site 全栈代码审查与优化报告

审查日期：2026-07-17

审查范围：Next.js 16 App Router 前端、Route Handlers/Repository 后端、Supabase/Resource Library、Vercel/CI 配置、生产探针。

审查起始基线：`master` / `d61968b3`；本报告随后同步记录了本轮收口修复，最终交付 SHA 以生产 `build-info.json` 为准。

## 0. 执行摘要与验证基线

### 已验证结果

- `pnpm test`：466 passed，6 skipped。
- `pnpm typecheck`：通过。
- `pnpm run lint`：通过，0 error、0 warning。
- `pnpm run audit:security`：未发现 moderate 及以上已知依赖漏洞。
- 覆盖率：Statements 60.55%、Branches 53.10%、Functions 57.90%、Lines 61.74%。当前阈值仍为 lines/statements 50、functions/branches 40，见 [vitest.config.ts](/D:/nav-site/vitest.config.ts:20)。
- `pnpm run build`：通过；移除 `next/font/google` 构建期下载后，失效本地代理不再阻断构建，`/tool/[slug]` 被识别为 SSG。
- 修复前生产健康探针：首页、`/api/health`、`/api/search`、`/sitemap.xml`、`/robots.txt`、`build-info.json` 通过，`/tool/figma` 返回 HTTP 500；详情页根因已在本轮修复，仍需部署最新 HEAD 后做最终生产验证。

### 总体结论

核心数据访问、限流、512-d RPC 授权和公开工具查询的高风险问题已有明显收口。详情页静态渲染根因、lint 阻断和字体构建外网依赖已在本轮修复。当前剩余优先项是公开评分统计的 service-role 回退、分布式限流 fail-open、embedding 单点依赖、CSP，以及 API 文档与真实契约漂移。

## 1. 前端代码审查

### F-01 生产工具详情页触发动态 Cookie，导致 ISR 页面 500（P0，本轮已修复）

- 问题描述： [app/tool/[slug]/page.tsx](/D:/nav-site/app/tool/[slug]/page.tsx:114) 调用 `getCategories()`；[lib/repositories/categories.ts](/D:/nav-site/lib/repositories/categories.ts:16) 在未注入 client 时调用 `createClient()`，而 [lib/supabase/server.ts](/D:/nav-site/lib/supabase/server.ts:6) 读取 `cookies()`。该调用链把本应静态/ISR 的详情页变成运行时动态渲染，生产日志已出现 `Page changed from static to dynamic at runtime`，`/tool/figma` 已验证 HTTP 500。
- 影响评估：P0；工具详情页不可用，且同类 slug 可能批量受影响。搜索和首页不一定受影响，但发布后的 smoke 会持续失败。
- 推荐操作步骤：本轮已在详情页显式注入 `createStaticClient()`，并新增静态 client 回归测试；剩余步骤是部署最新 HEAD，并运行 `pnpm run verify:production -- --no-proxy --base-url https://yuanjia1314.ccwu.cc --expect-commit <HEAD>`。
- 验证方式：生产请求 `/tool/figma` 应为 200；Vercel 日志不再出现 dynamic-to-static/cookies 错误；详情页关键内容和 metadata 均可生成。
- 预期收益：恢复生产详情页可用性，保留 ISR 缓存和较低数据库开销，避免同类页面回归。

### F-02 Favorites effect 中同步 setState 阻断 lint（P1，本轮已修复）

- 问题描述： [app/favorites/FavoritesView.tsx](/D:/nav-site/app/favorites/FavoritesView.tsx:25) 的 effect 在请求开始前同步执行 `setLinks([])`、`setLoading(false)`；React ESLint `react-hooks/set-state-in-effect` 报错。
- 影响评估：P1；CI quality job 失败，后续合并无法获得可靠门禁。同步清空还可能造成 UI 闪烁。
- 推荐操作步骤：本轮已改为由 favorites 请求 key 派生 loading，effect 不再同步 setState；保留现有 `isNavLink` 过滤、取消标记和 `/api/favorites?detail=links` 契约测试。
- 验证方式：`pnpm run lint` 无 error；favorites 首次加载、登出、网络失败、快速切换账户均有组件测试。
- 预期收益：恢复 CI 门禁，减少加载闪烁和竞态。

### F-03 `useServerSearch` effect 缺少 `links` 依赖（P1，本轮已修复）

- 问题描述： [components/navigation/useServerSearch.ts](/D:/nav-site/components/navigation/useServerSearch.ts:58) 使用 `links` 构建 facets/suggestions，但依赖数组未包含稳定的 `links` 引用，当前 ESLint 已报警。
- 影响评估：P1；导航数据更新后可能继续显示旧 facet/建议，属于低频但可见的数据一致性问题。
- 推荐操作步骤：本轮已补齐 `links` 依赖并通过 lint/测试；后续若监控发现 links 更新导致额外远程请求，再把本地 facet 计算拆成独立 `useMemo`。
- 验证方式：lint clean；测试先渲染旧 links，再传入新 links，断言 facets/suggestions 更新。
- 预期收益：消除陈旧闭包，提升搜索交互一致性。

### F-04 首屏向 Client Component 注入全量 links（P1）

- 问题描述：首页将完整导航数据注入 `Navigation`，RSC payload、序列化、水合和客户端内存随链接数量线性增长。
- 影响评估：当前约 500+ 条尚可，但增长到 1000+ 后会推高 TTFB、Hydration、INP 和移动端内存；影响属于推断，需用真实数据量和 Lighthouse/Profiler 确认。
- 推荐操作步骤：
  1. 首屏仅传分页/热门候选和分类摘要；搜索通过服务端 API/cursor 获取结果。
  2. 对大结果集采用虚拟列表，确保可见窗口之外不创建 DOM。
  3. 记录 RSC payload 大小、Hydration 时间、INP，设置回归预算。
- 验证方式：使用 500/1000/5000 条 fixture 对比 Lighthouse、React Profiler 和浏览器内存；目标是 payload 与交互延迟不随全量数据同步增长。
- 预期收益：降低首屏传输和主线程成本，提升低端设备体验。

### F-05 渐进挂载与键盘焦点预算不同步（P1）

- 问题描述：`ResultGrid` 只渐进挂载 `initialVisible`，而 `useKeyboardNav` 面向完整 `flatResults`。焦点进入尚未挂载的结果时只调用可选 DOM `focus()`，不会自动扩窗。
- 影响评估：键盘用户可能出现“焦点索引变化但页面无焦点元素”的可访问性和可用性问题。
- 推荐操作步骤：让焦点状态与 mount budget 共用控制器；当目标 index 超出已挂载窗口时先 `loadMore()`，待 DOM 出现后再 focus，并在等待期间保留可见 focus indicator。
- 验证方式：Playwright 键盘遍历 1、首屏边界、分页边界和末尾结果，断言每一步都有 `document.activeElement` 对应结果。
- 预期收益：键盘导航连续可预测，减少无障碍回归。

### F-06 搜索响应使用大量类型断言（P2）

- 问题描述： [components/navigation/useServerSearch.ts](/D:/nav-site/components/navigation/useServerSearch.ts:136) 将 API 响应先转成 `Record<string, unknown>` 再多处 `as` 映射，运行时字段契约未集中校验。
- 影响评估：后端字段改名时可能静默产生空标题、错误分类或运行时异常。
- 推荐操作步骤：使用共享 Zod response schema，在 fetch 边界 `safeParse`；失败时记录 request id 并展示可恢复错误；从 schema 推导 TypeScript 类型。
- 验证方式：对缺字段、错误类型、未知字段和正常响应做单元测试；typecheck 通过。
- 预期收益：把契约错误前移到边界，降低前后端漂移成本。

### F-07 全局 Pangu MutationObserver 扫描成本（P2）

- 问题描述：Pangu spacing 使用全局 MutationObserver 和 debounce，即使已限定到 `#main-content`，仍会扫描动态 DOM；cleanup 直接读取变化中的 `pendingTargets.current`，现有 lint 有警告。
- 影响评估：富文本或搜索结果频繁更新时可能增加主线程工作；属于中低风险。
- 推荐操作步骤：复制待处理节点快照后再 disconnect/cleanup；优先在渲染边界对文本做一次处理，减少全局观察；记录 observer callback 次数和耗时。
- 验证方式：Performance profile 对比长列表滚动、搜索连续输入和详情页渲染；确认 callback 时间预算内且无重复处理。
- 预期收益：降低 DOM 扫描和无效重排。

### F-08 已修复的图标 URL 安全问题需保持回归覆盖（已修复/P2 维护项）

- 问题描述：详情页已通过 `isSafeUrl()` 限制图标进入 `<Image>` 的来源，避免 emoji、任意协议或不完整字符串触发图片处理错误；修复位于提交 `f5fef30e`。
- 影响评估：当前不再作为未修复漏洞，但外部数据契约仍可能扩展。
- 推荐操作步骤：保留 `https/http`、相对路径、emoji、`javascript:`、`data:` 等边界测试；如未来开放远程图片域名，必须同步 `images.remotePatterns` 白名单。
- 验证方式：组件测试覆盖所有 URL 类别，并在生产工具详情 smoke 中验证默认图标回退。
- 预期收益：防止不可信资源数据再次进入图片组件或 CSP 边界。

## 2. 后端代码审查

### B-01 公开评分统计 GET 回退 service_role（P0）

- 问题描述： [app/api/resource-ratings/route.ts](/D:/nav-site/app/api/resource-ratings/route.ts:145) 先调用公开统计 RPC，失败后在 [同文件](/D:/nav-site/app/api/resource-ratings/route.ts:174) 使用 `createResourceLibraryServiceClient()` 直接查询 `ratings`。这是公开 GET 路由，却以跨项目 service role 作为回退。
- 影响评估：P0/P1；RPC 配置、权限或网络异常时，公开请求会触发高权限数据库读取，扩大密钥泄露/误配置的爆炸半径，并掩盖公开 RPC 的可用性问题。
- 推荐操作步骤：
  1. 生产环境删除 service-role 回退，公开统计只允许受限 aggregate RPC；RPC 不可用时返回 503 并告警。
  2. 若确需兼容迁移期，增加显式 `ALLOW_RESOURCE_RATING_SERVICE_FALLBACK=1`，仅开发/临时 staging 可开启，生产 readiness 直接失败。
  3. 为 RPC 返回 schema 和权限写集成测试，确认 anon 仅能获取 count，不能读取 rating 明细或 IP。
- 验证方式：生产/预生产禁用 RPC 时 GET 返回 503，不产生 service-role 查询；日志包含可检索告警；安全测试确认 anon 无法访问 `ratings` 行数据。
- 预期收益：遵守最小权限，缩小跨项目服务密钥暴露面。

### B-02 分布式限流 Redis 故障时 fail-open 到进程内桶（P1）

- 问题描述： [lib/rate-limit-distributed.ts](/D:/nav-site/lib/rate-limit-distributed.ts:83) 在 Upstash 不可用时回退 memory，并明确记录 `fail-open`；Vercel 多实例下每个实例各自计数。
- 影响评估：推断，需生产观测确认；高成本搜索、工具列表和敏感写操作的实际配额可能按实例数放大，Redis 故障时也失去统一保护。
- 推荐操作步骤：
  1. 为公开只读接口保留有限 memory fallback，为 semantic search、评分、favorites、认证/提交等入口在生产改为 fail-closed 或更低的固定保护上限。
  2. 在 `/api/health` 暴露 rate-limit backend 状态，并在 launch readiness 强制检查 Upstash 配置/连通性。
  3. 记录 backend、bucket、拒绝率和 Redis 错误率，设置告警阈值。
- 验证方式：注入 Upstash 超时，确认敏感路由返回 503/429 而不是无限放行；多实例压测时按 IP 的总配额保持稳定。
- 预期收益：限流在故障和扩容场景下仍可预测，降低滥用和成本风险。

### B-03 Repository 显式列投影与查询扇出（P2）

- 问题描述： [lib/repositories/categories.ts](/D:/nav-site/lib/repositories/categories.ts:20) 及 [lib/repositories/tags.ts](/D:/nav-site/lib/repositories/tags.ts:139) 的 admin 查询使用 `select("*")`；`attachTagsToLinks` 先查关联表再查 tags（[lib/repositories/tags.ts](/D:/nav-site/lib/repositories/tags.ts:37)），详情页还会并行触发分类、related 等多次查询。
- 影响评估：`select("*")` 会随 schema 演进扩大 payload/泄露字段；两次查询和详情扇出增加 p95，当前不是严重 N+1，但数据量增长后会放大。
- 推荐操作步骤：
  1. 将公开/admin 返回字段改为显式投影，并为 admin DTO 单独定义类型。
  2. 用 view/RPC 或 Supabase 关系 select 一次性返回 link-tags；为详情页提供聚合 RPC/view，保留超时和 abort signal。
  3. 对热门详情和分类元数据增加短 TTL 缓存，避免请求级重复查询。
- 验证方式：数据库日志/EXPLAIN 对比查询次数、返回字节数和 p95；schema 增加无关列时 API 响应不变。
- 预期收益：降低数据库往返和 payload，避免隐式字段泄露。

### B-04 favorites 依赖 service_role + 应用层 user_id 隔离（P1）

- 问题描述：favorites 使用 NextAuth user id 查询，再以 service_role 绕过 Supabase RLS；DELETE 的 `linkId` 目前未统一使用 UUID schema 边界校验。
- 影响评估：应用逻辑正确时可隔离用户，但任何遗漏 `.eq(user_id, ...)` 的新路径都会造成越权；service role 使数据库无法提供第二道防线。
- 推荐操作步骤：
  1. 短期为 POST/DELETE 所有 id 使用 Zod UUID 校验，并增加跨用户 IDOR 测试。
  2. 中期统一 Supabase Auth JWT 或安全 RPC，在数据库侧根据 JWT subject 强制 user_id；逐步移除请求路径的 service-role 直查。
  3. 对 service-role 使用增加审计日志和最小化表权限。
- 验证方式：两个用户的读/写/删矩阵测试；尝试非法 UUID、他人 favorite id 均返回 400/404，不泄露存在性。
- 预期收益：将授权从“代码约定”提升为数据库约束，降低 IDOR 风险。

### B-05 CSRF 无 Origin 请求默认放行（P2）

- 问题描述：`checkOrigin` 对没有 Origin 的请求放行，兼容非浏览器客户端；对于依赖 cookie 的敏感写操作，仅依赖 SameSite 行为。
- 影响评估：现代浏览器通常会携带 Origin/Referer，但代理、旧客户端或特殊跨站场景可能绕过预期检查。
- 推荐操作步骤：对 cookie 会话写操作要求 Origin 或可信 Referer；若必须支持无 Origin 客户端，增加显式 CSRF token/header，并在 API 文档中声明调用方式。
- 验证方式：测试同源、可信 Origin、恶意 Origin、无 Origin、错误 Referer 五类请求，确认状态码和审计日志符合策略。
- 预期收益：降低跨站状态变更风险，同时保留可审计的机器客户端通道。

## 3. 整体架构建议

### A-01 搜索架构从进程内全量 Fuse 逐步迁移（P1）

- 问题描述： [lib/search/fuse.ts](/D:/nav-site/lib/search/fuse.ts) 仍把 approved links/tags 全量载入进程并以 60 秒缓存；in-flight promise 只解决并发 stampede，不改变 O(N) 内存和构建成本。
- 影响评估：数据规模增长后冷启动、p95 和内存随 N 增长；Vercel serverless 多实例还会重复建索引。
- 推荐操作步骤：先用 PostgreSQL FTS/RPC 返回分页候选，再对小候选集使用 Fuse 做模糊排序；记录 query、候选数、p50/p95、缓存命中率；数据达到阈值后再评估 Meilisearch/专用索引，不提前引入全量 BEM/ES。
- 验证方式：用 1k/10k/100k fixture 压测，比较冷启动、p95、内存和费用；设置明确迁移阈值。
- 预期收益：搜索成本与数据规模解耦，减少 serverless 冷启动和实例内存压力。

### A-02 Embedding 服务需要高可用主轨（P1）

- 问题描述： [lib/search/embed-provider.ts](/D:/nav-site/lib/search/embed-provider.ts:27) 默认回退 `http://127.0.0.1:8003`；生产 runbook 仍依赖本机 BGE + Named Tunnel（[docs/PRODUCTION-RUNBOOK.md](/D:/nav-site/docs/PRODUCTION-RUNBOOK.md:171)）。本机关闭或隧道失效时语义搜索降级，而 health 默认可能仍 healthy。
- 影响评估：当前为架构单点故障；ARCH-1 尚未完成，影响语义搜索可用性和故障可见性。
- 推荐操作步骤：
  1. 无 Cloudflare/VPS 账号和密钥时只完成文档、health/probe 开关，不伪造密钥。
  2. 目标架构选 Cloudflare Workers AI 或常开 VPS，明确超时、重试、熔断、维度与 RPC 版本。
  3. 生产启用 `HEALTH_REQUIRE_EMBEDDING=1`（或等效 readiness 选项），将 provider、维度、最近成功时间纳入探针。
- 验证方式：停止 embedding endpoint，确认 readiness 失败或明确 degraded；恢复后探针自动回绿；语义搜索验证 `ok/skipped/error` 状态与配置一致。
- 预期收益：避免“页面健康但语义能力已失效”的假绿，提升故障发现和恢复能力。

### A-03 Launch readiness 的 embedding 期望状态需由配置驱动（P1）

- 问题描述： [scripts/check-launch-readiness.mjs](/D:/nav-site/scripts/check-launch-readiness.mjs:152) 与 `:164` 对不同路径固定 `expectEmbeddingSkipped`，而生产 runbook 同时允许 embedding `ok`。当生产启用 embedding 时，检查语义可能与真实配置不一致。
- 影响评估：发布门禁可能误报或漏报，导致错误上线/回滚决策。
- 推荐操作步骤：根据 `EMBED_PROVIDER`、`HEALTH_REQUIRE_EMBEDDING` 计算 expected state；提供互斥参数 `--require-embedding` / `--expect-embedding-skipped`，并在输出中打印实际配置摘要（不打印密钥）。
- 验证方式：分别用 local、embed-server、cloudflare 和缺 key 配置运行 readiness，断言四种结果与文档一致。
- 预期收益：发布检查成为可重复、可解释的配置契约。

## 4. 配置、构建与部署审查

### C-01 CSP 使用 unsafe-inline（P1）

- 问题描述： [next.config.ts](/D:/nav-site/next.config.ts:40) 的 production CSP 含 `script-src 'unsafe-inline'`，`:45` 的 `style-src` 也含 `unsafe-inline`。
- 影响评估：削弱 XSS 防护；Next、Sentry、Analytics 等运行时资源又要求兼容，直接删除可能造成页面回归。
- 推荐操作步骤：先以 Report-Only 收集违规来源；为脚本迁移 nonce/hash，限制 `connect-src`、`img-src`、`frame-src` 到实际域名；再分阶段 enforce。第三方域名变更需通过代码评审更新白名单。
- 验证方式：CSP Evaluator/浏览器控制台无未知违规；安全回归确认内联脚本注入被阻止，页面、Sentry、Analytics 正常。
- 预期收益：在不牺牲运行时兼容性的前提下提高 XSS 防线。

### C-02 next/font/google 使构建依赖外网字体（P1，本轮已修复）

- 问题描述：审查时 [app/layout.tsx](/D:/nav-site/app/layout.tsx:1) 使用 `next/font/google`，本机代理失效时 `pnpm run build` 因下载 Geist/Geist Mono 失败；该依赖已在本轮移除。
- 影响评估：构建可复现性和供应链稳定性下降；CI/Vercel 若外网或代理异常会直接阻断发布。
- 推荐操作步骤：本轮已移除 `next/font/google`，使用 CSS 系统字体栈，构建阶段不再下载 Google Fonts；如未来需要固定视觉字形，再引入已核对许可证的 `next/font/local` 文件。
- 验证方式：失效代理仍存在时 `pnpm run build` 已通过；后续用 Lighthouse 验证 CLS 和字体回退体验。
- 预期收益：构建确定性增强，减少外部依赖和发布偶发失败。

### C-03 CI 重复构建，Emergency Netlify 权限偏宽（P1）

- 问题描述： [ci.yml](/D:/nav-site/.github/workflows/ci.yml:48) 的 build 产物与 [lighthouse.yml](/D:/nav-site/.github/workflows/lighthouse.yml:31) 分别安装/构建；Emergency Netlify job 声明 `contents: write` 并使用 `--force-with-lease`（[ci.yml](/D:/nav-site/.github/workflows/ci.yml:150)）。
- 影响评估：重复构建增加 CI 时间和依赖下载；紧急镜像权限扩大误推分支的影响面。生产主轨已是 Vercel，Netlify 仅应为 emergency。
- 推荐操作步骤：
  1. 在同一 workflow 内复用 lockfile 缓存和 build artifact；跨 workflow 则固定可验证的 artifact/release。
  2. 将 Netlify job 放入受保护环境，限制手工触发、分支和 token；能用 deploy token/API 的场景不要授予通用 contents write。
  3. 明确 Vercel 为唯一生产主轨，Netlify 只在 runbook 记录的应急条件下运行。
- 验证方式：CI 时间/下载量下降；普通 PR 不具备镜像推送权限；模拟 emergency 流程仍可完成并可回滚。
- 预期收益：降低供应链和分支写入风险，缩短反馈时间。

### C-04 API 文档与实际域名、限流和字段契约漂移（P1）

- 问题描述： [app/api-docs/page.tsx](/D:/nav-site/app/api-docs/page.tsx:84) 仍使用 `nav-site.netlify.app`；`:268` 声称 `/api/tools`、`/api/search` 无限制；reviews 示例用 `linkId`，代码契约为 `link_id`；tools response 示例也与当前 `tools/name/category` 形态不一致。
- 影响评估：调用方会得到错误 URL、参数或限流预期，增加支持成本并可能触发误用。
- 推荐操作步骤：建立共享 Zod/OpenAPI schema，从 route handler 测试和 schema 生成文档；至少先同步 Vercel 域名、真实参数、错误码、分页和限流头；在 CI 加契约测试防止文档回退。
- 验证方式：文档中的每个 curl 在 staging/生产 smoke 可执行；schema diff 在 API 变更时阻断未更新文档的 PR。
- 预期收益：降低集成失败率，使 API 行为和公开承诺一致。

### C-05 Sentry release 与环境变量分层（P2）

- 问题描述：`withSentryConfig` 在缺少 `SENTRY_AUTH_TOKEN` 时无法完整上传 release/sourcemap；`.env.example` 对 Upstash/embedding 的生产必需性表达仍偏弱。
- 影响评估：生产异常可能只有压缩堆栈；错误配置可能直到运行时才暴露。
- 推荐操作步骤：在 CI 受保护环境上传 sourcemap，token 缺失时对生产构建 fail-fast 或明确降级；把“开发可选、生产必需”的变量分组，并由 readiness 检查非秘密配置存在性。
- 验证方式：生产错误可映射到源码；缺关键变量的 staging readiness 明确失败，日志不打印 secret。
- 预期收益：缩短故障定位时间，减少配置漂移。

### C-06 覆盖率阈值应分阶段上调（P2）

- 问题描述：实际覆盖率已高于当前阈值，但 API/admin/组件仍存在低覆盖区域；直接抬高阈值可能制造无效阻断。
- 影响评估：当前门禁偏松，新增回归可能漏检；盲目上调则会延误交付。
- 推荐操作步骤：先补 favorites、resource-ratings、rate-limit、详情页静态渲染和 API schema 测试；连续两次基线稳定后将 lines/statements 提至 60，再将 branches/functions 提至 50。
- 验证方式：每次只调整一个阶段，`pnpm test -- --coverage` 与 CI 同时通过；记录新增测试对应风险。
- 预期收益：覆盖率门禁与真实风险同步提升，避免数字驱动的假质量。

## 5. 分阶段落地路线

### 立即（发布前，P0/P1）

1. 部署已修复详情页静态 client 的最新 HEAD，并通过 production verify。
2. 生产移除 resource-ratings GET 的 service-role fallback；公开 RPC 不可用时 fail-closed。
3. 统一 launch readiness 的 embedding expected state，避免发布门禁误判。

### 1–2 个迭代（稳定性与安全）

1. 生产限流按路由分级 fail-closed，并将 Upstash 状态纳入 health/readiness。
2. self-host 字体，修复无外网构建；开始 CSP report-only → nonce/hash 迁移。
3. API 文档切换 Vercel 域名并由 schema/契约测试驱动。
4. 为 favorites、ratings、详情页和键盘导航补齐回归测试。

### 中期（规模化）

1. PostgreSQL FTS/RPC + 小候选 Fuse，按压测阈值决定是否引入专用搜索服务。
2. embedding 迁移到常开、可观测的 Cloudflare/VPS 主轨；启用 `HEALTH_REQUIRE_EMBEDDING=1`。
3. 将 service-role 访问收敛到安全 RPC/专用服务，强化数据库 RLS 与审计。
4. 复用 CI 构建 artifact，收窄 emergency mirror 权限。

## 6. 附录：已确认修复、验证命令与残余风险

### 不应重复报告为当前漏洞的项目

- 生产 SQL 的 S0 constraints 与 legacy 512-d RPC grant 已收口至 service_role。
- 生产 `list_public_tools` 缺失时已 fail-closed，禁止全表 fallback。
- favorites `detail=links` 契约、browse 筛选、`flatResults` 去重和 submit fail-close 已完成。
- 图标 URL 已增加安全来源校验；需保留回归测试。

### 建议的验收命令

```powershell
pnpm test
pnpm typecheck
pnpm run lint
pnpm run audit:security
pnpm run build
pnpm run verify:production -- --no-proxy --base-url https://yuanjia1314.ccwu.cc --expect-commit <HEAD>
```

### 残余风险说明

- 构建外网字体依赖已移除；当前 `pnpm run build` 已在原失效代理环境中通过。
- 限流多实例放大、Fuse 规模瓶颈和 embedding 单点是架构推断，需以生产 metrics/压测数据确认优先级。
- 本报告只提出代码、文档和配置优化，不执行生产 SQL、DNS、Cloudflare purge、Vercel deploy 或秘密变更。
