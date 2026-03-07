---
phase: 16-source-expansion
plan: 02
subsystem: ui
tags: [react, badges, filters, googlenews, ao3, source-labels]

# Dependency graph
requires:
  - phase: 16-source-expansion/01
    provides: "Server-side source entries, RSS scraper extension, shared description field"
provides:
  - "Badge colors for all source types including googlenews and ao3"
  - "Source labels for all types in frontend config"
  - "Frontend source config entries for googlenews, ao3, and new Reddit subs"
  - "FilterSheet grouped source display with expand pattern"
  - "Server description -> frontend preview mapping in api.ts"
affects: [frontend-display, feed-filtering]

# Tech tracking
tech-stack:
  added: []
  patterns: ["grouped-with-expand filter pattern in FilterSheet"]

key-files:
  created: []
  modified:
    - "packages/frontend/src/components/snap/SnapCard.tsx"
    - "packages/frontend/src/components/FeedCard.tsx"
    - "packages/frontend/src/components/SwipeFeed.tsx"
    - "packages/frontend/src/config/groups/bts/labels.ts"
    - "packages/frontend/src/config/groups/bts/sources.ts"
    - "packages/frontend/src/services/api.ts"
    - "packages/frontend/src/components/snap/FilterSheet.tsx"
    - "packages/frontend/src/App.css"

key-decisions:
  - "Added rss badge color alongside legacy news key for backwards compatibility"
  - "Source emojis added to SwipeFeed for tumblr, bluesky, googlenews, ao3 placeholders"
  - "FilterSheet detail chips are read-only informational display, filter stays at type level"

patterns-established:
  - "Grouped-with-expand: source type groups expand to show individual sources when active"

requirements-completed: [SRCX-08]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 16 Plan 02: Frontend Labels, Badges & Filters Summary

**Badge colors for googlenews (blue) and ao3 (red), source labels for all types, grouped FilterSheet with expand pattern, and description-to-preview API mapping**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T11:12:08Z
- **Completed:** 2026-03-06T11:14:16Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- All three card components (SnapCard, FeedCard, SwipeFeed) have badge colors for googlenews, ao3, rss, and all existing source types
- Source labels in labels.ts now include bluesky, googlenews, and ao3 display names
- Frontend sources.ts registers new Reddit subs (member-specific), Google News, and AO3 entries
- FilterSheet uses grouped-with-expand pattern showing individual source labels when a source type group is active
- Server description field mapped to frontend preview in api.ts, enabling headline + snippet display for Google News and AO3 items

## Task Commits

Each task was committed atomically:

1. **Task 1: Update badge colors, source labels, and frontend source config** - `8dd4b8b` (feat)
2. **Task 2: Update FilterSheet with grouped source display** - `281afea` (feat)

**Plan metadata:** `00587f1` (docs: complete plan)

## Files Created/Modified
- `packages/frontend/src/components/snap/SnapCard.tsx` - Added googlenews, ao3, rss badge colors
- `packages/frontend/src/components/FeedCard.tsx` - Added googlenews, ao3, rss badge colors
- `packages/frontend/src/components/SwipeFeed.tsx` - Added all missing badge colors and source emojis
- `packages/frontend/src/config/groups/bts/labels.ts` - Added bluesky, googlenews, ao3 source labels
- `packages/frontend/src/config/groups/bts/sources.ts` - Added 9 new Reddit subs, Google News, AO3 entries
- `packages/frontend/src/services/api.ts` - Mapped item.description to preview field
- `packages/frontend/src/components/snap/FilterSheet.tsx` - Grouped source display with useMemo + expand
- `packages/frontend/src/App.css` - Added CSS for filter-source-group, detail-row, chip-detail

## Decisions Made
- Added `rss` badge color alongside legacy `news` key -- items from RSS scraper have `source: 'rss'`, keeping `news` for backwards compatibility with any legacy items
- Added source emojis in SwipeFeed for all new types (placeholder display for items without thumbnails)
- FilterSheet detail chips are purely informational (read-only) -- filter data model unchanged, still filters by source type string

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added source emojis for new types in SwipeFeed**
- **Found during:** Task 1 (SwipeFeed badge colors)
- **Issue:** SwipeFeed uses sourceEmojis record for placeholder display but only had 4 entries
- **Fix:** Added emojis for rss, tumblr, bluesky, googlenews, ao3
- **Files modified:** packages/frontend/src/components/SwipeFeed.tsx
- **Verification:** TypeScript passes, all source types have emoji fallbacks
- **Committed in:** 8dd4b8b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for SwipeFeed placeholder display. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All frontend display updates complete for source expansion
- Phase 16 fully complete -- all source types have server entries, scraper support, and frontend display
- Ready for live deployment verification

---
*Phase: 16-source-expansion*
*Completed: 2026-03-06*

## Self-Check: PASSED
