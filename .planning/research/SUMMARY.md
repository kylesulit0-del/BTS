# Project Research Summary

**Project:** BTS Army Feed v4.0 — Enhanced Feed UI
**Domain:** Mobile vertical feed UI enhancement (touch overlays, fixed header, unified card layout, bottom sheet extraction)
**Researched:** 2026-03-04
**Confidence:** HIGH

## Executive Summary

BTS Army Feed v4.0 is a frontend-only milestone that enhances the existing v3.0 snap feed without touching the server or adding any new dependencies. Every feature builds directly on proven infrastructure: the `useVerticalPaging` programmatic touch system, `useSwipeGesture` axis-locked gesture arbitration, `FilterSheet` bottom sheet pattern, and the 60/40 `SnapCardImage` layout. The recommended approach is zero new npm packages — React 19, TypeScript, vanilla CSS flexbox, and browser touch APIs cover everything. The constraint is real: v3.0 shipped successfully without Motion, Zustand, Hammer.js, or any gesture library, and that architecture remains correct for v4.0.

The four features of this milestone — fixed always-visible header, sort bottom sheet, media-centric unified card layout, and transparent touch overlay for video iframes — have a clear dependency order. The fixed header must come first because it changes page geometry that all other features live within. The touch overlay is the most technically complex piece and must be isolated and tested on physical iOS before card layout changes restructure the DOM around it. The card layout refactor touches the most files but carries the lowest risk because `SnapCardImage` already demonstrates the target 60/40 pattern in production.

The primary risk is the touch overlay over cross-origin iframes. This is a well-documented problem with a confirmed solution (transparent div capturing all touches, tap detection via postMessage, no pointer-events toggling mid-gesture), but iOS Safari's touch-target-lock model means it will appear to work in Chrome DevTools and fail on a physical iPhone if implemented incorrectly. Architecture research confirms that DOM event bubbling naturally carries overlay touch events up to `containerRef` where `useVerticalPaging` already listens — no synthetic event forwarding needed. The critical constraint: the overlay must permanently capture all touches (`pointer-events: auto` always on) and handle taps via `togglePlayPause` postMessage rather than attempting iframe passthrough.

## Key Findings

### Recommended Stack

No new dependencies for v4.0. The entire milestone uses the existing stack: React 19 hooks (`useRef`, `useCallback`, `createPortal`), TypeScript, vanilla CSS custom properties and flexbox, and browser touch APIs (`touchstart`, `touchmove`, `touchend`). Every proposed library alternative was rejected — Hammer.js conflicts with the existing gesture arbitration system, Motion/react-spring violate the CSS-animations-only project constraint, Zustand would require rewriting the state layer during a UI-focused milestone, and Radix UI's dialog adds a dependency for a pattern already implemented in ~80 lines.

See: `.planning/research/STACK.md`

**Core technologies (unchanged from v3.0):**
- React 19 + TypeScript: UI and type safety — already in production
- Vite 7 + vite-plugin-pwa: Build tooling — unchanged
- CSS flexbox + custom properties: All layout — zero new classes needed from a framework
- `TouchEvent` APIs: Gesture handling — already used by `useVerticalPaging` and `useSwipeGesture`
- `createPortal`: Bottom sheet rendering outside scroll context — already used by `FilterSheet`

### Expected Features

All features are incremental improvements to the existing snap feed. Every new component has a direct analog already in the codebase.

See: `.planning/research/FEATURES.md`

**Must have (table stakes for this milestone):**
- Fixed header with "Army Feed" branding + Sort/Filter buttons — replaces auto-hide `SnapControlBar`
- Sort bottom sheet matching `FilterSheet` design language — removes inline sort tabs from control bar
- Media-centric unified card layout (~60% media / ~40% info panel) — all card types consistent
- Auto-snippet (first ~150 chars, CSS `line-clamp` primary, JS word-boundary fallback)
- Touch overlay for video iframe gesture passthrough — critical bug fix for video cards
- "(Show More)" opens original source URL in new tab — replaces `SeeMoreSheet` trigger
- Bottom sheet visual consistency — Sort and Filter use shared `BottomSheet` wrapper

**Should have (differentiators, implement if time permits):**
- Sort persistence visual indicator (dot on Sort button when non-default sort is active)
- Source-colored header accent line (picks up current card's source color)
- Header scroll-aware transparency (index 0 = semi-transparent, index > 0 = opaque)

**Defer to v5+:**
- Reusable `BottomSheet` component as a formal shared primitive (refactor, not user-facing)
- Smart tap-through refinements (distinguishing light taps from holds for iframe)
- Pull-to-refresh (conflicts with circular paging at index 0)
- Dark/light mode toggle (doubles CSS testing surface; dark-first is correct)

### Architecture Approach

The v4.0 architecture is a restructuring of existing components, not a new architecture. The core insight from the codebase audit: `useVerticalPaging` listens on `containerRef` (the `.snap-feed` div), and any touch event on a child element bubbles up naturally — UNLESS the touch originates inside a cross-origin iframe, which creates a separate browsing context that does not propagate events. The touch overlay fixes this by placing a regular div (not an iframe) in the touch path so events can bubble normally.

See: `.planning/research/ARCHITECTURE.md`

**Major components (new or replaced):**
1. `SnapHeader` — replaces `SnapControlBar`; in-flow flex child (not absolute overlay) so feed height auto-adjusts via `flex: 1`
2. `BottomSheet` — shared wrapper extracted from `FilterSheet`; encapsulates portal + backdrop + drag-dismiss + body scroll lock
3. `SortSheet` — thin content wrapper around `BottomSheet`; 5 radio-style sort options; dispatches existing `SET_SORT` action
4. Touch overlay div in `SnapCardVideo` — captures all touch on video area; tap detection via postMessage; swipe events bubble to `containerRef` naturally
5. `SnapCard` restructure — unified two-zone layout (`.snap-card-media-zone` + `.snap-card-info-zone`) shared across all card variants
6. `SnapCardSnippet` — auto-truncated preview; "(Show More)" opens source URL

**Deleted:**
- `useControlBarVisibility.ts` — no longer needed (header is always visible)
- `snap-reveal-zone` div — invisible 44px tap target that would conflict with header buttons if left in place

### Critical Pitfalls

See: `.planning/research/PITFALLS.md`

1. **Touch overlay captures all events including taps** — Handle taps via `postMessage` to `togglePlayPause`, never attempt iframe event passthrough. Overlay permanently captures all touches (`pointer-events: auto` always on). No pointer-events toggling.

2. **iOS Safari touch-target lock breaks pointer-events toggling mid-gesture** — Once `touchstart` fires on an element, iOS Safari locks the entire sequence to that element. Changing `pointer-events` during an active touch does nothing. Build the overlay as a unified gesture handler from the start. Test on physical iPhone — Chrome DevTools and Simulator do not reproduce this behavior.

3. **Touch overlay breaks existing right-swipe gesture** — The overlay adds a third participant to the two-party `gestureClaimedRef` arbitration. For video cards, the overlay must REPLACE the `useSwipeGesture` handler (not layer on top), calling `openSourceUrl()` directly for right swipes and delegating vertical swipes to paging.

4. **Fixed header changes viewport geometry for all card heights** — Use in-flow flex layout (`snap-header` as `flex: 0 0 auto`, `snap-feed` as `flex: 1`) NOT `position: absolute`. `useVerticalPaging` reads `containerRef.clientHeight` dynamically and auto-adjusts if the container is correctly sized by flexbox.

5. **Zombie auto-hide code creates ghost tap targets** — `useControlBarVisibility`, `snapIndex`/`setSnapIndex` state, `snap-reveal-zone` div, and related CSS must all be removed in the SAME commit as adding the fixed header. The reveal zone is an invisible 44px tap target that silently intercepts taps on the new header buttons.

## Implications for Roadmap

Research provides a clear three-phase dependency order. Architecture research explicitly identifies this build sequence as dependency-driven, confirmed by FEATURES.md ordering rationale and PITFALLS.md phase warnings.

### Phase 1: Fixed Header + Sort Bottom Sheet

**Rationale:** Pure UI-layer changes with no gesture system involvement. Independent of card layout. The header establishes the page geometry that phases 2 and 3 depend on. Sort sheet validates the shared `BottomSheet` extraction before card layout restructuring touches more files.

**Delivers:** Always-visible header with branding and action buttons; Sort bottom sheet matching Filter design; `BottomSheet` shared component; page layout settled (header height baked in for downstream phases).

**Addresses:** Fixed header, Sort bottom sheet, bottom sheet consistency features.

**Avoids:** Pitfalls 3 (header viewport calculation), 4 (zombie auto-hide code), 6 (bottom sheet inconsistency), 9 (dual sort controls). All must be resolved in this phase.

**Test checkpoint:** Header always visible through 10+ cards. Sort sheet opens/closes with matching animation to Filter sheet. Paging disabled when either sheet open. Vertical swipe navigation unaffected.

### Phase 2: Touch Overlay for Video Cards

**Rationale:** Touches the gesture system (`useVerticalPaging`, `useSwipeGesture`, `gestureClaimedRef`) and must be isolated before card DOM is restructured in Phase 3. Must be tested on physical iOS device with loaded YouTube iframe — cannot be validated in desktop browsers.

**Delivers:** Vertical swipe works on video cards (the critical bug fix); tap toggles play/pause; right-swipe opens source URL on video cards.

**Addresses:** Video gesture fix (touch overlay) feature.

**Avoids:** Pitfalls 1 (overlay steals all events), 2 (iOS pointer-events mid-gesture), 5 (overlay breaks right-swipe).

**Test checkpoint:** Can swipe up/down past playing YouTube video on physical iPhone. Tapping pauses/resumes. Mute button accessible. Right-swipe opens source URL on video cards (same as image/text cards).

### Phase 3: Media-Centric Card Layout + Snippets

**Rationale:** Largest visual change; touches all three card variants and shared `SnapCard` wrapper. Phases 1 and 2 must be stable first because this changes the card DOM structure. The touch overlay from Phase 2 must be integrated into the new 60% media zone structure.

**Delivers:** Unified two-zone layout across video/image/text cards; auto-snippet on all cards; "(Show More)" opens source URL; `SnapStatsBar` inline in info panel; consistent metadata rendering.

**Addresses:** Media-centric card layout, auto-snippet, consistent video card metadata, "(Show More)" behavior, engagement stats display.

**Avoids:** Pitfalls 7 (text-only card empty media area — keep `SnapCardText` layout as-is), 8 (video aspect ratio at 60% height — use responsive `aspect-ratio`), 10 (snippet truncation breaking Korean text — use CSS `line-clamp` as primary).

**Test checkpoint:** All three card types show media-top / info-bottom. Snippets truncate cleanly including Korean text. "(Show More)" opens source URL in new tab. Stats display inline in info zone. Touch overlay still works within new media zone structure.

### Phase Ordering Rationale

- Phase 1 before Phase 2: The header must be in place so the feed's `clientHeight` is correct when Phase 2 tests gesture distances. Testing gesture behavior against wrong container dimensions produces misleading results.
- Phase 2 before Phase 3: The touch overlay attaches to `SnapCardVideo` internals. Phase 3 restructures those internals (moves iframe into `.snap-card-media-zone`). Building the overlay first lets it be carried into the new structure cleanly.
- Phase 3 last: Most files changed, most potential for visual regressions. Stable gestures and settled header geometry reduce variables during the largest change.

### Research Flags

Phases likely needing deeper review during planning:

- **Phase 2 (Touch Overlay):** The `gestureClaimedRef` three-party protocol needs explicit design before implementation. PITFALLS.md provides the pattern (overlay replaces swipe handler for video cards, not layers on top) but the exact callback interface warrants careful spec work in the phase plan before coding starts.
- **Phase 2 (Touch Overlay):** Physical device testing is a hard gate. Cannot validate iOS Safari touch-target lock behavior in any simulator or browser DevTools.
- **Phase 3 (Video aspect ratio):** Two approaches identified (fixed 60% height vs responsive `aspect-ratio`). The responsive approach is better but more complex. Needs a concrete decision before implementation begins.

Phases with standard patterns (no additional research needed):

- **Phase 1 (Fixed Header + Sort Sheet):** Pure CSS flexbox, `createPortal`, and `useReducer` dispatch. `BottomSheet` extraction is a direct refactor of existing `FilterSheet` code. All patterns fully established in the codebase.
- **Phase 3 (Card Layout):** The 60/40 split already works in production in `SnapCardImage`. Extension to other card types is CSS restructuring. `SnapCardSnippet` is a ~30-line component using `line-clamp`. No unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All technologies in production in v3.0. No speculation. |
| Features | HIGH | All features build on existing v3.0 patterns. FEATURES.md grounded in full codebase audit. |
| Architecture | HIGH | Based on full source read of all relevant files. DOM event bubbling behavior is a web platform standard. |
| Pitfalls | HIGH | Touch-action/iframe behavior confirmed via W3C spec Issue #325. iOS touch-target lock documented in Apple Safari Web Content Guide. |

**Overall confidence:** HIGH

### Gaps to Address

- **Text-only card treatment in Phase 3:** Research recommends keeping `SnapCardText` layout as-is (not forcing a fake media area for text-only posts). This is a design decision that should be explicitly confirmed before Phase 3 implementation begins.
- **`SeeMoreSheet` fate:** The "(Show More)" change makes `SeeMoreSheet` unused for card content. Research assumes it becomes dead code. Confirm whether to delete it or keep it for potential future use before Phase 3.
- **Video aspect ratio handling in media zone:** Research identifies two approaches. The responsive `aspect-ratio` approach is better but more complex than a fixed 60% height. Needs a concrete decision before Phase 3 card layout work begins.
- **Touch overlay on iOS — physical device required:** No workaround exists for Pitfall 2 validation. The phase plan for Phase 2 should include a mandatory real-device test gate before Phase 3 begins.

## Sources

### Primary (HIGH confidence)

- Direct codebase audit: `useVerticalPaging.ts`, `useSwipeGesture.ts`, `useSnapFeed.ts`, `SnapFeed.tsx`, `SnapCard.tsx`, `SnapCardVideo.tsx`, `SnapCardImage.tsx`, `SnapCardText.tsx`, `SnapControlBar.tsx`, `FilterSheet.tsx`, `SeeMoreSheet.tsx`, `SnapStatsBar.tsx`, `useControlBarVisibility.ts`, `useFeedState.ts`, `useSnapVideo.ts`, `News.tsx`, `App.css`
- [W3C Pointer Events Issue #325](https://github.com/w3c/pointerevents/issues/325) — confirms `touch-action` does NOT cascade into embedded browsing contexts
- [MDN: touch-action CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — pan-y, none, manipulation values and behavior
- [MDN: pointer-events CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events) — none/auto for overlay behavior
- [MDN: Using Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events) — touchstart/move/end event handling
- [Apple Safari Web Content Guide: Handling Events](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html) — iOS touch-target lock model
- [NN/g: Bottom Sheets UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/) — shared component extraction patterns
- [Material Design 3: Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview) — bottom sheet design patterns

### Secondary (MEDIUM confidence)

- [Steven Waller: Prevent iFrames from eating touch events in iOS](https://stevenwaller.io/articles/prevent-iframes-from-eating-touch-events-in-ios/) — webkit-specific iframe touch behavior
- [Slick Carousel Issue #564](https://github.com/kenwheeler/slick/issues/564) — community post-mortem on iframe swipe blocking in carousels
- [GitHub Gist: iframe overlay for mobile scrolling](https://gist.github.com/datchley/6793842) — overlay pattern documentation
- [web.dev: Large, small, dynamic viewport units](https://web.dev/blog/viewport-units) — svh/dvh for fixed header calculations
- [CSS-Tricks: The trick to viewport units on mobile](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/) — mobile viewport height pitfalls
- [CSS-Tricks: pointer-events](https://css-tricks.com/almanac/properties/p/pointer-events/) — practical overlay patterns

---
*Research completed: 2026-03-04*
*Ready for roadmap: yes*
