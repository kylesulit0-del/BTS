---
phase: 02-feed-expansion
plan: 02
subsystem: ui, feeds
tags: [engagement, deduplication, sorting, tumblr, feed-scoring, svg-icons]

# Dependency graph
requires:
  - phase: 02-feed-expansion/01
    provides: "FeedStats type, stats in fetchers, abbreviateNumber utility, Tumblr fetcher"
provides:
  - "Inline engagement stats on feed cards (upvotes, comments, views, likes)"
  - "Tumblr filter chip in FeedFilter"
  - "Engagement-weighted feed scoring (50% recency + 50% engagement)"
  - "URL deduplication with UTM normalization"
  - "7-day age filtering"
  - "Enabled source filtering"
  - "Per-source-type cap (30 items)"
affects: [03-media-embeds, 04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: ["engagement-weighted scoring with log-scaled normalization", "URL deduplication with tracking param removal", "per-source-type capping to prevent feed domination", "applyFeedPipeline composable filter chain"]

key-files:
  created: []
  modified:
    - src/components/FeedCard.tsx
    - src/components/FeedFilter.tsx
    - src/services/feeds.ts
    - src/App.css

key-decisions:
  - "MIN_STAT_THRESHOLD=2 hides trivial '1 comment' noise from feed cards"
  - "Inline SVG icons (path-only, 14x14, currentColor) over icon library to avoid dependency"
  - "applyFeedPipeline extracted as shared function for both incremental and batch fetch paths"
  - "Per-source cap sorts by engagement before truncating to keep best content per source"

patterns-established:
  - "Feed pipeline pattern: age filter -> dedup -> per-source cap -> engagement sort"
  - "Stat threshold pattern: stats below MIN_STAT_THRESHOLD are hidden entirely"

requirements-completed: [SRC-04, STAT-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 2 Plan 2: Stats Display & Feed Ordering Summary

**Inline engagement stats on feed cards with SVG icons, Tumblr filter chip, and engagement-weighted feed ordering with URL deduplication and 7-day age filtering**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T08:59:11Z
- **Completed:** 2026-02-25T09:01:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Feed cards display upvote/comment/view/like counts with inline SVG icons when values exceed threshold
- Tumblr filter chip added to feed filter bar
- Feed sorted by engagement-weighted score (50% recency, 50% log-scaled engagement)
- Duplicate URLs across sources deduplicated, keeping higher-engagement version
- Posts older than 7 days filtered out automatically
- Sources with enabled:false skipped during fetch
- Per-source-type cap (30 items) prevents any single source from dominating the feed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add engagement stats display and Tumblr filter chip** - `24caf35` (feat)
2. **Task 2: Add engagement-weighted ordering, deduplication, and feed filtering** - `96b8fe0` (feat)

## Files Created/Modified
- `src/components/FeedCard.tsx` - Inline stats display with SVG icons, Tumblr badge color, MIN_STAT_THRESHOLD
- `src/components/FeedFilter.tsx` - Tumblr filter chip added between News and Twitter
- `src/services/feeds.ts` - Engagement scoring, URL dedup, age filtering, enabled filtering, per-source cap
- `src/App.css` - Styles for feed-card-stats and feed-card-stat

## Decisions Made
- MIN_STAT_THRESHOLD set to 2 to hide trivial single-digit stats
- Used inline SVG icons (14x14, path-only, currentColor fill) to avoid icon library dependency
- Extracted applyFeedPipeline as shared function for both incremental and batch fetch paths
- Per-source cap sorts by engagement before truncating to retain highest-quality content per source

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete -- all feed expansion work (data layer + UI/ordering) is done
- Feed cards show engagement context, feed ordering surfaces relevant content
- Ready for Phase 3 (media embeds) which will add rich previews to these feed cards

## Self-Check: PASSED

All files exist. All commits verified (24caf35, 96b8fe0).

---
*Phase: 02-feed-expansion*
*Completed: 2026-02-25*
