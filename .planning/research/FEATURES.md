# Feature Landscape

**Domain:** Enhanced feed UI -- media-centric cards, fixed header navigation, touch overlay for iframe gesture passthrough, sort bottom sheet
**Researched:** 2026-03-04
**Confidence:** HIGH (patterns well-established in mobile feed apps; iframe touch overlay is a known solution to a documented problem; all features build on existing v3.0 infrastructure)

## Context: What Already Exists

The v3.0 snap feed is fully implemented with:
- TikTok-style vertical snap via programmatic `useVerticalPaging` (touch-driven translateY, NOT CSS scroll-snap)
- 3-item DOM virtualization window (`useSnapFeed`)
- Adaptive card layouts: `SnapCardVideo` (full-bleed iframe), `SnapCardImage` (60% image hero + metadata panel), `SnapCardText` (centered reading layout)
- Sort tabs inline in `SnapControlBar` (Rec/New/Old/Pop/Disc)
- Filter bottom sheet (`FilterSheet`) with multi-select tabs (Source/Member/Type)
- Video autoplay/pause with single-iframe pattern (`useSnapVideo`)
- Engagement stats bar (`SnapStatsBar`) with SVG icons
- See More bottom sheet (`SeeMoreSheet`) for long text
- Right-swipe gesture to open source URL (`useSwipeGesture`)
- Auto-hide control bar based on index change (`useControlBarVisibility`)
- Feed state persistence in localStorage (`useFeedState`)

The v4.0 milestone enhances this foundation. Features below are scoped to ONLY what is new.

## Table Stakes

Features that the active requirements demand. Without these, the milestone is incomplete.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| **Fixed header with branding and action buttons** | Current `SnapControlBar` auto-hides on index change and overlays card content. Users need persistent top-level navigation with "Army Feed" branding (left) and Sort/Filter buttons (right) that never disappear. Every major feed app (Instagram, Twitter/X, YouTube) has a fixed header. | LOW | Replaces or restructures `SnapControlBar`. The auto-hide sort-tabs bar becomes separate from the always-visible header. `snap-page` layout needs a fixed header row before `SnapFeed`. | Fixed header occupies ~48-56px. Cards below it need `height: calc(100svh - headerHeight)` instead of full viewport. The existing `SnapControlBar` sort tabs currently sit at the top and auto-hide -- those tabs migrate to the new Sort bottom sheet. |
| **Sort bottom sheet (matching Filter sheet design)** | Sort tabs are currently inline pill buttons in the control bar. The requirement is to move sort selection into a bottom sheet that matches the Filter sheet's slide-up design language. This creates visual consistency -- both Sort and Filter use the same interaction pattern. | LOW | Reuses `FilterSheet` component patterns: `createPortal`, backdrop click-to-close, drag-to-dismiss handle, swipe-down-to-close gesture. Same CSS class structure with minor content changes. | Sort sheet shows 5 radio-style options (Recommended/Newest/Oldest/Popular/Most Discussed) instead of multi-select toggles. Single-select behavior (selecting one deselects others). Sheet closes automatically on selection. |
| **Media-centric card layout: ~60% media top** | Current `SnapCardImage` already uses `flex: 0 0 60%` for the image hero. But video cards (`SnapCardVideo`) take 100% of the viewport with metadata overlaid at the bottom over a gradient. The requirement is CONSISTENT layout across all card types: media always occupies the top ~60%, with title, metadata, snippet, and Show More below. Even video-only posts should show title + metadata in a dedicated panel, not just an overlay. | MEDIUM | Refactors `SnapCardVideo` to match `SnapCardImage` layout pattern. The iframe/facade goes in the top 60%, and a bottom panel shows `SnapCardMeta`, auto-snippet, and stats. `SnapCardText` also needs adjustment to be consistent (perhaps showing a placeholder gradient or source branding image in the top 60%). | The key tension: video cards currently put the iframe at 100% height with overlaid text. Moving to 60% height means shorter video players. For YouTube Shorts (9:16 aspect ratio), a ~60% viewport height on a phone gives roughly 390px of height, which is sufficient for playback. The iframe controls remain functional at this size. |
| **Auto-snippet: first 100-150 characters of post description** | Cards currently show `item.preview` text only when it exists and only on image/text cards. The requirement is that EVERY card shows a text snippet (first 100-150 characters of the post description) below the title, providing context even for video-only posts. | LOW | Uses existing `item.preview` field. Truncation is JS-side: `preview?.slice(0, 150)` with word-boundary-aware truncation. CSS `line-clamp: 2` or `line-clamp: 3` for visual truncation. The existing `snap-card-text-body` class already has `-webkit-line-clamp: 5` -- reduce to 2-3 lines for the snippet. | If `item.preview` is undefined/empty, the snippet section is simply omitted (graceful degradation). No need to generate snippets from titles. Word-boundary truncation: find the last space before character 150 to avoid mid-word cuts, append ellipsis. |
| **Consistent card layout for video-only posts** | Current video cards show only the video iframe + overlaid title/meta. The requirement is that title + metadata are ALWAYS present in a dedicated panel below the media area, even for video-only posts. | LOW | Part of the media-centric card layout refactor. `SnapCardVideo` gets a bottom panel identical to `SnapCardImage`'s `snap-card-image-panel`. Same `SnapCardMeta` component, same snippet display, same stats bar position. | This is really the same feature as the media-centric layout -- listed separately because the requirement spec calls it out explicitly. |
| **Engagement stats showing available per-source data** | `SnapStatsBar` currently shows upvotes, comments, views, likes with minimum threshold. The requirement emphasizes showing date alongside available per-source engagement data. Stats bar should show whatever data is available rather than requiring a minimum set. | LOW | Extends `SnapStatsBar` to include a date/time display. Each source provides different stats: Reddit (upvotes, comments), YouTube (views, likes, comments), news/RSS (may have none), Tumblr (notes), Bluesky (likes). The stats bar already handles optional fields gracefully. | Consider lowering or removing `MIN_STAT_THRESHOLD` (currently 2) so stats show even at low counts. Add the post date (from `item.timestamp` via existing `timeAgo()`) as a stat-like entry in the bar. |
| **"(Show More)" link opens original source URL** | Current "See More" button opens the `SeeMoreSheet` bottom sheet with expanded preview text. The requirement changes this: "(Show More)" should open the original source URL in a new tab, acting as a discovery link to the full content. | LOW | Changes `onSeeMore` callback in `SnapCardImage` and `SnapCardText` from opening `SeeMoreSheet` to calling `window.open(item.url, '_blank', 'noopener')`. Same as the existing `snap-card-source-link` button behavior. May make `SeeMoreSheet` obsolete or optional. | Design decision: keep the top-right external link icon AND the "(Show More)" text link? Or consolidate? Recommendation: keep both. The icon is for users who know the convention; the "(Show More)" text is for discoverability. Both do the same thing. |
| **Video gesture fix: transparent touch overlay** | Current `SnapCardVideo` renders an iframe that captures ALL touch events. When a user tries to swipe vertically to advance to the next card while touching the iframe, the iframe eats the touch event and `useVerticalPaging` never fires. This is THE critical bug for video cards. | MEDIUM | The `useVerticalPaging` hook attaches `touchstart`/`touchmove`/`touchend` listeners to `containerRef` (the `.snap-feed` div). When touches land on the iframe, they never bubble up to the container. The transparent overlay intercepts touches and decides whether to pass them through to the iframe (for play/pause taps) or handle them as vertical swipe gestures. | See detailed implementation notes below in "Touch Overlay Deep Dive" section. |
| **Bottom sheet consistency: Sort and Filter share design** | Current `FilterSheet` has a specific visual design (handle, backdrop, tabs, chip grid, clear button, swipe-to-dismiss). The new Sort sheet must match exactly -- same border radius, same backdrop opacity, same spring animation curve, same dismiss threshold. | LOW | Extract shared bottom sheet shell into a reusable component or ensure Sort sheet copies the exact CSS classes from `FilterSheet`. Both sheets use `createPortal` to render into `document.body`. | The existing `cubic-bezier(0.32, 0.72, 0, 1)` spring easing, 80px dismiss threshold, and drag-to-close gesture are already coded in `FilterSheet`. The Sort sheet reuses this. |

## Differentiators

Features that would elevate the experience beyond table stakes but are not strictly required.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| **Smart touch overlay with tap-through** | Beyond just blocking iframe touches for swipes, a smart overlay can detect TAP vs SWIPE intent. Taps pass through to the iframe (for play/pause), while vertical swipes are intercepted for paging. This gives users the best of both worlds: they can still interact with the video AND swipe past it. | MEDIUM | Builds on the touch overlay feature. Uses the same dead zone and axis lock logic already in `useVerticalPaging` (10px dead zone, 1.5x axis lock ratio). After axis determination: if vertical, handle paging; if tap (no movement beyond dead zone), programmatically dispatch a click event to the iframe or toggle play via YouTube IFrame API. | This is the difference between "video cards work" (basic overlay) and "video cards feel native" (smart overlay). Without tap-through, users cannot pause/play videos by tapping, which is a TikTok table-stake. |
| **Reusable BottomSheet component** | Extract shared bottom sheet infrastructure (portal, backdrop, handle, swipe-to-dismiss, body scroll lock) into a generic `<BottomSheet>` component. Sort, Filter, and See More sheets all become thin content wrappers. | LOW | Refactors `FilterSheet`, `SeeMoreSheet`, and the new Sort sheet to share a common shell. Currently each sheet duplicates the portal/backdrop/swipe-dismiss logic. | Reduces ~60 lines of duplicated code across 3 components. Makes adding future sheets trivial. |
| **Header scroll-aware transparency** | Fixed header starts semi-transparent when at the top of the feed, becomes fully opaque when the user is deeper in. Creates a more immersive feel at launch while maintaining readability during browsing. | LOW | New CSS logic on the header component, driven by the `currentIndex` from `useSnapFeed`. Index 0 = semi-transparent header, index > 0 = opaque header. | Simple conditional class toggle. No scroll listener needed since the app tracks index, not scroll position. |
| **Source-colored header accent** | The fixed header subtly picks up the source color of the current card (Reddit orange, YouTube red, Bluesky blue) as an underline or tint. Reinforces source identity without overwhelming the UI. | LOW | Uses the existing `sourceBadgeColors` map in `SnapCard.tsx`. Passes `currentItem.source` up to the header component. A thin 2px accent line at the bottom of the header changes color with CSS transition. | Delightful detail that costs almost nothing to implement. |
| **Sort persistence with visual indicator** | When a non-default sort is active, the Sort button in the header shows a visual indicator (dot, highlight, or label) so users know they are not seeing the default "Recommended" feed. | LOW | Reads `feedState.sort` from `useFeedState`. If sort !== "recommended", render a badge or dot on the Sort button. Same pattern as the existing `filter-badge` on the filter icon. | Prevents confusion: "Why does my feed look different?" -- because you changed the sort order last session and it persisted. |
| **Swipe-down from first card to show header controls** | When the user is on card 0 and swipes down (where there is no previous card), reveal the header/control area with a pull-down gesture instead of doing nothing. | LOW | `useVerticalPaging` currently handles "swipe down at index 0" by wrapping to the last item (circular loop). Could instead trigger header reveal or suppress the circular navigation at the boundary. | This is a nice touch but conflicts with the current circular-loop behavior. If implementing, make the loop optional via a config flag. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why It Seems Appealing | Why Avoid | What to Do Instead |
|--------------|------------------------|-----------|-------------------|
| **Full-screen video mode** | "Let users expand video to fill the entire viewport" | The iframe already has its own fullscreen button (YouTube/TikTok player controls). Building a custom full-screen layer on top of third-party iframes creates double-controls confusion and iframe sandboxing issues. Also conflicts with the media-centric layout goal of ALWAYS showing metadata. | Let the embedded player's native fullscreen button handle this. The 60% media area is the primary viewing experience. |
| **Custom video controls overlay** | "Replace iframe player controls with our own play/pause/seek" | YouTube and TikTok iframes are cross-origin. Cannot access their DOM or reliably control playback beyond the postMessage API (which is limited and varies by platform). Custom controls would fight the iframe's own controls, creating UX confusion. | Use the iframe's native controls. For play/pause, the touch overlay tap-through handles it. For mute/unmute, the existing `snap-card-video-mute-btn` works via YouTube IFrame API postMessage. |
| **Horizontal swipe between cards** | "Swipe left/right to navigate between cards as an alternative to vertical swiping" | The right-swipe gesture is already claimed for "open source URL". Adding left-swipe or changing horizontal semantics creates gesture conflicts with `useSwipeGesture`. Also contradicts the vertical-first feed paradigm. | Keep vertical swiping as the only navigation axis. Right-swipe opens source. Horizontal is not a navigation direction in a vertical feed. |
| **Animated header transitions** | "Header should animate in/out with spring physics" | The header is FIXED -- it does not move. Adding animation to a persistent element creates visual noise. The Sort/Filter bottom sheets already provide animation for interactive elements. | Static fixed header. Animate the sheets, not the chrome. |
| **Pull-to-refresh** | "Pull down at the top to refresh the feed" | Conflicts with the programmatic paging system. The `useVerticalPaging` hook interprets down-swipes as "go to previous card." At card 0, the circular loop wraps to the last card. Intercepting pull-to-refresh would require disabling circular navigation AND fighting overscroll behavior. | Refresh button in the header or auto-refresh on visibility change after 5+ minutes. The existing `useFeed.refresh()` handles this. |
| **Collapsible header** | "Hide the header when scrolling down to maximize content area" | The current `SnapControlBar` already auto-hides, and the requirement explicitly asks for a FIXED header that is ALWAYS visible. Collapsing defeats the purpose. | Fixed header, always visible. The 48-56px cost is acceptable -- the media area at ~60% viewport still gives 350-400px of media height on a typical phone. |
| **Dark/light mode toggle** | "Let users switch themes" | The app is dark-first (matching TikTok/Shorts aesthetic). Adding light mode doubles CSS testing surface. The `--bg-primary: #0d0d0d` and gradient backgrounds are designed for dark. | Ship dark mode only. Existing theme token system supports future light mode if needed. |

## Touch Overlay Deep Dive

The video gesture fix is the most technically complex feature in this milestone. Here is the detailed analysis.

### The Problem

When `SnapCardVideo` renders a YouTube/TikTok iframe, the iframe creates a cross-origin browsing context. Touch events that land on the iframe are captured by the iframe's document and do NOT bubble up to the parent page. This means:

1. `useVerticalPaging`'s `touchstart`/`touchmove`/`touchend` listeners on the `.snap-feed` container never fire when the user touches the video area.
2. The user cannot swipe to the next/previous card when touching the video.
3. This is not a bug in the app code -- it is fundamental browser behavior for cross-origin iframes.

### The Solution: Transparent Touch Overlay

Place an absolutely-positioned transparent `<div>` over the iframe that captures all touch events. The overlay decides what to do with each gesture:

```
User touches video area
  --> Touch hits the overlay (not the iframe)
  --> Overlay's touch handlers run
  --> Is this a vertical swipe? --> Forward to useVerticalPaging
  --> Is this a tap? --> Pass through to iframe (toggle play/pause)
  --> Is this a horizontal swipe? --> Forward to useSwipeGesture (open source)
```

### Implementation Strategy

1. **Overlay div**: `position: absolute; inset: 0; z-index: 2;` placed OVER the iframe inside `SnapCardVideo`.
2. **Touch event interception**: The overlay has its own `touchstart`/`touchmove`/`touchend` handlers.
3. **Gesture classification**: Same dead zone (10px) and axis lock (1.5x ratio) logic from `useVerticalPaging`.
4. **Vertical swipe passthrough**: When a vertical swipe is detected, the overlay updates the same refs/state that `useVerticalPaging` uses. Effectively, the overlay becomes a proxy touch source for the paging system.
5. **Tap detection**: If the touch starts and ends without exceeding the dead zone, treat it as a tap. Use YouTube IFrame API `postMessage` to toggle play/pause, or set `pointer-events: none` on the overlay momentarily to let the tap fall through to the iframe.
6. **CSS `touch-action: none`**: Set on the overlay div so the browser does not try to handle the touch gesture itself (no scrolling, no zooming).

### Integration with Existing Gesture System

The `gestureClaimedRef` pattern already coordinates between `useVerticalPaging` (vertical) and `useSwipeGesture` (horizontal). The touch overlay participates in this same coordination:

- Overlay detects vertical intent --> sets `gestureClaimedRef.current = "vertical"` and forwards touch data to paging
- Overlay detects horizontal intent --> sets `gestureClaimedRef.current = "horizontal"` and lets `useSwipeGesture` handle it
- Overlay detects tap --> neither axis claimed, pass through to iframe

### Known Limitation

When the overlay is active (which is always, for video cards), the user cannot directly interact with the iframe's UI (progress bar scrubbing, quality settings, etc.). This is acceptable because:
- YouTube Shorts iframe has minimal controls in the embedded player
- The mute/unmute button is OUTSIDE the overlay (existing `snap-card-video-mute-btn` sits at z-index 10)
- Play/pause is handled via tap-through
- Full-screen access works via the YouTube player's fullscreen button IF tap-through is implemented

## Feature Dependencies

```
[Fixed Header]
    +---replaces---> SnapControlBar auto-hide sort tabs (sort tabs move to Sort sheet)
    +---contains---> Sort button (opens Sort sheet)
    +---contains---> Filter button (opens existing FilterSheet)
    +---requires---> snap-page layout restructure (header + feed area)

[Sort Bottom Sheet]
    +---requires---> Fixed Header Sort button
    +---reuses----> FilterSheet patterns (portal, backdrop, handle, swipe-dismiss)
    +---dispatches-> useFeedState SET_SORT action
    +---closes-on--> selection (auto-dismiss)

[Media-Centric Card Layout]
    +---refactors--> SnapCardVideo (iframe moves to top 60%, metadata panel below)
    +---refactors--> SnapCardText (consistent with image/video layout)
    +---preserves--> SnapCardImage (already 60/40 split, minimal changes)
    +---contains---> Auto-snippet display
    +---contains---> "(Show More)" source link

[Touch Overlay]
    +---requires---> Media-Centric Layout (overlay sits in the 60% media area)
    +---integrates-> useVerticalPaging (forwards vertical swipe data)
    +---integrates-> useSwipeGesture via gestureClaimedRef (axis coordination)
    +---uses-------> useSnapVideo (tap-to-toggle play/pause via postMessage)

[Bottom Sheet Consistency]
    +---normalizes-> Sort sheet + Filter sheet + See More sheet visuals
    +---optional---> Extract shared BottomSheet component
```

### Ordering Rationale

1. **Fixed Header first** -- changes the page layout, all other features fit within the new layout
2. **Sort Bottom Sheet second** -- the header needs the Sort button to be functional
3. **Media-Centric Card Layout third** -- restructures card internals, auto-snippet, Show More behavior
4. **Touch Overlay fourth** -- requires the 60% media area from the card layout refactor
5. **Bottom Sheet Consistency** -- polish pass, can happen alongside or after other features

## MVP Recommendation

### Must Ship (This Milestone)

1. **Fixed header** with "Army Feed" branding + Sort/Filter buttons
2. **Sort bottom sheet** matching Filter sheet design
3. **Media-centric card layout** with consistent 60/40 split across all card types
4. **Auto-snippet** (first ~150 chars, word-boundary truncated)
5. **Touch overlay** for video iframe gesture passthrough (basic: vertical swipe + tap)
6. **"(Show More)" opens source URL** in new tab
7. **Bottom sheet visual consistency** across Sort and Filter

### Defer

- **Reusable BottomSheet component extraction**: Nice refactor but not user-facing. Extract after the milestone if the pattern stabilizes.
- **Source-colored header accent**: Delightful but purely cosmetic. Add as polish if time permits.
- **Smart tap-through to iframe**: Basic tap detection (did the touch move?) is sufficient for MVP. Full gesture classification (distinguishing light taps from holds) can be refined later.
- **Header scroll-aware transparency**: Cosmetic polish, not core functionality.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Risk | Priority |
|---------|------------|---------------------|------|----------|
| Fixed header with branding + buttons | HIGH | LOW | LOW | P0 |
| Sort bottom sheet | HIGH | LOW | LOW | P0 |
| Media-centric card layout (60/40) | HIGH | MEDIUM | LOW | P0 |
| Auto-snippet on all cards | MEDIUM | LOW | LOW | P0 |
| Touch overlay for video swipe | HIGH | MEDIUM | MEDIUM | P0 |
| "(Show More)" opens source URL | MEDIUM | LOW | LOW | P0 |
| Bottom sheet visual consistency | MEDIUM | LOW | LOW | P0 |
| Consistent video card layout (title+meta always) | MEDIUM | LOW | LOW | P0 (part of card layout) |
| Engagement stats with date | LOW | LOW | LOW | P1 |
| Smart tap-through (play/pause via overlay) | MEDIUM | MEDIUM | MEDIUM | P1 |
| Reusable BottomSheet component | LOW (dev-facing) | LOW | LOW | P2 |
| Source-colored header accent | LOW | LOW | LOW | P2 |
| Sort persistence indicator | LOW | LOW | LOW | P2 |

**Risk notes:**
- Touch overlay is MEDIUM risk because iframe touch behavior varies across browsers (iOS Safari vs Chrome). The fundamental approach (transparent div over iframe) is proven but integration with the existing `useVerticalPaging` gesture system needs careful testing on real devices.
- Media-centric card layout refactor is LOW risk because `SnapCardImage` already demonstrates the 60/40 pattern successfully. Applying it to `SnapCardVideo` and `SnapCardText` is straightforward CSS + layout restructuring.

## Sources

### Touch Overlay / iframe Gesture Passthrough
- [MDN: touch-action CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) -- HIGH confidence, authoritative
- [CSS-Tricks: touch-action](https://css-tricks.com/almanac/properties/t/touch-action/) -- HIGH confidence
- [W3C Pointer Events: touch-action behavior on iframe (Issue #325)](https://github.com/w3c/pointerevents/issues/325) -- HIGH confidence, spec-level discussion
- [Steven Waller: Prevent iframes from eating touch events in iOS](https://stevenwaller.io/articles/prevent-iframes-from-eating-touch-events-in-ios/) -- MEDIUM confidence, webkit-specific
- [Slick carousel: Swiping iframes doesn't work (Issue #564)](https://github.com/kenwheeler/slick/issues/564) -- MEDIUM confidence, documents the problem and common solutions
- [GitHub Gist: iframe overlay for mobile scrolling in webkit](https://gist.github.com/datchley/6793842) -- MEDIUM confidence, demonstrates the overlay pattern

### Fixed Header / Mobile Navigation Patterns
- [Design Studio: Mobile Navigation UX Best Practices (2026)](https://www.designstudiouiux.com/blog/mobile-navigation-ux/) -- MEDIUM confidence
- [Eleken: Mobile UX design examples (2025)](https://www.eleken.co/blog-posts/mobile-ux-design-examples) -- MEDIUM confidence
- [Arounda: Top Mobile Menu Design Inspirations (2025)](https://arounda.agency/blog/top-mobile-menu-design-inspirations) -- MEDIUM confidence

### Bottom Sheet Design
- [Mobbin: Bottom Sheet UI Design best practices](https://mobbin.com/glossary/bottom-sheet) -- MEDIUM confidence
- [NN/g: Bottom Sheets Definition and UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/) -- HIGH confidence
- [Material Design 3: Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview) -- HIGH confidence

### CSS Line-Clamp / Text Truncation
- [MDN: line-clamp](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-clamp) -- HIGH confidence
- [TheLinuxCode: CSS -webkit-line-clamp in Production (2026)](https://thelinuxcode.com/css-webkit-line-clamp-in-production-practical-patterns-pitfalls-and-2026-guidance/) -- MEDIUM confidence

### Card Layout Patterns
- [Material Design: Cards](https://m2.material.io/components/cards) -- HIGH confidence
- [Mobbin: Card UI Design best practices](https://mobbin.com/glossary/card) -- MEDIUM confidence

---
*Feature research for: BTS Army Feed v4.0 Enhanced Feed UI*
*Researched: 2026-03-04*
