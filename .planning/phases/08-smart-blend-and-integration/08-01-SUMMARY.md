---
phase: 08-smart-blend-and-integration
plan: 01
subsystem: api
tags: [ranking, engagement-normalization, percentile, feed-scoring, diversity-interleaving, boost]

# Dependency graph
requires:
  - phase: 06-scraper-expansion
    provides: "engagementStats JSON per content item"
  - phase: 07-llm-moderation-pipeline
    provides: "moderationStatus filtering (only approved items in feed)"
provides:
  - "rankFeed() module: normalize -> score -> sort -> interleave pipeline"
  - "Per-source percentile engagement normalization (0-1)"
  - "Multi-signal blend scoring (recency 0.40, engagement 0.35, variety 0.10, diversity 0.15)"
  - "Source diversity interleaving (max 2 consecutive from same source)"
  - "ScrapingSource.boost field for priority account configuration"
  - "Page-based pagination on ranked feed (?page=N&limit=M)"
affects: [08-02, frontend-feed-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [percentile-within-source normalization, post-sort diversity interleaving, exponential time decay]

key-files:
  created:
    - packages/server/src/ranking/normalize.ts
    - packages/server/src/ranking/scoring.ts
    - packages/server/src/ranking/interleave.ts
    - packages/server/src/ranking/index.ts
  modified:
    - packages/shared/src/config/sources.ts
    - packages/server/src/routes/feed.ts

key-decisions:
  - "Blend weights: recency 0.40, engagement 0.35, contentTypeVariety 0.10, sourceDiversity 0.15"
  - "Exponential decay constant k=8 gives ~0.47 at 6h, ~0.05 at 24h"
  - "Candidate set size: 500 items fetched from DB for ranking per request"
  - "Offset-based pagination for ranked feed, cursor-based retained as backward-compat fallback"
  - "bts-trans fan translation account boosted at 1.5x via ScrapingSource.boost field"

patterns-established:
  - "Percentile-within-source: group items by source, rank ascending by primary metric, position/(count-1) for 0-1 score"
  - "Post-sort interleaving: score+sort first, then reorder to enforce max consecutive constraint"
  - "Boost map built once at module load from scraping config, passed to rankFeed per request"

requirements-completed: [RANK-01, RANK-02, RANK-03]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 8 Plan 01: Server-Side Ranking Summary

**Multi-signal feed ranking with per-source percentile normalization, exponential time decay, source diversity interleaving (max 2 consecutive), and 1.5x boost for bts-trans fan translations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T05:52:24Z
- **Completed:** 2026-03-02T05:57:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Built complete ranking pipeline: normalizeEngagement -> computeBlendScore -> sort -> interleaveBySource
- Engagement normalization produces comparable 0-1 percentile scores across Reddit upvotes, YouTube views, Tumblr notes, and Bluesky likes; RSS items get neutral 0.5
- Feed endpoint returns ranked items with source diversity enforced (verified: max 2 consecutive from same source)
- Page-based pagination works without item overlap between pages; cursor-based pagination retained for backward compatibility
- bts-trans source configured with 1.5x boost, appearing prominently in ranked results

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ranking module and add boost config** - `a941cb7` (feat)
2. **Task 2: Wire ranking into feed endpoint with pagination** - `d726189` (feat)

## Files Created/Modified
- `packages/server/src/ranking/normalize.ts` - Per-source percentile engagement normalization (normalizeEngagement)
- `packages/server/src/ranking/scoring.ts` - Multi-signal blend score (computeBlendScore) with recency, engagement, variety, diversity
- `packages/server/src/ranking/interleave.ts` - Post-sort diversity reordering (interleaveBySource, max 2 consecutive)
- `packages/server/src/ranking/index.ts` - rankFeed() orchestrator combining all ranking steps
- `packages/shared/src/config/sources.ts` - Added boost field to ScrapingSource, set bts-trans to 1.5
- `packages/server/src/routes/feed.ts` - Rewired to use rankFeed(), added page-based pagination, kept cursor fallback

## Decisions Made
- Blend weights: recency 0.40, engagement 0.35, contentTypeVariety 0.10, sourceDiversity 0.15 -- balanced per user decision
- Exponential decay with k=8: ~0.47 at 6h (noticeable drop per user decision), ~0.05 at 24h
- Candidate set of 500 items: large enough for ranking quality, small enough for sub-millisecond scoring
- Page-based pagination replaces cursor-based for ranked feeds (cursor breaks with re-ranking), cursor retained as fallback
- Boost factor of 1.5 for bts-trans only confirmed fan translation account; others remain at default 1.0

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- rankFeed() module is ready for the frontend to consume via the API
- Page-based pagination (?page=N&limit=M) is ready for the frontend dual-mode data layer (Plan 02)
- Boost configuration is extensible -- additional fan accounts can be boosted by adding boost field to their source config entry

## Self-Check: PASSED

- All 5 created files verified present on disk
- Commits a941cb7 and d726189 verified in git log
- TypeScript compilation passes for both server and shared packages
- Feed endpoint returns ranked items with max 2 consecutive from same source
- Page-based pagination verified with zero overlap between pages
- Cursor fallback verified working

---
*Phase: 08-smart-blend-and-integration*
*Completed: 2026-03-02*
