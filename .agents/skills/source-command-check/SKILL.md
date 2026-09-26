---
name: "source-command-check"
description: "Migrated source command `check`"
---

# source-command-check

Use this skill when the user asks to run the migrated source command `check`.

## Command Template

# /check — 提交前检查

在提交流程前执行。本目录是 `D:\projects\ChronoPortal`（pnpm + webpack 锁）。

## 流程

1. 读本仓 AGENTS.md「常用命令」「快速入口」。
2. 按顺序跑（任一失败→停，报告失败点 + 修复建议，不 commit）：
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - 若改动涉及安全面（CSP/RLS/鉴权）→ 加 `pnpm audit:security` 和 `pnpm probe:headers`
3. 全部通过 → 给一行摘要：改了哪些文件、覆盖什么、各门结果。
4. 最后给 commit 命令建议（commitlint 前缀 + 中文 body）。

## 不做
- 不自动 commit。
- 不跑 `build`（webpack 锁，留 /review 或手动）。
- 不碰 `db:reviews:*`（写 DB 需人确认）。
