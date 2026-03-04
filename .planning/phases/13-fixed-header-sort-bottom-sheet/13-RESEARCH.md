# Phase 13: Fixed Header & Sort Bottom Sheet - Research

**Researched:** 2026-03-04
**Domain:** UI layout (fixed header), bottom sheet component, feed state management
**Confidence:** HIGH

## Summary

This phase replaces the auto-hiding `SnapControlBar` overlay with a permanently visible fixed header containing "Army Feed" branding and sort/filter icon buttons. The sort functionality currently lives as inline pill tabs in the old control bar; it moves into a new sort bottom sheet that mirrors the existing `FilterSheet` design. The old `useControlBarVisibility` hook, `snap-reveal-zone`, and `SnapControlBar` component are deleted entirely.

The implementation is straightforward because all the hard parts already exist: the `useFeedState` reducer already handles `SET_SORT` actions with all five sort modes, the `FilterSheet` component provides a proven bottom sheet pattern (portal, backdrop, swipe-to-dismiss, slide-up animation), and the snap feed layout (`snap-page` with flexbox column) naturally accommodates a fixed header by placing it before the `snap-feed` container that uses `flex: 1`.

**Primary recommendation:** Build a new `FixedHeader` component (branding + two icon buttons) and a new `SortSheet` component (cloning FilterSheet's portal/backdrop/animation pattern). Wire both into `News.tsx`'s snap mode branch, delete all old control bar code, and adjust the `.snap-page` layout so the feed area fills remaining viewport below the header.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Solid dark opaque background, matching app dark theme
- "Army Feed" branding as bold white text only (no icon/logo), positioned top-left
- Sort and filter as icon-only buttons at top-right
- Subtle 1px border at bottom separating header from feed content
- Tapping a sort option applies immediately (instant apply, no confirm button)
- Checkmark icon next to the currently active sort option
- "Sort By" title at top of sheet, matching filter sheet's header pattern
- Sheet closes by swiping down or tapping outside (does NOT auto-close on selection)
- Feed area = viewport minus header height; cards fill remaining space, no overlap
- Compact header height (~44px) to maximize feed space on mobile
- Small colored dot indicator on sort icon when non-default sort is active
- Sort and filter indicators are independent (sort shows dot, filter shows its own count)
- Clean removal of all old control bar code: useControlBarVisibility hook, snap-reveal-zone, and related components
- Filter button moves from old control bar into the new fixed header
- No card counter or other old control bar info carried over -- header is branding + sort/filter only
- No concern about losing old control bar features

### Claude's Discretion
- Safe area / notch handling for iOS PWA (follow PWA best practices)
- Exact icon choices for sort and filter buttons
- Header typography sizing and spacing within the ~44px constraint
- Sort sheet animation timing and easing (match filter sheet)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Fixed header with "Army Feed" branding always visible at top-left | New `FixedHeader` component in `.snap-page` flexbox layout; `position: relative` (not absolute/overlay), renders before `SnapFeed` so flexbox gives it fixed space |
| NAV-02 | Sort and Filter action buttons at top-right of fixed header | Two icon buttons in header; filter reuses existing `onFilterIconClick` pattern; sort opens new `SortSheet` |
| NAV-03 | Sort button opens bottom sheet with sort options (Recommended/Newest/Oldest/Popular/Discussed) | New `SortSheet` component cloning `FilterSheet` portal+backdrop+animation pattern; dispatches `SET_SORT` actions from existing `useFeedState` reducer |
| NAV-04 | Sort and Filter bottom sheets share consistent slide-up design language | Both use `createPortal(document.body)`, identical backdrop class, identical `.cubic-bezier(0.32, 0.72, 0, 1)` transition, same border-radius/handle/padding |
| NAV-05 | Remove auto-hide control bar and related dead code | Delete `SnapControlBar.tsx`, `useControlBarVisibility.ts`, all `snap-reveal-zone` CSS/JSX, related imports/state in `News.tsx` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component framework | Already in project |
| react-dom (createPortal) | 19 | Bottom sheet rendering | Already used by FilterSheet |
| CSS (App.css) | N/A | Styling | Project convention -- single CSS file, no CSS modules |

### Supporting
No new libraries needed. All functionality is achievable with existing project dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled bottom sheet | react-spring, framer-motion | Overkill -- FilterSheet already works with CSS transitions and manual touch handling. Cloning that pattern keeps bundle small and consistent. |
| SVG inline icons | lucide-react, react-icons | Adds dependency for 2 icons. Project already uses inline SVG (see filter-icon-btn in SnapControlBar). Keep consistent. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
packages/frontend/src/
├── components/snap/
│   ├── FixedHeader.tsx      # NEW: header with branding + sort/filter icons
│   ├── SortSheet.tsx        # NEW: sort bottom sheet (clones FilterSheet pattern)
│   ├── FilterSheet.tsx      # EXISTING: unchanged
│   ├── SnapFeed.tsx         # EXISTING: unchanged
│   ├── SnapCard.tsx         # EXISTING: unchanged
│   └── SnapControlBar.tsx   # DELETE
├── hooks/
│   ├── useFeedState.ts      # EXISTING: already has SET_SORT, SortMode, all 5 modes
│   └── useControlBarVisibility.ts  # DELETE
├── pages/
│   └── News.tsx             # MODIFY: replace SnapControlBar + reveal zone with FixedHeader
└── App.css                  # MODIFY: add header styles, sort sheet styles, remove old control bar styles
```

### Pattern 1: Fixed Header in Flexbox Column Layout
**What:** The `.snap-page` uses `position: fixed; inset: 0; display: flex; flex-direction: column`. The header sits as a flex-shrink-0 child before the `SnapFeed` container (which is `flex: 1`). This naturally gives the feed the remaining viewport height without any JS height calculations.
**When to use:** When a fixed-height element must coexist with a fill-remaining-space element.
**Example:**
```tsx
// News.tsx snap mode return
<div className="snap-page">
  <FixedHeader
    feedState={feedState}
    onSortClick={() => setIsSortOpen(true)}
    onFilterClick={() => setIsFilterOpen(true)}
  />
  {isLoading && !hasItems ? (
    <SnapSkeleton />
  ) : (
    <SnapFeed items={items} onIndexChange={setSnapIndex} pagingDisabled={isFilterOpen || isSortOpen} />
  )}
  <SortSheet
    isOpen={isSortOpen}
    onClose={() => setIsSortOpen(false)}
    feedState={feedState}
    dispatch={dispatch}
  />
  <FilterSheet
    isOpen={isFilterOpen}
    onClose={() => setIsFilterOpen(false)}
    feedState={feedState}
    dispatch={dispatch}
  />
</div>
```

### Pattern 2: Bottom Sheet via Portal (Clone FilterSheet)
**What:** The SortSheet uses the same `createPortal(document.body)` approach as FilterSheet. Backdrop div with `.open` class toggles opacity/pointer-events. Inner sheet div animates `transform: translateY(100%) -> translateY(0)` with the same easing. Touch-to-dismiss via `onTouchStart/Move/End` tracking on the sheet element.
**When to use:** For all bottom sheets in this app.
**Example:**
```tsx
// SortSheet.tsx structure (mirrors FilterSheet exactly)
export default function SortSheet({ isOpen, onClose, feedState, dispatch }: SortSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // Same touch tracking refs as FilterSheet
  // Same body scroll lock useEffect as FilterSheet
  // Same handleTouchStart/Move/End as FilterSheet

  return createPortal(
    <div className={`sort-sheet-backdrop${isOpen ? " open" : ""}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className="sort-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sort-sheet-handle" />
        <h3 className="sort-sheet-title">Sort By</h3>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            className={`sort-sheet-option${feedState.sort === opt.mode ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_SORT", sort: opt.mode })}
          >
            <span>{opt.label}</span>
            {feedState.sort === opt.mode && <CheckmarkIcon />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
```

### Pattern 3: Indicator Dot for Non-Default State
**What:** A small colored dot overlaid on the sort icon when `feedState.sort !== "recommended"`. CSS positioned with `position: absolute` relative to the icon button. This matches the existing `filter-badge` pattern on the filter icon but is simpler (just a dot, no count).
**When to use:** Visual indicator that a non-default state is active.
**Example:**
```tsx
<button className="header-icon-btn" onClick={onSortClick}>
  <SortIcon />
  {feedState.sort !== "recommended" && <span className="header-icon-dot" />}
</button>
```

### Anti-Patterns to Avoid
- **Absolute positioning the header over the feed:** The old `SnapControlBar` was `position: absolute; top: 0; z-index: 20` which overlapped content. The new header MUST be a flow element (flex child) so it takes up space and the feed naturally fills the remainder. No overlap, no invisible tap targets.
- **JS-based height calculation for feed:** Don't use `window.innerHeight - headerHeight` in JavaScript. The flexbox `flex: 1` approach handles this automatically, including safe-area-inset changes on iOS.
- **Copying FilterSheet's touch logic via inheritance/abstraction:** Don't over-engineer a shared base. Just copy the ~30 lines of touch handling. Two concrete components are simpler than an abstraction for a two-use-case scenario.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet animation | Custom JS animation system | CSS `transform` + `transition` (same as FilterSheet) | CSS transitions handle the slide-up/down perfectly; FilterSheet proves this works |
| Portal rendering | Manual DOM manipulation | `createPortal(document.body)` | React's built-in; FilterSheet already uses it |
| Sort state management | New state hooks or context | Existing `useFeedState` reducer (`SET_SORT` action) | Already fully implemented with localStorage persistence |
| Safe area handling | JS-based notch detection | CSS `env(safe-area-inset-top)` | Standard PWA approach; already used in current `.snap-control-bar` padding |

**Key insight:** Nearly every building block exists. The FilterSheet is the template for SortSheet. The `useFeedState` reducer already handles all sort actions. The flexbox layout just needs the header inserted as a sibling before the feed.

## Common Pitfalls

### Pitfall 1: Feed Height Not Adjusting After Header Insertion
**What goes wrong:** Cards render at 100vh instead of (100vh - header height), causing content to overflow behind the header or get clipped.
**Why it happens:** The old `SnapControlBar` was absolutely positioned (overlay), so the feed filled the entire viewport. If the new header is also positioned absolute, the same overlap happens.
**How to avoid:** Make the header a normal flex child with `flex-shrink: 0` and a fixed height (~44px + safe-area). The `.snap-feed` with `flex: 1` will automatically fill the rest. The `.snap-card` elements use `height: 100%` relative to `.snap-feed`, so they'll adapt.
**Warning signs:** Cards are partially hidden behind the header, or the bottom of cards is cut off.

### Pitfall 2: Touch Paging Conflicts with Header
**What goes wrong:** Vertical swipe gestures that start on the header accidentally trigger feed paging, or feed swipes near the top accidentally miss.
**Why it happens:** The `useVerticalPaging` hook listens on the `containerRef` (snap-feed div). If the header is outside this div (which it should be), touches on the header won't trigger paging. This is the correct behavior by default.
**How to avoid:** Keep the header outside the `SnapFeed` component's DOM tree. The flexbox sibling approach naturally achieves this.
**Warning signs:** Swiping on the header changes cards.

### Pitfall 3: Bottom Sheet Scroll Lock Conflict
**What goes wrong:** Opening sort sheet while filter sheet is closing causes both `body.style.overflow = "hidden"` effects to interfere, leaving body scroll permanently locked.
**Why it happens:** Each sheet's `useEffect` cleanup restores `body.style.overflow = ""` independently.
**How to avoid:** Only one sheet can be open at a time (the `pagingDisabled` prop already prevents simultaneous opens). Adding `isSortOpen || isFilterOpen` to `pagingDisabled` ensures mutual exclusivity.
**Warning signs:** Page becomes unscrollable after opening and closing sheets.

### Pitfall 4: iOS PWA Safe Area Not Applied to Header
**What goes wrong:** On iPhones with notch/dynamic island, the header content overlaps the status bar area.
**Why it happens:** The viewport meta tag `viewport-fit=cover` extends content into safe areas. Without `env(safe-area-inset-top)` padding, the header's top edge sits under the system UI.
**How to avoid:** Use `padding-top: max(8px, env(safe-area-inset-top))` on the header, matching the existing pattern from `.snap-control-bar`.
**Warning signs:** Header text is hidden behind the iPhone notch/dynamic island in standalone PWA mode.

### Pitfall 5: Forgetting to Disable Paging When Sort Sheet Is Open
**What goes wrong:** User swipes down to dismiss the sort sheet, but the gesture also pages the feed.
**Why it happens:** The `pagingDisabled` prop on `SnapFeed` only checked `isFilterOpen`. Need to add `isSortOpen` too.
**How to avoid:** Pass `pagingDisabled={isFilterOpen || isSortOpen}` to SnapFeed.
**Warning signs:** Feed jumps to next card when sort sheet is dismissed.

## Code Examples

### FixedHeader Component Structure
```tsx
// packages/frontend/src/components/snap/FixedHeader.tsx
import type { FeedState } from "../../hooks/useFeedState";

interface FixedHeaderProps {
  feedState: FeedState;
  onSortClick: () => void;
  onFilterClick: () => void;
}

export default function FixedHeader({ feedState, onSortClick, onFilterClick }: FixedHeaderProps) {
  const filterCount = feedState.sources.length + feedState.members.length + feedState.contentTypes.length;
  const isSortNonDefault = feedState.sort !== "recommended";

  return (
    <header className="fixed-header">
      <span className="fixed-header-brand">Army Feed</span>
      <div className="fixed-header-actions">
        <button className="header-icon-btn" onClick={onSortClick} aria-label="Sort">
          {/* Sort icon SVG - e.g., arrows-up-down or bar-chart style */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M6 12h12" /><path d="M9 18h6" />
          </svg>
          {isSortNonDefault && <span className="header-icon-dot" />}
        </button>
        <button className="header-icon-btn" onClick={onFilterClick} aria-label="Filter">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
          {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
        </button>
      </div>
    </header>
  );
}
```

### Fixed Header CSS
```css
/* === Fixed Header === */
.fixed-header {
  flex-shrink: 0;
  height: 44px;
  padding-top: env(safe-area-inset-top);
  /* Total visual height = 44px + safe-area-inset-top */
  height: calc(44px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 8px;
  background: var(--bg-card, #1a1a2e); /* solid dark, matching theme */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 20;
}

.fixed-header-brand {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.fixed-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-icon-btn {
  position: relative;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.header-icon-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-primary);
}
```

### Sort Sheet Options Data
```tsx
const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "recommended", label: "Recommended" },
  { mode: "newest", label: "Newest First" },
  { mode: "oldest", label: "Oldest First" },
  { mode: "popular", label: "Most Popular" },
  { mode: "discussed", label: "Most Discussed" },
];
```

### Sort Sheet CSS (Mirrors FilterSheet)
```css
/* Reuse filter-sheet-backdrop pattern */
.sort-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.sort-sheet-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.sort-sheet {
  width: 100%;
  background: var(--bg-card, #1a1a2e);
  border-radius: 16px 16px 0 0;
  padding: 0 16px 24px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 201;
}

.sort-sheet-backdrop.open .sort-sheet {
  transform: translateY(0);
}
```

### News.tsx Snap Mode Changes (Diff-Style)
```tsx
// REMOVE these imports:
// import SnapControlBar from "../components/snap/SnapControlBar";
// import { useControlBarVisibility } from "../hooks/useControlBarVisibility";

// ADD these imports:
import FixedHeader from "../components/snap/FixedHeader";
import SortSheet from "../components/snap/SortSheet";

// REMOVE this state:
// const [snapIndex, setSnapIndex] = useState(0);
// const { visible: barVisible, showBar } = useControlBarVisibility({ currentIndex: snapIndex });

// ADD this state:
const [isSortOpen, setIsSortOpen] = useState(false);

// UPDATE snap mode return:
return (
  <div className="snap-page">
    <FixedHeader
      feedState={feedState}
      onSortClick={() => setIsSortOpen(true)}
      onFilterClick={() => setIsFilterOpen(true)}
    />
    {isLoading && !hasItems ? (
      <SnapSkeleton />
    ) : (
      <SnapFeed items={items} pagingDisabled={isFilterOpen || isSortOpen} />
    )}
    <SortSheet
      isOpen={isSortOpen}
      onClose={() => setIsSortOpen(false)}
      feedState={feedState}
      dispatch={dispatch}
    />
    <FilterSheet
      isOpen={isFilterOpen}
      onClose={() => setIsFilterOpen(false)}
      feedState={feedState}
      dispatch={dispatch}
    />
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-hide overlay control bar with invisible tap zone | Fixed always-visible header | This phase | Eliminates hidden UI, improves discoverability |
| Sort tabs inline in control bar | Sort bottom sheet opened via icon | This phase | Cleaner header, more room for sort option labels |
| `useControlBarVisibility` hook tracking page index | No visibility tracking needed (always visible) | This phase | Simpler state, less code |

**Deprecated/outdated:**
- `SnapControlBar.tsx`: Replaced by `FixedHeader.tsx` + `SortSheet.tsx`
- `useControlBarVisibility.ts`: No longer needed -- header is always visible
- `.snap-reveal-zone`: Invisible tap target removed entirely
- `.snap-control-bar` CSS block: Replaced by `.fixed-header` CSS

## Open Questions

1. **Icon differentiation between sort and filter**
   - What we know: Both sort and filter are icon-only buttons at top-right. The existing filter icon is a funnel (three horizontal lines). Sort needs a visually distinct icon.
   - What's unclear: Exact SVG paths for sort icon.
   - Recommendation: Use a vertical arrows icon (up/down arrows) or horizontal bars of decreasing length for sort. The existing filter icon (funnel) stays as-is. Both are inline SVG to match project convention. This is marked as Claude's discretion.

2. **SnapFeed `onIndexChange` callback -- still needed?**
   - What we know: `onIndexChange` was used to drive `useControlBarVisibility`. With the control bar gone, the only consumer was `setSnapIndex` which fed into `useControlBarVisibility`.
   - What's unclear: Whether any other code uses the snap index.
   - Recommendation: The `snapIndex` state and `onIndexChange` callback can likely be removed from News.tsx since they were only used for control bar visibility. However, the `startIndex` logic for preserving card position on sort/filter change also used `snapIndex`. Audit `News.tsx` carefully -- if `snapIndex` is only used for `useControlBarVisibility` and `startIndex`, the `startIndex` logic can use an internal ref inside `SnapFeed` instead. But since `startIndex` is passed to `SnapFeed`, some index tracking may still be needed. Keep `onIndexChange`/`snapIndex` if the position-preservation logic requires it.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- Read and analyzed all relevant source files:
  - `packages/frontend/src/components/snap/SnapControlBar.tsx` (component to delete)
  - `packages/frontend/src/hooks/useControlBarVisibility.ts` (hook to delete)
  - `packages/frontend/src/components/snap/FilterSheet.tsx` (template for SortSheet)
  - `packages/frontend/src/pages/News.tsx` (main integration point)
  - `packages/frontend/src/hooks/useFeedState.ts` (existing sort state management)
  - `packages/frontend/src/hooks/useFeed.ts` (feed data with sort support)
  - `packages/frontend/src/hooks/useVerticalPaging.ts` (paging mechanism)
  - `packages/frontend/src/hooks/useSnapFeed.ts` (snap feed index tracking)
  - `packages/frontend/src/components/snap/SnapFeed.tsx` (feed component)
  - `packages/frontend/src/components/snap/SnapCard.tsx` (card layout)
  - `packages/frontend/src/App.css` (all relevant CSS sections)
  - `packages/frontend/src/config/groups/bts/theme.ts` (theme values)
  - `packages/frontend/src/config/types.ts` (config type definitions)
  - `packages/frontend/src/config/applyTheme.ts` (CSS variable application)
  - `packages/frontend/src/config/snap.ts` (snap feed constants)

### Secondary (MEDIUM confidence)
- CSS `env(safe-area-inset-top)` for iOS PWA safe area -- standard approach, already in use in the codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns already proven in codebase
- Architecture: HIGH -- flexbox layout change is well-understood; FilterSheet clone is mechanical
- Pitfalls: HIGH -- identified from direct codebase analysis, all have clear prevention strategies

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- no external dependency changes)
