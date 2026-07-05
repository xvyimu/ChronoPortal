# nav-site 架构升级建议（2026-07-05）

## 结论

优先顺序：

1. **Netlify 部署等待 module 加深**：先做，低风险，直接提升生产发布可诊断性。
2. **数据访问按域拆出 deep modules**：中期主线，先 ADR，后分批迁移。
3. **搜索编排 adapter seam 显式化**：搜索质量稳定后推进，避免隐式 mock 继续扩散。

## 候选 A：数据访问按域拆出 deep modules

**文件**
- `lib/repositories.ts`
- `tests/repositories.test.ts`
- 未来新增：`lib/repositories/links.ts`、`reviews.ts`、`admin.ts`、`favorites.ts`、`categories.ts`

**问题**
`lib/repositories.ts` 的 interface 过宽，implementation 混合了公开读取、admin 写入、评价隐私、标签可选迁移、收藏 RLS 绕过和提交/点击逻辑。

**方案**
保留 `lib/repositories.ts` 作为兼容 facade，逐步把实现迁移到按域 deep modules，并把 Supabase client 创建、错误转换、可选迁移降级策略收敛到共享 adapter。

**收益**
- locality：评价、收藏、标签问题各自集中
- leverage：页面/API 仍通过稳定 facade 调用
- interface 缩小：每个域只暴露业务动作
- tests hit one interface：各域测试更小

**推荐强度**
Strong。它是维护成本最大的长期结构问题，但一次性拆会影响面过大。

**ADR**
见 `docs/adr-003-data-access-domain-modules.md`。

## 候选 B：搜索编排 adapter seam 显式化

**文件**
- `lib/search/use-case.ts`
- `lib/search/semantic.ts`
- `lib/search/fuse.ts`
- `tests/search-use-case.test.ts`
- `tests/search-optimization.test.ts`

**问题**
`executeSearch` 已经是较深的 module，但依赖仍通过直接 import 和全局状态进入；测试需要 `vi.mock` 多个 module，seam 没有被 interface 命名。

**方案**
引入 `SearchAdapters` interface，把 pool、embedding、semantic RPC、logger、clock 作为 adapter 传入；生产使用默认 adapter，测试使用 in-memory adapter。

**收益**
- seam：生产 adapter 与测试 adapter 并存
- locality：fallback、超时、日志策略留在 use-case
- leverage：路由仍只调用 `executeSearch`
- implementation absorbs mocks：减少跨 module mock

**推荐强度**
Worth exploring。搜索近期刚完成 RRF 与阈值调整，应等质量基线稳定后再动。

**ADR**
见 `docs/adr-004-search-adapter-seam.md`。

## 候选 C：Netlify 部署等待 module 加深

**文件**
- `scripts/wait-netlify-deploy.mjs`
- `.github/workflows/ci.yml`
- 新增：`tests/wait-netlify-deploy.test.ts`

**问题**
脚本当前是浅 module：env 读取、HTTP、匹配规则、轮询、GitHub output 和 process exit 都在顶层；CI 出错时只能整体失败，不能单测匹配规则。

**方案**
把 deploy 匹配、summary、轮询核心抽成可导入函数，CLI 只负责读取 env、调用 `main()`、设置 exit code。

**收益**
- interface shrinks：CLI 只有 config -> wait
- locality：部署匹配 bug 集中在一个 module
- leverage：本地测试覆盖 CI 关键分支
- adapter：fetch/sleep/output/logger 可替换

**推荐强度**
Strong。本轮直接执行。

**ADR**
见 `docs/adr-005-netlify-deploy-wait-module.md`。

## 取舍矩阵

| 维度 | 候选 A：数据访问域 modules | 候选 B：搜索 adapters | 候选 C：Netlify wait module |
|------|---------------------------|-----------------------|-----------------------------|
| 实现复杂度 | 中高，需要分批迁移 facade 后面的 implementation | 中，需要小心保持搜索质量和日志语义 | 低，单脚本 + 单测试 |
| 运行风险 | 中，影响页面和 API 数据读取 | 中，影响搜索路径 | 低，仅 CI 部署等待 |
| 测试收益 | 高，仓储测试从巨型 MockDB 拆小 | 高，减少隐式 module mock | 高，CI 关键逻辑变成小测试 |
| 生产收益 | 中长期维护性提升 | 搜索稳定性和可诊断性提升 | 立即提升发布稳定性 |
| 推荐阶段 | 下一轮主线 | 搜索质量稳定后 | 本轮执行 |

## 下一步

本轮执行候选 C。完成后，下一轮建议从候选 A 开始，先拆 `reviews` 或 `favorites`，因为它们的隐私/RLS 语义最独立，最适合作为第一条 seam。
