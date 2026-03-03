# Project Research Summary

**Project:** BTS Army Feed v3.0 — Immersive Feed Experience
**Domain:** TikTok-style vertical snap feed with sort/filter controls, content virtualization, and config-driven theming
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

This milestone converts the existing BTS fan content aggregation PWA from a list/swipe view into a full-screen vertical snap feed — the same interaction model used by TikTok, YouTube Shorts, and Instagram Reels, but applied to mixed content types (video, image, text, news) and extended with explicit sort/filter controls. The research is anchored to the actual codebase: the existing `SwipeFeed.tsx` already uses IntersectionObserver + CSS scroll-snap + video autoplay patterns that directly transfer to the new architecture. The core recommendation is CSS `scroll-snap-type: y mandatory` for scroll physics (native, 60fps, compositor-threaded), `motion` for card entry/exit animations, `useReducer` + `useSearchParams` for filter/sort state with URL sync, and a hand-rolled 3-item DOM window for virtualization instead of TanStack Virtual (which has a documented incompatibility with CSS scroll-snap).

The recommended implementation order is: define the API contract and shared types first, then build the snap feed container and card components, then layer in sort/filter controls, then add polish (animations, auto-hide, haptics). This order matters because the sort API endpoint must exist before the sort UI can be correctly tested — client-side sorting on paginated data produces wrong results and should never be used as a placeholder. The feature flag (`feedMode: 'snap' | 'list'`) should be implemented in Phase 1 as insurance; the old `SwipeFeed.tsx` should not be deleted until the snap feed is verified on physical iOS and Android devices.

The two highest-risk areas are: (1) iframe lifecycle management during virtualization — each TikTok embed costs ~15MB of bandwidth and must never auto-mount, YouTube embeds should exist in the adjacent slot only as thumbnails, and at most ONE iframe should be in the DOM at any time; (2) the Framer Motion + CSS scroll-snap rendering conflict, which produces cross-browser flickering if Motion is used for the scroll container itself. Motion must be limited to content animations within cards, not the scroll physics layer.

## Key Findings

### Recommended Stack

The existing stack (React 19, Vite 7, TypeScript, Fastify, SQLite/Drizzle, PWA) requires only two new frontend dependencies: `motion@^12.34.3` (the renamed successor to `framer-motion`, same API, React 19 confirmed) and `zustand@^5.0.11` (1.16KB, selector-based subscriptions prevent re-render cascades). No virtualization library is needed — TanStack Virtual and react-window both conflict with CSS scroll-snap. No theming library is needed — CSS custom properties already in use via `applyTheme.ts`, extended with a new `tokens` object in `ThemeConfig`. No additional state library beyond React's built-in `useReducer` is needed for the primary state management approach.

**Core technologies:**
- `CSS scroll-snap-type: y mandatory` — snap scroll physics, native compositor-threaded, zero JS — browsers do this better than any library
- `motion@^12.34.3` — card entry/exit animations, `AnimatePresence`, `useScroll` for progress indicator — NOT for scroll physics
- `useReducer` + `useSearchParams` in `useFeedState` hook — global filter/sort state with URL sync, no external library needed for page-local state
- Manual 3-item DOM window with IntersectionObserver — virtualization without library conflict, proven pattern already in `SwipeFeed.tsx`
- `100svh` (small viewport height) — stable mobile height unit, no layout jumps when address bar animates; `100dvh` causes snap jitter on iOS

**What NOT to add:** TanStack Virtual (scroll-snap conflict documented in GitHub issue #478), react-window (unmaintained + conflict), framer-motion (use `motion` instead), styled-components, Redux, @tanstack/react-query for UI state, React Context for filter state (re-renders all consumers).

### Expected Features

The feed must deliver the TikTok/Shorts interaction model while adding user controls that no major short-form platform provides. All major filter/sort capabilities are largely already implemented in the current codebase — the work is architectural reorganization plus new presentation.

**Must have (v3.0 core — table stakes):**
- Full-viewport vertical snap scrolling — core TikTok/Shorts pattern, missing this breaks the immersive contract
- Current item detection via IntersectionObserver — foundation for video autoplay, virtualization, position tracking
- Adaptive card layouts (3 variants: video, image, text) — content types differ too much for a single layout
- Unified sort/filter control bar — replaces the current 3-row stacked filter UI
- Sort options: Recommended, Newest, Most Popular, Most Discussed — all require server-side sort API endpoint
- 3-item virtualized DOM window — prevents iframe memory explosion on mobile
- Collapsed text with "See More" modal — mandatory snap requires content bounded to card height
- Engagement stats overlay — right-side vertical bar matching platform conventions
- Loading/empty states — full-viewport skeleton and filtered-empty feedback

**Should have (v3.x — polish, add after core works):**
- `motion` card entrance/exit animations — polish layer on top of working snap feed
- Auto-hide control bar on scroll-down — maximize immersive space
- Config feature flag (`feedMode: 'snap' | 'list'`) — white-label flexibility
- Haptic feedback on snap (`navigator.vibrate(10)`) — Android-only, negligible code
- Global filter/sort state persistence to localStorage
- Web Share API on each card

**Defer (v4+):**
- Extended theming tokens (full semantic + component token system)
- Gesture-based quick filters (long-press)
- Content preview expansion to detail view
- Preload optimization for next 3 thumbnail images

**Anti-features to avoid:** Framer Motion drag navigation (conflicts with native scroll), infinite scroll auto-fetch (wrong model for snap), pull-to-refresh (conflicts with overscroll), horizontal swipe actions (conflicts with browser back/forward), dark/light mode toggle (doubles CSS surface area, app is dark-first).

### Architecture Approach

The existing `News.tsx` page owns all state and renders either SwipeFeed or a card list. The v3.0 architecture lifts filter/sort state into a `useFeedState` hook (`useReducer` + `useSearchParams` for URL sync), introduces a new `SnapFeed` component tree, and absorbs the separate `FeedFilter` and `BiasFilter` components into a unified `FeedControlBar`. The FeedControlBar sits as a sibling ABOVE the SnapFeed — not inside the scroll container — so it stays visible during scrolling. The existing `useFeed` hook gains a `loadMore`/`hasMore` interface and accepts the full `FeedState` object.

**Build order (dependency-aware):**
1. Shared types (`SortMode`, `FeedQuery`) + server sort endpoint — API contract must exist before sort UI
2. `useFeedState` hook + modified `useFeed` — state foundation before components
3. `SnapSlide`, `CardMedia`, `CardOverlay`, `CardActions`, `SnapCard` — leaf-to-root build order
4. `SnapFeed` — assembles components, owns virtualization and IntersectionObserver
5. `SortSelector`, `FeedControlBar` — controls layer
6. `FeedPage` rewrite — wires everything together
7. Polish: CSS, VideoEmbed `isActive` prop, feature flags, theme tokens, Motion animations

**Major components (8 new, 4 modified, 2 deprecated):**
1. `SnapFeed` — scroll-snap container, 3-item virtualization, IO-based index tracking
2. `SnapSlide` — 100svh slide wrapper with snap alignment
3. `SnapCard` — full-screen card layout (media ~60%, overlay ~40%)
4. `CardMedia` — video/image/placeholder rendering, iframe lifecycle control
5. `CardOverlay` — gradient overlay with source badge, title, truncated text, stats
6. `CardActions` — source link icon, share button
7. `FeedControlBar` — collapsible sort/filter bar, sibling above SnapFeed
8. `useFeedState` — useReducer + useSearchParams, replaces scattered useState in News.tsx

**Deprecated:** `SwipeFeed.tsx` (replaced by SnapFeed), inline content type pills in News.tsx (absorbed into FeedControlBar). Do not delete until snap feed is device-verified.

### Critical Pitfalls

1. **Framer Motion + CSS scroll-snap = cross-browser flickering** — Use CSS scroll-snap for scroll physics ONLY. Use Motion only for card content animations (entry, exit, overlays), never on the scroll container. Confirmed in Framer Motion GitHub issues #2315 and #342. Test on Chrome AND iOS Safari before committing to any approach. (Phase 1)

2. **100vh on mobile includes hidden browser chrome** — Use `height: 100svh` (small viewport height) with `100vh` fallback. Never `100dvh` for snap cards — it resizes during address bar animation and causes snap jitter on iOS. `100dvh` has a 2025 regression on iOS Safari (Apple Developer Forums). (Phase 1)

3. **Iframe destroy/recreate on virtualization causes bandwidth explosion** — At most ONE iframe in the DOM at any time. TikTok embeds NEVER auto-mount — tap-to-load facade only (~15MB per auto-load). YouTube adjacent slot shows thumbnail, not iframe. Extend `VideoEmbed.tsx` with a `thumbnailOnly` mode. (Phase 2)

4. **Sort must be server-side, not client-side** — Sorting 20 paginated recommended items client-side produces wrong results (subset != full dataset). The sort API endpoint (`?sort=newest|popular|discussed`) must be built before shipping sort UI. Cache per sort mode with sort-specific localStorage keys. (Phase 1 API contract)

5. **Scroll position lost on filter change** — Store current item ID (not array index) in state. On filter apply, find the saved item in the filtered array and scroll to it. "See More" must open a modal/drawer overlay, NOT expand content in-place (in-place expansion changes card height, breaking mandatory snap). (Phase 1 design)

6. **Removing old views without rollback** — Implement `feedMode` feature flag FIRST. Build SnapFeed as a NEW component alongside SwipeFeed. Only delete SwipeFeed after snap feed is verified on physical devices. (Phase 1)

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation, API Contract, and Feature Flag

**Rationale:** Everything downstream depends on the API sort contract and shared type definitions. State management architecture must be decided before any UI is built. Feature flags enable safe parallel development and preserve rollback. Card layout constraints (max heights, "See More" as modal) must be designed before component build begins. Sort API endpoint must exist before sort UI can be correctly tested.
**Delivers:** Shared types, server sort endpoint, `useFeedState` hook, updated `useFeed` with loadMore/hasMore, `feedMode` feature flag routing, and card dimension constraint decisions
**Addresses:** Sort options (API contract), filter state management, feature flag for snap vs list mode
**Avoids:** Client-side sort mistake (Pitfall 9 in PITFALLS.md), scroll position loss (Pitfall 4), no rollback path (Pitfall 7), Context re-render cascade (Pitfall 5)
**Includes:**
- `SortMode` type in shared package, `sort` query param on `GET /api/feed` with 5 sort strategies
- `useFeedState` hook (useReducer + useSearchParams, URL-synced)
- `useFeed` updated to accept FeedState + loadMore/hasMore + sort-keyed localStorage cache
- `feedMode` config feature flag in GroupConfig
- Card dimension rules stubbed in CSS (100svh, content height caps per content type)

### Phase 2: Snap Feed Core

**Rationale:** The snap feed container and card components are the core deliverable. Build leaf-to-root (CardMedia before SnapCard before SnapFeed) to isolate dependencies. The virtualization strategy (3-item window with iframe lifecycle) is the technical centerpiece and needs full attention before adding controls on top. CSS scroll-snap and IntersectionObserver patterns transfer directly from existing `SwipeFeed.tsx`.
**Delivers:** Functional snap feed replacing SwipeFeed — full-viewport snapping, adaptive card layouts (video/image/text variants), 3-item virtualization, video autoplay integration, TikTok tap-to-load facade, loading/empty states
**Uses:** CSS scroll-snap, `100svh`, IntersectionObserver (existing pattern from SwipeFeed.tsx), modified VideoEmbed with `isActive` + `thumbnailOnly` props
**Implements:** SnapFeed, SnapSlide, SnapCard, CardMedia, CardOverlay, CardActions
**Avoids:** Framer Motion + scroll-snap conflict (Pitfall 1), 100vh mobile issue (Pitfall 2), iframe remount bandwidth explosion (Pitfall 3), TikTok embed catastrophe (Pitfall 8), mixed content heights breaking mandatory snap (Pitfall 6)

### Phase 3: Sort and Filter Controls

**Rationale:** Controls depend on the snap feed being stable. The FeedControlBar sits above SnapFeed and dispatches to `useFeedState` — it can only be built after the state hook and snap feed container exist. Sort UI can now be correctly built since the API endpoint exists from Phase 1.
**Delivers:** Unified FeedControlBar replacing FeedFilter + BiasFilter + inline content type pills — sort picker, source/member/content type filter chips, collapsed/expanded states, active filter count badge, scroll position preservation on filter change
**Implements:** FeedControlBar, SortSelector, FilterChips (absorbs FeedFilter and BiasFilter)
**Avoids:** Sort results being misleading (API contract complete from Phase 1), scroll position reset on filter change (position restoration designed in Phase 1)

### Phase 4: Polish and Config Extensions

**Rationale:** Animation polish, auto-hide control bar, haptics, and theming tokens are non-critical enhancements that can only be added after a working, stable snap feed exists. Motion animations should never be added to an unstable feed — the cross-browser testing burden is significant. Accessibility can be layered on but the foundational ARIA structure should be completed here.
**Delivers:** Card entrance/exit animations with Motion AnimatePresence, auto-hide control bar on scroll, haptic feedback (Android), extended ThemeConfig tokens applied via applyTheme.ts, global state persistence to localStorage, Web Share API, ARIA attributes (`role="feed"`, `role="article"`, `aria-posinset`), keyboard navigation (arrow keys between cards)
**Uses:** `motion@^12.34.3` — installed here, not in Phase 2, to keep Phase 2 focused on native CSS patterns
**Avoids:** ARIA/keyboard accessibility gaps (Pitfall 10), adding Motion before snap feed is stable

### Phase Ordering Rationale

- API contract before UI is non-negotiable — sort UI without server-side sort produces wrong results that users notice
- Feature flag before snap feed enables safe shipping — old views remain functional fallbacks during development
- Leaf-to-root component build order (CardMedia -> CardOverlay -> SnapCard -> SnapFeed) isolates dependencies and makes each component independently testable
- Motion dependency deferred to Phase 4 — adding it in Phase 2 risks the scroll-snap + Motion conflict derailing the core snap feed work
- State management hook built in Phase 1 before any components — prevents state shape rework mid-build

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (iframe lifecycle + virtualization):** The interaction between IntersectionObserver thresholds and CSS scroll-snap settle timing is the highest-complexity part of this milestone. The existing `useVideoAutoplay.ts` pattern is a starting point, but adding the virtualization window creates new failure modes (IO fires during snap animation, element enters/exits/re-enters as snap settles). Recommend a focused spike on the IntersectionObserver debounce pattern before full implementation.
- **Phase 2 (TikTok facade):** The tap-to-load facade for TikTok needs a confirmed approach — verify that server-side oEmbed data includes a usable static thumbnail before committing to the facade pattern.

Phases with standard patterns (skip research-phase):
- **Phase 1 (API contract):** Adding a `sort` query param to an existing Drizzle ORM query is a well-understood pattern. No research needed.
- **Phase 1 (useFeedState hook):** `useReducer` + `useSearchParams` is a standard React pattern with abundant documentation.
- **Phase 3 (FeedControlBar):** Filter/sort UI with horizontal scrollable chips is a mature mobile UX pattern. Well-documented.
- **Phase 4 (Motion animations):** `AnimatePresence` + `whileInView` animations are the primary documented use case for Motion. Standard patterns apply.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Two new dependencies (motion, zustand) are documented, widely used, confirmed compatible with React 19. Decision NOT to use TanStack Virtual backed by documented GitHub issues #478 and #267. |
| Features | HIGH | CSS scroll-snap and IntersectionObserver are W3C standards. Feature set researched against competitor UX analysis (TikTok, Shorts, Reels). Most features are already partially implemented in the codebase. |
| Architecture | HIGH | Codebase fully audited. Existing patterns (IO for index tracking, localStorage caching, dual-mode API) directly inform the new architecture. Build order derived from actual component dependencies. |
| Pitfalls | HIGH | Most pitfalls backed by specific GitHub issues (Motion #2315, TanStack Virtual #478), MDN spec documentation, and measured performance data (TikTok embed costs from Justin Ribeiro). Codebase audit confirms which pitfalls are live risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **Zustand vs useReducer:** STACK.md and PITFALLS.md recommend Zustand; ARCHITECTURE.md recommends useReducer + useSearchParams and explicitly lists Zustand as an anti-pattern for page-local state. This summary sides with ARCHITECTURE.md (useReducer, no external dependency). Confirm this decision at the start of Phase 1 planning. If cross-route state sharing becomes a requirement in future phases, Zustand becomes justified.
- **`100svh` vs `100dvh`:** STACK.md specifies `100dvh`; PITFALLS.md warns against `100dvh` and recommends `100svh`. PITFALLS.md is correct based on cited sources (Apple Developer Forums 2025 dvh regression). Use `100svh` with `100vh` fallback. This discrepancy should be explicitly called out in Phase 1.
- **"See More" implementation mode:** Research is unanimous that "See More" must open a modal/drawer, NOT expand content in-place (in-place expansion changes card height, breaks mandatory scroll-snap). This constraint must be documented as a hard requirement in Phase 2 card design.
- **TikTok oEmbed thumbnail availability:** Server already fetches oEmbed data, but whether that reliably includes a usable static thumbnail for the tap-to-load facade needs verification during Phase 2 planning.

## Sources

### Primary (HIGH confidence)
- MDN: scroll-snap-type, Basic concepts of scroll snap — CSS scroll snap specification behavior
- Motion.dev docs: React motion component, scroll animations, gestures, upgrade guide — motion@^12.34.3 API
- Framer Motion GitHub Issue #2315, #342 — confirmed cross-browser scroll-snap + Motion conflict
- TanStack Virtual GitHub Issue #478, #267 — confirmed CSS scroll-snap incompatibility
- Apple Developer Forums thread 803987 — 2025 dvh regression on iOS Safari
- Codebase audit: SwipeFeed.tsx, VideoEmbed.tsx, useVideoAutoplay.ts, useFeed.ts, News.tsx, FeedFilter.tsx, BiasFilter.tsx, api.ts, config/types.ts

### Secondary (MEDIUM confidence)
- Zustand npm + TypeScript guide — v5.0.11 API and React 19 compatibility
- Justin Ribeiro: TikTok embed performance measurements (500KB JS + 4MB thumbnails + 10MB video per embed)
- Mux blog: Building TikTok-style video feed — three-system architecture for video feeds
- DEV.to: TikTok/YouTube Shorts snap infinite scroll in React — IntersectionObserver + scroll-snap pattern
- DeveloperWay: React State Management 2025 — Zustand recommendation for filter state
- CSS-Tricks: Practical CSS Scroll Snapping
- Medium: Understanding mobile viewport units (svh/lvh/dvh)

### Tertiary (MEDIUM-LOW confidence)
- Alvaro Trigo: Why not to use CSS scroll snap — limitations with variable heights (useful as pitfall reference)
- react-lite-youtube-embed npm — facade pattern for YouTube (validates thumbnail-only approach)

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
