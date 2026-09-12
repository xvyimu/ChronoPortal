# /review — 按本仓规范代码评审

对当前分支/最近一次 diff 做评审。红线与规范以本仓 `CLAUDE.md` + `docs/PROJECT.md` 为准。

## 流程

1. 先读本仓 `CLAUDE.md` + `docs/PROJECT.md`，列出红线清单。
2. 范围：默认评审 `git diff`（工作树）；若参数给了 commit/branch，用 `git diff <base>..<target>`。
3. 评审轴：
   - **红线**：不生产 CSP flip、不绕 RLS、不换框架、不未授权 push master
   - **规范**：Supabase 访问走 RLS、webpack 锁（禁去 webpack 无 ADR）、类型安全
   - **测试**：改动是否有对应测试；依赖升级是否做跨大版本风险评估
4. 输出：
   - 问题清单（按严重度排序，每条给 file:line）
   - 红线符合性结论
   - 是否建议合并（一句话理由）

## 不做
- 不改写业务代码。
- 不跑长构建（build/e2e 只在必要时抽查）。