# 会话过程态

本目录放**当前这次工作的过程记录**。**默认不进版本控制**（`.gitignore` 只放行本 README）。

| 文件 | 用途 | 进 git |
|------|------|--------|
| `task_plan.md` | 要做什么、拆成哪几步 | ✗ |
| `findings.md` | 过程中的原始快照 | ✗ |
| `progress.md` | 做到哪了 | ✗ |
| `README.md` | 本文件（说明约定） | ✓ |

## 为什么不进 git

三件套是**过程态**，不是交付物：

- 它们的价值在会话内，会话结束即衰减
- 每天一份快照会让 git 历史被过程文件淹没
- 读者是「同一会话的下一个 agent」，功能上等价于 `.planning/`

**要留的东西不在这里：**

| 有结论要留 | 去哪 |
|---|---|
| 可复用的经验 | `docs/lessons/`（`new-lesson.mjs`） |
| 跨会话的交接状态 | `docs/HANDOFF.md` |
| 当时做了什么排查 | `docs/ops/`（带日期，供追溯） |

从 `findings.md` 到 `docs/lessons/` 是一次**提炼**动作，不是复制改名。

## 归档

会话结束时若有价值，把结论提炼到上表对应位置，三件套**直接丢弃**或移到 `docs/archive/session-<日期>/`。

`new-session.mjs` 会校验本目录已在 `.gitignore` 里；已存在三件套时会拒绝覆盖并提示归档。

**规范：** `~/.claude/templates/project/SESSION.md`
