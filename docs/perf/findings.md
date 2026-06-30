# 性能假设验证追踪表

> **建立时间**：2026-06-29
> **关联文档**：`docs/superpowers/specs/2026-06-29-performance-optimization-design.md` §四

每个假设必须走完整循环：**验证 → 修复 → 量化对比 → 提交**。

---

## 假设总览

| # | 假设 | 优先级 | 状态 | commit |
|---|---|---|---|---|
| H1 | PanguSpacing 全 DOM 遍历拖慢 INP | P0 | 🔍 验证中（前提已修正） | — |
| H2 | 513 LinkCard 实例造成首屏长任务 | P0 | ⚠️ 已坐实（代码层） | — |
| H3 | Fuse.js 客户端索引残留 | P1 | ❌ 已排除（静态审查） | — |
| H4 | Favicon 同步 `new Image()` 加载阻塞 CLS | P1 | ❌ 已排除（静态审查） | — |
| H5 | Motion 动画在低端设备触发 layout thrashing | P2 | ⚠️ 重定位（layout prop 而非变体） | — |
| H6 | 首屏 JS chunk 中存在可拆分的 sync import | P2 | 🔍 验证中（数据已采集） | — |
| H7 | Sentry client bundle 占首屏 JS 比重过高 | P3 | ⚠️ 部分修复（-2.9KB，核心仍在） | — |
| H8 | 路由切换无 prefetch 导致 TTFB 偏高 | P3 | ❌ 已排除（静态审查） | — |

**状态图例**：🔄 待验证 / 🔍 验证中 / ❌ 已排除 / ✅ 已修复 / ⚠️ 部分修复

---

## 静态验证阶段小结（2026-06-30）

本轮在**无头环境**完成了所有可静态/bundle 定性的验证，把 8 个假设从「全部待验证」收敛为：

- **已排除（3）**：H3 / H4 / H8 —— 假设前提在代码层不成立，无需修复。
- **已坐实（2）**：H2（513 全量挂载，无虚拟化）/ H7（Sentry 首屏 ~113KB）。
- **重定位（1）**：H5 —— 真实风险是 `ResultGrid` 的 `layout` prop，非变体定义；与 H2 同源。
- **数据已采集（1）**：H6 —— 首屏 472KB，结论：仅靠 bundle 拆分达不到 250KB，需 RSC 边界收缩。
- **前提已修正（1）**：H1 —— 已无 500ms setTimeout，全 DOM 遍历开销待浏览器实测。

**已实施修复**：H7 构建期 tree-shaking（-2.9KB，诚实有限）；附带修复了 Phase 1 测量工具 `extract-bundle-stats.mjs` 的 4 个解析 bug。

**接手者第一优先级**：H2 + H5 的 `layout` prop 移除是最高杠杆且低风险，但需 `pnpm dev` + Chrome Performance（CPU 6x）做 before/after INP/TBT 量化——无头环境无法完成，必须人工实测。

---

## H1: PanguSpacing 全 DOM 遍历拖慢 INP

### 假设陈述

> ⚠️ **原假设前提已修正（2026-06-30 静态审查）**：原文写"延迟 500ms 调用 `spacingPage()`"，
> 但 `components/PanguSpacing.tsx` 现状已无 500ms setTimeout。实际实现为：
> - `await import("pangu/browser")` 动态导入（不进首屏 bundle）
> - `requestAnimationFrame` 内首次 `spacingPage()`
> - `MutationObserver` + 300ms debounce 处理动态内容
>
> 真实风险点仍在：`pangu.spacingPage()` 是**全 DOM 文本节点遍历**，
> 在 513 LinkCard 场景下首次执行 + 每次筛选/搜索后 debounce 执行可能造成长任务，拖慢 INP。

### 验证方法

1. 启动 `pnpm dev`，访问首页
2. Chrome DevTools → Performance 面板 → 录制
3. 模拟用户交互（点击侧边栏分类切换）
4. 检查 INP 长任务中是否含 `pangu.spacingPage` 调用栈
5. 同时在 Performance 录制中搜索 "pangu" 关键字

### 验证结果

**静态审查（2026-06-30）**：
- ✅ 动态 import 已确认（不影响首屏 bundle，与 H6/H7 解耦）
- ✅ rAF + 300ms debounce 已确认（避免高频触发）
- ⏳ 全 DOM 遍历开销需 Performance 面板实测确认（浏览器环境）

待浏览器实测：在 513 卡片首屏 + 分类切换场景下录制，确认 `spacingPage` 单次执行是否 >50ms。

### 修复方案

_待浏览器实测验证成立后选 A/B/C 预案，见设计文档 §4.3。
候选：限定 observer 作用域到内容区（非 document.body）/ 增大 debounce / 仅对新增节点 spacing（pangu.spacingNode）_

### before/after 数据

_待填写（需浏览器实测）_

### commit

_待填写_

---

## H2: 513 LinkCard 实例造成首屏长任务

### 假设陈述

首页 `DualTrackSection` + `CategorySection` 渲染时，可能同时挂载大量 LinkCard 实例。
即使每个 LinkCard 已 memo，初次挂载的 reconciliation 阶段仍可能造成 >50ms 长任务。

### 验证方法

1. Performance 面板录制首次渲染
2. 找 >50ms 长任务
3. 检查调用栈是否含 LinkCard / CategorySection reconciliation

### 验证结果

**⚠️ 已坐实（2026-06-30 代码层定量，无需浏览器）**

首屏默认态（`activeCategory === "all"` 且无搜索）的渲染链路：

1. `app/page.tsx` 把**全部 513 条** `getApprovedLinks()` 传给 `Navigation`
2. `useLinksFilter` → `useDerivedLinks.linkSections`（`useLinksFilter.ts:513-553`）：默认态遍历所有顶级分类，
   每个分类 section 渲染 `filtered.filter(属于该分类)` —— `filtered` 在 "all" 态即全部 513 条
3. `CategorySection` → `ResultGrid`（`ResultGrid.tsx:34`）：`links.map` 全量渲染，**无分页/虚拟化/懒加载**
4. 结果：首屏一次性挂载 ≈ 513 个 `LinkCard`（featured/latest/popular 各 ≤6 另算）

**比假设更尖锐的发现**：`ResultGrid.tsx:38` 每个卡片外层是 `<motion.div layout>`，
LinkCard 内层还有 `<motion.div variants={fadeInUp}>`。首屏约 **1000+ motion 组件**，
其中 `layout` prop 会做 FLIP 测量（`getBoundingClientRect`），513 个并发 = 首次挂载强制同步重排。
（此项与 H5 共因，见 H5。）

`LinkCard.tsx:59` 的 `transition={{ delay: (index % 20) * 0.02 }}` stagger 说明设计上已知数量大，
但 stagger 只错开动画时机，DOM 节点仍全量构建，不缓解 reconciliation 长任务。

### 修复方案

候选（按风险/收益）：
1. **首屏分页 / 「加载更多」** — 默认每分类 section 首屏只渲染 N 条（如 12），其余点击展开。
   最直接降低首屏 LinkCard 数量，风险中（改交互）
2. **IntersectionObserver 懒挂载** — below-the-fold 的 section 进入视口才渲染卡片，保持「全部」语义
3. **虚拟滚动**（react-window/virtua）— 收益最大但与现有多 section + 响应式 grid 布局冲突，重构成本高
4. **移除首屏 `layout` prop**（见 H5）— 低风险，先做，量化 INP/TBT 改善

> 推荐顺序：先做 H5 的 `layout` 移除（低风险、可量化），再评估是否需要 (1)/(2)。
> 三者均需浏览器 Performance 面板 before/after（首次挂载长任务时长 + INP），无头环境无法量化，留给接手者实测。

### before/after 数据

_待浏览器实测（首屏挂载长任务时长 / INP）。代码层已确认 513 全量挂载。_

### commit

_待填写_

---

## H3: Fuse.js 客户端索引残留

### 假设陈述

虽然 Fuse.js 搜索已迁至服务端 API，但客户端代码中可能仍残留 fuse.js import 或
索引构建逻辑，导致客户端 bundle 体积虚增 + 内存占用。

### 验证方法

1. 代码审查：`grep -r "fuse" components/ app/ lib/`
2. DevTools Memory snapshot 对比首页加载前后
3. `pnpm analyze` 查看 fuse.js 是否出现在客户端 chunk

### 验证结果

**❌ 已排除（2026-06-30 静态审查）**

全仓库 grep `fuse|Fuse` 结果：客户端代码无任何 fuse.js 引入。

| 引用位置 | 性质 | 是否进客户端 bundle |
|---|---|---|
| `lib/search/fuse.ts` | 服务端搜索池，`await import("fuse.js")` 动态导入 | ❌ 否（API 路由专属） |
| `lib/search/types.ts` | `import type Fuse` 仅类型 | ❌ 否（类型编译期擦除） |
| `app/api/search/route.ts` | 服务端路由 | ❌ 否 |
| `components/useLinksFilter.ts:94` | 注释说明"简单文本匹配替代 Fuse.js（排行榜仅 29 条）" | ❌ 否（无 import） |

结论：Fuse.js 仅存在于服务端 `/api/search` 路径，且为动态 import。客户端 bundle 无残留。
待 `pnpm analyze` 完成后做最终交叉确认（确认 client chunk 不含 fuse.js）。

### 修复方案

无需修复（假设不成立）。

### before/after 数据

N/A

### commit

N/A（仅追踪表更新）

---

## H4: Favicon 同步 `new Image()` 加载阻塞 CLS

### 假设陈述

`lib/use-favicon.ts` 使用 `new Image()` 同步预加载 favicon，
图片加载完成时切换 src 可能造成 Layout Shift。
513 个 LinkCard 同时触发可能放大 CLS。

### 验证方法

1. Chrome DevTools → Lighthouse → 跑首页 CLS 评估
2. Performance → Layout Shift Regions 录制
3. 检查 shift 是否集中在 LinkCard img 元素

### 验证结果

**❌ 已排除（2026-06-30 静态审查 `components/LinkCard.tsx:69-87`）**

favicon 槽位有固定尺寸，不存在布局撑开：

1. 外层容器固定 `h-[42px] w-[42px]` + `overflow-hidden`，尺寸与图片加载状态无关
2. `NextImage` 固定 `width={24} height={24}`，渲染前后占位一致
3. 加载未完成时渲染同尺寸 `<Globe>` 占位图标，加载完成后 React 把 `Globe` 替换为 `NextImage`——
   是**占位符替换**（容器尺寸不变），不是布局撑开，不产生 layout shift
4. `useFavicon` 的 `new Image()` 是**离屏预加载**（从不插入 DOM），仅探测 URL 可用性，本身无法造成 CLS

结论：假设前提（"图片加载完成时切换 src 造成 Layout Shift"）不成立，槽位尺寸固定。
待 Lighthouse CI 出 CLS 数值做最终量化确认（预期 CLS 贡献来自 favicon ≈ 0）。

### 修复方案

无需修复（假设不成立）。

### before/after 数据

N/A（待 Lighthouse CLS 数值交叉确认）

### commit

N/A（仅追踪表更新）

---

## H5: Motion 动画在低端设备触发 layout thrashing

### 假设陈述

`lib/animations.ts` 中定义的 motion 变体可能触发 layout 属性动画（如 width/height/top），
在低端设备（CPU 6x slowdown）上可能造成 layout thrashing。

### 验证方法

1. Chrome DevTools → Performance → CPU 6x slowdown
2. 录制侧边栏切换 / 卡片悬停动画
3. 检查是否触发 Forced reflow / Layout 警告

### 验证结果

**⚠️ 重定位（2026-06-30 代码层审查）：风险源不是变体定义，是 `layout` prop**

1. **变体定义合规**（`lib/animations.ts`）：`fadeInUp` = `opacity` + `y`，`slideDown` = `opacity` + `y`，
   `staggerContainer` = `opacity`。全部是 transform/opacity（GPU composited），**不触发 layout**。
   假设里说的"width/height/top layout 动画"在变体层面**不成立**。

2. **真实风险源**（`ResultGrid.tsx:38`）：每个卡片外层 `<motion.div layout>` 的 `layout` prop。
   `layout` 让 Motion 在渲染时做 FLIP 测量（读 `getBoundingClientRect`），首屏 513 个并发，
   构成首次挂载的强制同步重排 / layout thrashing。这才是 H5 的真实落点，且与 H2 同源。

### 修复方案

**移除首屏默认态的 `layout` prop**（低风险、可量化）：

`layout` 仅在卡片**位置发生重排**时才有视觉价值（如筛选/排序后卡片平滑移位）。
首屏初次挂载没有"上一帧位置"可 FLIP，`layout` 此时纯属开销。

候选实现：
- 简单版：直接去掉 `ResultGrid.tsx:38` 的 `layout` prop —— 失去筛选重排的位移动画，但 fadeInUp 入场动画保留
- 保守版：仅在结果集较小（如 < 60）时启用 `layout`，大列表禁用
- 进一步：用 `LayoutGroup` 限定 layout 作用域，避免跨 section 的全局 FLIP

> ⚠️ 移除 `layout` 是行为改变（筛选时卡片不再平滑位移，直接重排）。
> 需 before/after 录制确认 INP/TBT 改善幅度后再定夺是否接受该体验变化。无头环境无法量化，留给接手者。

### before/after 数据

_待浏览器实测（CPU 6x slowdown 下录制筛选切换，对比 Forced reflow 时长）。_

### commit

_待填写_

## H6: 首屏 JS chunk 中存在可拆分的 sync import

### 假设陈述

`pnpm analyze` 报告中，首屏 first-load JS 可能包含本可动态 import 的模块，
如 Sentry 全量初始化、Supabase client、ModelRanking 数据等。

### 验证方法

1. `pnpm analyze` 生成报告
2. 检查 first-load JS chunk 内容
3. 找出可在 below-the-fold 或路由切换时再加载的模块

### 验证结果

**🔍 验证中（2026-06-30 bundle 分析，gzip）**

`docs/perf/baseline-bundle-2026-06-30.json`：client 首屏 first-load JS = **472.4 KB**（目标 < 250KB，**超标 89%**）。

首屏第三方库 top（gzip）：

| 库 | 首屏占用 | 可寻址性 |
|---|---|---|
| next（框架运行时） | 265.8 KB | ❌ 框架地板，不可动 |
| @sentry/* （4 包合计） | ~113 KB | ✅ 见 H7（Replay/tracing 可削） |
| react-dom | 55.1 KB | ❌ 框架地板 |
| (app code) | 50.9 KB | ⚠️ 可审查拆分 |
| motion-dom + framer-motion | ~40 KB | ⚠️ 部分组件可懒加载 |
| lucide-react | 16.3 KB | ⚠️ 确认是否按需 import |
| sonner | 9.0 KB | ⚠️ toast 可懒加载 |
| pangu | 5.6 KB | ✅ 已动态 import（见 H1） |

框架地板（next + react-dom + react + scheduler）≈ 325 KB 不可动。
**可寻址空间**：Sentry 113 + motion 40 + lucide 16 + sonner 9 ≈ 178 KB。

### 修复方案

按收益排序：
1. **H7 Sentry 瘦身**（最大单项，见 H7）— 预计省 30-50KB
2. lucide-react 确认 tree-shaking（应已按需，需 analyzer 交叉确认具体 import 数）
3. sonner toast 懒加载
4. motion 非首屏动画组件 `next/dynamic`

> ⚠️ 即便全部削减约 178KB 可寻址空间，首屏仍由 ~325KB 框架地板决定，
> **无法仅靠 bundle 拆分达到 <250KB**。需结合 RSC 边界优化（减少 client component 范围）。
> 这是结构性结论，接手者需在设计文档 §5.3 退出条件中重新评估该阈值的现实性。

### before/after 数据

baseline（2026-06-30）：client 首屏 472.4 KB / 总 483.2 KB / 63 chunks

### commit

工具修复 commit 待提交（extract-bundle-stats.mjs 三处 bug）。具体瘦身 commit 待 H7 推进。

---

## H7: Sentry client bundle 占首屏 JS 比重过高

### 假设陈述

`@sentry/nextjs` client bundle 可能因 replay / tracing 全量启用，
导致首屏 JS 占用 30KB+，影响 LCP。

### 验证方法

1. `pnpm analyze` 查看 @sentry 在 client chunk 的大小
2. 评估是否启用 Sentry Replay（最大开销来源）

### 验证结果

**⚠️ 已坐实（2026-06-30 bundle 分析）**

`@sentry/*` 客户端首屏占用（gzip，`baseline-bundle-2026-06-30.json`）：

| 包 | 首屏 gzip |
|---|---|
| @sentry/core | 70.0 KB |
| @sentry/browser-utils | 18.9 KB |
| @sentry/browser | 17.8 KB |
| @sentry/nextjs | 6.9 KB |
| **合计** | **~113 KB** |

远超假设的 30KB+，是首屏第三方库中仅次于框架（next + react-dom）的最大块。

**根因（`instrumentation-client.ts:24`）**：`replaysOnErrorSampleRate: 1.0` 启用了 Session Replay 集成。
Replay 是 Sentry client SDK 体积最大的可选模块（`@sentry/browser-utils` 中含 rrweb 录制逻辑），
即便采样率走 onError 路径，集成代码仍被静态打入首屏 bundle。

### 修复方案

候选（按收益/风险）：
1. **构建期 tree-shaking**（`next.config.ts` → `withSentryConfig({bundleSizeOptimizations})`）✅ 已实施
2. **懒加载 Sentry init** — 用 `import()` 延迟到首屏 paint 后，不减体积但移出关键路径
3. **更换 SDK entry** — 不从 `@sentry/nextjs` 顶层 import（含全部集成），改用不带 Replay 的精简初始化 — ⚠️ 破坏性，需单独验证

> ⚠️ **重要教训**：在 `instrumentation-client.ts` 用运行时 `integrations: (defaults)=>defaults.filter(...)`
> 过滤 Replay **无效**——实测 before/after bundle 数字零变化（472.4KB→472.4KB），
> Replay 代码仍被静态打入。减体积**必须在构建期**（`bundleSizeOptimizations`）。

### before/after 数据

实测（2026-06-30，gzip，`bundleSizeOptimizations: {excludeReplayShadowDom/Iframe/Worker, excludeDebugStatements}`）：

| 包 | before | after | delta |
|---|---|---|---|
| @sentry/core | 70.0 KB | 68.2 KB | -1.8 KB |
| @sentry/browser-utils | 18.9 KB | 18.3 KB | -0.5 KB |
| @sentry/browser | 17.8 KB | 17.2 KB | -0.5 KB |
| @sentry/nextjs | 6.9 KB | 6.7 KB | -0.2 KB |
| **Sentry 合计** | **113.6 KB** | **110.4 KB** | **-3.2 KB** |
| client 首屏 | 472.4 KB | **469.5 KB** | **-2.9 KB** |

**诚实评估**：`excludeReplay*` 仅削掉 Replay 的 shadowDom/iframe/worker 边角子模块（~3KB），
Replay 核心 + rrweb 主体（~15-18KB）**仍在 bundle 中**——因为 SDK 顶层 import 静态引入全部集成。
彻底移除需方案 3（换 entry），属破坏性改动，留作后续 TODO，不在本次交接范围。

### commit

待提交：`next.config.ts` bundleSizeOptimizations + `instrumentation-client.ts` 注释 + extract 脚本修复。

### 假设陈述

Next.js `<Link>` 默认 prefetch，但项目可能在某些场景下禁用了 prefetch，
或路由配置（如 dynamic params）导致 prefetch 失效，
造成路由切换 TTFB 偏高。

### 验证方法

1. Network 面板观察 `<Link>` hover 时的 prefetch 请求
2. 检查 `next/link` 使用方式是否传了 `prefetch={false}`
3. 测量路由切换 TTFB

### 验证结果

**❌ 已排除（2026-06-30 静态审查）**

- 全仓库 grep `prefetch={false}`：**0 处匹配**——无任何 `<Link>` 禁用了 prefetch
- 8 个使用 `next/link` 的文件（Header / Footer / tool/[slug] / FavoritesView / admin/layout / error / global-error / not-found）均用默认 prefetch
- Next.js 16 App Router 默认对视口内 `<Link>` 自动 prefetch（生产环境）

结论：假设前提（"某些场景禁用了 prefetch"）不成立。
TTFB 若偏高，根因更可能在服务端（dynamic 路由 SSR / DB 查询），不在 prefetch 配置。
待 Sentry Web Vitals 积累 P75 TTFB 数据后，若确实偏高，另立假设排查服务端渲染链路。

### 修复方案

无需修复（假设不成立）。

### before/after 数据

N/A（待 Sentry P75 TTFB 数据交叉确认服务端侧）

### commit

N/A（仅追踪表更新）

---

## 追踪表更新规则

1. 每个假设开始验证时，状态从 🔄 改为 🔍
2. 验证完成后填写"验证结果"章节，状态改为 ❌（排除）或继续修复
3. 修复完成后填写"修复方案"+"before/after"+"commit"，状态改为 ✅
4. 部分修复（如多步实施）状态用 ⚠️
5. 完成后更新顶部总览表
