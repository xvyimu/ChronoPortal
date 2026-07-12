# 导航站前端优化报告

**日期：** 2026-07-12  
**范围：** UI/UX 一致性、shadcn 组件体系、工程结构、性能边界、可访问性  
**约束：** 不改核心业务逻辑；不混入 embed / 向量检索脏改动；不自动 commit / push  

---

## 1. 结论摘要

本次将 nav-site 从「paper 视觉 + 少量自定义控件」推进到「paper 语义令牌 + shadcn/Radix 原语」双轨对齐：

| 维度 | 结果 |
|------|------|
| 设计系统 | 新建 10 个 UI 原语；light/dark paper 令牌与 shadcn CSS 变量绑定 |
| 组件迁移 | Header / SearchBar / LinkCard / ThemeToggle / NavSkeleton / Sidebar / ToolQuickView |
| 工程结构 | `Navigation` 表现层拆出 `AtlasWorkspace`；过滤逻辑仍在 `useLinksFilter` |
| 性能 | 保持 Phase 2 结论：首屏不回灌 motion；Dialog/Sheet 仅交互覆盖层 |
| 测试 | 相关组件单测 **38/38 通过** |
| 类型 | UI 路径 typecheck 干净；`tests/api-search.test.ts` never 错误为 **既有 embed 脏区**，未混修 |

**未提交。** UI 与 embed 工作区改动仍共存于 working tree，提交时请按路径拆分。

---

## 2. 背景与问题

优化前状态：

1. **shadcn 表面偏薄**：仅有 `sonner` / `interactive-surface` / `atlas-pill`，大量按钮、输入、弹层为手写 class。
2. **双轨色板风险**：paper 变量与 shadcn 语义色（`--primary` 等）未对齐，组件迁移易出现明暗主题断层。
3. **`cn()` 能力不足**：自定义拼接无法正确合并 Tailwind 冲突 class。
4. **`Navigation.tsx` 过重**：状态钩子 + 结果区渲染同文件，可读性与复用差。
5. **无障碍缺口**：自定义预览层 / 移动侧栏缺少稳定的 Dialog/Sheet 语义。

阻塞点：官方 `shadcn` CLI 因项目 `zod@4` 与 `@modelcontextprotocol/sdk` 导出冲突失败 → **改为手工安装 Radix peer + 手写 `components/ui/*`**。

---

## 3. 设计系统落地

### 3.1 令牌对齐（`app/globals.css`）

- light：`--background/--foreground/--primary/...` 绑定 `--paper-*`
- dark：同步校准 paper 与语义变量，避免 shadcn 组件在暗色下掉色
- 保留 paper 视觉语言（圆角、低饱和蓝灰、纸质表面），不换品牌气质

### 3.2 工具函数（`lib/utils.ts`）

```ts
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

`withTimeout` / `escapeJsonForHtml` 行为保持；后者用稳定写法避免 shell 转义损坏。

### 3.3 UI 原语清单（`components/ui/`）

| 文件 | 用途 | 备注 |
|------|------|------|
| `button.tsx` | 按钮 | variants: default/destructive/outline/secondary/ghost/link/**paper**/**accent**；sizes 含 icon-sm / icon-lg |
| `input.tsx` | 输入 | SearchBar 等复用 |
| `badge.tsx` | 标签 | featured / 搜索解释标签 |
| `skeleton.tsx` | 骨架 | NavSkeleton |
| `separator.tsx` | 分割线 | 侧栏/区块 |
| `tooltip.tsx` | 提示 | 收藏/预览；根级 `TooltipProvider` |
| `dialog.tsx` | 对话框 | ToolQuickView；显式 `aria-modal="true"`；`showCloseButton` |
| `sheet.tsx` | 抽屉 | 移动端 Sidebar |
| `tabs.tsx` | 标签页 | 预留 |
| `dropdown-menu.tsx` | 下拉 | 预留 / 后续 Header 菜单 |

**依赖新增（package.json）：**

- `clsx` / `tailwind-merge` / `class-variance-authority`
- `@radix-ui/react-dialog` / `dropdown-menu` / `label` / `separator` / `slot` / `tabs` / `tooltip`

未引入多余 UI 库；未把 motion 拉回首屏热路径。

---

## 4. 组件迁移明细

| 组件 | 变更要点 |
|------|----------|
| **Providers** | 包一层 `TooltipProvider delayDuration={300}` |
| **Header** | 原生 button → `Button`；计数 → `Badge` |
| **SearchBar** | 输入 → `Input`；动作 → `Button` |
| **LinkCard** | 收藏/预览 → `Button` + `Tooltip`；荐标 → `Badge` |
| **ThemeToggle** | `Button` ghost icon |
| **NavSkeleton** | `Skeleton` 替代手写 pulse div |
| **Sidebar** | 移动端 → `Sheet`（side=left）；桌面 sticky aside 结构不变 |
| **ToolQuickView** | 自定义层 → `Dialog`；`link==null` 仍 `return null`；关闭按钮 `aria-label="关闭工具预览"`；`showCloseButton={false}` 避免双关闭 |
| **Navigation** | 结果区抽到 `components/navigation/AtlasWorkspace.tsx`；钩子与预览状态仍在 Navigation |

业务行为（搜索/筛选/收藏/点击统计/语义搜索）未改接口语义。

---

## 5. 工程结构

```
components/
  Navigation.tsx              # 状态编排 + 布局壳
  navigation/
    AtlasWorkspace.tsx        # 搜索体验面板 + 结果区 + 空态
  ui/                         # 设计系统原语
```

- **过滤/键盘/派生数据**：仍在 `useLinksFilter` 及其拆分 hooks（既有结构）
- **表现层**：AtlasWorkspace 只接收 props，不直接碰数据源
- **键盘类型**：`handleResultKeyDown: (e: KeyboardEvent<HTMLElement>, index: number) => void`，消除 HTMLElement 与 Element 不兼容

---

## 6. 可访问性（WCAG AA 基础）

| 项 | 处理 |
|----|------|
| 焦点环 | Button 统一 `focus-visible:ring-2 ring-ring` |
| Dialog | `role="dialog"` + `aria-modal="true"` + Title/Description |
| Sheet | Radix 侧栏语义 + 标题 |
| Tooltip | 触发器保留 `aria-label`（收藏/预览） |
| 关闭控件 | 明确中文 `aria-label` |
| 实时区 | 结果公告 `role="status" aria-live="polite"` 保留 |

---

## 7. 性能边界

延续 Phase 2（见 `docs/perf/*` 与历史 handoff）：

1. **不把 motion 重新打进首屏主 chunk**
2. Dialog / Sheet 仅在打开交互时进入体验路径；MobileNav 仍 `dynamic(..., { ssr: false })`
3. LinkCard `memo` 与稳定 `openPreview` / `closePreview` 回调保留
4. 本次未做新的 bundle 体积基准；若需对比，建议：
   ```bash
   pnpm analyze
   # 对比首屏 JS 与 dialog/sheet 是否被错误静态拉入首页关键
   ```

---

## 8. 测试与验证

### 已跑

```bash
# 组件相关
pnpm exec vitest run components
# → Test Files 5 passed / Tests 38 passed
```

覆盖：

- `LinkCard`（含 TooltipProvider 包装）
- `CategorySection`（含 TooltipProvider 包装）
- `ToolQuickView`（含 aria-modal）
- `useLinksFilter`
- `ResourceRating`（顺带纳入 components 目录扫描）

### 已知非本次问题

| 项 | 说明 |
|----|------|
| `tests/api-search.test.ts` TS2322 never | embed/语义搜索脏区；与 UI 提交应隔离 |
| 工作区其它 embed 文件 | `lib/embedding-runtime.ts`、`scripts/embed-server.py`、`workers/` 等 **不要** 与 UI 同 commit |

### 建议提交前自检

```bash
# 仅 UI 相关单测
pnpm exec vitest run components

# 类型（会撞上既有 api-search 错误；UI 文件本身应无新增）
pnpm typecheck

# 可选：lint / e2e 冒烟
pnpm lint
pnpm e2e --grep "ToolQuickView|search|navigation"   # 若有对应用例
```

---

## 9. 组件使用约定（后续开发）

### 按钮

```tsx
import { Button } from "@/components/ui/button";

<Button variant="paper">次要</Button>
<Button variant="accent">主行动</Button>
<Button variant="ghost" size="icon-sm" aria-label="...">...</Button>
```

- 纸质次级操作优先 `paper` / `outline` / `ghost`
- 品牌主 CTA 用 `accent` 或 `default`（已绑 paper-accent）

### 浮层

```tsx
// 应用根已有 TooltipProvider（Providers）
// 单测需本地包一层：
render(<TooltipProvider>{ui}</TooltipProvider>);
```

- 模态：`Dialog`；侧滑：`Sheet`
- 自定义关闭时设 `showCloseButton={false}`，自管 `DialogClose` + 明确 `aria-label`

### class 合并

一律 `cn(...)`，禁止手写字符串拼接覆盖 Tailwind。

### 新业务组件

1. 先查 `components/ui/*` 是否已有原语  
2. 视觉优先 paper 变量，其次 shadcn 语义色  
3. 不在首屏路径静态 import 重型 overlay（必要时 dynamic）

---

## 10. 回滚策略

| 层级 | 做法 |
|------|------|
| 整包 UI | `git checkout -- components app/globals.css lib/utils.ts package.json pnpm-lock.yaml`（**勿**误还原 embed 文件若需保留） |
| 单组件 | 按文件 checkout 对应 `components/*.tsx` |
| 依赖 | 还原 `package.json` + `pnpm-lock.yaml` 后 `pnpm install` |

建议拆 commit 示例：

1. `chore(ui): add shadcn primitives + cn/tokens`
2. `refactor(ui): migrate Header/SearchBar/LinkCard/...`
3. `refactor(nav): extract AtlasWorkspace`
4. `test(ui): TooltipProvider + Dialog aria-modal`

**不要**与 embed / fly / workers 同批。

---

## 11. 后续可选（未做）

1. Header 用户菜单迁到 `DropdownMenu`（原语已就绪）
2. Tabs 用于资源库/管理后台分段
3. 正式 Lighthouse / bundle 对比基线入库 `docs/perf/`
4. 将 `TooltipProvider` 写入 vitest setup 全局，减少单测样板
5. 清理 `tests/api-search.test.ts` never（属 embed 线）

---

## 12. 文件索引（本次 UI 主路径）

**新增**

- `components/ui/{button,input,badge,skeleton,separator,tooltip,dialog,sheet,tabs,dropdown-menu}.tsx`
- `components/navigation/AtlasWorkspace.tsx`
- `docs/frontend-optimization-report-2026-07-12.md`（本文件）

**修改（UI）**

- `app/globals.css`
- `lib/utils.ts`
- `components/{Header,SearchBar,LinkCard,ThemeToggle,NavSkeleton,Sidebar,ToolQuickView,Navigation,Providers}.tsx`
- `components/{LinkCard,CategorySection,ToolQuickView}.test.tsx`
- `package.json` / `pnpm-lock.yaml`

**故意未纳入本次语义**

- embed runtime / health / resource-search-status / fly / workers 等

---

## 13. 验收清单

- [x] paper 视觉保留，语义令牌对齐
- [x] shadcn 风格原语可用（CLI 阻塞已绕过）
- [x] 核心导航组件迁移完成
- [x] Navigation 表现层拆分
- [x] Dialog/Sheet a11y 基础属性
- [x] 相关单测全绿（38）
- [x] UI 路径 eslint 绿（`input` empty-interface 已改为 type alias）
- [x] 优化报告落盘
- [ ] 用户确认后拆分 commit（未自动提交）
- [ ] 生产部署（未执行）
