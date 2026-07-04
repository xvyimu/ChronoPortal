# 任务计划：nav-site Superpower 性能收尾工作流

## 目标
用 Superpower 流程完成 nav-site 下一阶段性能收尾：先核对性能文档与 git 历史，再选择一个可量化、低风险的优化点，按测试/验证闭环交付。

## 当前阶段
完成

## 各阶段

### 阶段 1：上下文恢复与目标确认
- [x] 读取 Superpower 工作流说明
- [x] 读取 planning-with-files-zh 说明
- [x] 确认项目无既有 `task_plan.md` / `findings.md` / `progress.md`
- [x] 确认当前工作树 clean
- [x] 读取性能基线与假设追踪文档
- **状态：** complete

### 阶段 2：性能 Phase 2 状态核对
- [x] 核对 `docs/perf/findings.md` 中 H9/H10 的 "待提交" 是否已被历史 commit 覆盖
- [x] 核对当前代码中 sonner / motion / initial bundle 相关状态
- [x] 记录不一致项并修正文档
- **状态：** complete

### 阶段 3：选择下一项可量化优化
- [x] 从 Sentry residual、sonner route import、lucide imports、RSC 边界中选择一个低风险候选
- [x] 明确 before/after 指标与退出条件
- [x] 如涉及代码，先设计 RED 测试或静态回归测试
- **状态：** complete

### 阶段 4：TDD 实现
- [x] RED：写失败测试或静态约束测试并确认失败
- [x] GREEN：最小实现通过测试
- [x] REFACTOR：清理实现并保持测试绿色
- [x] 更新 `docs/perf/findings.md`
- **状态：** complete

### 阶段 5：验证与审查
- [x] 运行必要的 lint / typecheck / test / build
- [x] 用 review skill 做 Standards + Spec 双轴审查
- [x] 写 handoff checkpoint
- [x] 提交或交付给用户
- **状态：** complete

## 关键问题
1. H9/H10 的文档状态是否落后于 git 历史？
2. 当前最值得做的低风险性能项是文档同步、sonner 路由级懒加载、lucide 审查，还是 Sentry 残余体积评估？
3. 若进入代码实现，哪种测试能先失败并稳定防回退？

## 已做决策
| 决策 | 理由 |
|------|------|
| 默认下一阶段选择性能 Phase 2 收尾 | 最新 handoff 建议的下一目标之一，且已有 `docs/perf/findings.md` 可直接接手 |
| 先核对状态再实现 | 性能文档中存在 "待提交" 字样，但当前工作树 clean，可能是文档滞后 |
| 对代码改动坚持可量化 | 项目性能设计文档要求无 before/after 数据不修复 |
| 选择 ResourceRating sonner 动态导入作为本轮代码项 | 低风险、目标清晰，可用静态边界测试先失败再修复 |
| Toast 加载失败不影响评分状态 | 通知属于非关键路径，动态 chunk 失败不应回滚已成功的提交 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 无 | 0 | 无 |

## 备注
- 规划文件为本轮 Superpower 工作流状态，不包含密钥。
- 外部网页或搜索内容如后续使用，只写入 `findings.md`，不写入本文件。
- 做重大决策前重新读取本计划。
- Handoff checkpoint：`mem_20260704_190256_ac152f`。
