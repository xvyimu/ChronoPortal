# Aupale-Inspired Visual Redesign

Status: Draft for implementation  
Date: 2026-06-28  
Reference: https://www.aupalevodka.com/en

## Goal

Bring the homepage of nav-site closer to the cinematic, premium rhythm of the Aupale reference site while preserving nav-site's core job: helping users find developer, AI, design, cloud, and operations tools quickly.

This is a visual and interaction direction, not a brand copy. We should borrow the reference site's structure and feeling, not its alcohol category, product copy, imagery, or assets.

## Reference Breakdown

Observed traits from the reference page:

- Full-viewport first screen with dark photographic motion as the dominant visual layer.
- Split navigation: left and right link clusters with a centered brand mark.
- Large serif display headline placed asymmetrically over the image.
- Small uppercase mono text for navigation, metadata, and secondary copy.
- Strong contrast between oversized emotional headline and tiny factual labels.
- Minimal primary actions: film/product/story/buy instead of many equal buttons.
- Scroll narrative built from short sections, not dense panels.
- Product detail appears as a focused overlay-like moment with structured facts.
- Mobile keeps the cinematic image, then compresses navigation into a pale floating bar.

## nav-site Adaptation

nav-site is not a beverage brand site. It is a tool-finding product, so the redesign must keep search, categories, facets, favorites, and cards usable.

Adaptation mapping:

| Aupale pattern | nav-site equivalent |
| --- | --- |
| Dark video hero | Generated glacial/aurora atlas image for tool discovery |
| Brand mark centered | "Nav Atlas" / existing site name centered in header |
| "Born From..." headline | "Find the signal in the tool wilderness" style message |
| Watch film tile | Compact stats tile: curated tools, categories, search modes |
| Product sections | Featured/latest/popular/category sections |
| Product detail overlay | Future quick-view drawer for tool details |
| Tiny uppercase copy | Section labels, metadata, facets, command hints |

## Product Principles

1. Search remains the main action. The hero exists to make the page feel memorable, not to hide the search box.
2. Keep density after the hero. The Aupale mood can frame the page, but tool cards must stay scannable.
3. Use one visual asset and restrained CSS effects. Avoid copying Aupale's images or building a heavy video dependency.
4. Preserve keyboard flow: `Ctrl/Meta+K`, category navigation, result focus, and visible focus rings.
5. Do not introduce new runtime services or animation libraries.
6. Do not make the homepage a pure landing page. It must remain the usable navigation app on first load.

## Visual Direction

Palette:

- Background: ink black with blue-green glacial tint.
- Foreground: soft white, mist gray, muted cyan-green accent.
- Surface: translucent dark glass for search, filters, and cards.
- Accent: restrained aurora green/cyan, used for focus and active state.

Typography:

- Keep Geist Sans and Geist Mono already configured.
- Add an editorial display class using system serif for the hero only.
- Do not scale type with viewport width. Use responsive Tailwind breakpoints and fixed rem sizes.

Layout:

- Header becomes a floating cinematic bar:
  - Desktop: left nav group, centered brand, right nav group.
  - Mobile: rounded light/dark glass bar with menu and key actions.
- Homepage hero sits above the current results:
  - Full-width immersive image background.
  - Asymmetric title lines.
  - Search dock embedded into the lower half of the hero.
  - Compact status tile for counts and shortcuts.
- Results area follows as the "atlas":
  - Existing sidebar remains on desktop but becomes more glass-like.
  - Cards get darker translucent surfaces on the homepage.
  - Section headings use mono labels and thin rules.

## Implementation Scope

Phase 1, this pass:

- Add a detailed project document.
- Add one local generated bitmap hero background under `public/visuals/`.
- Update `Header` to support the cinematic split/floating treatment.
- Update `Navigation` to render a new hero before the existing search/results flow.
- Update `SearchBar`, `Sidebar`, `LinkCard`, and result sections with darker glass treatment that still works in light/dark mode.
- Add global utility classes for the Aupale-inspired surface, grain, display type, and hero image.
- Verify desktop and mobile rendering with Playwright screenshots.

Phase 2, later:

- Add a tool quick-view drawer inspired by Aupale product fact overlays.
- Add scroll-triggered narrative bands for categories.
- Add optional motion refinement under `prefers-reduced-motion`.
- Add visual regression tests if this direction is accepted.

Out of scope:

- Copying Aupale images, copy, logo, or brand names.
- Adding alcohol/age-gate concepts.
- Replacing Supabase/search/data code.
- Adding a video dependency or a separate animation runtime.

## Component Plan

Files expected to change:

- `components/Header.tsx`
  - Convert sticky flat header to translucent floating bar.
  - Keep all existing links and auth actions.
- `components/Navigation.tsx`
  - Add hero summary derived from categories, links, rankings, and current search state.
  - Keep existing `useLinksFilter` behavior.
- `components/SearchBar.tsx`
  - Add a `variant` prop so the hero search can use a larger glass treatment while other pages can retain compact mode.
- `components/Sidebar.tsx`
  - Dark glass desktop rail, mobile overlay remains accessible.
- `components/LinkCard.tsx`
  - Keep favicon, favorite, click tracking, highlight, and explanation.
  - Upgrade surface and hover style.
- `components/CategorySection.tsx`, `components/DualTrackSection.tsx`, `components/SearchExperiencePanel.tsx`
  - Align headings and panels with cinematic mono labels.
- `app/globals.css`
  - Add scoped visual utilities and hero image classes.
- `public/visuals/nav-atlas-aurora.png`
  - Generated local bitmap asset.

## Acceptance Criteria

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- Relevant Vitest tests still pass:
  - `components/CategorySection.test.tsx`
  - `components/useLinksFilter.test.ts`
  - `lib/search-experience.test.ts`
- `pnpm build` passes.
- Playwright desktop and mobile screenshots show:
  - Nonblank hero image.
  - Header visible and not overlapping critical content.
  - Search visible in first viewport.
  - Tool cards visible after hero scroll.
  - No horizontal overflow at 390px and 1440px.
  - Focusable search input and primary header controls.

## Risks

- Too much brand styling could reduce tool-finding speed. Mitigation: keep search and results visible and preserve card density.
- Dark surfaces may hurt contrast. Mitigation: use AA-level text colors and inspect mobile screenshots.
- Header changes may affect auth/favorite controls. Mitigation: keep existing actions and test both mounted fallback and unauthenticated state.
- Generated image may feel generic. Mitigation: use it as atmosphere only; the product signal remains search and curated tools.
