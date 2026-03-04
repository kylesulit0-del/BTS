# Technology Stack

**Project:** BTS Army Feed v4.0 -- Enhanced Feed UI
**Researched:** 2026-03-04

## Existing Stack (DO NOT CHANGE)

Already validated and deployed in v3.0. Listed for reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.1 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |
| dompurify | ^3.3.1 | HTML sanitization |

## Recommended Stack Additions

### NONE. Zero new dependencies.

Every feature in v4.0 is achievable with the existing stack plus browser APIs. The previous v3.0 research recommended Motion and Zustand, but v3.0 shipped successfully without either -- using CSS keyframe animations, `useReducer`-based `useFeedState`, manual 3-slide DOM windowing via `useVerticalPaging`, and `createPortal` for bottom sheets. That architecture remains correct for v4.0.

## How Each Feature Maps to Existing Technology

### Feature 1: Touch Overlay for Iframe Gesture Passthrough

**Problem:** Cross-origin iframes (YouTube, TikTok) swallow all touch events. When a user touches a video card to swipe vertically to the next card, the iframe captures the touch and the `useVerticalPaging` hook never receives it. The current `SnapCardVideo` has an `onClick={togglePlayPause}` on the wrapper div, but this only works because the click fires on the wrapper outside the iframe. Vertical swipes over the iframe area are completely lost.

**Solution:** Transparent overlay div with programmatic tap passthrough. No library needed.

| Concern | Technology | Why |
|---------|-----------|-----|
| Intercept vertical swipes | Transparent `<div>` with `pointer-events: auto` positioned over iframe (z-index above iframe) | The overlay receives all touch events. `useVerticalPaging` already listens on the container -- the overlay just needs to be inside the touch-event-receiving container, which it is. |
| Pass taps through to iframe controls | Programmatic `pointer-events: none` toggle + re-dispatch or `elementFromPoint` | On `touchend` with no significant movement (<10px) and short duration (<300ms), classify as a tap. Briefly set overlay `pointer-events: none`, use `document.elementFromPoint(x, y).click()` to forward the tap to the iframe's play/pause/mute buttons, then restore `pointer-events: auto`. |
| Pass horizontal swipes through | `useSwipeGesture` already handles axis locking via `gestureClaimedRef` | The existing gesture arbitration system (`gestureClaimedRef` shared between `useVerticalPaging` and `useSwipeGesture`) determines vertical vs horizontal intent. The overlay just needs to be inside the same container. |

**Why this works for cross-origin iframes:** We do NOT need to forward events INTO the iframe document. YouTube/TikTok embedded players respond to `postMessage` commands for play/pause/mute -- the existing `useSnapVideo` hook already uses this pattern (`sendCommand(iframe, videoType, "play")`). The tap-through is needed only so the user can interact with the embedded player's native UI controls (scrubber, fullscreen button) when they intentionally tap rather than swipe.

**Alternative considered and rejected:**

| Alternative | Why Not |
|-------------|---------|
| `touch-action: pan-y` on iframe | W3C spec explicitly states `touch-action` does NOT cascade through embedded browsing contexts. Setting it on the `<iframe>` element has no effect on touch behavior within the iframe content. Confirmed in [W3C Pointer Events #325](https://github.com/w3c/pointerevents/issues/325). |
| Remove iframe, use custom video player | YouTube/TikTok Terms of Service require using their official embed players. A custom player using direct video URLs would violate ToS and eventually break. |
| Capture phase event listeners on parent | Touch events from within a cross-origin iframe never propagate to the parent document at all. The browser blocks this for security reasons. The event never reaches any parent listener regardless of capture vs bubble phase. |
| Hammer.js / ZingTouch gesture libraries | Add a dependency for something achievable in ~40 lines of vanilla JS. The app already has gesture detection (`useVerticalPaging`, `useSwipeGesture`). Adding a library creates a second gesture system that fights the first. |

**Implementation pattern (React hook):**

```typescript
// useTouchOverlay.ts -- ~50 lines
// Attaches to a transparent div overlaying the iframe
// Returns: ref for the overlay div, tap handler props

interface UseTouchOverlayOptions {
  onTap?: (x: number, y: number) => void;  // optional: custom tap handler
  tapThreshold?: number;   // max movement in px to classify as tap (default: 10)
  tapDuration?: number;    // max duration in ms to classify as tap (default: 300)
}

// Core logic:
// 1. touchstart: record position + timestamp
// 2. touchmove: do nothing (useVerticalPaging handles via container)
// 3. touchend: if distance < threshold && duration < tapDuration:
//    a. Set overlay pointer-events: none
//    b. document.elementFromPoint(x, y)?.click()
//    c. requestAnimationFrame(() => restore pointer-events: auto)
```

**Critical detail:** The overlay must NOT call `e.preventDefault()` or `e.stopPropagation()` on `touchstart` or `touchmove`. It must be passive. The `useVerticalPaging` hook listens on the `containerRef` (the `.snap-feed` div) which is an ancestor of the overlay. Touch events bubble from the overlay up to the container, where `useVerticalPaging` picks them up. The overlay only acts on `touchend` to determine if it was a tap.

**Confidence:** HIGH. This pattern is well-documented for TikTok-style vertical feeds with embedded video iframes. The `elementFromPoint` + `pointer-events` toggle is the standard approach for cross-origin iframe tap passthrough.

### Feature 2: Media-Centric Card Layout (~60% Viewport Media)

**Problem:** Current card layout already uses `flex: 0 0 60%` for `.snap-card-image-hero` but video cards use `width: 100%; height: 100%` (full bleed). The new requirement is a consistent layout across ALL card types: media area ~60% viewport top, then title + metadata + snippet + engagement stats below.

**Solution:** CSS restructuring only. No new technology.

| Concern | Technology | Why |
|---------|-----------|-----|
| 60/40 viewport split | CSS `flex: 0 0 60%` on media region, `flex: 1` on info panel | Already used in `SnapCardImage`. Extend to video and text cards. |
| Consistent card structure | Shared CSS class `.snap-card-unified` with predictable child regions | All three card variants (video, image, text) render the same DOM skeleton: `.media-region` + `.info-panel`. Content differs; structure is identical. |
| Auto-snippet (100-150 chars) | `String.prototype.slice(0, 150)` + word boundary cleanup | Pure JS string operation. The server already provides `preview` text. Truncation is a one-liner. |
| Text card without media | Gradient or themed background in the media region | Current `.snap-card-text` uses full-height text. New layout places a decorative gradient in the 60% media area with the source logo/icon centered, maintaining visual consistency. |

**Why no CSS framework or layout library:**

| Alternative | Why Not |
|-------------|---------|
| Tailwind CSS | Would require rewriting ~2300 lines of existing CSS. The layout change is ~30 lines of CSS. |
| CSS Grid with `grid-template-rows: 60fr 40fr` | Flexbox `flex: 0 0 60%` already works and is what the image card uses. Grid adds no benefit for a two-region vertical split. |
| Container queries | The card is always 100% viewport width. There is no responsive breakpoint within the card. Media queries (already unused for snap mode) or fixed percentages suffice. |

**Confidence:** HIGH. This is a CSS restructuring of existing components, not a technology decision.

### Feature 3: Fixed Always-Visible Header

**Problem:** Current `SnapControlBar` auto-hides with `transform: translateY(-100%)` based on user interaction. The new requirement is a fixed header that NEVER hides, with "Army Feed" branding on the left and Sort/Filter action buttons on the right.

**Solution:** CSS `position: fixed` with layout adjustment. No new technology.

| Concern | Technology | Why |
|---------|-----------|-----|
| Always-visible header | `position: fixed; top: 0;` with fixed height (e.g., 48px) | Standard CSS fixed positioning. The current `SnapControlBar` already uses `position: absolute; top: 0;` -- change to `position: fixed;` and remove the hide/show logic. |
| Feed content not hidden behind header | `padding-top` on `.snap-page` matching header height, or `calc(100svh - 48px)` for feed height | The snap feed container needs to account for the header. Cards fill the remaining viewport below the header. |
| Safe area inset (notch) | `padding-top: max(8px, env(safe-area-inset-top))` | Already implemented in `SnapControlBar`. Keep this. |
| Backdrop blur for glass effect | `backdrop-filter: blur(12px)` | Already implemented in `SnapControlBar`. Keep this. |

**Layout impact on card heights:** Cards currently use `height: 100%` (filling the `.snap-card` which fills `.snap-paging-track` which fills `.snap-feed`). With a fixed header, the feed container is `100svh - headerHeight`. Cards still use `height: 100%` but now "100%" refers to the post-header space. No card CSS changes needed -- only the container sizing changes.

**What changes:**

| Current | New |
|---------|-----|
| `SnapControlBar` with show/hide animation | Fixed `SnapHeader` that never hides |
| Sort tabs inline in control bar | Sort button in header opens Sort bottom sheet |
| Filter icon in control bar | Filter button in header opens Filter bottom sheet |
| `snap-reveal-zone` touch target to show bar | Remove (no longer needed -- header is always visible) |
| `useControlBarVisibility` hook | Remove (no longer needed) |

**Confidence:** HIGH. Fixed headers are a solved problem. The current implementation is 80% of the way there.

### Feature 4: Sort Bottom Sheet

**Problem:** Sort selection is currently inline tabs in `SnapControlBar`. The new requirement is a bottom sheet matching the existing `FilterSheet` design language.

**Solution:** Clone and simplify `FilterSheet`. No new technology.

| Concern | Technology | Why |
|---------|-----------|-----|
| Bottom sheet overlay | `createPortal(sheet, document.body)` | Exactly what `FilterSheet` already uses. Same pattern, same escape from scroll-snap stacking context. |
| Slide-up animation | CSS `transform: translateY(100%)` transitioning to `translateY(0)` | Exactly what `FilterSheet` already uses via `.filter-sheet-backdrop.open .filter-sheet`. |
| Drag-to-dismiss | Touch handlers tracking `deltaY` with threshold | Exactly what `FilterSheet` already implements in `handleTouchStart/Move/End`. |
| Body scroll lock | `document.body.style.overflow = 'hidden'` on open | Exactly what `FilterSheet` already implements. |
| Sort option list | 5 radio-style buttons (Recommended, Newest, Oldest, Popular, Discussed) | Simpler than `FilterSheet` which has tabs + multi-select chips. `SortSheet` is a flat list of options with the active one highlighted. |
| Dispatch sort change | `dispatch({ type: "SET_SORT", sort: mode })` | Already exists in `useFeedState` reducer. |

**Why not a shared "BottomSheet" component:** Extracting a shared base is a reasonable refactor during implementation, but it is NOT a stack decision. Whether the two sheets share a base component or are two independent components with similar CSS is an implementation detail. Both approaches use the same underlying technology: `createPortal` + CSS transforms + touch event handlers.

**Confidence:** HIGH. This is a direct clone of an existing pattern in the codebase.

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **None needed** | -- | -- | -- |

**That's it.** Zero new dependencies for v4.0. Every feature uses:
- React 19 (`useRef`, `useCallback`, `createPortal`)
- TypeScript (type safety)
- CSS custom properties + flexbox (layout)
- Vanilla touch event APIs (`touchstart`, `touchmove`, `touchend`)
- DOM APIs (`document.elementFromPoint`, `pointer-events` CSS property)

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| motion (framer-motion) | v3.0 shipped without it. CSS animations handle entry transitions. No exit animations needed for v4.0 features. The constraint "CSS animations only" is an explicit project decision. | CSS `@keyframes` + `transition` (already used throughout) |
| Hammer.js | Gesture library that would create a second gesture system conflicting with `useVerticalPaging` + `useSwipeGesture`. The app already has robust gesture arbitration. | Existing hooks + a new `useTouchOverlay` hook (~50 lines) |
| ZingTouch | Same as Hammer.js. Adds complexity for a problem already solved in the codebase. | Existing gesture hooks |
| zustand | v3.0 shipped without it. `useFeedState` with `useReducer` + `localStorage` persistence works. Adding Zustand for this milestone would mean rewriting the state layer during a UI-focused milestone. | Existing `useFeedState` hook (already handles sort + filter + persistence) |
| react-spring | Animation library. Same rationale as Motion -- CSS animations are the project constraint. | CSS transitions + `@keyframes` |
| @radix-ui/react-dialog | Would provide an accessible bottom sheet primitive, but adds a dependency for something the app already implements (FilterSheet). The existing sheet handles backdrop, focus trap equivalent (body scroll lock), and drag-to-dismiss. | Clone existing `FilterSheet` pattern |
| react-bottom-sheet | 25KB+ library for a pattern already implemented in ~80 lines of code in `FilterSheet.tsx`. | Clone existing pattern |
| any CSS framework | Tailwind, Bootstrap, etc. would require rewriting existing CSS. The layout changes are ~50 lines of CSS. | Plain CSS (already used throughout) |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Touch overlay | Vanilla `useTouchOverlay` hook | Hammer.js gesture library | App already has gesture arbitration. Hammer.js would be a second gesture system fighting the first. |
| Touch overlay | `pointer-events` toggle + `elementFromPoint` | `touch-action: pan-y` on iframe | W3C spec: `touch-action` does not cascade into embedded browsing contexts. Does not work. |
| Card layout | CSS flexbox 60/40 split | CSS Grid `grid-template-rows` | Flexbox already used for image cards. No benefit from grid for a two-region split. |
| Bottom sheet | Clone FilterSheet | @radix-ui/react-dialog | Adds dependency for 80 lines of code already written. FilterSheet pattern is proven. |
| Sort UI | Bottom sheet | Keep inline tabs | Requirements specify bottom sheet to match filter UI design language. Inline tabs also waste fixed header space. |
| Fixed header | CSS `position: fixed` | `position: sticky` | Sticky requires a scroll container. The snap feed uses `overflow: hidden` with programmatic `translateY` -- there is no scroll container for sticky to attach to. Fixed positioning is correct. |

## Integration Points with Existing Code

### What changes in existing files

| File | Change | Why |
|------|--------|-----|
| `components/snap/SnapCardVideo.tsx` | Add transparent touch overlay div above iframe | Intercept vertical swipes that currently get swallowed by cross-origin iframe |
| `components/snap/SnapCard.tsx` | Unify card DOM structure: media region (60%) + info panel (40%) for all variants | Consistent layout across video/image/text cards |
| `components/snap/SnapCardImage.tsx` | Already has 60/40 split. Minor adjustments: add auto-snippet, ensure consistent metadata rendering | Align with unified card structure |
| `components/snap/SnapCardText.tsx` | Restructure: decorative gradient in media region, text content in info panel | Currently full-height text. New layout matches image/video card structure. |
| `components/snap/SnapControlBar.tsx` | Replace with new `SnapHeader.tsx`: fixed position, branding left, sort+filter buttons right | Header is always visible, sort moves to bottom sheet |
| `pages/News.tsx` | Remove `useControlBarVisibility`, remove `snap-reveal-zone`, add sort sheet state | Simpler page-level state (no show/hide bar logic) |
| `hooks/useControlBarVisibility.ts` | Delete (no longer needed) | Header is always visible |
| `App.css` | Update `.snap-page` layout to account for fixed header height, update card layout classes, add sort sheet styles | Layout adjustments for fixed header + unified cards |

### New files

| File | Purpose |
|------|---------|
| `hooks/useTouchOverlay.ts` | Touch overlay logic: classify tap vs swipe, handle tap passthrough to iframe |
| `components/snap/SortSheet.tsx` | Sort selection bottom sheet (clone of FilterSheet pattern) |
| `components/snap/SnapHeader.tsx` | Fixed header with branding + action buttons |

### What stays the same

| File | Why No Change |
|------|---------------|
| `hooks/useVerticalPaging.ts` | Touch events from the overlay bubble up to the container where this hook listens. No changes needed. |
| `hooks/useSwipeGesture.ts` | Horizontal swipe gesture detection continues to work via `gestureClaimedRef` arbitration. No changes needed. |
| `hooks/useSnapVideo.ts` | Video play/pause/mute via `postMessage` is unchanged. The overlay handles touch; the hook handles video state. |
| `hooks/useSnapFeed.ts` | DOM windowing (3-item visible slice) is unchanged. Card contents change, but the feed mechanics do not. |
| `hooks/useFeedState.ts` | Already has `SET_SORT` action and full sort/filter state. No additions needed. |
| `components/snap/FilterSheet.tsx` | Filter bottom sheet is unchanged. Sort sheet is a new component. |
| `components/snap/SeeMoreSheet.tsx` | Text expansion sheet is unchanged. |
| `components/snap/SnapStatsBar.tsx` | Engagement stats display is unchanged (moves into unified info panel but component itself is the same). |
| `components/snap/SnapFeed.tsx` | Feed container and paging track are unchanged. Cards render differently inside, but the feed structure is the same. |
| All server-side code | This milestone is frontend-only. No API changes needed. |
| `config/groups/bts/*` | No config changes needed. All features use existing config values. |

## Browser APIs Used (No Polyfills Needed)

| API | Purpose | Support |
|-----|---------|---------|
| `document.elementFromPoint(x, y)` | Find element under tap coordinates for iframe passthrough | All browsers, no polyfill |
| `element.style.pointerEvents` | Programmatic `pointer-events: none/auto` toggle | All browsers, no polyfill |
| `TouchEvent` (touchstart/move/end) | Touch gesture detection | All mobile browsers, no polyfill |
| `createPortal` (React) | Bottom sheet rendering outside scroll context | React 19, already used |
| `CSS position: fixed` | Always-visible header | All browsers |
| `CSS env(safe-area-inset-top)` | Notch/status bar avoidance | iOS Safari 11.1+, Chrome 69+ |
| `CSS backdrop-filter: blur()` | Frosted glass header background | All modern browsers (2020+) |

## Sources

- [W3C Pointer Events Issue #325: touch-action on iframe](https://github.com/w3c/pointerevents/issues/325) -- Confirms `touch-action` does NOT cascade into embedded browsing contexts (HIGH confidence)
- [W3C Pointer Events PR #334](https://github.com/w3c/pointerevents/pull/334) -- Spec clarification for touch-action + iframe behavior (HIGH confidence)
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) -- `pan-y`, `none`, `manipulation` values and browser compat (HIGH confidence)
- [MDN: pointer-events CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events) -- `none`/`auto` for click-through behavior (HIGH confidence)
- [MDN: Using Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events) -- touchstart/move/end event handling (HIGH confidence)
- [CSS-Tricks: pointer-events](https://css-tricks.com/almanac/properties/p/pointer-events/) -- Practical overlay patterns with pointer-events (HIGH confidence)
- [Iframe overlay for touch event capture (Gist)](https://gist.github.com/datchley/6793842) -- Overlay pattern for iframe touch events, noting cross-origin limitations (MEDIUM confidence)
- [Iframe overlay for click passthrough (Gist)](https://gist.github.com/agaase/6971953) -- jQuery overlay dispatching clicks through to iframe (MEDIUM confidence)

---
*Stack research for: BTS Army Feed v4.0 -- Enhanced Feed UI*
*Researched: 2026-03-04*
