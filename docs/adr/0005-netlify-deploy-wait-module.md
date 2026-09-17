# ADR-005: Netlify 部署等待脚本加深为可测试 module

Status: Accepted
Date: 2026-07-05
Deciders: nav-site maintainers

## Context

当前 CI 的 deploy job 不再直接 `netlify deploy --prod`，而是把 `master` commit 同步到 Netlify 监听的 `main` 分支，再等待 Netlify Git deploy 完成。这个策略依赖 `scripts/wait-netlify-deploy.mjs` 正确识别目标 deploy。

脚本当前把 env 读取、Netlify API、部署匹配、轮询、GitHub output、`process.exit` 放在顶层。它能在 CI 中运行，但不能安全导入测试，也无法单测 created_at fallback、branch 过滤、失败态等关键规则。

## Decision

把 `scripts/wait-netlify-deploy.mjs` 加深为可导入 module：

- 纯函数：`candidateValues`、`matchesCommit`、`matchesBranch`、`matchesCreatedAfter`、`findMatchingDeploy`、`summarizeDeploy`
- orchestration：`waitForNetlifyDeploy({ config, fetchImpl, sleep, writeOutput, logger })`
- CLI：只负责从 `process.env` 构造 config，并把异常转为 exit code

## Considered Alternatives

- 维持顶层脚本，只靠 CI 验证：发布失败时反馈慢，且无法覆盖边界。
- 改回 Netlify CLI prod deploy：此前遇到 forbidden，不适合作为当前主线。
- 用 GitHub Actions marketplace action：会新增外部 action 依赖，仍需解决匹配和诊断。

## Consequences

- 正面：CI 关键逻辑有本地测试，失败态信息更明确，后续可扩展 deploy 诊断。
- 负面：脚本行数略增。
- 风险：CLI 行为必须保持兼容，尤其是 env 名称、轮询默认值、GitHub output 写入格式。

## Revisit triggers

- Netlify API 返回新的 commit 字段。
- CI 从 Git deploy 改回直接 deploy。
- 部署分支不再是 `main`，或仓库默认分支发生变化。
