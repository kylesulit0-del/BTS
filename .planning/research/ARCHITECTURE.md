# Architecture: v3.0 Immersive Feed Integration

**Domain:** TikTok-style snap feed, sort/filter global state, virtualized rendering
**Researched:** 2026-03-03
**Confidence:** HIGH (existing codebase fully audited, CSS scroll-snap and IntersectionObserver patterns verified against MDN docs and production implementations)

## Existing Architecture (Baseline)

The current frontend has this structure:

```
packages/frontend/src/
  pages/
    News.tsx              Feed page -- owns ALL state (filter, contentType, viewMode, bias)
  components/
    SwipeFeed.tsx         Horizontal swipe cards (IntersectionObserver for current index)
    FeedCard.tsx          List view card (thumbnail, video embed, stats, meta)
    FeedFilter.tsx        Source filter tabs (reddit, youtube, news, etc.)
    BiasFilter.tsx        Member chip toggles
    VideoEmbed.tsx        Lazy iframe loader (IntersectionObserver for viewport entry)
  hooks/
    useFeed.ts            Data fetching + caching (localStorage 5min TTL) + source/bias filtering
    useBias.ts            Bias selection persistence (localStorage)
    useVideoAutoplay.ts   IntersectionObserver for video play/pause + one-at-a-time enforcement
  services/
    feedService.ts        Dual-mode: API fetch (primary) with client-side fallback
    api.ts                fetchApiFeed() -- page-based pagination, source/contentType params
  config/
    types.ts              GroupConfig, ThemeConfig, SourceEntry, MemberConfig
    applyTheme.ts         CSS custom properties from config
```

### Current Data Flow

```
News.tsx (page)
  |-- useState: filter, contentTypeFilter, viewMode, biases
  |-- useFeed(filter, biases) -> allItems + client-side filtering
  |-- useBias() -> bias selection (localStorage-persisted)
  |
  |-- FeedFilter        props: active, onChange (sets filter state)
  |-- ContentType pills  inline in News.tsx (sets contentTypeFilter state)
  |-- BiasFilter         props: biases, onToggle, onClear
  |
  |-- viewMode === "swipe" ? SwipeFeed : FeedCard list
```

### Key Observations About Current State

1. **All state lives in News.tsx** -- filter, contentType, viewMode, biases are local useState
2. **useFeed hook** fetches ALL items then filters client-side by source and bias
3. **SwipeFeed renders ALL items** as DOM nodes (no virtualization)
4. **Three separate filter UIs** (source tabs, content type pills, member chips) are stacked vertically, consuming significant screen space
5. **Server already supports** page-based pagination, source filtering, and contentType filtering via query params
6. **Existing IntersectionObserver patterns** in useVideoAutoplay and SwipeFeed prove the team can use IO-based virtualization without a library

## Target Architecture (v3.0)

### What Changes

| Area | Current | Target |
|------|---------|--------|
| Feed view | List + swipe toggle | Full-screen vertical snap feed (default), list as fallback |
| Scroll behavior | Normal scroll (list) / CSS snap (swipe) | CSS `scroll-snap-type: y mandatory` with 100dvh slides |
| Rendering | All items in DOM | 3-item virtualization window (prev + current + next) |
| Filter/sort state | useState in News.tsx | Lifted to `useFeedState` hook with URL search params sync |
| Sort options | None (server-ranked only) | Recommended, Newest, Oldest, Most Popular, Most Discussed |
| Filter UI | 3 stacked horizontal rows | Single collapsible control bar |
| Video playback | Autoplay visible video | Autoplay current snap item only, pause all others |
| Text content | Full preview shown | Collapsed with "See More" gradient overlay |
| Source link | "View original" text link | Separate icon button on card overlay |
| Config | ThemeConfig with 3 colors | Extended with feature flags and styling tokens |

### Component Architecture

```
App.tsx
  |-- BrowserRouter > Routes
        |-- /news -> FeedPage (renamed from News.tsx)

FeedPage.tsx (page)
  |-- useFeedState() ................. global filter/sort state hook
  |-- useFeed(feedState) ............. data fetching, uses feedState params
  |
  |-- FeedControlBar ................. NEW: collapsed sort/filter overlay
  |     |-- SortSelector ............. NEW: sort mode dropdown
  |     |-- FilterChips .............. NEW: unified source + member + type chips
  |
  |-- SnapFeed ....................... NEW: replaces SwipeFeed + list view
  |     |-- SnapSlide (x3 max) ...... NEW: 100dvh container for single item
  |     |     |-- SnapCard ........... NEW: full-screen card layout
  |     |     |     |-- CardMedia .... NEW: video/image/placeholder (top portion)
  |     |     |     |-- CardOverlay .. NEW: gradient + meta + text + actions
  |     |     |     |-- CardActions .. NEW: source link icon, share, etc.
  |     |-- InfiniteScrollSentinel ... NEW: triggers next page fetch
  |
  |-- (config.features.listFallback ? FeedList : null) .. existing list view behind feature flag
```

### New Components (8)

| Component | Responsibility | Key Props |
|-----------|---------------|-----------|
| `SnapFeed` | Scroll-snap container, 3-item virtualization window, IO-based current index tracking | `items: FeedItem[]`, `onLoadMore: () => void`, `hasMore: boolean` |
| `SnapSlide` | 100dvh wrapper with snap alignment, renders content or placeholder | `item: FeedItem \| null`, `isActive: boolean`, `index: number` |
| `SnapCard` | Full-screen card layout: media top, overlay bottom | `item: FeedItem`, `isActive: boolean` |
| `CardMedia` | Handles video embed, image, or placeholder for snap context | `item: FeedItem`, `isActive: boolean` |
| `CardOverlay` | Gradient overlay with source badge, title, collapsed text, stats | `item: FeedItem`, `expanded: boolean`, `onToggleExpand` |
| `CardActions` | Action buttons on right edge (source link, share) | `item: FeedItem` |
| `FeedControlBar` | Collapsible sort/filter bar, sticky at top | `feedState: FeedState`, `dispatch: Dispatch` |
| `SortSelector` | Sort mode picker (dropdown or horizontal pills) | `value: SortMode`, `onChange` |

### Modified Components (4)

| Component | Change | Reason |
|-----------|--------|--------|
| `News.tsx` -> `FeedPage.tsx` | Rename + gut rewrite. Replace all local state with `useFeedState()`. Replace SwipeFeed/FeedCard list with SnapFeed. | Central orchestrator for new feed experience |
| `FeedFilter.tsx` | Absorb into `FeedControlBar` as `FilterChips` section. Current standalone component becomes unused. | Unified control bar replaces 3 separate filter rows |
| `BiasFilter.tsx` | Absorb into `FeedControlBar` as member chips within `FilterChips`. Current standalone component becomes unused. | Same reason |
| `VideoEmbed.tsx` | Add `isActive` prop to control autoplay based on snap position instead of IO-based viewport detection. Keep IO fallback for list mode. | Snap feed knows exactly which item is "current" -- no need for per-video IO |

### Components to Deprecate (2)

| Component | Replacement |
|-----------|-------------|
| `SwipeFeed.tsx` | `SnapFeed` (full rewrite, not refactor -- different paradigm) |
| Content type pill inline JSX in News.tsx | `FilterChips` inside `FeedControlBar` |

### Components Unchanged

`FeedCard.tsx`, `Navbar.tsx`, `SkeletonCard.tsx`, `NewsCard.tsx`, `MemberCard.tsx`, all pages except News.

## Data Flow Architecture

### State Management: useFeedState Hook

Use a custom hook with `useReducer` + `useSearchParams` for URL sync. No external state library needed -- the state is localized to the feed page and does not need cross-route sharing.

**Why not Zustand:** The filter/sort state only matters on the feed page. It does not need to survive route changes (URL params handle that). Adding a dependency for one page of state is over-engineering. React 19's useReducer handles this cleanly.

**Why URL search params:** Enables shareable filtered URLs (`/news?sort=newest&source=youtube`), browser back/forward respects filter changes, and persists across page refreshes.

```typescript
// hooks/useFeedState.ts

type SortMode = 'recommended' | 'newest' | 'oldest' | 'popular' | 'discussed';

interface FeedState {
  sort: SortMode;
  source: string | 'all';       // source filter
  contentType: ContentType | 'all';
  members: BiasId[];            // member/bias filter
}

type FeedAction =
  | { type: 'SET_SORT'; sort: SortMode }
  | { type: 'SET_SOURCE'; source: string | 'all' }
  | { type: 'SET_CONTENT_TYPE'; contentType: ContentType | 'all' }
  | { type: 'TOGGLE_MEMBER'; id: BiasId }
  | { type: 'CLEAR_MEMBERS' }
  | { type: 'RESET' };

function feedReducer(state: FeedState, action: FeedAction): FeedState { ... }

export function useFeedState(): [FeedState, Dispatch<FeedAction>] {
  // Initialize from URL search params, fall back to defaults
  // Sync state changes back to URL search params
  // Persist member selection to localStorage (existing useBias pattern)
}
```

### Updated useFeed Hook

The existing `useFeed` hook needs modification to:
1. Accept the full `FeedState` instead of separate `filter` and `biases` params
2. Pass `sort` to the API (requires minor server-side addition)
3. Support incremental page loading for infinite scroll

```typescript
// hooks/useFeed.ts (modified)

export function useFeed(state: FeedState) {
  // Existing: fetch, cache, retry logic
  // New: pass sort param to API
  // New: loadMore() function for infinite scroll (increment page)
  // New: reset page to 1 when filters change

  return {
    items,
    isLoading,
    isRetrying,
    error,
    refresh,
    hasItems,
    hasMore,         // NEW: from API response
    loadMore,        // NEW: fetch next page and append
  };
}
```

### Server-Side Sort Support

The server `/feed` endpoint already accepts `page`, `limit`, `source`, and `contentType` params. Add a `sort` param:

| Sort Mode | Server Implementation |
|-----------|----------------------|
| `recommended` | Existing `rankFeed()` blend scoring (default, no change) |
| `newest` | ORDER BY publishedAt DESC (skip rankFeed) |
| `oldest` | ORDER BY publishedAt ASC (skip rankFeed) |
| `popular` | ORDER BY extracted engagement score DESC |
| `discussed` | ORDER BY commentCount DESC |

This is a minor change to `packages/server/src/routes/feed.ts` -- add a `sort` query param that selects the ordering strategy before pagination.

### Updated Data Flow Diagram

```
FeedPage
  |
  |-- useFeedState() -> [state, dispatch]
  |     |-- reads URL search params on mount
  |     |-- syncs state changes to URL params
  |     |-- persists member selection to localStorage
  |
  |-- useFeed(state) -> { items, loadMore, hasMore, isLoading }
  |     |-- fetchApiFeed({ page, sort, source, contentType })
  |     |-- appends pages (items accumulate for infinite scroll)
  |     |-- resets to page 1 when state.sort/source/contentType changes
  |     |-- client-side member filtering (bias matching unchanged)
  |
  |-- FeedControlBar
  |     |-- dispatch(SET_SORT), dispatch(SET_SOURCE), etc.
  |     |-- reads state for active indicators
  |
  |-- SnapFeed
        |-- receives items array
        |-- manages virtualization window internally (prev/current/next)
        |-- IntersectionObserver tracks current index
        |-- calls onLoadMore when near end of list
        |
        |-- SnapSlide[current-1]  (or empty placeholder)
        |-- SnapSlide[current]    (active: video autoplay, full rendering)
        |-- SnapSlide[current+1]  (preload media, no autoplay)
```

## Virtualization Strategy

### Why Not TanStack Virtual or react-window

CSS `scroll-snap-type: y mandatory` is **incompatible** with TanStack Virtual. The virtualization library's scroll position management conflicts with the browser's snap behavior, causing scroll bounce-back and jitter on Chrome/Edge. This is a [known unresolved issue](https://github.com/TanStack/virtual/issues/478).

For a feed with ~50-200 items per page load, the performance concern is not DOM node count but **iframe/media weight**. Each video embed is an iframe with its own browsing context. Rendering 50+ iframes simultaneously will crash mobile browsers.

### 3-Item Windowed Rendering (Custom)

Render exactly 3 items in the DOM at any time: previous, current, and next. Use CSS scroll snap for physics and IntersectionObserver for index tracking. This approach:

1. Works with CSS scroll snap (no library conflict)
2. Limits iframes to 1-2 simultaneously (current + preloading next)
3. Uses patterns already proven in this codebase (useVideoAutoplay uses IO)
4. Zero dependency cost

```
Implementation approach:

Container: scroll-snap-type: y mandatory; height: 100dvh; overflow-y: auto;
           (minus navbar height via calc)

Items:     Each has scroll-snap-align: start; min-height: 100dvh;

Virtualization:
  - Maintain a `currentIndex` via IntersectionObserver (threshold: 0.5)
  - Render 3 SnapSlide components: [currentIndex-1, currentIndex, currentIndex+1]
  - Above/below the 3-item window: render empty divs with fixed height (100dvh)
    to maintain scroll position
  - When currentIndex changes: swap which items are "real" vs placeholder
  - When currentIndex approaches items.length - 2: trigger loadMore()
```

### Scroll Position Maintenance

The critical challenge with windowed rendering + scroll snap is maintaining scroll position when replacing real content with placeholders. The approach:

```
Total scroll height = items.length * slideHeight
                    = items.length * (100dvh - navHeight)

For currentIndex = 5 with items.length = 50:
  Slots 0-3:  empty divs, height: slideHeight each
  Slot 4:     SnapSlide (previous)
  Slot 5:     SnapSlide (current, active)
  Slot 6:     SnapSlide (next)
  Slots 7-49: empty divs, height: slideHeight each
```

This maintains the total scroll height so the scrollbar position stays accurate and snap points remain correct.

### Fallback for Long Lists

If total items exceed 200, the empty placeholder divs (even with minimal DOM) become a concern. For v3.0 this is unlikely since the API returns max 500 items and pagination is 50/page. But if needed later: replace the placeholder approach with `paddingTop`/`paddingBottom` on the container to simulate scroll height.

## Component Design Details

### SnapFeed

```typescript
interface SnapFeedProps {
  items: FeedItem[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

// Internal state:
// - currentIndex: number (tracked by IntersectionObserver)
// - slideHeight: number (measured from container, typically 100dvh - navHeight)
//
// Renders:
// 1. Spacer div (height = currentIndex > 1 ? (currentIndex - 1) * slideHeight : 0)
// 2. SnapSlide for items[currentIndex - 1] (if exists)
// 3. SnapSlide for items[currentIndex] (isActive = true)
// 4. SnapSlide for items[currentIndex + 1] (if exists)
// 5. Spacer div (height = remaining items * slideHeight)
//
// IO targets: each SnapSlide's root div
// Threshold: 0.5 (same as existing SwipeFeed pattern)
//
// Load more trigger: when currentIndex >= items.length - 3
```

**CSS:**
```css
.snap-feed {
  height: calc(100dvh - var(--nav-height));
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.snap-slide {
  height: calc(100dvh - var(--nav-height));
  scroll-snap-align: start;
  scroll-snap-stop: always;
  position: relative;
  overflow: hidden;
}
```

### SnapCard Layout

Each snap card fills the full viewport height. Layout strategy:

```
+----------------------------------+
|                                  |
|          CardMedia               |  ~60% of height
|    (video/image/placeholder)     |
|                                  |
+----------------------------------+
|  [Source Badge] [Time]     [Stats]|
|                                  |
|  Title (2 lines max)             |  CardOverlay
|                                  |  ~40% of height
|  Preview text...                 |  gradient from transparent to bg
|  [See More]                      |
|                                  |
|  Author                         |
|         [Source Link] [Share]    |  CardActions
+----------------------------------+
```

For items with video content, the media section expands and the overlay becomes a gradient overlay on top of the video (similar to TikTok/YouTube Shorts).

For text-heavy content (Reddit discussions, news articles), the media section shrinks to thumbnail-only and the text area gets more space.

### CardOverlay: "See More" Pattern

Long text content needs truncation with a reveal mechanism:

```typescript
// Inside CardOverlay
const [expanded, setExpanded] = useState(false);
const textRef = useRef<HTMLDivElement>(null);
const [isTruncated, setIsTruncated] = useState(false);

useEffect(() => {
  if (textRef.current) {
    setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
  }
}, [item.preview]);

// Render:
// - Truncated: max-height with gradient overlay, "See More" button
// - Expanded: full text, "See Less" button
// - Not truncated: no button, no gradient
```

### FeedControlBar

A sticky bar at the top of the feed that collapses into a single row. Tapping expands it to show all filter options.

```
Collapsed state (default):
+------------------------------------------+
| [Recommended v]  [Filters (2)]      [X]  |
+------------------------------------------+

Expanded state (on tap):
+------------------------------------------+
| Sort: [Recommended] [Newest] [Popular]...|
|                                          |
| Source: [All] [Reddit] [YouTube] [News]..|
|                                          |
| Type: [All] [News] [Fan Art] [Meme].... |
|                                          |
| Member: [All] [RM] [Jin] [Suga]....     |
+------------------------------------------+
```

The bar should be positioned above the SnapFeed, taking space from the viewport height. When collapsed: ~44px. When expanded: auto-height with slide animation. The SnapFeed adjusts its height via CSS calc.

**Important:** The control bar must NOT be inside the scroll-snap container. It sits as a sibling above the SnapFeed so it remains visible during scrolling.

## Config Extensions

### Feature Flags

Add to `GroupConfig` (or a new `features` field):

```typescript
interface FeatureFlags {
  snapFeed: boolean;          // true = snap feed default, false = list view
  listFallback: boolean;      // true = show list mode toggle
  controlBarCollapsed: boolean; // true = control bar starts collapsed
}
```

### Styling Tokens

Extend `ThemeConfig` for the immersive feed:

```typescript
interface ThemeConfig {
  // Existing...
  primaryColor: string;
  accentColor: string;
  darkColor: string;

  // New styling tokens
  cardOverlayGradient?: string;   // CSS gradient for card overlay
  cardBorderRadius?: number;       // px, default 0 for full-bleed
  snapTransition?: string;         // CSS transition for snap animations
  controlBarBg?: string;           // Control bar background
}
```

These are optional fields with sensible defaults, maintaining backward compatibility with existing configs.

## Patterns to Follow

### Pattern 1: IntersectionObserver for Index Tracking

Already used in `SwipeFeed.tsx` and `useVideoAutoplay.ts`. The SnapFeed uses the same pattern but with a stricter threshold for full-screen items.

```typescript
// Create observer once, observe all rendered slides
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const index = Number(entry.target.dataset.index);
        setCurrentIndex(index);
      }
    }
  },
  { root: containerRef.current, threshold: 0.5 }
);
```

### Pattern 2: URL-Synced State

```typescript
// Read from URL on mount
const [searchParams, setSearchParams] = useSearchParams();
const initialState: FeedState = {
  sort: (searchParams.get('sort') as SortMode) || 'recommended',
  source: searchParams.get('source') || 'all',
  contentType: (searchParams.get('type') as ContentType) || 'all',
  members: loadBiasesFromLocalStorage(), // existing pattern from useBias
};

// Sync on state change
useEffect(() => {
  const params = new URLSearchParams();
  if (state.sort !== 'recommended') params.set('sort', state.sort);
  if (state.source !== 'all') params.set('source', state.source);
  if (state.contentType !== 'all') params.set('type', state.contentType);
  setSearchParams(params, { replace: true });
}, [state.sort, state.source, state.contentType]);
```

### Pattern 3: Accumulated Infinite Scroll

```typescript
// In useFeed, items accumulate across pages
const [allItems, setAllItems] = useState<FeedItem[]>([]);
const [page, setPage] = useState(1);

const loadMore = useCallback(async () => {
  const result = await fetchApiFeed({ page: page + 1, ...filterParams });
  setAllItems(prev => [...prev, ...result.items]);
  setPage(p => p + 1);
  setHasMore(result.hasMore);
}, [page, filterParams]);

// Reset on filter/sort change
useEffect(() => {
  setAllItems([]);
  setPage(1);
  // Trigger fresh fetch...
}, [state.sort, state.source, state.contentType]);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Framer Motion for Scroll Physics

**What:** Using Framer Motion's `animate` or `drag` to implement the snap scrolling.
**Why bad:** CSS scroll-snap runs on the compositor thread (off main thread), achieving consistent 60fps on mobile. Framer Motion's JavaScript-driven animations run on the main thread and will cause jank on lower-end phones. Framer Motion also adds ~30KB to the bundle.
**Instead:** Use native CSS `scroll-snap-type: y mandatory`. The browser handles the physics. Use Framer Motion only if adding entry/exit animations to the card content (not the scroll).

### Anti-Pattern 2: TanStack Virtual with Scroll Snap

**What:** Using `@tanstack/react-virtual` for the virtualized snap feed.
**Why bad:** [Known incompatibility](https://github.com/TanStack/virtual/issues/478) -- TanStack Virtual's scroll management fights with CSS scroll-snap in Chrome/Edge, causing scroll bounce-back. The library was designed for continuous scrolling, not discrete snapping.
**Instead:** Custom 3-item windowed rendering with IntersectionObserver. The codebase already uses this IO pattern.

### Anti-Pattern 3: Rendering All Iframes

**What:** Keeping all items in the DOM with just CSS `display: none` or visibility tricks.
**Why bad:** Each video iframe is a separate browsing context. Even hidden iframes consume memory and CPU. 50+ hidden iframes will crash mobile Safari.
**Instead:** The 3-item window ensures at most 2 iframes exist simultaneously (current + next preload).

### Anti-Pattern 4: Global State Library for Page-Local State

**What:** Adding Zustand/Redux/Jotai for the feed filter/sort state.
**Why bad:** The state only matters on the `/news` route. It does not need cross-route persistence (URL params handle that). Adding a library for a single page creates unnecessary dependency and indirection.
**Instead:** `useReducer` + `useSearchParams` in a custom hook. Clean, zero-dependency, and URL-synced.

### Anti-Pattern 5: Client-Side Sorting

**What:** Fetching all items then sorting client-side.
**Why bad:** The server has access to the full candidate set (500 items) and the ranking pipeline. Client-side sort on a subset would give inconsistent results, especially for "most popular" which needs engagement normalization across the full dataset.
**Instead:** Pass sort mode to the API. The server applies the appropriate ordering before pagination.

## Integration Points Summary

### Files to Create (New)

| File | Purpose |
|------|---------|
| `components/SnapFeed.tsx` | Scroll-snap container with 3-item virtualization |
| `components/SnapSlide.tsx` | Individual 100dvh slide wrapper |
| `components/SnapCard.tsx` | Full-screen card layout for snap context |
| `components/CardMedia.tsx` | Media rendering (video/image) for snap cards |
| `components/CardOverlay.tsx` | Gradient overlay with text, stats, actions |
| `components/CardActions.tsx` | Source link and share action buttons |
| `components/FeedControlBar.tsx` | Collapsible sort/filter control bar |
| `components/SortSelector.tsx` | Sort mode picker |
| `hooks/useFeedState.ts` | Global feed state (sort, filters) with URL sync |

### Files to Modify

| File | Change |
|------|--------|
| `pages/News.tsx` | Rename to FeedPage.tsx (or keep name, gut rewrite internals) |
| `hooks/useFeed.ts` | Accept FeedState, add loadMore/hasMore, pass sort to API |
| `components/VideoEmbed.tsx` | Add `isActive` prop for snap-aware autoplay |
| `services/api.ts` | Add `sort` param to fetchApiFeed |
| `config/types.ts` | Add FeatureFlags and extend ThemeConfig |
| `config/groups/bts/index.ts` | Add feature flags to btsConfig |
| `App.css` | Add snap feed CSS, control bar CSS, card overlay CSS |

### Server-Side Changes

| File | Change |
|------|--------|
| `packages/server/src/routes/feed.ts` | Add `sort` query param with 5 sort strategies |
| `packages/shared/src/types/feed.ts` | Add `SortMode` type, add `sort` to `FeedQuery` |

### Files Unchanged

Everything outside the feed feature: Members, Tours, Home, MemberDetail, all scrapers, ranking engine, pipeline, database schema.

## Build Order (Dependency-Aware)

The following build order respects component dependencies:

### Phase 1: Foundation (no visible changes)

1. **Shared types** -- Add `SortMode` to shared types
2. **Server sort endpoint** -- Add `sort` param to `/feed` route
3. **Config types** -- Add `FeatureFlags` and styling tokens to `GroupConfig`
4. **useFeedState hook** -- State management with URL sync
5. **Modify useFeed** -- Accept FeedState, add loadMore/hasMore

Build these first because everything else depends on the state shape and API contract.

### Phase 2: Snap Feed Core (replaces existing view)

6. **SnapSlide** -- 100dvh slide wrapper (no dependencies on other new components)
7. **CardMedia** -- Media rendering (depends on existing VideoEmbed)
8. **CardOverlay** -- Text + stats overlay (standalone)
9. **CardActions** -- Action buttons (standalone)
10. **SnapCard** -- Assembles CardMedia + CardOverlay + CardActions
11. **SnapFeed** -- Scroll-snap container + virtualization + IO tracking

### Phase 3: Controls (adds sort/filter)

12. **SortSelector** -- Sort picker (depends on SortMode type)
13. **FeedControlBar** -- Assembles SortSelector + absorbs FeedFilter + BiasFilter
14. **FeedPage rewrite** -- Wire everything together

### Phase 4: Polish

15. **CSS** -- Snap feed styles, overlay gradients, control bar animations
16. **VideoEmbed isActive** -- Snap-aware autoplay
17. **Feature flags** -- Config-driven snap vs list toggle
18. **Theme tokens** -- Apply new styling tokens via applyTheme

## Scalability Considerations

| Concern | Current (50 items) | At 200 items | At 1000 items |
|---------|--------------------|--------------|---------------|
| DOM nodes | 3 slides rendered | 3 slides rendered | 3 slides rendered |
| Placeholder divs | ~47 empty divs | ~197 empty divs | Replace with padding approach |
| Memory | 1-2 iframes | 1-2 iframes | 1-2 iframes |
| Scroll position | Accurate | Accurate | Use container padding instead of divs |
| API calls | 1 page of 50 | 4 pages of 50 | 20 pages of 50 (lazy loaded) |

## Sources

- [MDN: scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) -- CSS scroll snap reference
- [MDN: Basic concepts of scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap/Basic_concepts) -- snap behavior details
- [TanStack Virtual scroll-snap issue #478](https://github.com/TanStack/virtual/issues/478) -- incompatibility documented
- [TanStack Virtual scroll-snap issue #267](https://github.com/TanStack/virtual/issues/267) -- Chrome bounce-back bug
- [DEV.to: TikTok/YouTube Shorts snap infinite scroll](https://dev.to/biomathcode/create-tik-tokyoutube-shorts-like-snap-infinite-scroll-react-1mca) -- React implementation pattern
- [DEV.to: IntersectionObserver + scroll snap + React](https://dev.to/ruben_suet/my-experience-with-intersectionobserver-scroll-snap-and-react-252a) -- IO pitfalls and solutions
- [Motion.dev: Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) -- CSS vs JS animation performance
- [DEV.to: React State Management 2025 - Context vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) -- state management comparison
- [CSS-Tricks: Practical CSS Scroll Snapping](https://css-tricks.com/practical-css-scroll-snapping/) -- scroll snap patterns
