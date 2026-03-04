# Architecture Research

**Domain:** Integration of enhanced feed UI into existing snap feed system
**Researched:** 2026-03-04
**Confidence:** HIGH

## Existing System Overview

```
snap-page (position: fixed, inset: 0, flex column)
 |
 +-- SnapControlBar (absolute, z:20, auto-hide overlay)      <-- REPLACE with SnapHeader
 |    +-- sort tabs (Rec/New/Old/Pop/Disc)                   <-- MOVE into SortSheet
 |    +-- filter icon + badge                                <-- MOVE into SnapHeader
 |    +-- active filter chips                                <-- MOVE into SnapHeader
 |
 +-- snap-reveal-zone (absolute, z:15, tap-to-show)          <-- REMOVE
 |
 +-- SnapFeed (flex:1, overflow:hidden, touch-action:none)
 |    +-- snap-paging-track (translateY for spring transitions)
 |    |    +-- SnapCard[-1] (absolute, top:-100%)
 |    |    +-- SnapCard[0]  (absolute, top:0) -- active
 |    |    +-- SnapCard[+1] (absolute, top:100%)
 |    |
 |    +-- snap-counter (absolute, bottom:12px)
 |
 +-- FilterSheet (createPortal to body)
```

### Hook Architecture

```
News.tsx (page)
  +-- useFeedState()             -- sort/filter state with localStorage persistence
  +-- useFeed()                  -- API fetch with sort/source/member params
  +-- useControlBarVisibility()  -- hide bar on index change, show on tap  <-- REMOVE
  |
  +-- SnapFeed (component)
       +-- useSnapFeed()         -- 3-item DOM window, currentIndex, goNext/goPrev
       +-- useVerticalPaging()   -- touch-driven translateY with spring animation
       |    returns: trackRef, containerRef, gestureClaimedRef, onTransitionEnd
       |
       +-- SnapCard (per visible item)
            +-- useSwipeGesture() -- horizontal right-swipe via gestureClaimedRef axis locking
```

### Gesture Axis Locking (Critical Integration Point)

`useVerticalPaging` and `useSwipeGesture` share a `gestureClaimedRef` for mutual exclusion:

1. On touchstart, both reset: `gestureClaimedRef.current = null`
2. On touchmove, first to exceed dead zone (10px) claims the axis:
   - Vertical wins (dy > dx * 1.5): `gestureClaimedRef.current = "vertical"` -- blocks horizontal
   - Horizontal wins (dx > dy * 1.5): `gestureClaimedRef.current = "horizontal"` -- blocks vertical
3. On touchend/transitionEnd, ref resets to null

Touch events are registered on `containerRef` (the `.snap-feed` div) via `addEventListener` with `{ passive: true }`. The swipe gesture uses React synthetic events on the `.snap-card-layout` div.

**Key constraint:** Iframes swallow ALL touch events. When the iframe is active and loaded (visible YouTube/TikTok video), touch events on the iframe area never reach `containerRef`. The iframe creates a separate browsing context. This is the bug that the touch overlay must fix.

## Integration Architecture for New Features

### Feature 1: Transparent Touch Overlay for Video Iframes

**Problem:** When a YouTube/TikTok iframe is active and loaded, the iframe captures all touch events. `useVerticalPaging` touch listeners on `.snap-feed` (`containerRef`) never fire. User cannot swipe up/down to navigate away from a playing video card.

**Solution:** Render a transparent `<div>` above the iframe (higher z-index) that intercepts touch events. Since this overlay div exists in the same DOM tree as `containerRef`, touch events naturally bubble up from the overlay through the DOM to `containerRef`, where `useVerticalPaging` picks them up.

**Why this works (DOM event bubbling):**

1. User touches the overlay (a regular div inside the snap-feed tree)
2. Touch event fires on overlay, bubbles up through DOM: overlay -> snap-card-video -> snap-card-content -> snap-card-layout -> snap-card -> snap-paging-track -> snap-feed (containerRef)
3. `useVerticalPaging` touchstart/touchmove/touchend listeners on containerRef fire normally
4. Axis locking works as before via gestureClaimedRef
5. The overlay ALSO tracks touches locally to detect taps vs. drags for play/pause

No event forwarding or synthetic event dispatching needed. Standard DOM bubbling handles everything.

**Integration point:** Inside `SnapCardVideo`, above the iframe.

```
SnapCardVideo (position: relative)
  +-- video-facade (loading state, z-index: 2)
  +-- <iframe> (z-index: 1)
  +-- touch-overlay (z-index: 3, position: absolute, inset: 0)
  |    - pointer-events: auto (captures all touch on video area)
  |    - On tap (movement < 10px): calls togglePlayPause
  |    - On swipe: does nothing -- events bubble to containerRef naturally
  +-- mute-btn (z-index: 10, pointer-events: auto)
  +-- progress bar (z-index: 10)
  +-- metadata overlay (z-index: 5, pointer-events: none)
```

**What changes:**

| File | Change Type | Description |
|------|-------------|-------------|
| `SnapCardVideo.tsx` | MODIFY | Add transparent overlay div above iframe. Replace `onClick={togglePlayPause}` on outer div with tap detection on overlay. |
| `useVerticalPaging.ts` | NO CHANGE | Touch listeners already on containerRef. Bubbling from overlay reaches them. |
| `useSwipeGesture.ts` | NO CHANGE | Axis locking via gestureClaimedRef works as before. |
| `App.css` | MODIFY | Add `.snap-card-video-touch-overlay` styles. |

**Tap detection implementation:**

```typescript
// Inside SnapCardVideo
const touchStartPos = useRef({ x: 0, y: 0 });

const onOverlayTouchStart = (e: React.TouchEvent) => {
  touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
};

const onOverlayTouchEnd = (e: React.TouchEvent) => {
  const touch = e.changedTouches[0];
  const dx = Math.abs(touch.clientX - touchStartPos.current.x);
  const dy = Math.abs(touch.clientY - touchStartPos.current.y);
  if (dx < 10 && dy < 10) {
    togglePlayPause(); // Tap, not swipe
  }
  // Swipes: useVerticalPaging already handled via bubbling
};
```

**Mute button interaction:** Currently at z-index 10, above the overlay's z-index 3. Button events fire on the button directly. Its existing `e.stopPropagation()` prevents tap-to-play/pause from also firing. No changes needed.

### Feature 2: Media-Centric Card Layout Rearrangement

**Current card layouts diverge significantly:**

- **VideoCard:** Full-bleed iframe (100% height), metadata in gradient overlay at bottom, stats bar absolute-positioned
- **ImageCard:** Image hero (flex: 0 0 60%), panel below with SnapCardMeta + preview text
- **TextCard:** Title + preview centered, SnapCardMeta in footer

**Target: Unified two-zone layout for all variants:**

```
+--------------------------------------------------+
|                                                  |
|              Media Zone (~60%)                   |
|   (image / video iframe+overlay / gradient bg)   |
|                                                  |
+--------------------------------------------------+
| Title                                            |
| source-dot  author  time-ago                     |
| First 100-150 chars of description...            |
| (Show More)                        upvotes cmt v |
+--------------------------------------------------+
```

**Architecture decision: Lift shared layout into SnapCard.**

Currently each variant independently renders its own SnapCardMeta, handles its own layout split, and positions SnapStatsBar. The unified layout means title, metadata, snippet, stats, and "(Show More)" all live in a shared info zone rendered by `SnapCard`. The variant components only render their media zone content.

**Restructured SnapCard:**

```tsx
<div className="snap-card-layout" {...handlers} style={swipeStyle}>
  <div className="snap-card-content" style={style}>
    {/* Source link button -- top right */}
    <button className="snap-card-source-link" onClick={openSourceUrl}>...</button>

    {/* Media zone: ~60% height */}
    <div className="snap-card-media-zone">
      {variant === "video" && <SnapCardVideoMedia item={item} isActive={isActive} />}
      {variant === "image" && <SnapCardImageMedia item={item} />}
      {variant === "text" && <SnapCardTextMedia />}
    </div>

    {/* Info zone: remaining height */}
    <div className="snap-card-info-zone">
      <SnapCardMeta item={item} />
      <SnapCardSnippet item={item} onShowMore={openSourceUrl} />
      <SnapStatsBar stats={item.stats} />
    </div>
  </div>
</div>
```

**What changes:**

| File | Change Type | Description |
|------|-------------|-------------|
| `SnapCard.tsx` | MODIFY | Add two-zone layout structure. Move SnapCardMeta, snippet, SnapStatsBar into shared info zone. Variant components only render media zone. |
| `SnapCardVideo.tsx` | MODIFY | Remove SnapCardMeta import, remove metadata overlay div, remove bottom gradient. Export only media zone content (iframe + facade + touch overlay). |
| `SnapCardImage.tsx` | MODIFY | Remove SnapCardMeta, remove preview text rendering. Export only image hero. |
| `SnapCardText.tsx` | MODIFY | Remove title, preview text, footer. Export only gradient/placeholder hero for media zone. |
| `SnapStatsBar.tsx` | MODIFY | Change from absolute-positioned gradient overlay to inline flex row. Remove gradient background. |
| `App.css` | MODIFY | Add `.snap-card-media-zone` (flex: 0 0 60%), `.snap-card-info-zone` (flex: 1). Update stats bar to remove absolute positioning. |
| `SeeMoreSheet.tsx` | NO CHANGE | Keep component, but remove triggers from card variants. "(Show More)" now opens source URL directly. SeeMoreSheet may be removed in a future cleanup. |

**Snippet logic (new SnapCardSnippet component):**

```typescript
function getSnippet(preview: string | undefined): string | null {
  if (!preview) return null;
  const max = 150;
  if (preview.length <= max) return preview;
  const truncated = preview.slice(0, max);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function SnapCardSnippet({ item, onShowMore }: { item: FeedItem; onShowMore: () => void }) {
  const snippet = getSnippet(item.preview);
  if (!snippet) return null;
  return (
    <div className="snap-card-snippet">
      <p className="snap-card-snippet-text">{snippet}</p>
      <button className="snap-card-show-more" onClick={onShowMore}>
        (Show More)
      </button>
    </div>
  );
}
```

"(Show More)" opens original source URL via `window.open(item.url, '_blank', 'noopener')` per requirements. This replaces the current "...See More" button that opened SeeMoreSheet.

### Feature 3: Fixed Header Replacing Auto-Hide Control Bar

**Current behavior:** `SnapControlBar` is absolutely positioned at top of `.snap-page`, slides up via CSS transform on index change (useControlBarVisibility), revealed by tapping a transparent `.snap-reveal-zone`. Contains sort tabs inline + filter icon + active filter chips.

**Target behavior:** Fixed header always visible. Contains "Army Feed" branding on left, Sort button and Filter button on right. No auto-hide. No reveal zone.

**Layout change:**

```
BEFORE:                              AFTER:
+---------------------------+        +---------------------------+
| SnapControlBar (absolute) |        | SnapHeader (in-flow)      |
| auto-hides on swipe       |        | always visible, ~48px     |
+===========================+        +===========================+
|                           |        |                           |
| SnapFeed (flex:1)         |        | SnapFeed (flex:1)         |
| height: 100% of snap-page|        | height: remaining space   |
|                           |        |                           |
+---------------------------+        +---------------------------+
```

**Critical implication:** Moving from absolute overlay to in-flow flex child shrinks the feed viewport by header height (~48px). Cards fill the SnapFeed container, which is `flex: 1` and fills remaining space. `useVerticalPaging` already measures `container.clientHeight` dynamically for paging distances, so transitions auto-adjust. No hook changes needed.

**What changes:**

| File | Change Type | Description |
|------|-------------|-------------|
| `SnapControlBar.tsx` | REPLACE | Delete and create `SnapHeader.tsx` -- fixed header with brand left, sort/filter buttons right. |
| `useControlBarVisibility.ts` | DELETE | No longer needed. Header always visible. |
| `News.tsx` | MODIFY | Remove useControlBarVisibility, remove snapIndex/setSnapIndex (only used for bar visibility), remove snap-reveal-zone div, replace SnapControlBar with SnapHeader, add isSortOpen state. |
| `SnapFeed.tsx` | MODIFY | Remove `onIndexChange` prop (no longer needed). |
| `App.css` | MODIFY | Replace `.snap-control-bar` with `.snap-header`. Remove `.snap-reveal-zone`. Remove auto-hide transition styles. |

**SnapHeader component:**

```tsx
interface SnapHeaderProps {
  onSortClick: () => void;
  onFilterClick: () => void;
  filterCount: number;
}

function SnapHeader({ onSortClick, onFilterClick, filterCount }: SnapHeaderProps) {
  return (
    <header className="snap-header">
      <span className="snap-header-brand">Army Feed</span>
      <div className="snap-header-actions">
        <button className="snap-header-btn" onClick={onSortClick}>
          {/* Sort icon SVG */} Sort
        </button>
        <button className="snap-header-btn" onClick={onFilterClick}>
          {/* Filter icon SVG */}
          {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
        </button>
      </div>
    </header>
  );
}
```

**CSS for SnapHeader:**

```css
.snap-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: var(--bg-primary);
  z-index: 20;
}
```

### Feature 4: Sort Bottom Sheet

**Current sort UI:** Inline horizontal pill tabs in SnapControlBar (Rec/New/Old/Pop/Disc). User taps a pill to change sort.

**Target sort UI:** Bottom sheet triggered by Sort button in header. Matches FilterSheet's visual design: slide-up from bottom, drag handle, backdrop, drag-to-dismiss.

**Architecture decision: Extract shared BottomSheet wrapper.**

FilterSheet and SortSheet share identical mechanics: createPortal to body, backdrop click-to-close, drag handle, drag-to-dismiss (80px threshold), body scroll lock. Extract a reusable `BottomSheet` component.

**What changes:**

| File | Change Type | Description |
|------|-------------|-------------|
| `BottomSheet.tsx` | NEW | Shared wrapper: portal, backdrop, drag handle, drag-to-dismiss, body scroll lock. Extracted from FilterSheet logic. |
| `SortSheet.tsx` | NEW | Sort option list (5 modes) inside BottomSheet. Single-select (radio style). Closes on selection. |
| `FilterSheet.tsx` | MODIFY | Refactor to use BottomSheet wrapper instead of duplicating portal/backdrop/drag logic. |
| `SeeMoreSheet.tsx` | MODIFY | Optionally refactor to use BottomSheet wrapper for consistency. |
| `News.tsx` | MODIFY | Add `isSortOpen` state. Pass to SortSheet. Wire to SnapHeader's `onSortClick`. Extend `pagingDisabled` to `isFilterOpen \|\| isSortOpen`. |
| `App.css` | MODIFY | Add `.bottom-sheet-*` shared classes. Add `.sort-sheet-*` specific styles. Refactor `.filter-sheet-*` to use shared classes. |

**BottomSheet component:**

```tsx
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  // Body scroll lock on open
  // Drag-to-dismiss with 80px threshold
  // createPortal to document.body
  return createPortal(
    <div className={`bottom-sheet-backdrop${isOpen ? ' open' : ''}`} onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()} onTouch...>
        <div className="bottom-sheet-handle" />
        {children}
      </div>
    </div>,
    document.body
  );
}
```

**SortSheet component:**

```tsx
const SORT_OPTIONS = [
  { mode: "recommended", label: "Recommended", desc: "Best mix of new and popular" },
  { mode: "newest", label: "Newest First", desc: "Most recent content" },
  { mode: "oldest", label: "Oldest First", desc: "Earliest content" },
  { mode: "popular", label: "Most Popular", desc: "Highest engagement" },
  { mode: "discussed", label: "Most Discussed", desc: "Most comments" },
];

function SortSheet({ isOpen, onClose, currentSort, onSortChange }: SortSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="sort-sheet-content">
        <h3 className="sort-sheet-title">Sort by</h3>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.mode}
            className={`sort-option${currentSort === opt.mode ? ' active' : ''}`}
            onClick={() => { onSortChange(opt.mode); onClose(); }}
          >
            <span className="sort-option-label">{opt.label}</span>
            <span className="sort-option-desc">{opt.desc}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
```

**Paging disabled when any sheet open:** Extend `pagingDisabled={isFilterOpen || isSortOpen}` in News.tsx.

## Data Flow Changes

### Before (Current v3.0)

```
News.tsx
  |-- useFeedState() ----------> feedState {sort, sources, members, contentTypes}
  |-- useFeed(feedState) ------> items[]
  |-- useControlBarVisibility(snapIndex) --> barVisible
  |
  |-- SnapControlBar (sort tabs inline, filter icon, filter chips)
  |     |-- dispatch(SET_SORT) on tab click
  |     |-- onFilterIconClick --> setIsFilterOpen(true)
  |
  |-- snap-reveal-zone (tap --> showBar)
  |
  |-- SnapFeed (items, onIndexChange=setSnapIndex, pagingDisabled=isFilterOpen)
  |
  |-- FilterSheet (feedState, dispatch)
```

### After (v4.0)

```
News.tsx
  |-- useFeedState() ----------> feedState {sort, sources, members, contentTypes}
  |-- useFeed(feedState) ------> items[]
  |
  |-- SnapHeader (onSortClick, onFilterClick, filterCount)
  |
  |-- SnapFeed (items, pagingDisabled=isFilterOpen||isSortOpen)
  |     (no onIndexChange -- no longer needed)
  |
  |-- SortSheet (feedState.sort, dispatch)   -- via BottomSheet wrapper
  |-- FilterSheet (feedState, dispatch)      -- via BottomSheet wrapper
```

**Removed:**
- `useControlBarVisibility` hook (deleted entirely)
- `snapIndex` / `setSnapIndex` state in News.tsx
- `snap-reveal-zone` div
- `onIndexChange` prop on SnapFeed
- Sort tabs from control bar inline UI
- `SnapControlBar` component (replaced by `SnapHeader`)

**Added:**
- `SnapHeader` component (always visible)
- `BottomSheet` shared wrapper component
- `SortSheet` component
- `isSortOpen` state in News.tsx
- `SnapCardSnippet` component
- Touch overlay div in SnapCardVideo

**Modified:**
- `FilterSheet` (refactored to use BottomSheet wrapper)
- `SnapCard` (unified two-zone layout)
- `SnapCardVideo` (media zone only + touch overlay)
- `SnapCardImage` (media zone only)
- `SnapCardText` (media zone only)
- `SnapStatsBar` (inline instead of absolute-positioned)

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `SnapHeader` | Brand text + sort/filter trigger buttons, always visible | News.tsx (callbacks for opening sheets) |
| `BottomSheet` | Shared portal + backdrop + drag-dismiss + body scroll lock | FilterSheet, SortSheet (as wrapper) |
| `SortSheet` | Sort option list (radio-style single select) | News.tsx via dispatch(SET_SORT) |
| `FilterSheet` | Multi-select filter tabs (source/member/type) | News.tsx via dispatch (unchanged API) |
| `SnapCard` | Unified two-zone layout: media zone + info zone (meta, snippet, stats) | Variant media components |
| `SnapCardVideoMedia` | Video iframe + facade + touch overlay (media zone only) | SnapCard parent (isActive prop) |
| `SnapCardImageMedia` | Image hero display (media zone only) | SnapCard parent |
| `SnapCardTextMedia` | Gradient placeholder (media zone only) | SnapCard parent |
| `SnapCardSnippet` | Auto-truncated preview text + "(Show More)" link | SnapCard parent |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synthetic Touch Event Forwarding

**What people do:** Capture touch events on the overlay and manually dispatch synthetic `TouchEvent` on containerRef using `dispatchEvent`.
**Why it's wrong:** Synthetic TouchEvents lack `isTrusted: true`. Browser security may reject them. Complex state tracking to reconstruct touch sequences. Fragile across browsers and versions.
**Do this instead:** Let DOM event bubbling work naturally. The overlay div is a descendant of containerRef. Events bubble automatically without intervention. useVerticalPaging's listeners on containerRef fire natively.

### Anti-Pattern 2: pointer-events Toggle During Active Touch

**What people do:** Set `pointer-events: none` on the overlay mid-touch to let events pass through to the iframe underneath.
**Why it's wrong:** Changing pointer-events during an active touch sequence does NOT re-target the touch. The original target continues receiving events until touchend. The intent (let iframe receive touches for its native controls) fails silently.
**Do this instead:** Keep the overlay permanently above the iframe with `pointer-events: auto`. Handle play/pause via tap detection on the overlay. The iframe's native tap-to-play is replaced by the overlay's tap handler calling `togglePlayPause` via `postMessage`.

### Anti-Pattern 3: Separate Gesture System for Overlay

**What people do:** Create a second `useVerticalPaging` instance specifically for the touch overlay, thinking it needs its own gesture handling since it's above the iframe.
**Why it's wrong:** Two competing gesture systems processing the same touch sequence causes double-fires, conflicting animations, and race conditions on the shared `gestureClaimedRef`.
**Do this instead:** One useVerticalPaging instance on containerRef. The overlay's touch events bubble to containerRef naturally. Zero duplication.

### Anti-Pattern 4: Absolute Header with Padding Compensation

**What people do:** Keep the header absolutely positioned (like current SnapControlBar) and add `padding-top` to the feed container to avoid overlap.
**Why it's wrong:** Header height varies with safe-area-inset-top and potentially active filter chips. Hard-coded padding leads to content overlap or gaps. Dynamic calculation adds fragile resize observers.
**Do this instead:** Make the header an in-flow flex child (not absolute). The feed container (`flex: 1`) naturally fills remaining space. `useVerticalPaging` already measures `containerRef.clientHeight` dynamically.

### Anti-Pattern 5: Duplicating Bottom Sheet Mechanics

**What people do:** Copy-paste FilterSheet's portal/backdrop/drag code into SortSheet, creating two independent implementations of the same pattern.
**Why it's wrong:** Bug fixes must be applied twice. Behavior drifts between sheets. Animation timing, drag threshold, body scroll lock logic diverges silently.
**Do this instead:** Extract `BottomSheet` wrapper. FilterSheet and SortSheet become thin content wrappers around shared mechanics.

## Build Order (Dependency-Driven)

### Phase 1: BottomSheet + SortSheet + FixedHeader

**Rationale:** Pure UI-layer changes. No touch on gesture system. Low risk. Independently testable.

1. Create `BottomSheet.tsx` -- extract portal/backdrop/drag-dismiss from FilterSheet
2. Refactor `FilterSheet.tsx` to use BottomSheet wrapper (functional parity, visual parity)
3. Create `SortSheet.tsx` using BottomSheet wrapper
4. Create `SnapHeader.tsx` replacing SnapControlBar
5. Update `News.tsx`: remove useControlBarVisibility, remove snapIndex state, remove snap-reveal-zone, add isSortOpen state, swap SnapControlBar for SnapHeader + SortSheet, extend pagingDisabled
6. Delete `useControlBarVisibility.ts`
7. Remove `onIndexChange` prop from `SnapFeed.tsx`
8. Update `App.css`: add snap-header/bottom-sheet/sort-sheet styles, remove snap-control-bar auto-hide + snap-reveal-zone styles

**Test checkpoint:** Header always visible. Sort sheet opens/closes. Filter sheet still works. Paging disabled when either sheet open. Vertical swipe navigation unaffected.

### Phase 2: Touch Overlay for Video Cards

**Rationale:** Touches SnapCardVideo internals and gesture system integration. Must be tested on real mobile device with loaded YouTube iframe. Independent of Phase 1 UI changes.

1. Add transparent touch overlay div in `SnapCardVideo.tsx` above the iframe (z-index 3)
2. Add tap detection (touchstart/touchend position delta < 10px threshold)
3. On tap: call `togglePlayPause`
4. Remove `onClick={togglePlayPause}` from the outer `.snap-card-video` div
5. Ensure overlay does NOT call `e.stopPropagation()` (events must bubble to containerRef)
6. Ensure mute button z-index (10) remains above overlay z-index (3)
7. Update CSS for `.snap-card-video-touch-overlay`

**Test checkpoint:** Can swipe up/down past a playing YouTube video on mobile. Tapping pauses/resumes video. Mute button still accessible. Horizontal swipe-to-open-source still works (gestureClaimedRef axis locking).

### Phase 3: Media-Centric Card Rearrangement

**Rationale:** Largest visual change, touches all three card variants and the shared SnapCard wrapper. Phases 1-2 must be stable first since this changes the card DOM structure that gesture handlers attach to.

1. Create `SnapCardSnippet` component (auto-truncate 150 chars, "(Show More)" opens source URL)
2. Restructure `SnapCard.tsx`: add two-zone layout (media-zone + info-zone), render shared SnapCardMeta + SnapCardSnippet + SnapStatsBar in info zone
3. Refactor `SnapCardVideo.tsx`: remove SnapCardMeta, remove bottom gradient overlay, export only media zone content (iframe + facade + touch overlay from Phase 2)
4. Refactor `SnapCardImage.tsx`: remove SnapCardMeta, remove preview text. Export only image hero div.
5. Refactor `SnapCardText.tsx`: replace title/text layout with gradient placeholder hero for media zone. Remove internal title/footer rendering.
6. Modify `SnapStatsBar.tsx`: change from absolute-positioned gradient overlay to inline flex row within info zone. Remove `position: absolute`, `background: linear-gradient(...)`.
7. Update `App.css`: add `.snap-card-media-zone` (flex: 0 0 60%), `.snap-card-info-zone` (flex: 1), update stats bar styles, remove variant-specific meta styles that moved to shared zone.
8. Remove `SeeMoreSheet` triggers from card variants (replaced by "(Show More)" source link)

**Test checkpoint:** All three card types show media top / info bottom. Snippets truncate at ~150 chars. "(Show More)" opens source URL in new tab. Stats display inline in info zone. Video touch overlay still works within new media zone structure. Layout consistent across video/image/text cards.

## Sources

- Direct codebase analysis: `useVerticalPaging.ts`, `useSwipeGesture.ts`, `useSnapFeed.ts`, `SnapFeed.tsx`, `SnapCard.tsx`, `SnapCardVideo.tsx`, `SnapCardImage.tsx`, `SnapCardText.tsx`, `SnapControlBar.tsx`, `FilterSheet.tsx`, `SeeMoreSheet.tsx`, `SnapStatsBar.tsx`, `useControlBarVisibility.ts`, `useFeedState.ts`, `useSnapVideo.ts`, `News.tsx`, `App.css` (HIGH confidence -- full source read)
- DOM event bubbling: W3C UI Events spec -- events on child elements bubble to ancestor event listeners unless `stopPropagation()` is called (browser standard, HIGH confidence)
- iframe touch event isolation: cross-origin iframes are separate browsing contexts that do not propagate touch events to parent document DOM (web platform standard, HIGH confidence)

---
*Architecture research for: BTS Army Feed v4.0 -- enhanced feed UI integration*
*Researched: 2026-03-04*
