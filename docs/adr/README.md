<!-- doc-template: project/adr-README v1 -->
# 架构决策记录（ADR）

本目录记录本产品已做出的**影响系统结构或框架特征**的重要决策。
格式：[MADR 4.0.0](https://adr.github.io/madr/)。规范：`~/.claude/templates/project/ADR.md`。

**命名：** `NNNN-<kebab-slug>.md`，4 位零填充。
**索引维护：** 新增 ADR 时**必须**在此表加一行（`new-adr.mjs` 会自动插入到正确位置）。

---

| ADR | 状态 | 决策 | 日期 |
| --- | --- | --- | --- |
| [0001](./0001-dual-db-merge.md) | accepted | 双库合并可行性评估 | 2026-06-23 |
| [0002](./0002-authjs-migration.md) | accepted | Auth.js canary → next-auth v5 beta 迁移评估 | 2026-06-24 |
| [0003](./0003-data-access-domain-modules.md) | proposed | 数据访问按域拆出 deep modules | 2026-07-05 |
| [0004](./0004-search-adapter-seam.md) | accepted | 搜索编排显式化 adapter seam | 2026-07-05 |
| [0005](./0005-netlify-deploy-wait-module.md) | accepted | Netlify 部署等待脚本加深为可测试 module | 2026-07-05 |
| [0006](./0006-repository-domain-modules-rollout.md) | accepted | Repository domain modules rollout | 2026-07-06 |
| [0007](./0007-navigation-state-and-information-architecture.md) | accepted | Navigation state and information architecture modules | 2026-07-06 |
| [0008](./0008-remote-embed-endpoint.md) | accepted | 远程 Embedding 端点（HTTPS + API Key） | 2026-07-11 |
| [0009](./0009-admin-frontend-backend-interface.md) | accepted | 管理后台前后端 interface 分离 | 2026-07-18 |
| [0010](./0010-next-auth-v5-strategy.md) | accepted | next-auth v5 beta 收口策略 | 2026-07-23 |

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
