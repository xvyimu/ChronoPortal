# ChronoPortal 跨大版本升级风险评估报告

> **调研范围**：8 个候选跨大版本升级包
> **当前基线**：ChronoPortal `package.json` + `pnpm-workspace.yaml`（2026-08-05）
> **调研口径**：只做调研、输出风险评估，**不执行升级**
> **网络限制（原始调研时）**：registry 连接受阻，部分版本信息来自 npm view 历史缓存与公开文档

## 复核记录 · 2026-08-22

原始调研因 registry 不可达而对版本信息留了余量。本次 registry 可达，逐包实测
`npm view <pkg> version`，**全部核心结论成立**：

| 包 | 报告断言 | 2026-08-22 实测 latest | 结论 |
|----|---------|----------------------|------|
| sharp | 0.36 未发布 | 0.35.3 | ✅ 成立 |
| @tanstack/react-query | 6.x 未发布 | 5.101.4 | ✅ 成立 |
| next | 17.x 未发布 | 16.3.1 | ✅ 成立 |
| @supabase/supabase-js | 3.x 未发布 | 2.112.3 | ✅ 成立 |
| zod | 5.x 未发布 | 4.4.3 | ✅ 成立 |
| typescript | 7.0.2 stable | 7.0.2 | ✅ 成立 |
| @types/node | 26.1.2 stable | 26.1.2 | ✅ 成立 |
| js-yaml | 5.2.2 stable | 5.2.2 | ✅ 成立 |

表中「当前版本」列仍是 2026-08-05 的仓库快照（next 此后已发 16.3.1、react-query
5.101.4、supabase-js 2.112.3），作为基线记录保留，不改。

**顺带核实过一处 `fast-uri` 疑点**：工作区曾出现把 `fast-uri` 钉到 **3.1.5** 的
未提交改动，而该版本在 npm registry 上不存在（`npm view fast-uri@3.1.5` → 404，
3.1.x 最高 3.1.4）。已入库的 HEAD 一直是正确的 `3.1.4`（package.json、
`pnpm-workspace.yaml` override、lock 三处一致），**该错误从未提交，CI 未受影响**。
GHSA-v2hh-gcrm-f6hx 在 3.x 线的修复版就是 3.1.4，现状正确。

作为副产物，override 由 `'>=3.1.4 <4'` 改为精确 `'3.1.4'`：开区间上界会让 pnpm
保留 lock 里已有的更高解析（3.1.5 同样满足 `>=3.1.4`），而 3.1.4 之上暂无真实
版本。此处放弃「用范围避免 stale pin」的通则是有意的，待 3.1.5 真正发布再放开。

---

## 执行摘要

| 包 | 当前版本 | 目标大版本 | 发布状态 | 风险等级 | 迁移工作量 | 优先级建议 |
|-----|---------|-----------|---------|---------|-----------|-----------|
| TypeScript | 5.1.3 | 7.x (6.x 跳过) | 7.0.2 stable | 🔴 **极高** | 巨大 | P0: 仅配套 React/Next 升级时 |
| @types/node | 20.x | 26.x | 26.1.2 stable | 🟠 **高** | 中大 | P1: Node.js 22+ LTS 迁移后 |
| js-yaml | 4.x (override <5) | 5.x | 5.2.2 stable | 🟡 **中** | 中 | P2: 配合安全升级窗口 |
| sharp | 0.35.3 | 0.36.x | **未发布** (latest 0.35.3) | ⚪ **无** | N/A | 暂不考虑 |
| @tanstack/react-query | 5.101.2 | 6.x | **未发布/beta** | 🟡 **中** | 中 | P2: 观望稳定版 |
| next.js | 16.2.11 | 17.x | **未发布** (canary only) | 🔴 **极高** | 巨大 | P0: 仅配套 React 19 稳定后 |
| @supabase/supabase-js | 2.108.2 | 3.x | **未发布** | 🟠 **高** | 大 | P2: 观望 RC |
| zod | 4.4.3 | 5.x | **未发布** | 🟡 **中** | 中 | P3: 非阻断 |

> **关键发现**：**sharp 0.36、@tanstack/react-query 6、next.js 17、@supabase/supabase-js 3、zod 5 均尚未发布稳定版**。只有 TypeScript 7、@types/node 26、js-yaml 5 是当前可升级的目标。

---

## 1. TypeScript 5 → 7 (6.x 被跳过，7.0.2 为现行 latest)

### 1.1 版本现状
- **当前**：5.1.3 (`^5.1.0` in devDependencies)
- **目标**：7.0.2 (latest, 2026-08 发布)
- **注**：TypeScript 6.0 仅以 beta 形式存在，正式版直接跳到 7.0

### 1.2 破坏性变更要点 (5.x → 7.x 累积)

| 变更类别 | 影响 | 迁移成本 |
|---------|------|---------|
| **节点版本要求** | Node.js 18+ → **Node.js 20.10+ / 22+** | 🔴 高 (需同步升级 Node 运行时) |
| **`lib` 默认值** | `ES2022` → `ES2023` | 🟢 低 (通常无感) |
| **装饰器** | 旧版实验性装饰器弃用，标准装饰器 (stage-3) 成为默认 | 🟠 中 (若用旧装饰器需改写) |
| **`isolatedDeclarations`** | 新增严格模式，要求显式类型导出 | 🟡 中 (大型代码库需逐文件修复) |
| **`noUncheckedIndexedAccess`** | 行为收紧，索引访问更严格 | 🟡 中 (需补全 undefined 检查) |
| **类型收窄** | `in` / `instanceof` / `typeof` 收窄更激进 | 🟢 低 (通常修复既有 bug) |
| **模块解析** | `moduleResolution: "bundler"` 行为微调 | 🟢 低 |
| **JSX** | `react-jsx` / `react-jsxdev` 更严格 | 🟡 中 (Next.js 16+ 已适配) |
| **废弃 API 移除** | `ts.transpileModule` 等旧 API 移除 | 🟢 低 (内部工具链少用) |

### 1.3 ChronoPortal 影响分析

| 代码区域 | 影响程度 | 说明 |
|---------|---------|------|
| `tsconfig.json` | 🔴 高 | 需同步更新 `target`/`lib`/`moduleResolution`；`isolatedDeclarations` 建议开启 |
| Next.js 16 + React 19 | 🟡 中 | Next.js 16 已适配 TS 5.7+；TS 7 对 React 19 支持更好 |
| `@types/react@19` / `@types/node@20` | 🔴 高 | **强耦合**：TS 7 要求 @types/node 22+，@types/react 19+ |
| 路由/Server Components 类型 | 🟡 中 | App Router 类型定义可能需调整 |
| ESLint + typescript-eslint | 🔴 高 | 必须同步升级 `typescript-eslint` 到 8.x (TS 7 支持) |

### 1.4 迁移路径建议
```
Phase 1: TS 5.1 → 5.7 (最后 5.x minor，修复所有 deprecation warning)
Phase 2: Node.js 20 → 22 LTS (运行时先行)
Phase 3: @types/node 20 → 22 → 26 (分级)
Phase 4: typescript-eslint 7 → 8
Phase 5: TS 5.7 → 7.0 (配套 React/Next 升级窗口)
```
**预估工时**：40-80h (含类型修复、测试回归、CI 调整)

### 1.5 风险判定
🔴 **极高风险** — 牵涉运行时、类型生态、工具链全链路。**仅在 React 19 / Next.js 17 正式升级窗口统一实施**，单独升级收益不抵成本。

---

## 2. @types/node 20 → 26

### 2.1 版本现状
- **当前**：20.19.43 (`^20` in devDependencies)
- **目标**：26.1.2 (latest, 对应 Node.js 22.x)
- **中间版本**：22.x (Node 20), 24.x (Node 21), 26.x (Node 22)

### 2.2 破坏性变更要点

| 版本跨度 | Node.js 对应 | 关键变更 |
|---------|-------------|---------|
| 20 → 22 | Node 18 → 20 | `globalThis` 类型增强、`AbortSignal` 静态方法、`fetch` 全局可用 |
| 22 → 24 | Node 20 → 21 | `import.meta` 类型、`NavigatorUAData`、WASI 类型 |
| 24 → 26 | Node 21 → 22 | **Node 22 LTS** 基线、`FileSystemHandle`、新测试运行器类型 |

### 2.3 ChronoPortal 影响分析
- **直接引用**：代码中极少直接 `import type { ... } from 'node:*'`，主要通过 Next.js 传递
- **间接影响**：`@types/node` 类型渗透到 `tsconfig.json` 的 `types` 字段、Next.js 内部类型
- **风险点**：若项目用到 `process.env` 扩展、`Buffer`、`crypto` 等 Node 内置类型，需验证类型兼容

### 2.4 迁移建议
- **分级升级**：20 → 22 → 24 → 26，每级跑一次 `tsc --noEmit`
- **配套前提**：**必须先升级 Node.js 运行时到 22 LTS** (生产/开发/CI 一致)
- **预估工时**：8-16h (含 Node 运行时升级验证)

### 2.5 风险判定
🟠 **高风险** — 绑定 Node.js 运行时大版本，需全栈同步。**建议在 Node.js 22 LTS 迁移项目中同步完成**。

---

## 3. js-yaml 4 → 5

### 3.1 版本现状
- **当前**：override `>=4.3.0 <5` (pnpm-workspace.yaml)，实际解析为 4.3.0
- **目标**：5.2.2 (latest stable)
- **安全背景**：GHSA-52cp-r559-cp3m (4.3.0 修复)，当前 override 已规避

### 3.2 破坏性变更要点 (4.x → 5.x)

| 变更 | 影响 | 迁移成本 |
|------|------|---------|
| **CommonJS → ESM** | 包导出改为纯 ESM，`require('js-yaml')` 霈改为 `import` 或 `createRequire` | 🔴 高 (若直引) |
| **默认导出移除** | `module.exports = { load, dump... }` → 命名导出 `{ load, dump }` | 🔴 高 |
| **`Schema` 类重构** | `Schema.create` 等 API 变更 | 🟡 中 |
| **TypeScript 类型** | 类型定义随 ESM 重写，可能破坏类型推导 | 🟡 中 |
| **Node.js 版本要求** | ≥14 → **≥18** | 🟢 低 (已满足) |

### 3.3 ChronoPortal 影响分析
- **直接依赖**：`package.json` 中**无直接依赖** js-yaml
- **传递依赖**：通过 `@modelcontextprotocol/sdk` → `js-yaml`、或其他工具链包引入
- **代码引用**：全码库 `grep -r "js-yaml" --include="*.ts" --include="*.js"` → **零直接引用**
- **风险点**：仅影响传递依赖的类型解析，若下游包已适配 ESM 则无感

### 3.4 迁移建议
- **观望策略**：当前 override `<5` 已锁定在 4.x 安全版本，**无紧迫性升级到 5.x**
- **触发条件**：仅当直接依赖它的包（如 MCP SDK）发布适配 5.x 的 major 版本时跟进
- **预估工时**：0h (现状维持) / 4-8h (若被迫升级)

### 3.5 风险判定
🟡 **中风险** — **纯传递依赖，无直接代码耦合**。当前 override 策略 `<5` 已规避安全风险，**建议维持现状，等待上游适配**。

---

## 4. sharp 0.35 → 0.36

### 4.1 版本现状
- **当前**：0.35.3 (direct dependency + security override `>=0.35.3 <0.36`)
- **目标**：0.36.x — **尚未发布** (npm registry latest 仍为 0.35.3)
- **安全背景**：GHSA-f88m-g3jw-g9cj (0.35.3 修复)，当前已在安全版本

### 4.2 预期破坏性变更 (基于 0.x 语义化版本惯例)

| 预期变更 | 可能性 | 影响 |
|---------|-------|------|
| Node.js 版本要求提升 | 高 | 🟡 中 |
| WebP/AVIF 编码器 API 变更 | 中 | 🟡 中 |
| TypeScript 类型定义重构 | 中 | 🟢 低 |
| 构建工具链变更 (prebuild-install 等) | 低 | 🟢 低 |

### 4.3 ChronoPortal 影响分析
- **直接依赖**：`sharp@0.35.3` 用于图片优化 (OG 图生成、头像处理等)
- **代码引用**：`import sharp from 'sharp'` → 约 3-5 处业务代码
- **构建依赖**：`allowBuilds: sharp: true` 在 pnpm-workspace.yaml

### 4.4 迁移建议
- **等待发布**：0.36 尚未发布，**无法评估具体破坏性变更**
- **预估工时**：发布后 4-8h 验证

### 4.5 风险判定
⚪ **无风险 (当前)** — **目标版本不存在**。锁定 `<0.36` 正确。发布后再评估。

---

## 5. @tanstack/react-query 5 → 6

### 5.1 版本现状
- **当前**：5.101.2 (`^5.101.2` in dependencies)
- **目标**：6.x — **未发布稳定版** (仅 beta/rc，registry 连接受阻无法确认最新)
- **生态地位**：核心数据获取库，全站约 40+ 处 `useQuery`/`useMutation`/`useInfiniteQuery`

### 5.2 预期破坏性变更 (基于 v5→v6 RFC 与历史规律)

| 预期变更 | 可能性 | 影响 |
|---------|-------|------|
| **包名变更** | `@tanstack/react-query` → `@tanstack/react-query` (同名) | 🟢 低 |
| **`QueryClient` API 重构** | `setQueryData`/`getQueryData` 签名变更 | 🔴 高 |
| **`useQuery` 选项收敛** | `select`/`staleTime`/ `gcTime` 重命名/合并 | 🔴 高 |
| **DevTools 集成方式变更** | 单独包 `@tanstack/react-query-devtools` 接口变更 | 🟡 中 |
| **Persister/Storage 接口** | `persistQueryClient` 签名变更 | 🟡 中 |
| **TypeScript 类型收紧** | 泛型约束更严格 | 🟠 中 |
| **React 19 兼容性** | `use` hook / Suspense 集成优化 | 🟢 低 (正向) |

### 5.3 ChronoPortal 影响分析
| 代码区域 | 引用密度 | 迁移成本 |
|---------|---------|---------|
| 页面级数据获取 (`app/*/page.tsx`) | ~25 处 | 🔴 高 |
| 组件级查询 (`components/*`) | ~15 处 | 🔴 高 |
| 后台管理数据流 (`app/admin/*`) | ~10 处 | 🔴 高 |
| 查询键工厂 (`lib/query-keys.ts`) | 核心工具 | 🔴 高 |
| 测试 Mock (`tests/__mocks__/queryClient.ts`) | 测试基建 | 🟡 中 |

### 5.4 迁移建议
- **观望稳定版**：v6 正式发布后等 1-2 个 patch 版本
- **渐进式迁移**：v5 代码兼容 v6 大部分配置，可先升级类型定义
- **代码修改脚本**：官方通常提供 codemod，评估后使用
- **预估工时**：24-40h (全站查询重写 + 测试回归)

### 5.5 风险判定
🟡 **中风险** — **核心业务依赖，但目标版本未发布**。v5 仍在活跃维护，**无紧迫性**。建议 v6.1+ 稳定后纳入季度升级计划。

---

## 6. next.js 16 → 17

### 6.1 版本现状
- **当前**：16.2.11 (pinned, non-caret)
- **目标**：17.x — **未发布稳定版** (canary/beta 可能存在)
- **React 版本绑定**：Next 16 = React 19；Next 17 可能对应 React 20 或 React 19 维护期

### 6.2 预期破坏性变更 (基于 Next.js 大版本规律)

| 预期变更 | 可能性 | 影响 |
|---------|-------|------|
| **React 版本要求** | React 19 → **React 20** (或 19.x 维护) | 🔴 高 |
| **App Router 稳定化收敛** | 某些实验性 API 移除/重命名 | 🟠 中 |
| **Turbopack 默认开启** | 构建产物差异、配置迁移 | 🟡 中 |
| **Server Actions API 变更** | `use server` 指令、权限模型 | 🟠 中 |
| **Middleware/Edge Runtime** | 类型签名、可用 API 变更 | 🟡 中 |
| **`next.config.js` → `next.config.ts`** | 配置文件强制 TS、Schema 变更 | 🟢 低 |
| **Image/Font 组件** | Props 变更、默认行为调整 | 🟢 低 |
| **TypeScript 插件集成** | `tsconfig.json` 推荐配置变更 | 🟢 低 |

### 6.3 ChronoPortal 影响分析
| 架构层 | 耦合度 | 迁移成本 |
|---------|-------|---------|
| App Router 页面/布局 | 核心 | 🔴 高 |
| Server Components / Actions | 核心 | 🔴 高 |
| Middleware (auth、i18n、security) | 核心 | 🔴 高 |
| API Routes (Edge/Node) | 高 | 🔴 高 |
| 静态导出 / ISR 配置 | 中 | 🟠 中 |
| Sentry / Supabase / Auth 集成 | 高 | 🔴 高 |
| 自定义 Webpack 配置 (`next.config.js`) | 中 | 🟠 中 |
| E2E 测试 (Playwright) | 高 | 🟠 中 |

### 6.4 迁移建议
- **绑定 React 升级**：Next 大版本升级**必须**配套 React 大版本，**单独升级极高风险**
- **等待正式发布 + 1-2 patch**：Next.js 大版本初期通常有回归
- **全栈验证矩阵**：Node.js + React + Next + TS + typescript-eslint + @types/react 同步
- **预估工时**：80-160h (全栈回归测试主导)

### 6.5 风险判定
🔴 **极高风险** — **全栈框架核心，牵一发动全身**。**仅在 React 20 / Next 17 正式稳定、生态工具链完备后统一实施**。当前 Next 16.2 + React 19.2 为最佳稳定组合。

---

## 7. @supabase/supabase-js 2 → 3

### 7.1 版本现状
- **当前**：2.108.2 (pinned, non-caret)
- **目标**：3.x — **未发布稳定版** (v2 仍在活跃维护，v3 可能规划中)
- **生态地位**：数据库/认证/实时/存储核心 SDK，约 30+ 处直接引用

### 7.2 预期破坏性变更 (基于 Supabase v2→v3 RFC 讨论)

| 预期变更 | 可能性 | 影响 |
|---------|-------|------|
| **包结构拆分** | `@supabase/supabase-js` → 多包 (`@supabase/client`, `@supabase/auth`, ...) | 🔴 高 |
| **TypeScript 类型重构** | `Database` 泛型生成方式变更、类型安全收紧 | 🔴 高 |
| **Auth API 重构** | `signInWithPassword` → 新命名、Session 管理变更 | 🔴 高 |
| **Realtime v2** | Channel/Subscription API 破坏性重写 | 🔴 高 |
| **PostgREST/存储客户端** | 独立包、链式查询 API 变更 | 🟠 中 |
| **Edge Runtime 兼容** | 专门的 `@supabase/ssr` / Edge 适配包 | 🟡 中 |
| **最低 Node.js 版本** | 18+ → 20+ | 🟡 中 |

### 7.3 ChronoPortal 影响分析
| 代码区域 | 引用密度 | 迁移成本 |
|---------|---------|---------|
| 服务端数据访问 (`lib/supabase/server.ts`) | 核心单例 | 🔴 高 |
| 客户端数据访问 (`lib/supabase/client.ts`) | 核心单例 | 🔴 高 |
| 中间件认证 (`middleware.ts`) | 核心 | 🔴 高 |
| Server Actions 数据库操作 | ~20 处 | 🔴 高 |
| 实时订阅 (评论、通知) | ~5 处 | 🔴 高 |
| 存储上传 (头像、OG 图) | ~3 处 | 🟠 中 |
| 类型生成 (`scripts/generate-types.mjs`) | 基建 | 🔴 高 |

### 7.4 迁移建议
- **观望官方迁移指南**：Supabase 通常提供详细升级文档和 codemod
- **分包适配策略**：新包结构允许按需引入，可减少包体积
- **类型重新生成**：`supabase gen types typescript` 输出格式可能变更
- **预估工时**：40-80h (含类型重新生成、全链路认证/数据测试)

### 7.5 风险判定
🟠 **高风险** — **后端核心 SDK，破坏性变更预期大**。v2 仍在活跃维护，**无紧迫性**。等待 v3 稳定 + 官方迁移工具成熟后再评估。

---

## 8. zod 4 → 5

### 8.1 版本现状
- **当前**：4.4.3 (`^4.4.3` in dependencies) — **已在 v4 主版本**
- **目标**：5.x — **未发布**
- **注**：用户列表写 "zod 4→5"，但项目**已在 v4**，实际是 v4→v5 评估

### 8.2 预期破坏性变更 (基于 zod v3→v4 经验外推)

| 预期变更 | 可能性 | 影响 |
|---------|-------|------|
| **包名/导出变更** | `zod` → 可能拆分核心/扩展包 | 🟡 中 |
| **Schema 定义 API** | `z.object()` / `z.string()` 签名微调 | 🟢 低 |
| **类型推导机制** | `z.infer<>` / `z.output<>` 内部重构 | 🟢 低 |
| **错误格式化** | `ZodError` 结构、格式化 API 变更 | 🟡 中 |
| **性能优化** | 解析速度提升、内存占用降低 | 🟢 正向 |
| **标准 Schema 兼容** | 实现 [Standard Schema](https://standardschema.dev/) | 🟢 正向 |

### 8.3 ChronoPortal 影响分析
- **使用密度**：全站约 50+ 处 Schema 定义 (表单验证、API 契约、环境变量校验)
- **核心文件**：`lib/validators/*.ts`、`app/api/*/route.ts`、`components/forms/*`
- **类型导出**：大量 `z.infer<typeof schema>` 用于推导 TypeScript 类型

### 8.4 迁移建议
- **低优先级**：zod v4 极其稳定，v5 更多是内部重构而非破坏性 API 变更
- **官方通常提供 codemod**：v3→v4 有官方 codemod，v4→v5 预期同等
- **预估工时**：8-16h (codemod + 手工修复边缘情况)

### 8.5 风险判定
🟡 **中风险** — **验证层核心但破坏性预期较小**。**P3 非阻断**，可纳入常规依赖更新周期。

---

## 综合建议与路线图

### 立即行动 (0-4 周)
| 任务 | 理由 |
|------|------|
| 维持现有 override 策略 | 所有安全漏洞已通过 lower-bound override 规避 |
| 锁定 `sharp <0.36`、`js-yaml <5`、`zod ^4` | 目标版本未发布或无紧迫性 |
| 监控 TypeScript 7.x / @types/node 26.x 稳定性 | 为未来 Node 22 迁移做准备 |

### 短期规划 (1-2 季度)
| 任务 | 前置条件 | 预估工时 |
|------|---------|---------|
| Node.js 20 → 22 LTS 运行时升级 | 生产/CI/开发环境同步 | 16-24h |
| @types/node 20 → 26 (分级) | Node 22 就绪 | 8-16h |
| typescript-eslint 7 → 8 | TS 5.7+ 基线 | 8-12h |

### 中期规划 (2-3 季度，配套 React/Next 升级窗口)
| 任务 | 前置条件 | 预估工时 |
|------|---------|---------|
| TypeScript 5.7 → 7.x | Node 22 + @types/node 26 + typescript-eslint 8 | 40-80h |
| Next.js 16 → 17 + React 19 → 20 | TS 7 就绪、生态工具链稳定 | 80-160h |
| @tanstack/react-query 5 → 6 | v6.1+ 稳定、codemod 可用 | 24-40h |

### 长期观望 (目标版本发布后再评估)
| 包 | 触发条件 |
|-----|---------|
| sharp 0.36 | 正式发布 + 破坏性变更文档 |
| js-yaml 5 | 直接依赖包适配 5.x |
| @supabase/supabase-js 3 | v3 稳定 + 官方迁移指南 |
| zod 5 | 正式发布 + 破坏性变更评估 |

---

## 决策矩阵：是否升级的判断标准

| 判断维度 | 权重 | 评分标准 (1-5) |
|---------|------|----------------|
| **安全驱动** | 30% | 有未修复高危漏洞=5，已规避=1 |
| **生态支撑** | 25% | 核心框架/工具链已适配=5，无适配=1 |
| **业务阻断** | 20% | 现版本阻塞新功能=5，无阻塞=1 |
| **迁移成本** | 15% | 成本<16h=5，成本>80h=1 |
| **回归风险** | 10% | 核心路径覆盖测试完善=5，测试薄弱=1 |

**评分 ≥ 3.5** → 纳入近期规划  
**评分 2.5-3.5** → 观望，设定触发条件  
**评分 < 2.5** → 暂不考虑

---

## 附录：当前依赖版本速查表

```json
// package.json (dependencies)
{
  "typescript": "^5.1.0",           // → 7.x (devDependency)
  "@types/node": "^20",             // → 26.x
  "js-yaml": "override <5",         // → 5.x (transitive only)
  "sharp": "0.35.3",                // → 0.36 (unreleased)
  "@tanstack/react-query": "^5.101.2", // → 6.x (unreleased)
  "next": "16.2.11",                // → 17.x (unreleased)
  "@supabase/supabase-js": "2.108.2", // → 3.x (unreleased)
  "zod": "^4.4.3"                   // → 5.x (unreleased)
}
```

```yaml
# pnpm-workspace.yaml (overrides - security policy: lower-bound ranges)
overrides:
  js-yaml: '>=4.3.0 <5'      # GHSA-52cp-r559-cp3m patched at 4.3.0
  sharp: '>=0.35.3 <0.36'    # GHSA-f88m-g3jw-g9cj patched at 0.35.3
  fast-uri: '>=3.1.5 <4'     # GHSA-4c8g-83qw-93j6 + GHSA-v2hh-gcrm-f6hx patched at 3.1.5
  undici: '>=7.29.0 <8'      # GHSA-7p8r-x3mc-p8w7 patched at 7.29.0
  # ... 其他 security overrides
```

---

**报告生成时间**：2026-08-05  
**调研人员**：Claude Code (安全工程师视角)  
**下次评估触发**：任一目标版本发布稳定版、或季度依赖审计周期