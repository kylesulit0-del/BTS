---
phase: 11-sort-and-filter-controls
plan: 01
subsystem: ui
tags: [react, localStorage, sort, filter, control-bar, overlay, hooks]

# Dependency graph
requires:
  - phase: 10-snap-feed-core
    provides: SnapFeed component with vertical paging and card rendering
provides:
  - Multi-select FeedState with localStorage persistence (useFeedState)
  - Overlay SnapControlBar with segmented sort tabs and filter icon
  - useControlBarVisibility hook for auto-hide on page change
  - Content type category mapping for snap mode filtering
affects: [11-02-PLAN (filter sheet), future sort/filter extensions]

# Tech tracking
tech-stack:
  added: []
  patterns: [localStorage feed state persistence, overlay control bar with auto-hide, multi-select toggle array pattern]

key-files:
  created:
    - packages/frontend/src/hooks/useControlBarVisibility.ts
    - packages/frontend/src/components/snap/SnapControlBar.tsx
  modified:
    - packages/frontend/src/hooks/useFeedState.ts
    - packages/frontend/src/hooks/useFeed.ts
    - packages/frontend/src/components/snap/SnapFeed.tsx
    - packages/frontend/src/pages/News.tsx
    - packages/frontend/src/App.css

key-decisions:
  - "localStorage over useSearchParams for feed state persistence (multi-select arrays, no URL clutter)"
  - "URL param migration on first load: reads ?sort/?source/?type, stores in localStorage, clears URL via replaceState"
  - "Control bar uses absolute positioning overlay with blur backdrop, not flex-column layout allocation"
  - "Content type filtering uses 4-category mapping (video/image/news/discussion) for snap mode"

patterns-established:
  - "Multi-select toggle pattern: toggleInArray helper for array-based filter state"
  - "Control bar auto-hide: tracks paging index changes via useEffect + prevRef"
  - "Tap reveal zone: invisible div at top of viewport for re-showing hidden control bar"

requirements-completed: [FILT-01, FILT-02, FILT-06]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 11 Plan 01: Sort & Filter Controls Summary

**Overlay control bar with 5 segmented sort tabs (Rec/New/Old/Pop/Disc), localStorage-persisted multi-select feed state, and auto-hide on page change with tap-to-reveal**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T10:49:57Z
- **Completed:** 2026-03-03T10:53:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Rewrote useFeedState from useSearchParams/single-string to localStorage/multi-select arrays with URL param migration
- Built SnapControlBar overlay component with segmented sort tabs, filter icon with badge count, and active filter chips row
- Wired auto-hide/reveal behavior: control bar slides up on page change, tap reveal zone at top brings it back
- Removed entire old SnapDropdown toolbar component and all related CSS

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite useFeedState + useFeed + useControlBarVisibility** - `adf8e6d` (feat)
2. **Task 2: Build SnapControlBar and wire into News.tsx** - `6f41ab2` (feat)

## Files Created/Modified
- `packages/frontend/src/hooks/useFeedState.ts` - Multi-select FeedState with localStorage persistence and URL migration
- `packages/frontend/src/hooks/useFeed.ts` - Updated filtering for array-based sources, server-side pass-through for single source
- `packages/frontend/src/hooks/useControlBarVisibility.ts` - New hook: auto-hide on index change, showBar/hideBar callbacks
- `packages/frontend/src/components/snap/SnapControlBar.tsx` - New overlay component with sort tabs, filter icon, filter chips
- `packages/frontend/src/components/snap/SnapFeed.tsx` - Added onIndexChange callback prop for parent index tracking
- `packages/frontend/src/pages/News.tsx` - Replaced SnapDropdown with SnapControlBar, wired visibility hook, content type category mapping
- `packages/frontend/src/App.css` - Replaced snap-toolbar/dropdown styles with control-bar overlay, sort tabs, filter chips, reveal zone

## Decisions Made
- localStorage over useSearchParams for feed state persistence -- multi-select arrays don't map well to URL params, avoids URL clutter
- URL param migration on first load -- smooth transition from PERF-03, reads existing params then clears them via replaceState
- Control bar uses absolute positioning overlay with blur backdrop -- doesn't consume vertical layout space, cards fill entire viewport
- Content type filtering in snap mode uses 4-category mapping (video, image, news, discussion) grouping related types together

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Feed state foundation with multi-select arrays ready for Plan 02's filter sheet
- SnapControlBar's `onFilterIconClick` prop wired as no-op, ready for Plan 02 to connect filter sheet
- All old dropdown code removed, clean slate for filter sheet overlay

## Self-Check: PASSED

All 7 files verified present. Both task commits (adf8e6d, 6f41ab2) verified in git log.

---
*Phase: 11-sort-and-filter-controls*
*Completed: 2026-03-03*
