# Visual Polish Phase 2 Design

> Date: 2026-07-04
> Status: Approved for spec, awaiting implementation approval
> Direction: Option B - mobile-first paper workspace polish
> Scope: Home visual density, paper surface primitives, mobile first viewport, header, mobile nav, search panel, cards

## 1. Background

Phase 25 completed the Shijiucode-inspired paper redesign. The current page already has the right baseline: warm paper background, low-saturation blue-gray accents, serif hero title, restrained cards, and a cleaner navigation product feel.

Browser review on 2026-07-04 found that the next quality gap is not a full redesign. It is visual density and hierarchy:

- Desktop at 1440 x 1100 looks coherent, but the hero still reads closer to a poster than a work surface.
- Mobile at 390 x 844 has a hero height of about 1126 px. The first results are not visible in the first viewport.
- The mobile bottom nav is present after hydration, but it overlaps the lower part of the hero statistics card in the first viewport.
- `nav-glass`, header, and mobile bottom nav still carry heavy shadow and glass-like semantics from the previous visual direction.
- The footer uses the paper background correctly. No white footer regression was observed.
- Port `7897` was already occupied by local processes and did not return the app page during review. Screenshots were taken with `localhost:3264`.

The goal of Phase 2 is to keep the current visual identity and make it feel more like a mature navigation workspace.

## 2. Goals

1. Make the mobile first viewport useful. Users should see the search control and a clear hint of the atlas/results flow without scrolling through a full poster.
2. Reduce remaining glass and floating-card weight. Paper surfaces should feel quiet, not glossy.
3. Keep desktop expressive but lower the hero height and visual drama slightly.
4. Preserve the existing search, category, favorites, preview, auth, data, and API behavior.
5. Keep the interface low-saturation, simple, artistic, and efficient.

## 3. Non-Goals

- Do not introduce new dependencies, animation libraries, font packages, or external image services.
- Do not change search ranking, semantic search, filters, database schema, auth, API routes, or Supabase access.
- Do not rebuild the information architecture.
- Do not create a landing page or marketing hero.
- Do not redesign dark mode in this phase. Only prevent obvious breakage if touched styles are shared.

## 4. Proposed Design

### 4.1 HomeHero

Current issue:

- Desktop hero is about 846 px tall at 1440 x 1100.
- Mobile hero is about 1126 px tall at 390 x 844.
- Mobile statistics and category pills push the atlas below the first viewport.

Target:

- Desktop hero should remain spacious but show more of the result grid sooner.
- Mobile hero should prioritize search and reduce supporting material.

Implementation direction:

- Reduce `HomeHero` mobile vertical padding and gap.
- Use a smaller mobile title scale and tighter title block rhythm.
- Keep the serif title, but make mobile line breaks less dominant.
- On mobile, make the statistics area compact:
  - Keep the three numbers.
  - Reduce padding and card height.
  - Limit or move category pills so they do not push the viewport past the results.
- Consider hiding the decorative bottom row on mobile.
- Keep the "探索图谱" action available, but make it less vertically expensive.

Acceptance:

- At 390 x 844, the first viewport should show the hero search and either the search experience panel top or the first result section beginning.
- The bottom nav should not cover essential hero content.
- No horizontal overflow at 320, 360, 390, or 430 px widths.

### 4.2 Paper Surface Primitive

Current issue:

- `.nav-glass` still names and styles surfaces as glass: blur, large shadow, and a high floating-card feel.

Target:

- A quiet paper panel primitive should replace the remaining glass feeling while preserving the existing class name temporarily if a broad rename would add risk.

Implementation direction:

- Soften `.nav-glass`:
  - Reduce `backdrop-filter`.
  - Reduce shadow size and opacity.
  - Lower border radius where it reads too plush.
  - Keep paper surface and border contrast.
- Optionally add a new class such as `.paper-panel` and map key surfaces to it only if the diff stays small.

Acceptance:

- Hero overview panel and search experience panel should feel printed or layered on paper, not glassy.
- Cards should remain distinct without needing heavy shadows.

### 4.3 Header

Current issue:

- Header is polished, but the large shadow competes with the paper style.

Target:

- Header should act like a calm fixed toolbar.

Implementation direction:

- Reduce toolbar shadow and blur.
- Keep border and paper surface.
- Maintain current navigation actions and theme toggle.

Acceptance:

- Header remains readable on hero and atlas backgrounds.
- No button text overflow.
- Keyboard focus remains clear.

### 4.4 Mobile Bottom Nav

Current issue:

- Mobile bottom nav is readable after hydration, but visually heavy and can cover first-viewport hero content.

Target:

- Bottom nav should be useful without dominating the screen.

Implementation direction:

- Reduce shadow intensity and vertical height if possible.
- Keep horizontal scrolling and safe-area support.
- Ensure the active tab remains clear with low-saturation color.
- Add enough bottom spacing near content sections so cards are not hidden behind the nav.

Acceptance:

- At 390 x 844, bottom nav does not cover hero metrics, search controls, or first visible result cards.
- At 320 px width, tab labels remain readable or wrap cleanly without page overflow.

### 4.5 SearchExperiencePanel

Current issue:

- On mobile, the panel can become a large chip cloud immediately after the hero.

Target:

- It should remain useful but not become the new first-screen bottleneck.

Implementation direction:

- Use tighter padding and gap on mobile.
- Reduce visible suggestion/facet count on narrow screens if needed.
- Keep query suggestions, categories, tags, rating, popularity, and clear filters behavior unchanged.

Acceptance:

- The panel remains scannable.
- Active filter states stay clear.
- No functionality is removed.

### 4.6 LinkCard And Result Grid

Current issue:

- Cards are already clean. Only minor surface tuning is needed.

Target:

- Preserve density and polish without adding decorative weight.

Implementation direction:

- Keep current one-column mobile and multi-column desktop layout.
- Fine-tune shadow, border color, and favicon container only if necessary after surface primitive changes.
- Do not change card actions, click tracking, favorites, preview, or search highlight.

Acceptance:

- Card title, domain, timestamp, favorite, and preview actions remain readable.
- Hover and focus states remain visible.
- No layout shift from favicon loading.

## 5. Implementation Order

1. Adjust global paper surface styles in `app/globals.css`.
2. Compact `components/HomeHero.tsx` for mobile first, then tune desktop height.
3. Tune `components/Header.tsx` and `components/MobileNav.tsx`.
4. Compact `components/SearchExperiencePanel.tsx` on narrow screens.
5. Make only minimal `LinkCard` or result grid tweaks if the new surfaces require it.
6. Run code validation.
7. Run visual validation in browser with desktop and mobile viewports.
8. Update progress or handoff notes if implementation proceeds.

## 6. Validation Plan

Code validation:

```powershell
rtk pnpm lint
rtk pnpm typecheck
rtk pnpm test
rtk pnpm build
```

Visual validation:

- Start the dev server using the project script unless port `7897` is intentionally made available.
- Desktop: 1440 x 1100.
- Mobile: 390 x 844.
- Narrow mobile checks: 320, 360, 390, 430 px.
- Check first viewport, atlas entry, search panel, result cards, mobile bottom nav, and footer.
- Use `localhost` rather than `127.0.0.1` during Next dev browser checks to avoid dev-origin hydration/HMR blocking.

Accessibility checks:

- Tab focus is visible on header controls, search, semantic toggle, pills, card actions, and mobile nav.
- Text does not overflow buttons or cards.
- Active states do not rely only on color.
- Reduced-motion mode still reaches visible states.

## 7. Risks And Rollback

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Mobile hero becomes too compressed | Medium | Keep title and search prominent; only reduce supporting material |
| Search panel loses discoverability | Medium | Preserve all controls and only reduce mobile density |
| Surface changes affect many components | Medium | Start from shared CSS, inspect affected surfaces before deeper edits |
| Visual snapshots change | Low | Update snapshots only after browser review confirms intended result |
| Dark mode shared styles regress | Medium | Check dark mode quickly where touched primitives are shared |

Rollback:

- The spec can be reverted independently.
- Implementation should be split into small commits or one tightly scoped commit.
- Since no data or API behavior is changed, rollback is limited to CSS and component layout changes.

## 8. Self-Review

- Marker scan: no unfinished section remains.
- Consistency check: goals, component plans, and validation all target mobile-first paper workspace polish.
- Scope check: the design is limited to visual density and presentation components.
- Ambiguity check: acceptance criteria define the key viewport expectations and non-goals exclude backend or search changes.
