---
phase: 10-snap-feed-core
plan: 01
subsystem: ui
tags: [scroll-snap, css-scroll-snap, dom-virtualization, intersection-observer, react-hooks, feed-ui]

# Dependency graph
requires:
  - phase: 09-api-contract-and-state-foundation
    provides: feedMode config flag, FeedItem type, useFeedState hook, theme tokens
provides:
  - DOM_WINDOW_SIZE configurable constant for virtualization window
  - useSnapFeed hook with IntersectionObserver index tracking, DOM windowing, seamless looping
  - SnapFeed scroll-snap container component with 100svh cards
  - WindowedItem type for virtualized item representation
affects: [10-02 card layouts, 10-03 gestures/video, snap feed styling, feed mode switching]

# Tech tracking
tech-stack:
  added: []
  patterns: [manual DOM windowing with modular arithmetic for infinite looping, IntersectionObserver snap detection with data-realindex attributes, CSS scroll-snap mandatory with scroll-snap-stop always]

key-files:
  created:
    - packages/frontend/src/config/snap.ts
    - packages/frontend/src/hooks/useSnapFeed.ts
    - packages/frontend/src/components/snap/SnapFeed.tsx
  modified:
    - packages/frontend/src/pages/News.tsx
    - packages/frontend/src/App.css

key-decisions:
  - "DOM_WINDOW_SIZE default 5 with documentation for adjusting (3 minimal, 7 smoother)"
  - "IntersectionObserver threshold 0.6 for snap detection matching research recommendation"
  - "useLayoutEffect for scroll position adjustment to prevent visual jumps during window shifts"
  - "Edge case: items.length <= DOM_WINDOW_SIZE renders all items without modular wrapping to avoid duplicate keys"
  - "Placeholder card layout with title/source/preview/index -- real card layouts deferred to Plan 02"

patterns-established:
  - "Snap feed container pattern: CSS scroll-snap-type y mandatory + scroll-snap-stop always for one-at-a-time advancement"
  - "DOM virtualization pattern: getWindowedItems with modular arithmetic, symmetric window around currentIndex"
  - "Snap detection pattern: data-realindex attributes on cards + IntersectionObserver threshold 0.6"

requirements-completed: [SNAP-01, SNAP-02, SNAP-04]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 10 Plan 01: Snap Feed Container Summary

**Full-viewport scroll-snap feed container with CSS mandatory snapping, manual 5-item DOM virtualization via IntersectionObserver, and seamless infinite looping via modular arithmetic**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T03:22:12Z
- **Completed:** 2026-03-03T03:24:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Core snap feed infrastructure with CSS scroll-snap mandatory vertical snapping (100svh cards with 100vh fallback)
- DOM virtualization via useSnapFeed hook limiting rendered items to configurable DOM_WINDOW_SIZE (default 5)
- Seamless infinite looping using modular arithmetic in getWindowedItems -- no visible wrapping boundary
- SnapFeed component wired into News.tsx, replacing Phase 9 snap placeholder when feedMode === 'snap'

## Task Commits

Each task was committed atomically:

1. **Task 1: Create snap config and useSnapFeed hook with DOM windowing and index tracking** - `ec4a28e` (feat)
2. **Task 2: Create SnapFeed container component and wire into News.tsx** - `a271405` (feat)

## Files Created/Modified
- `packages/frontend/src/config/snap.ts` - Configurable DOM_WINDOW_SIZE constant (default 5)
- `packages/frontend/src/hooks/useSnapFeed.ts` - Core hook: currentIndex tracking, DOM windowing, IntersectionObserver snap detection, scroll position management
- `packages/frontend/src/components/snap/SnapFeed.tsx` - Scroll-snap container with placeholder card rendering
- `packages/frontend/src/pages/News.tsx` - Imports SnapFeed, renders when feedMode === 'snap'
- `packages/frontend/src/App.css` - CSS classes for .snap-feed, .snap-card with scroll-snap rules and scrollbar hiding

## Decisions Made
- DOM_WINDOW_SIZE set to 5 (balanced between DOM overhead and smooth scrolling)
- IntersectionObserver threshold 0.6 for snap detection (per research recommendation)
- useLayoutEffect used for synchronous scroll position adjustment when window shifts
- Items fewer than window size skip virtualization entirely (avoids duplicate key bugs)
- Placeholder card layout showing title/source/preview/index -- real card layouts are Plan 02's scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Snap feed container ready for Plan 02 card layouts (image/video/text variants replace placeholder cards)
- useSnapFeed hook provides currentIndex for Plan 03 video autoplay and gesture detection
- DOM virtualization infrastructure in place for all subsequent snap feed features
- TypeScript compiles cleanly, Vite build succeeds

## Self-Check: PASSED

All 5 files verified present. Both task commits (ec4a28e, a271405) verified in git log.

---
*Phase: 10-snap-feed-core*
*Completed: 2026-03-03*
