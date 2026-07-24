# CP revalidate tags · evidence · 2026-07-24

> **模块：** M-CP-revalidate-tags · **WEEK：** W6  
> **分支：** `xvyimu/cp-revalidate-tags`  
> **范围：** `lib/admin/revalidate*` · Admin 写后 revalidate 调用点 · 相关 tests · 本 evidence  
> **禁止已守：** push master · 去 webpack · 绕 RLS · 放宽 CSP · 生产 env · 乱扩公开 revalidate · 空口完成

## As-found

| 项 | 状态 |
|----|------|
| `revalidatePublicNavContent` | 一律 `revalidatePath("/")` + 可选 `/tool/:slug` + **总是** `/sitemap.xml` |
| 标签 CRUD | 与 link/category 同扫 sitemap（**多余**：sitemap 无 tag URL） |
| 公开页缓存 | path ISR only（home/tool `revalidate=60`，sitemap `3600`）；**无** `revalidateTag`/`unstable_cache` tag 契约 |
| 契约测 | `tests/admin-revalidate-public.test.ts` 仅 2 例（default + slug） |

## Decision

**不引入 `revalidateTag`。** 公开面尚无 cache tag 绑定；强行加 tag 会扩大公开 revalidate 面且无消费者。  
本刀做 **reason → path 矩阵**（仍 `revalidatePath`）：

| reason | `/` | `/tool/:slug` | `/sitemap.xml` |
|--------|-----|---------------|----------------|
| `link` | ✓ | slug 时 ✓ | ✓ |
| `category` | ✓ | — | ✓ |
| `tag` | ✓ | — | **—**（去掉多余 sitemap 扫） |

`resolvePublicNavRevalidatePaths` 纯函数导出，契约测锁定矩阵。

## Diff（最小）

| 文件 | 动作 |
|------|------|
| `lib/admin/revalidate-public.ts` | reason 类型 + `resolvePublicNavRevalidatePaths` + 按矩阵 `revalidatePath` |
| `app/api/admin/links/route.ts` · `[id]/route.ts` | `reason: "link"` |
| `app/api/admin/categories/route.ts` · `[id]/route.ts` | `reason: "category"` |
| `app/api/admin/tags/route.ts` · `[id]/route.ts` | `reason: "tag"` |
| `tests/admin-revalidate-public.test.ts` | 矩阵 + tag 不扫 sitemap 契约 |
| `docs/ops/cp-revalidate-tags-evidence-2026-07-24.md` | 本证据 |

**未改：** RLS · CSP · webpack · 生产 env · repository · 公开读路径。

## Verification

| 命令 | Exit | 结果 |
|------|-----:|------|
| `node_modules/.bin/vitest run tests/admin-revalidate-public.test.ts` | **0** | 1 file · **9/9 pass** |
| `node_modules/.bin/tsc --noEmit --incremental false` | **2** | **既有** `tests/probe-security-headers.test.ts` ProcessEnv 债（W5 范围）；**与本刀无关** · 本刀未触该文件 |
| `git diff --check` | **0** | 无 whitespace error |

注：本 wt 用 junction 复用 sibling `node_modules`（pnpm hook 会因 junction 尝试 purge；直接调 bin 验证）。

## Risk（一句）

低：仅 Admin 写后 path 失效范围收窄（tag 不再刷 sitemap）；若未来 sitemap 纳入 tag URL，须扩展矩阵并补测，勿静默恢复「一律扫」。

## Stop

DONE · in-review · feature push OK（不 push master）。
