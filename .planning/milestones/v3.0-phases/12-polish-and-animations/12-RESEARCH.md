# Phase 12: Polish and Animations - Research

**Researched:** 2026-03-03
**Domain:** CSS animations, skeleton loading, engagement stats UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Entrance animation: slide up from below + fade in (translateY: +30px -> 0, opacity: 0 -> 1)
- Duration ~250ms, ease-out easing -- snappy and quick
- No exit animation -- card simply leaves the viewport on scroll away
- Animation plays every time a card snaps into view, including when scrolling back to previous cards
- First card on page load also animates in (after skeleton disappears)
- Engagement stats bar: horizontal bar along the bottom of each card (not vertical/right-side)
- Stats shown: upvotes, comments, views -- with abbreviated counts (1.2k, 3.4M format)
- Stats are display-only, not tappable
- If a stat is zero or unavailable, hide that stat entirely -- don't show icon with dash/zero
- Only show stats that have real data
- Shimmer blocks style: gray blocks with left-to-right shimmer animation (YouTube/Facebook pattern)
- Single full-viewport skeleton card (one card, since snap feed shows one at a time)
- Generic layout -- large block at top, text lines below. Not specific to any card type
- Skeleton only shows on initial page load, not on sort/filter changes
- Snappy and quick personality -- fast transitions (~200-250ms), sharp easing
- Respect prefers-reduced-motion: skip entrance animations but keep subtle motion (shimmer, fades)
- Engagement stats bar animates in with the card (no staggered delay)
- Control bar slides down into place on initial load (coordinated with card slide-up)

### Claude's Discretion
- Exact shimmer gradient colors and animation speed
- Specific icons for upvotes/comments/views
- Skeleton block proportions and spacing
- Whether to use CSS animations or a motion library
- Exact easing curves

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLSH-01 | Cards animate in/out with Motion entrance/exit transitions | CSS-only approach: `@keyframes` entrance animation triggered by key change on `isActive` card. No exit animation needed (user decision). No motion library required. |
| PLSH-02 | Engagement stats displayed as horizontal bar (icons + abbreviated counts) | Refactor existing `SnapCardMeta` stats inline display into a dedicated `SnapStatsBar` component rendered at the bottom of each card variant. `abbreviateNumber()` utility already exists. |
| PLSH-03 | Loading state shows full-viewport skeleton card | New `SnapSkeleton` component with CSS shimmer (linear-gradient animation). Rendered in `News.tsx` snap mode when `isLoading && !hasItems`. |
</phase_requirements>

## Summary

This phase adds three polish layers to the existing snap feed: card entrance animations, a horizontal engagement stats bar, and a full-viewport skeleton loading state. The technical scope is narrow and well-defined.

The most important architectural decision is **using pure CSS animations instead of the `motion` library** (formerly framer-motion). The original stack research recommended `motion@^12.34.3` for card animations, but the user's decisions eliminate every use case that requires a JS animation library: no exit animations (the primary reason for `AnimatePresence`), no spring physics (ease-out easing is CSS-native), no scroll-linked animations, and no gesture physics. Adding a ~34KB dependency for a single `@keyframes` slide-up animation is unjustified. Every animation in this phase is achievable with CSS `@keyframes`, `transition`, and `animation` properties.

The engagement stats bar is partially implemented already -- `SnapCardMeta` renders inline stats within the metadata row. The refactor extracts these into a dedicated bottom bar with a horizontal layout, matching the user's "bottom of each card" decision. The existing `abbreviateNumber()` utility and `FeedStats` type cover the data formatting needs.

**Primary recommendation:** Use pure CSS `@keyframes` for all animations. No new dependencies. Three components to build: entrance animation CSS class, `SnapStatsBar` component, `SnapSkeleton` component.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS `@keyframes` | Native | Entrance animation, shimmer effect | Zero bundle cost, GPU-accelerated `transform` + `opacity`, browser-native. All animations in this phase use only `transform` and `opacity` -- the two properties browsers composite on the GPU without triggering layout/paint. |
| CSS `animation` | Native | Triggering entrance animation on snap | Applied via class name; plays once per snap using `animation-fill-mode: forwards`. Key-change on React elements triggers re-mount, which re-triggers the animation. |
| CSS `transition` | Native | Control bar slide-down on load | Already used for control bar show/hide (`transform` transition in `.snap-control-bar`). Load animation extends this existing pattern. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prefers-reduced-motion` | CSS media query | Accessibility | Wrap entrance `@keyframes` in `@media (prefers-reduced-motion: no-preference)`. Shimmer continues regardless (subtle, non-motion). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `@keyframes` | `motion@^12.34.3` | Motion adds `AnimatePresence` for exit animations and spring physics. User decided no exit animations, no springs. Motion would add ~34KB gzipped for one animation. Not justified. |
| CSS `@keyframes` | `auto-animate` | 1.5KB, auto-detects DOM changes and animates them. But it animates ALL changes including re-renders we don't want animated. Too magical for a controlled animation trigger. |
| CSS shimmer | `react-loading-skeleton` | Pre-built skeleton components. But we need one specific full-viewport layout, not generic skeletons. CSS shimmer is ~15 lines. |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/snap/
│   ├── SnapCard.tsx          # Add entrance animation class + key strategy
│   ├── SnapStatsBar.tsx      # NEW: horizontal stats bar component
│   ├── SnapSkeleton.tsx      # NEW: full-viewport shimmer skeleton
│   ├── SnapFeed.tsx          # Wire skeleton into loading state
│   └── ...existing files
├── App.css                   # Add animation keyframes and skeleton styles
└── config/snap.ts            # Add animation timing constants
```

### Pattern 1: Entrance Animation via CSS Class + Key Re-mount

**What:** Apply a CSS animation class to the active card. When the card changes (via vertical paging), React re-mounts the card component due to key change, which re-triggers the CSS animation.

**When to use:** Any time a card snaps into the active position (position === 0).

**How it works in the existing codebase:**
The `SnapFeed.tsx` renders `visibleItems` with key `${vi.realIndex}-${vi.position}`. When `currentIndex` changes, the item at `position: 0` gets a new `realIndex`, causing React to unmount the old card and mount a new one. This re-mount naturally re-triggers any CSS animation applied to the element.

```css
/* Entrance animation */
@keyframes snap-card-enter {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.snap-card-enter {
  animation: snap-card-enter 250ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .snap-card-enter {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

**Key insight:** The existing key strategy (`${vi.realIndex}-${vi.position}`) already guarantees re-mount on snap. No additional state management needed to trigger the animation.

### Pattern 2: Horizontal Stats Bar at Card Bottom

**What:** A fixed-position bar at the bottom of each card showing engagement stats with icons and abbreviated counts.

**When to use:** Every card that has stats data.

**How it integrates:**
Each card variant (SnapCardImage, SnapCardVideo, SnapCardText) already renders `SnapCardMeta` which includes inline stats. The new `SnapStatsBar` replaces the inline stats in `SnapCardMeta` and renders as a separate positioned element at the bottom of the card.

```tsx
// SnapStatsBar.tsx
interface SnapStatsBarProps {
  stats?: FeedStats;
}

export default function SnapStatsBar({ stats }: SnapStatsBarProps) {
  if (!stats) return null;

  const entries = [
    { key: 'upvotes', value: stats.upvotes, icon: '...' },
    { key: 'comments', value: stats.comments, icon: '...' },
    { key: 'views', value: stats.views, icon: '...' },
    { key: 'likes', value: stats.likes, icon: '...' },
  ].filter(e => e.value != null && e.value >= 2);

  if (entries.length === 0) return null;

  return (
    <div className="snap-stats-bar">
      {entries.map(e => (
        <span key={e.key} className="snap-stats-item">
          {e.icon}
          <span>{abbreviateNumber(e.value!)}</span>
        </span>
      ))}
    </div>
  );
}
```

```css
.snap-stats-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 10px 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 6;
  pointer-events: none;
}
```

**Positioning per card variant:**
- **Video card:** Already has `snap-card-video-overlay` at the bottom. Stats bar goes BELOW the metadata overlay, or integrated into it. Note: video progress bar is at `bottom: 0` with `z-index: 10`. Stats bar needs to sit above the gradient but below the progress bar.
- **Image card:** The panel area (`snap-card-image-panel`) is at the bottom. Stats bar goes at the bottom edge of the panel.
- **Text card:** The footer area (`snap-card-text-footer`) is at the bottom. Stats bar goes below the footer meta block.

### Pattern 3: Full-Viewport Shimmer Skeleton

**What:** A single skeleton card that fills 100% of the snap feed viewport with shimmer animation blocks.

**When to use:** Initial page load only, before any feed data arrives.

```css
/* Shimmer animation (left-to-right sweep) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.snap-skeleton {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  padding: 0;
}

.snap-skeleton-block {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 0;
}
```

**Layout:** Large block at top (~60% height for "hero" area), then narrower text-line blocks below with spacing. Matches the generic card structure without being specific to any content type.

### Pattern 4: Control Bar Slide-Down on Initial Load

**What:** Control bar starts off-screen (translateY(-100%)) and slides into place when the feed first loads.

**How it works:** The control bar already has `transform: translateY(0)` for visible state and `transform: translateY(-100%)` for hidden state with a CSS transition. On initial load, start in hidden state and transition to visible once data arrives. This can be done by having the bar start with the `.hidden` class and removing it after a brief delay or when `isLoading` becomes false.

### Anti-Patterns to Avoid
- **Animating layout properties (width, height, top, left):** These trigger expensive layout recalculations. Only animate `transform` and `opacity` -- both are GPU-composited.
- **Animation on every re-render:** The entrance animation must only play when the card SNAPS into view, not on any re-render. The key-based re-mount strategy ensures this naturally.
- **Disabling ALL animation for reduced-motion:** The `prefers-reduced-motion` media query should only suppress the entrance slide animation. Shimmer (a background gradient shift) and opacity fades are considered safe for most users with vestibular disorders. The W3C guidance is to remove large motion, not all visual change.
- **Adding stats bar to SnapCardMeta:** The stats are currently inline in the metadata row. Moving them to a separate absolute-positioned bar means they should be REMOVED from `SnapCardMeta` to avoid duplication.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number abbreviation | Custom formatter | Existing `abbreviateNumber()` in `src/utils/formatNumber.ts` | Already handles k/M formatting with .0 stripping |
| Shimmer gradient | Complex SVG/canvas shimmer | CSS `linear-gradient` + `background-position` animation | Pure CSS, zero JS, GPU-composited. The YouTube/Facebook shimmer is literally a gradient that moves left-to-right via `background-position`. |
| Stats data filtering | Custom null-check logic per stat | `.filter()` on stat entries array | Pattern shown in code example above -- filter once, render filtered list |
| Reduced motion detection | JS `matchMedia('prefers-reduced-motion')` | CSS `@media (prefers-reduced-motion: reduce)` | No JS needed -- CSS handles the conditional animation removal natively |

**Key insight:** This phase has zero novel problems. Every technique (shimmer skeletons, entrance animations, stat bars) is a well-established CSS pattern. The complexity is in wiring them into the existing component structure correctly.

## Common Pitfalls

### Pitfall 1: Entrance Animation Firing on Wrong Cards
**What goes wrong:** All 3 visible cards (prev, current, next) animate on every index change, causing a jarring triple-animation.
**Why it happens:** Applying the animation class to all cards without filtering by position.
**How to avoid:** Only apply `snap-card-enter` class to the card at `position: 0` (the active card). The prev/next cards remain hidden behind the viewport edge and don't need animation.
**Warning signs:** Multiple cards sliding up simultaneously during a snap.

### Pitfall 2: Animation Re-triggers on Unrelated Re-renders
**What goes wrong:** Card entrance animation plays when filter chips change, sort mode changes, or other state updates cause re-render.
**Why it happens:** If animation is state-driven (e.g., `useState(true)` toggled on mount), any re-render from parent could re-trigger.
**How to avoid:** Rely on React's key-based re-mount mechanism. The key `${vi.realIndex}-${vi.position}` changes only when the card at position 0 changes. Parent re-renders that don't change `currentIndex` won't change the key, so the animation doesn't re-trigger.
**Warning signs:** Card animates when opening the filter sheet or changing sort tabs.

### Pitfall 3: Shimmer Animation Jank on Low-End Devices
**What goes wrong:** Shimmer animation stutters or causes high CPU usage.
**Why it happens:** Animating `background-position` is NOT GPU-composited by default. It's a paint operation.
**How to avoid:** Two options: (1) Accept the minor paint cost since shimmer is temporary (only during load) and a single element. (2) Use a pseudo-element with `transform: translateX()` as the shimmer overlay, which IS GPU-composited. Option 1 is fine for this case -- shimmer is one element shown briefly.
**Warning signs:** DevTools Performance panel shows frequent paint operations during shimmer.

### Pitfall 4: Stats Bar Overlapping Video Controls
**What goes wrong:** The stats bar covers the video progress bar, mute button, or video metadata overlay.
**Why it happens:** Video cards have multiple absolute-positioned overlays at the bottom (progress bar z-index:10, mute button z-index:10, metadata overlay z-index:5).
**How to avoid:** For video cards, integrate stats into the existing `snap-card-video-overlay` gradient rather than adding a separate absolute bar. Or position the stats bar above the progress bar with appropriate z-index layering and padding.
**Warning signs:** Tapping the mute button hits the stats bar instead; progress bar is invisible behind stats.

### Pitfall 5: Skeleton Persists After Data Loads (Flash of Skeleton)
**What goes wrong:** User sees the skeleton flash briefly even when data loads quickly from cache.
**Why it happens:** `isLoading` is true initially, skeleton renders, then data loads from localStorage cache in ~1ms, skeleton unmounts -- causing a visible flash.
**How to avoid:** Check the loading path: `useFeed` sets `isLoading(true)` then immediately checks cache. If cache hits, it calls `setIsLoading(false)` synchronously in the same tick. React batches these state updates, so the skeleton should never render if cache is warm. Verify this by testing with a warm cache. If flash persists, add a `useLayoutEffect` to suppress skeleton rendering on cache-hit paths.
**Warning signs:** Brief skeleton flash on every page visit, even with cached data.

### Pitfall 6: Control Bar Initial Animation Conflicting with Existing Transition
**What goes wrong:** Control bar "jumps" or double-animates on initial load.
**Why it happens:** The control bar already has `transition: transform 0.3s cubic-bezier(...)` for show/hide. If the initial load animation uses the same transition property, removing the `.hidden` class triggers both the auto-hide transition and the entrance animation simultaneously.
**How to avoid:** Use a separate class (e.g., `.snap-control-bar-initial`) with its own animation, or ensure the visible state is set before the transition property activates (e.g., delay adding the transition class until after initial position is set).
**Warning signs:** Control bar slides down, then immediately jumps or re-slides.

## Code Examples

Verified patterns from the existing codebase:

### Card Entrance Animation Application Point
```tsx
// In SnapFeed.tsx, apply entrance class to active card only
{visibleItems.map((vi) => (
  <div
    className={`snap-card${vi.position === 0 ? ' snap-card-enter' : ''}`}
    key={`${vi.realIndex}-${vi.position}`}
    style={{ top: `${vi.position * 100}%` }}
  >
    <SnapCard item={vi.item} isActive={vi.position === 0} gestureClaimedRef={gestureClaimedRef} />
  </div>
))}
```

### Shimmer Skeleton Integration Point
```tsx
// In News.tsx snap mode, before SnapFeed
if (feedMode === "snap") {
  return (
    <div className="snap-page">
      <SnapControlBar ... />
      {isLoading && !hasItems ? (
        <SnapSkeleton />
      ) : (
        <SnapFeed items={items} ... />
      )}
      <FilterSheet ... />
    </div>
  );
}
```

### Stats Bar Integration in SnapCard
```tsx
// In SnapCard.tsx, after card content but inside snap-card-content
<div className="snap-card-content" style={style}>
  {/* Source link icon */}
  <button className="snap-card-source-link" ...>...</button>

  {/* Card variant */}
  {variant === "video" && <SnapCardVideo ... />}
  {variant === "image" && <SnapCardImage ... />}
  {variant === "text" && <SnapCardText ... />}

  {/* Stats bar at bottom */}
  <SnapStatsBar stats={item.stats} />
</div>
```

### Existing Stats Data Structure
```typescript
// From types/feed.ts -- already has all needed fields
export interface FeedStats {
  upvotes?: number;
  comments?: number;
  views?: number;
  likes?: number;
  notes?: number;
}

// From utils/formatNumber.ts -- already handles abbreviation
export function abbreviateNumber(n: number): string { ... }
```

### Existing Stats Rendering (to refactor from)
```tsx
// Current inline stats in SnapCardMeta (SnapCard.tsx lines 59-85)
// These will be REMOVED and replaced by SnapStatsBar
{item.stats && (
  <>
    {item.stats.upvotes != null && item.stats.upvotes >= MIN_STAT_THRESHOLD && (
      <span className="snap-card-meta-stat" ...>...</span>
    )}
    {/* ...comments, views, likes */}
  </>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (same API, new name) | 2024 | Import path changed to `motion/react`. But we're not using either -- CSS is sufficient. |
| Pulse skeleton (`opacity` animation) | Shimmer skeleton (`background-position` animation) | ~2022 | YouTube/Facebook established the left-to-right shimmer as the standard loading pattern. This project's existing `skeleton-pulse` is the older opacity-based pattern. Phase 12 upgrades to shimmer for the snap skeleton. |
| `@keyframes` only for looping animations | `@keyframes` for one-shot entrance animations | Always available | `animation-fill-mode: forwards` (or `both`) makes one-shot animations work correctly -- the element stays at the final keyframe state. |

**Deprecated/outdated:**
- `framer-motion` import path: Use `motion/react` if ever needed. But CSS is the recommendation here.
- Opacity-pulse skeletons: The existing `skeleton-pulse` keyframe in `App.css` uses opacity pulsing. The new snap skeleton uses shimmer (gradient position animation) per user decision.

## Open Questions

1. **Stats bar positioning in video cards**
   - What we know: Video cards have overlapping z-index layers at the bottom (progress bar, mute button, metadata overlay). Stats bar needs to coexist.
   - What's unclear: Exact visual layout -- should stats be inside the existing gradient overlay or separate?
   - Recommendation: Integrate stats into the existing `snap-card-video-overlay` div rather than adding a new absolute layer. This avoids z-index conflicts and keeps the bottom area clean. For image and text cards, the stats bar can be a separate element since those don't have the same overlay complexity.

2. **Stats bar positioning consistency across card types**
   - What we know: Image cards have a panel section at the bottom. Text cards have a footer section. Video cards have a gradient overlay.
   - What's unclear: Should the stats bar be in a uniform absolute position across all card types, or integrated into each card's existing bottom area?
   - Recommendation: Use a consistent absolute-positioned bar at the bottom of `.snap-card-layout` for all card types. This keeps the implementation DRY (one component, one position) and provides visual consistency. The gradient background on the bar handles readability over any card content.

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** - `SnapCard.tsx`, `SnapFeed.tsx`, `useVerticalPaging.ts`, `useSnapFeed.ts`, `App.css` -- all animation integration points verified
- **CSS Animations spec** - `@keyframes`, `animation-fill-mode`, `prefers-reduced-motion` media query -- native browser features, no version concerns
- **Existing `FeedStats` type and `abbreviateNumber()`** - `types/feed.ts`, `utils/formatNumber.ts` -- data layer already complete

### Secondary (MEDIUM confidence)
- **Prior stack research** (`STACK.md`, `PITFALLS.md`) - Motion library recommendation and cross-browser animation pitfalls -- used to inform the decision to use CSS instead
- **STATE.md decisions** - "Motion for card animations only, NOT scroll physics" -- the original intent was Motion, but user's CONTEXT.md decisions (no exits, no springs) eliminate the need

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase and CSS specifications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using native CSS, no new dependencies. All techniques verified against browser standards.
- Architecture: HIGH - All integration points mapped to exact files and line numbers in the existing codebase.
- Pitfalls: HIGH - All pitfalls derive from direct analysis of the existing component structure (z-index layers, key strategy, transition properties).

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- CSS specifications don't change)
