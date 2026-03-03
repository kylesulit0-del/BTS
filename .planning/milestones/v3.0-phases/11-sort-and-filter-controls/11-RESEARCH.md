# Phase 11: Sort and Filter Controls - Research

**Researched:** 2026-03-03
**Domain:** React UI controls, bottom sheet pattern, gesture handling, CSS animations, state persistence
**Confidence:** HIGH

## Summary

Phase 11 replaces the existing snap toolbar (dropdown-based source/media/bias filters) with a unified control bar featuring segmented sort tabs, a filter icon opening a bottom sheet, active filter chip display, and auto-hide behavior. The existing codebase already has all the infrastructure: `useFeedState` manages sort/source/contentType via `useReducer`+`useSearchParams`, `useBias` manages member filtering via localStorage, the server API supports all 5 sort modes, and `SeeMoreSheet` provides a working bottom sheet pattern with swipe-to-dismiss.

The primary challenge is architectural: the current `useFeedState` persists to URL params (PERF-03), but the user's Phase 11 decision explicitly says "persist in local storage (not URL params)." This requires migrating `useFeedState` from `useSearchParams` to localStorage. The second challenge is gesture coordination: the bottom sheet's swipe-to-dismiss must not conflict with the vertical paging system in `useVerticalPaging`, which already has a `gestureClaimedRef` arbitration pattern. The third challenge is the overlay control bar design -- it must float on top of snap cards with semi-transparency, auto-hide on scroll, and reappear on tap of the top screen area.

**Primary recommendation:** Build entirely with existing React 19 + vanilla CSS. No new dependencies needed. Reuse `SeeMoreSheet` patterns for the filter bottom sheet, extend `useFeedState` reducer for multi-select filters, and add a `useControlBarVisibility` hook for hide/show behavior.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Segmented tabs for sort modes + filter icon that opens a bottom sheet
- All 5 sort modes visible as tabs (horizontally scrollable if needed): Rec, New, Old, Pop, Disc
- Filter icon (hamburger) at the right end of the tab row opens bottom sheet
- Bar overlays on top of snap card content with semi-transparent background -- does not take its own vertical space
- Tabbed sections inside the sheet: Source | Member | Type tabs
- Each tab shows its filter options as tappable chips
- Source: Reddit, YouTube, RSS, Tumblr, Bluesky
- Member: RM, Jin, Suga, j-hope, Jimin, V, Jungkook, OT7
- Type: Video, Image, News, Discussion
- No "Apply" button -- filters apply live/instantly as chips are toggled
- Sheet can be dismissed by swiping down or tapping outside
- Multi-select within all categories (source, member, type)
- Active filters shown two ways: badge count on filter icon + dismissible chips below sort tabs
- "Clear all" button to reset all filters at once (no individual x on chips outside the sheet)
- Active filter chips auto-hide with the bar on scroll
- Default sort: Recommended
- Active sort tab gets a filled/highlighted background (purple pill style), inactive tabs are text-only
- When switching sorts, try to keep the current card visible if it exists in new results; fall back to top if not
- Sort and filter selections persist in local storage (not URL params)
- Bar visible on initial load (first card) so users discover controls exist
- Hides immediately when user starts scrolling down
- Reappears on tap of the top area of the screen (not scroll-up)
- Slide up/down animation for hide/show transitions

### Claude's Discretion
- Exact tab abbreviations and sizing
- Semi-transparent background opacity/blur
- Bottom sheet height and drag handle styling
- Tap target size for top-area reveal gesture
- Loading/transition state when sort/filters change
- Empty state when filters match no content

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILT-01 | User can sort the feed by Recommended (default), Newest, Oldest, Most Popular, or Most Discussed | Server API already supports all 5 sort modes via `?sort=` param. `useFeedState` reducer already has `SET_SORT` action. Build segmented tab UI dispatching sort changes. |
| FILT-02 | User sees a unified control bar consolidating source, member, and content type filters | Replace existing `snap-toolbar` with overlay control bar. Segmented sort tabs + filter icon + active chips in a single floating row. |
| FILT-03 | User can filter by source (Reddit, YouTube, RSS, Tumblr, Bluesky) | Source filtering exists in `useFeed` (server-side via API, client-side fallback). Extend to multi-select array instead of single string. Bottom sheet Source tab with chip toggles. |
| FILT-04 | User can filter by member (RM, Jin, Suga, j-hope, Jimin, V, Jungkook, OT7) | `useBias` hook already manages multi-select member filtering with localStorage. Wire into bottom sheet Member tab as chips. OT7 means "all members" -- treat as alias for group content. |
| FILT-05 | User can filter by content type (Video, Image, News, Discussion) | Content type filtering exists client-side in `News.tsx`. Note: CONTEXT says 4 types (Video, Image, News, Discussion) vs. existing 7 content types. Map existing types to these 4 categories. |
| FILT-06 | Control bar auto-hides on scroll-down and reappears on scroll-up | User decision overrides: hides on scroll-down, reappears on TAP of top area (not scroll-up). `useControlBarVisibility` hook tracking paging events and top-area tap. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Component rendering, hooks | Already in project |
| react-router-dom | 7.13.1 | URL routing (but NOT for state persistence this phase) | Already in project |
| vanilla CSS | n/a | Styling, animations, transitions | Project convention -- no CSS-in-JS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dom createPortal | 19.2.0 | Render bottom sheet outside snap feed stacking context | Required for z-index layering (same pattern as SeeMoreSheet) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled bottom sheet | react-spring-bottom-sheet, Vaul | Adds dependency; SeeMoreSheet pattern already works; project has zero UI dependencies |
| CSS animation library | Motion (framer-motion) | Phase 12 plans Motion for card animations, but control bar slide is simple CSS `transform`+`transition` |
| State management lib | Zustand, Jotai | STATE.md explicitly chose useReducer over Zustand for feed state -- page-local, no external dep needed |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── snap/
│       ├── SnapFeed.tsx            # Modified: passes control bar callbacks
│       ├── SnapControlBar.tsx      # NEW: sort tabs + filter icon + active chips
│       ├── FilterSheet.tsx         # NEW: bottom sheet with Source/Member/Type tabs
│       └── ... (existing cards)
├── hooks/
│   ├── useFeedState.ts            # MODIFIED: localStorage persistence, multi-select filters
│   ├── useControlBarVisibility.ts # NEW: auto-hide logic
│   └── useBias.ts                 # EXISTING: member filtering (may be absorbed into useFeedState)
└── pages/
    └── News.tsx                   # MODIFIED: wire new control bar, remove old snap-toolbar
```

### Pattern 1: Overlay Control Bar with CSS Transform Auto-Hide
**What:** Position the control bar with `position: absolute` inside `.snap-page`, overlaying snap cards. Use CSS `transform: translateY(-100%)` with transition to animate hide/show.
**When to use:** When the bar must not consume layout space (user decision: "does not take its own vertical space").
**Example:**
```css
.snap-control-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--control-bar-bg, rgba(26, 26, 46, 0.95));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 6px 12px;
  padding-top: max(6px, env(safe-area-inset-top));
  transform: translateY(0);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.snap-control-bar.hidden {
  transform: translateY(-100%);
}
```

### Pattern 2: Bottom Sheet via createPortal
**What:** Render filter sheet to `document.body` via `createPortal`, matching the `SeeMoreSheet` pattern.
**When to use:** The bottom sheet must escape the `.snap-page` and `.snap-feed` stacking contexts. Without portal, `z-index` layering breaks.
**Example:**
```typescript
// FilterSheet.tsx -- same portal pattern as SeeMoreSheet
export default function FilterSheet({ isOpen, onClose, ...props }: FilterSheetProps) {
  return createPortal(
    <div className="filter-sheet-backdrop" onClick={onClose}>
      <div
        className={`filter-sheet ${isOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="filter-sheet-handle" />
        {/* Tabbed content */}
      </div>
    </div>,
    document.body
  );
}
```

### Pattern 3: Multi-Select Filter State with useReducer
**What:** Extend the existing `FeedState` to hold arrays for source, member, and contentType filters instead of single strings.
**When to use:** Multi-select within all categories is a locked decision.
**Example:**
```typescript
export interface FeedState {
  sort: SortMode;
  sources: string[];       // was: source: string (single)
  members: string[];       // was: managed separately by useBias
  contentTypes: string[];  // was: contentType: string (single)
}

// Empty array = "all" (no filter)
// Non-empty array = show only matching items
```

### Pattern 4: Top-Area Tap Reveal Zone
**What:** An invisible tap target at the top of the screen that shows the hidden control bar. User decision: "reappears on tap of the top area of the screen (not scroll-up)."
**When to use:** When the control bar is hidden and user wants to bring it back.
**Example:**
```typescript
// Invisible tap zone overlaying the top ~44px of snap-feed
<div
  className="snap-reveal-zone"
  onClick={() => setBarVisible(true)}
  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, zIndex: 15 }}
/>
```

### Pattern 5: localStorage Persistence for Feed State
**What:** Replace `useSearchParams` sync with localStorage read/write. User decision explicitly says "local storage (not URL params)."
**When to use:** All sort and filter state for the snap feed.
**Conflict note:** This contradicts PERF-03 ("Filter/sort state persists in URL params"). Since this is a locked user decision for Phase 11, localStorage takes precedence for snap mode. The list mode can retain URL params if desired.
**Example:**
```typescript
const STORAGE_KEY = 'bts-feed-preferences';

function loadFeedState(): FeedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}

function saveFeedState(state: FeedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
```

### Anti-Patterns to Avoid
- **CSS `display: none` for hide/show:** Causes layout reflow and breaks transition animations. Use `transform: translateY(-100%)` instead.
- **Separate state stores for sort vs filters:** Consolidate into one reducer to avoid sync issues between sort changes and filter changes.
- **`preventDefault()` on bottom sheet touch events without checking scroll position:** The sheet has scrollable content inside (member list). Only prevent default when at scroll top and swiping down.
- **Re-fetching from server on every filter toggle:** Source/member/type filtering is all client-side. Only sort changes trigger a server re-fetch (sort is a query param to `/feed`).
- **Using scroll events for auto-hide detection:** The snap feed uses manual touch paging (`useVerticalPaging`), NOT native scroll. There are no scroll events. Detect paging gestures instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet drag-to-dismiss | Custom physics engine | Copy `SeeMoreSheet` touch pattern (threshold=80px, spring easing) | Already proven in codebase, handles edge cases |
| Gesture arbitration between sheet and paging | New gesture system | Existing `gestureClaimedRef` pattern from `useVerticalPaging`+`useSwipeGesture` | Already handles vertical/horizontal conflicts |
| Safe area insets | Manual pixel calculations | `env(safe-area-inset-top)` in CSS | Standard CSS env() function, already used in `.snap-toolbar` |

**Key insight:** The project's zero-dependency philosophy is well-established. Every UI interaction (bottom sheet, swipe gestures, virtual paging) is hand-rolled with vanilla CSS + React hooks. Phase 11 should follow the same pattern -- no new npm packages.

## Common Pitfalls

### Pitfall 1: Gesture Conflict Between Filter Sheet and Vertical Paging
**What goes wrong:** Opening the bottom sheet while the snap feed's `useVerticalPaging` is active causes touch events to be captured by both systems. Swiping down to dismiss the sheet also triggers a "page to previous" action.
**Why it happens:** `useVerticalPaging` attaches touch listeners on the container element. The bottom sheet renders via portal outside that container, but the backdrop click area overlaps.
**How to avoid:** When the filter sheet is open, pass `enabled: false` to `useVerticalPaging`. The sheet already renders via portal to `document.body`, so its touch events won't propagate to the snap container. But the backdrop tap-to-dismiss could bubble. Use `e.stopPropagation()` on the backdrop (already done in SeeMoreSheet pattern).
**Warning signs:** Swiping down on the filter sheet also moves the snap card underneath.

### Pitfall 2: Content Type Mapping Mismatch
**What goes wrong:** The user wants 4 filter types (Video, Image, News, Discussion) but the codebase has 7 content types (`news`, `fan_art`, `meme`, `video`, `discussion`, `translation`, `official`).
**Why it happens:** The filter categories in the CONTEXT.md don't map 1:1 to the `ContentType` enum.
**How to avoid:** Create a mapping: Video = `video`, Image = `fan_art` + `meme` (visual content), News = `news` + `official` + `translation`, Discussion = `discussion`. OR display all 4 as user-facing labels but filter on the underlying types. Clarify during planning.
**Warning signs:** Selecting "Image" filter shows nothing because no items have contentType exactly "image".

### Pitfall 3: Scroll Detection in a Non-Scrolling Container
**What goes wrong:** Trying to use `onScroll` or `IntersectionObserver` to detect scroll direction for auto-hide. The snap feed container has `overflow: hidden` and `touch-action: none` -- it never fires scroll events.
**Why it happens:** The snap feed uses manual `translateY` transforms via `useVerticalPaging`, not native scrolling.
**How to avoid:** Hook into the paging gesture lifecycle instead. When `useVerticalPaging` starts a downward (next page) gesture, hide the bar. Expose a callback from the paging hook or detect index changes.
**Warning signs:** Control bar never hides because scroll events never fire.

### Pitfall 4: localStorage State Migration
**What goes wrong:** Existing users have sort/filter state in URL params (from PERF-03 implementation in Phase 9). After Phase 11 migration, their URL params are ignored and state resets.
**Why it happens:** Switching from `useSearchParams` to localStorage means the old persistence mechanism is abandoned.
**How to avoid:** On first load, check if URL params exist. If so, migrate them to localStorage and clear the URL params. This provides a smooth transition.
**Warning signs:** Users who had `?sort=newest` bookmarked lose their preference.

### Pitfall 5: Stacking Context Isolation
**What goes wrong:** The control bar's `backdrop-filter: blur()` creates a new stacking context, causing the filter sheet (portaled to body) to render behind the blur. Or the `.snap-counter` renders above the control bar.
**Why it happens:** `backdrop-filter`, `transform`, and `will-change` all create new stacking contexts in CSS.
**How to avoid:** Give explicit z-index values: snap cards = 1, control bar = 20 (already used by `.snap-toolbar`), tap reveal zone = 15, filter sheet backdrop = 200, filter sheet = 201 (matching SeeMoreSheet pattern).
**Warning signs:** Visual layering looks wrong on iOS Safari specifically (WebKit stacking context handling differs from Blink).

### Pitfall 6: "Keep Current Card" on Sort Change
**What goes wrong:** User is on card index 15, changes sort from Recommended to Newest. The same card may now be at index 42 in the new order. If we naively reset to index 0, the user loses their place.
**Why it happens:** Sort changes reorder the entire `items` array passed to `useSnapFeed`.
**How to avoid:** Before applying the new sorted items, capture the current item's `id`. After items update, search for that `id` in the new array. If found, set `currentIndex` to its new position. If not found (filtered out), fall back to index 0.
**Warning signs:** Sort change always jumps to the first card, losing user's position.

## Code Examples

### Control Bar Visibility Hook
```typescript
// useControlBarVisibility.ts
import { useState, useCallback, useRef, useEffect } from "react";

interface UseControlBarVisibilityOptions {
  currentIndex: number;
}

export function useControlBarVisibility({ currentIndex }: UseControlBarVisibilityOptions) {
  const [visible, setVisible] = useState(true);
  const prevIndex = useRef(currentIndex);

  // Hide bar when index changes (user swiped to next/prev card)
  useEffect(() => {
    if (currentIndex !== prevIndex.current) {
      setVisible(false);
      prevIndex.current = currentIndex;
    }
  }, [currentIndex]);

  // Tap handler for the reveal zone
  const showBar = useCallback(() => setVisible(true), []);

  // Explicit hide (e.g., when starting a swipe)
  const hideBar = useCallback(() => setVisible(false), []);

  return { visible, showBar, hideBar };
}
```

### Multi-Select Feed State Reducer
```typescript
export interface FeedState {
  sort: SortMode;
  sources: string[];     // empty = all
  members: string[];     // empty = all
  contentTypes: string[];// empty = all
}

export type FeedAction =
  | { type: "SET_SORT"; sort: SortMode }
  | { type: "TOGGLE_SOURCE"; source: string }
  | { type: "TOGGLE_MEMBER"; member: string }
  | { type: "TOGGLE_CONTENT_TYPE"; contentType: string }
  | { type: "CLEAR_ALL_FILTERS" }
  | { type: "RESET" };

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "TOGGLE_SOURCE": {
      const sources = state.sources.includes(action.source)
        ? state.sources.filter(s => s !== action.source)
        : [...state.sources, action.source];
      return { ...state, sources };
    }
    case "TOGGLE_MEMBER": {
      const members = state.members.includes(action.member)
        ? state.members.filter(m => m !== action.member)
        : [...state.members, action.member];
      return { ...state, members };
    }
    case "TOGGLE_CONTENT_TYPE": {
      const contentTypes = state.contentTypes.includes(action.contentType)
        ? state.contentTypes.filter(t => t !== action.contentType)
        : [...state.contentTypes, action.contentType];
      return { ...state, contentTypes };
    }
    case "CLEAR_ALL_FILTERS":
      return { ...state, sources: [], members: [], contentTypes: [] };
    case "RESET":
      return DEFAULT_STATE;
    default:
      return state;
  }
}
```

### Segmented Sort Tabs
```tsx
const SORT_TABS: { mode: SortMode; label: string }[] = [
  { mode: "recommended", label: "Rec" },
  { mode: "newest", label: "New" },
  { mode: "oldest", label: "Old" },
  { mode: "popular", label: "Pop" },
  { mode: "discussed", label: "Disc" },
];

function SortTabs({ active, onChange }: { active: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div className="sort-tabs">
      {SORT_TABS.map(({ mode, label }) => (
        <button
          key={mode}
          className={`sort-tab${active === mode ? " active" : ""}`}
          onClick={() => onChange(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Active Filter Chip Row
```tsx
function ActiveFilterChips({ state, dispatch }: { state: FeedState; dispatch: React.Dispatch<FeedAction> }) {
  const activeCount = state.sources.length + state.members.length + state.contentTypes.length;
  if (activeCount === 0) return null;

  return (
    <div className="active-filter-chips">
      {/* Show chip labels for active filters */}
      {state.sources.map(s => <span key={s} className="filter-chip">{s}</span>)}
      {state.members.map(m => <span key={m} className="filter-chip">{m}</span>)}
      {state.contentTypes.map(t => <span key={t} className="filter-chip">{t}</span>)}
      <button className="filter-clear-all" onClick={() => dispatch({ type: "CLEAR_ALL_FILTERS" })}>
        Clear all
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dropdown filters (current snap-toolbar) | Segmented tabs + bottom sheet | Phase 11 | Replaces SnapDropdown component entirely |
| Single-select source/contentType | Multi-select arrays | Phase 11 | FeedState shape changes; useFeed filtering logic must handle arrays |
| URL param persistence (useSearchParams) | localStorage persistence | Phase 11 | useFeedState rewritten; PERF-03 behavior changes for snap mode |
| Separate useBias hook for member filtering | Consolidated into useFeedState | Phase 11 | Member state moves from dedicated hook into unified reducer |
| Static toolbar always visible | Auto-hiding overlay bar | Phase 11 | New useControlBarVisibility hook; bar position changes from flow to absolute |

**Deprecated/outdated:**
- `SnapDropdown` component (inline in News.tsx): Replaced entirely by SnapControlBar + FilterSheet
- Current `.snap-toolbar` CSS: Replaced by `.snap-control-bar` overlay styles
- `useBias` hook as separate concern: Member filtering absorbed into consolidated `useFeedState`

## Key Implementation Notes

### Server API Already Supports Everything
The `/feed` endpoint (in `packages/server/src/routes/feed.ts`) already accepts:
- `?sort=recommended|newest|oldest|popular|discussed` -- all 5 modes
- `?source=reddit|youtube|...` -- source filtering
- `?contentType=...` -- content type filtering

Sort is computed server-side on a 500-item candidate set. Source and contentType can be filtered server-side. However, **member filtering is always client-side** (text-matching against member aliases in item title/preview).

### Data Flow
1. User taps sort tab -> dispatch SET_SORT -> useFeed re-fetches with new sort param -> items array reorders -> useSnapFeed receives new items -> attempt to preserve current card position
2. User toggles filter chip -> dispatch TOGGLE_SOURCE/MEMBER/TYPE -> useFeed applies client-side filtering -> filtered items array updates -> useSnapFeed receives fewer items -> reset to top if current card filtered out
3. Sort changes trigger server re-fetch; filter changes are client-side only (no network request)

### Existing Infrastructure to Reuse
- `SeeMoreSheet` pattern: portal rendering, swipe-to-dismiss, backdrop click, z-index 200/201
- `useVerticalPaging` gesture arbitration: `gestureClaimedRef` pattern
- `useBias` localStorage pattern: load/save with try/catch
- CSS easing: `cubic-bezier(0.32, 0.72, 0, 1)` used throughout for spring animations
- `env(safe-area-inset-top)` padding in toolbar
- `--control-bar-bg` CSS variable already in theme tokens

### Content Type Category Mapping
User wants 4 categories; codebase has 7 types. Recommended mapping:
- **Video** -> `video`
- **Image** -> `fan_art`, `meme` (visual content without video)
- **News** -> `news`, `official`, `translation`
- **Discussion** -> `discussion`

This means the filter is a category-to-types mapping, not a direct 1:1 match.

## Open Questions

1. **Content type category mapping**
   - What we know: User wants 4 filter types; codebase has 7 ContentType values
   - What's unclear: Whether the user intends exact 1:1 mapping or category grouping
   - Recommendation: Use the 4-category grouping above. It covers all 7 types and matches user intent. Can be adjusted later.

2. **OT7 member filter behavior**
   - What we know: "OT7" is listed as a member filter option
   - What's unclear: Does OT7 mean "show content about all 7 members together" or "show everything (reset member filter)"?
   - Recommendation: Treat OT7 as "content tagged as group content" (matching aliases like "bts", "bangtan"). If OT7 is the only member selected, it acts like a group content filter. If combined with individual members, it unions.

3. **Multi-source API behavior**
   - What we know: Server `/feed` endpoint accepts a single `?source=` param
   - What's unclear: How to pass multiple selected sources to the server
   - Recommendation: Apply multi-source filtering client-side (same as member/type). Only use server `?source=` when exactly one source is selected. This avoids API changes.

4. **List mode feed state**
   - What we know: Phase 11 moves snap feed state to localStorage. The list mode (feedMode="list") currently uses URL params via useFeedState.
   - What's unclear: Should list mode also migrate to localStorage, or keep URL params?
   - Recommendation: Only change snap mode. Guard the localStorage logic behind `feedMode === "snap"`. List mode retains URL params for backward compatibility.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/frontend/src/hooks/useFeedState.ts` -- current reducer + URL param sync
- Codebase inspection: `packages/frontend/src/hooks/useFeed.ts` -- data fetching, client-side filtering
- Codebase inspection: `packages/frontend/src/hooks/useBias.ts` -- localStorage member persistence pattern
- Codebase inspection: `packages/frontend/src/components/snap/SeeMoreSheet.tsx` -- bottom sheet pattern
- Codebase inspection: `packages/frontend/src/components/snap/SnapFeed.tsx` -- snap feed architecture
- Codebase inspection: `packages/frontend/src/hooks/useVerticalPaging.ts` -- gesture arbitration
- Codebase inspection: `packages/server/src/routes/feed.ts` -- server API sort/filter support
- Codebase inspection: `packages/frontend/src/App.css` -- snap CSS patterns, z-index hierarchy
- Codebase inspection: `packages/frontend/src/config/groups/bts/theme.ts` -- controlBarBg token

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` -- project decisions: useReducer over Zustand, zero-dep UI philosophy
- `.planning/REQUIREMENTS.md` -- PERF-03 conflict with localStorage decision

### Tertiary (LOW confidence)
- Content type category mapping is researcher's recommendation, not user-confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns exist in codebase
- Architecture: HIGH -- clear patterns from existing SeeMoreSheet, useFeedState, useVerticalPaging
- Pitfalls: HIGH -- gesture conflicts, stacking contexts, and scroll detection issues identified from direct code analysis

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain, no fast-moving dependencies)
