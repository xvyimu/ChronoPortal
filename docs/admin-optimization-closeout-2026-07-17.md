# 管理后台视觉与架构优化收尾报告

日期：2026-07-17  
范围：登录页、链接工作台、分类管理、后台 API、Supabase 开发库  
数据口径：本地生产构建 + headed Chromium；不是生产 RUM，也不是伪造的 Lighthouse 报告。

## 当前问题清单

1. 历史后台视觉层级弱，登录、列表、表单缺少统一的后台语义令牌。
2. 旧页面会把全量链接交给客户端过滤，数据增长后会放大首屏和交互成本。
3. 表单与后台主包同步加载，低频功能占用首屏 JavaScript。
4. 后台请求缺少统一缓存键、失效策略和请求取消。
5. 导航表曾对匿名角色开放写权限，RLS 写策略过宽。
6. 分类层级、标签和原子限流依赖的数据库对象不完整。
7. 后台关键路径过去没有可复用的认证 E2E。
8. 性能文档缺少本轮代码对应的可重复实际基线。

## 问题诊断

- 视觉：前台纸张风格不适合高频管理操作；后台需要更安静、紧凑、可扫描的独立视觉域。
- 渲染：列表派生状态、筛选和表单同处热路径会增加水合与重复渲染。
- 数据：后台列表必须由服务端分页；客户端缓存只负责短时复用和突变后失效。
- 安全：RLS 与 SQL `GRANT` 是两层边界；只收紧其中一层仍可能暴露 Data API 写面。
- 度量：开发服务器首次编译会污染 p95，因此正式本地基线固定复用 `pnpm build` 的生产产物。

## 视觉方案

### 登录页

| 维度 | 方案 A：专注登录（已实施、推荐） | 方案 B：品牌引导 |
|---|---|---|
| 主色 | `#4A5568` + 白色 | `#4A5568` + 浅蓝灰分区 |
| 间距 | 8px 基线；面板 28-32px | 12px 基线；分区 40-48px |
| 字号 | 正文 14px；标题 24px | 正文 14px；标题 24px；品牌说明 18px |
| 信息密度 | 低，只保留密码与返回入口 | 中，增加品牌和安全提示 |

### 主控制台

| 维度 | 方案 A：工作台（已实施、推荐） | 方案 B：数据总览 |
|---|---|---|
| 主色 | 蓝灰导航 + 白色内容 | 蓝灰 + 状态色占比更高 |
| 间距 | 页面 24-32px；组件 12-16px | 页面 20-24px；组件 8-12px |
| 字号 | 正文 14px；分区 18px；页标题 24px | 正文 13-14px；指标 24px；页标题 22px |
| 信息密度 | 中，优先筛选与操作 | 高，优先图表和趋势 |

### 列表与详情

| 维度 | 方案 A：表格 + 侧滑详情（已实施、推荐） | 方案 B：双栏主从 |
|---|---|---|
| 主色 | 白底、蓝灰操作、克制状态色 | 浅灰列表底 + 白色详情面板 |
| 间距 | 行高 52-56px；侧栏 24px | 列表行 44-48px；详情 20px |
| 字号 | 表格 14px；辅助信息 12px；标题 18px | 表格 13px；详情 14px；标题 18px |
| 信息密度 | 中；移动端切卡片 | 高；适合宽屏连续审核 |

推荐方案 A。当前数据量、操作频率和移动端需求更适合单任务焦点、服务端分页和侧滑编辑；方案 B 只有在需要连续审核和复杂统计时才值得承担更高密度与双栏宽度成本。

## 架构方案

- 服务端首屏：`app/admin/page.tsx` 并行读取分页链接与分类，客户端不再接收全量数据。
- 按需加载：`AdminWorkspace` 用 `next/dynamic` 延迟加载 `LinkForm`。
- 渲染控制：列表行和移动卡片使用 `memo`；筛选对象、统计值和可见分类使用 `useMemo`。
- 请求缓存：React Query 统一链接/分类键，分类 `staleTime` 为 5 分钟，保存后精确失效。
- 数据边界：Supabase 开发库仅允许匿名/登录角色读取导航数据，写操作只给 `service_role`。
- 限流：登录与提交限流改为服务端原子 RPC，内部表保持 RLS deny-all。
- 测试：E2E 使用每次 CI 随机生成的 Auth 密钥签名测试会话，不提交登录表单，也不改写业务数据。

## 关键代码位置

```tsx
// components/admin/AdminWorkspace.tsx
const LinkForm = dynamic(
  () => import("@/components/admin/LinkForm").then((module) => module.LinkForm),
  { loading: () => <div aria-label="正在加载表单">...</div> }
);
```

```tsx
// components/admin/AdminWorkspace.tsx
const filters = useMemo(
  () => ({ page, pageSize: 20, query: deferredQuery, category, status }),
  [category, deferredQuery, page, status]
);
```

```ts
// e2e/helpers/admin-session.ts
const token = await encode({
  token: { sub: "admin", role: "admin" },
  secret,
  salt: cookieName,
  maxAge: 60 * 60,
});
```

## 性能对比与度量方法

### 实际本地数据

| 指标 | 历史基线 | 当前值 | 结论 |
|---|---:|---:|---|
| Client first-load JS (gzip) | 429.6 KB | 400.2 KB | 实测减少 29.4 KB，约 6.8% |
| 登录页 LCP p95 | 无同环境基线 | 300 ms | 本地生产构建，低于 2 秒目标 |
| 控制台 LCP p95 | 无同环境基线 | 1,340 ms | 本地生产构建，低于 2 秒目标 |
| 链接 API p95 | 无同环境基线 | 158.2 ms | 低于 200ms 预算 |
| 分类 API p95 | 无同环境基线 | 382.9 ms | 未达到 200ms 预算 |

不能从缺失的同环境旧 API 数据推导“已降低 50%”。规划时可使用的**估算值**是：常见未缓存后台 API `300-600ms` -> 分页、索引和缓存后 `150-300ms`；该区间仅用于容量规划，不是本系统实测对比。

复现命令：

```powershell
pnpm build
pnpm perf:admin
pnpm e2e:admin
```

原始数据：

- `docs/perf/baseline-bundle-2026-07-17.json`
- `docs/perf/admin-baseline-2026-07-17.json`

后续生产上线后，应以同版本的 Lighthouse CI、Sentry Web Vitals P75 和服务端 API p95 作为最终验收；本地结果只能证明当前实现具备达标潜力。

## CDN 与图标口径

- 后台图标统一为 `lucide-react@1.20.0`，统一 `strokeWidth={1.75}`；没有混入手写 SVG、Feather 或 Heroicons。
- 字体采用系统无衬线栈，不再依赖构建时下载 Google Fonts。
- Next/Vercel 的内容哈希静态资源由平台边缘缓存，无需额外设置 `assetPrefix`。
- favicon 代理只访问三个固定图标 CDN，并返回浏览器 1 天、共享缓存 7 天的缓存头。
- `public/visuals/nav-atlas-aurora.png` 约 1MB 且当前未引用；保留为待确认删除项，不进入现有首屏。

## 参考来源

- Next.js 16 本地文档：`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`
- [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [TanStack Query Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [React memo](https://react.dev/reference/react/memo) 与 [useMemo](https://react.dev/reference/react/useMemo)
- [web.dev Core Web Vitals](https://web.dev/articles/vitals)
- [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- 视觉令牌、8px 间距、列表密度和 p95 预算：通用实践。
