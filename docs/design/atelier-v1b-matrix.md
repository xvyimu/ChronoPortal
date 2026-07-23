# V1b · ChronoPortal × Atelier 差异矩阵

**日期：** 2026-07-23  
**仓 tip 基线：** `d7840648`（实现前 master）  
**强度：** **A0/A1 only**（无 A2 霓虹 / 无 default-on glass / 无 dual-primary 换品牌）  
**SSOT：** `D:\orca\.planning\portfolio-visual-fluent-glass-2026-07-23\atelier-token-ssot.md`  
**Pattern：** Chronicle V1a · `docs/design/atelier-v1a-matrix.md`  
**栈：** Next 16 · React 19 · Tailwind v4 · shadcn · `app/globals.css`（**不换栈**）

---

## Design Read

> 导航图谱门户 · Paper + 蓝灰 accent（`#5f84b2`）· 保留 paper 品牌身份 · 对齐 Atelier **半径 / chrome blur / 间距纪律 / 克制顶轨**，非 MindSync shell 克隆。

| Dial     | 值                                    |
| -------- | ------------------------------------- |
| VARIANCE | 5                                     |
| MOTION   | 3（沿用现有动画 + reduced-motion）    |
| DENSITY  | 4–5                                   |

---

## 1. 现状 vs 目标

| 维          | ChronoPortal 现状                         | Atelier SSOT          | V1b 裁决                                                                 |
| ----------- | ----------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| 品牌主色    | `--paper-accent` `#5f84b2` → `--primary`  | CTA 橙 `#f97316`      | **保留 paper-accent 为交互主色**；橙仅 `--cta` 附加                      |
| 画布        | 暖纸 `#f8f6f2` / surface `#fffdfa`        | 冷灰 slate 系         | **保留纸感**（产品身份）                                                 |
| 主字        | `--paper-ink` `#3d4a5a`                   | slate ink             | 保留；对比已达标                                                         |
| 间距        | 大量 Tailwind 任意 gap                    | **仅** 4/8/16/24/32   | 新 CSS 用合法阶；**不**大面积改现有 utility                              |
| 圆角        | `--radius: 0.75rem`（12）· 卡 12–16+      | 8 / 4                 | **收到** control **4** · card/panel **8**；`--radius-lg/xl` 本波亦 **8** |
| Header 霜   | `backdrop-blur-md` / sm                   | chrome ≤12            | **token** `--atelier-panel-blur: 12px`                                   |
| `.nav-glass`| blur 8 · radius 1rem                      | ≤12 · 8               | blur 走 token；radius **8**                                              |
| Admin panel | radius 12 / icon 6                        | 8 / 4                 | panel **8** · icon **4**                                                 |
| 顶轨签名    | 无                                        | 2–3px brand 轨        | Header 内条 `.cp-chrome-rail` · paper-accent 渐变（非彩虹）              |
| 字体        | `.nav-display` Noto Serif SC              | 系统/IBM              | **保留** serif 展示（门户身份）                                          |
| 按钮形状    | shadcn pill `rounded-full`                | chip/FAB 可 pill      | **KEEP** pill                                                            |
| 动效        | fade/slide + reduced-motion               | A0/A1                 | 不升级 A2                                                                |
| CSP / proxy | 独立议程                                  | —                     | **本波零改**                                                             |

---

## 2. 本波文件范围

| 做 | 不做 |
| -- | ---- |
| `app/globals.css` 半径 + Atelier 附加令牌 + nav-glass/admin + rail 类 | 换框架 / 换品牌主色为橙 |
| `components/Header.tsx` 圆角 + token blur + rail | 重写 nav IA |
| 高流量壳层：`LinkCard` / `SearchExperiencePanel` / `MobileNav` / `Sidebar` / hero 面板半径与 >12 blur | 全树 `rounded-*` 审计 |
| `docs/design/atelier-v1b-matrix.md`（本文件） | 生产 env · CSP_DYNAMIC · RLS |
| — | A2 snippets / glassShell 默认开 / dual-primary neon |

---

## 3. 令牌决策摘要

```css
--radius: 8px;
--radius-sm: 4px;   /* controls */
--radius-md: 8px;   /* cards / panels */
--radius-lg: 8px;   /* 本波不恢复 16–24 默认卡面 */
--radius-xl: 8px;
--cta / --cta-ink / --cta-soft  /* 附加；默认 Button 仍 primary */
--atelier-panel-blur: 12px
--atelier-rail: 3px
/* Spacing legal (new CSS): 4 / 8 / 16 / 24 / 32 */
```

Dark：`--cta` 共享；`--cta-ink: #ffedd5` 提升可读；**不**把 `--paper-accent` 改成橙。

---

## 4. 验收

- [ ] `pnpm typecheck` exit 0
- [ ] `pnpm test` exit 0
- [ ] 视觉：圆角更利落、顶栏更清晰；paper + 蓝灰仍在
- [ ] Header / `.nav-glass` blur ≤ 12px
- [ ] 无 CSP/proxy/security-header 生产逻辑 diff
- [ ] 无 A2 / default-on glass flag

---

## 5. 回滚

```text
git checkout HEAD -- app/globals.css components/Header.tsx \
  components/LinkCard.tsx components/SearchExperiencePanel.tsx \
  components/MobileNav.tsx components/Sidebar.tsx \
  components/HomeHero.tsx components/SearchBar.tsx
rm docs/design/atelier-v1b-matrix.md
```

或单 commit revert。

---

## 6. 后续（非本波）

- A2 intensity flag / radical snippets
- 全组件 `rounded-2xl` 审计
- Homepage IA redesign
- CSP_DYNAMIC 生产 canary（独立 ops）
- CTA 实际接到稀有按钮（本波只定义令牌）
