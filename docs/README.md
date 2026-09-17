<!-- doc-template: project/docs-README v1 -->
# ChronoPortal · 文档索引

**先读顺序：**

| 顺序 | 文件 | 读完知道什么 |
| --- | --- | --- |
| 1 | [`PROJECT.md`](./PROJECT.md) | 这是什么、为谁做、用什么栈、怎样算验收通过 |
| 2 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 系统长什么样、模块边界在哪 |
| 3 | [`adr/`](./adr/) | 已经定过哪些事、为什么 |
| 4 | [`lessons/`](./lessons/) | 别人踩过哪些坑 |
| 5 | [`HANDOFF.md`](./HANDOFF.md) | 现在做到哪了 |

---

## 按目录

| 目录 | 放什么 | 维护方式 |
| --- | --- | --- |
| `adr/` | 架构决策记录 | 新增走 `new-adr.mjs` |
| `lessons/` | 经验与教训 | 新增走 `new-lesson.mjs` |
| `session/` | 会话三件套（**gitignore**） | `new-session.mjs` |
| `ops/` | 运维与排查证据卡，文件名带 `<仓前缀>-<主题>-<日期>` | 手工 |
| `design/` | 设计简报与视觉矩阵 | 手工 |
| `specs/` | 需求规格（动手前写） | `spec-driven-development` skill |
| `archive/` | 已归档的历史产物，**不再更新** | 只增不改 |

---

## 一条纪律

**只有当前维护的文档描述现行操作。** 日期型报告、`archive/` 下的文件、带月份后缀的 `ops/` 证据卡，都是**历史快照** —— 它们描述的是当时的状况，不是现在的要求。

判断依据：文件名里有日期 → 先当作历史读，再回 `PROJECT.md` / `ARCHITECTURE.md` 确认当前状态。
