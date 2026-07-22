# 生产安全头变更申请单 · 模板（ChronoPortal）

> **用途：** XFO / Referrer 等 **平台层 DRIFT** 或刻意平台策略时，操作人填单后人 gate。  
> **W3 状态：** 生产自定义域 DRIFT **仍在**；本会话 **未** 改 CF / Vercel Production / `next.config`。  
> 证据链：`headers-drift-trace-2026-07.md` · `headers-drift-platform-remediation-2026-07.md`

---

## 元数据

| 字段 | 填写 |
|------|------|
| 日期 | |
| 申请人 | |
| 批准人（人 gate） | |
| 关联 tip / deploy | |
| 目标 host | `https://yuanjia1314.ccwu.cc`（生产） |
| 关联 DRIFT | ☐ X-Frame-Options ☐ Referrer-Policy ☐ 其他：____ |

---

## 1. 现状证据（申请前粘贴）

```text
命令:
pnpm run probe:headers -- --base-url https://yuanjia1314.ccwu.cc --allow-production --compare-repo --json

（W3 基线 2026-07-23 摘要，可替换为新跑）:
X-Frame-Options     expected DENY                              actual SAMEORIGIN     match=false
Referrer-Policy     expected strict-origin-when-cross-origin   actual same-origin    match=false
X-Content-Type-Options / Permissions-Policy                    match=true
Server: cloudflare · x-vercel-* 仍在
/build-info.json commit: 46e71ec…（W3 只读）
```

Preview 分层证明（**必须**在网络可达时附上，否则不得改生产）：

```text
pnpm run probe:headers -- --base-url https://<preview>.vercel.app --compare-repo --json
# 推断: Preview match → 优先 CF；Preview 同 DRIFT → 优先 Vercel project headers
```

W3 agent 主机：Preview **仍不可达**（timeout）→ **本波不得填「已完成 P1」**。

---

## 2. 变更范围（只选一层）

| 层 | 计划动作 | 勾选 |
|----|----------|------|
| Cloudflare | 删除/收窄改写 XFO 或 Referrer 的 Transform / Managed Headers / Page Rules | ☐ |
| Vercel Project Headers | 删除与 repo 冲突的 project/env headers | ☐ |
| Next `next.config.ts` | **仅当** ADR 决定平台为 SSOT 并 **对齐合同**（模式 B） | ☐ |
| 同时多层 | **禁止** | ☒ 不允许 |

**推荐默认：** 模式 A — 平台停止改写，repo 合同（DENY + strict-origin-when-cross-origin）透出。

---

## 3. 回滚

| 步骤 | 内容 |
|------|------|
| 1 | 变更前：规则/UI **截图或导出** |
| 2 | 失败：还原同一层规则 |
| 3 | 验证：`probe:headers --allow-production --compare-repo` |
| 4 | 缓存：仅 owner 批准下 purge；W1/W2 已见 MISS 仍 DRIFT |

---

## 4. 验收

- [ ] `compare` 中 XFO 与 Referrer **match=true**，**或**  
- [ ] 模式 B：书面 ADR + matrix「已知例外」+ CI allowlist  
- [ ] **未**改生产 `CSP_DYNAMIC` / RLS  
- [ ] **未**与 CSP/RLS flip 无授权捆绑

---

## 5. 明确不在本单

- 生产 CSP_DYNAMIC / 去 unsafe-inline  
- 生产 RLS policy  
- 无 P1 证明的盲目 CF 清理  
- push 应用代码「假修」DRIFT（把 Next 改成 SAMEORIGIN 对齐 live）

---

## 6. 批准

| 角色 | 签名 | 日期 |
|------|------|------|
| 申请人 | | |
| 批准人 | | |
| 执行结果 | ☐ 成功 ☐ 回滚 ☐ 未执行 | |

**W3 Claude：** 模板已落库；**执行勾选全部未做。**
