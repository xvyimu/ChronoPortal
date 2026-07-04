# 发现与决策

## 需求
- 用户调用 `superpower`，需要用端到端研发流程推进 nav-site 下一阶段工作。
- 默认目标：性能 Phase 2 收尾，先解决文档状态与当前代码/提交历史不一致，再选择可量化优化点。

## 研究发现
- 项目根目录此前不存在 `task_plan.md`、`findings.md`、`progress.md`，因此本轮创建新的 Superpower 工作流文件。
- 当前 `git status --short` 为 clean。
- `docs/perf/findings.md` 是性能 Phase 2 的主要入口，顶部 H9/H10 仍写 "待提交"。
- `git log --grep` 显示 H9/H10 相关 commit 已存在：
  - `62261102 H9: sonner toast 动态 import 替代静态 import`
  - `bff0fed8 perf(H9+H10): CSS animations replace motion in ShortcutPanel/login/SubmitForm/Nav/Sidebar/LinkCard`
- 当前代码状态：
  - `components/ReviewSection.tsx` 已使用 `await import("sonner")`。
  - `components/ToasterWrapper.tsx` 通过 `dynamic(..., { ssr: false })` 懒加载 `components/ui/sonner`。
  - `components/ShortcutPanel.tsx`、`app/login/page.tsx`、`components/SubmitForm.tsx` 当前未命中 `motion/react` 运行时导入。
  - `lib/animations.ts` 仅有 `import { type Variants } from "motion/react"`，属于 type-only import。
  - `app/resources/_components/ResourceRating.tsx` 曾静态 `import { toast } from "sonner"`；本轮已改为提交路径内动态 import，并添加静态边界测试。

## 技术决策
| 决策 | 理由 |
|------|------|
| 第一项工作先修正文档状态 | H9/H10 已有历史 commit，文档仍写待提交，会误导后续 agent |
| 改 `ResourceRating.tsx` 为动态 toast import | 虽然不属于首页初始路径，但属于低风险 route-level 依赖瘦身，且可用静态测试防回退 |
| 下一项代码优化必须有 RED 测试或静态约束 | 遵守 Superpower 的 TDD 阶段要求 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 最新 handoff 查询返回较旧 Claude Code 状态 | 以当前 git 状态、`CLAUDE-HANDOFF.md` v11 和 `docs/PROGRESS.md` Phase 26 为准 |
| 第一次 RED 测试失败于 `import.meta.url` 不是 file URL | 改用 `join(process.cwd(), "...")` 读取源码文件后，失败原因变为预期的静态 sonner import |

## 资源
- `docs/perf/findings.md`
- `docs/perf/baseline-2026-06-29.md`
- `docs/superpowers/specs/2026-06-29-performance-optimization-design.md`
- `CLAUDE-HANDOFF.md`

## 视觉/浏览器发现
- 本轮尚未执行新的浏览器检查。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
