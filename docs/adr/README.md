<!-- doc-template: project/adr-README v1 -->
# 架构决策记录（ADR）

本目录记录本产品已做出的**影响系统结构或框架特征**的重要决策。
格式：[MADR 4.0.0](https://adr.github.io/madr/)。规范：`~/.claude/templates/project/ADR.md`。

**命名：** `NNNN-<kebab-slug>.md`，4 位零填充。
**索引维护：** 新增 ADR 时**必须**在此表加一行（`new-adr.mjs` 会自动插入到正确位置）。

---

| ADR | 状态 | 决策 | 日期 |
| --- | --- | --- | --- |
| [{{NNNN}}](./{{NNNN}}-{{slug}}.md) | {{status}} | {{一句话}} | {{YYYY-MM-DD}} |

---

## 状态含义

| 状态 | 含义 |
| --- | --- |
| `proposed` | 已提出，未定 |
| `accepted` | 已采纳，当前有效 |
| `rejected` | 已否决（保留供追溯） |
| `deprecated` | 不再推荐，但未正式替代 |
| `superseded by ADR-NNNN` | 已被某条替代（**必须写出编号**） |

## 校验

`audit-docs.mjs` 的 D7 检查：索引行数 == 目录 `.md` 数 − 1（减掉本文件），且编号无重复、状态值在枚举内。
