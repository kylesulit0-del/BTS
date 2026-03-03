---
phase: 09-api-contract-and-state-foundation
plan: 01
subsystem: api
tags: [sort, feed-api, typescript, fastify, shared-types]

# Dependency graph
requires:
  - phase: 06-scraper-engine-core
    provides: content_items table with engagementStats, commentCount, publishedAt columns
  - phase: 08-feed-ranking-engine
    provides: rankFeed() orchestrator with normalize/scoring/interleave pipeline
provides:
  - SortMode type union exported from @bts/shared
  - Server-side /api/feed sort param with 5 modes (recommended, newest, oldest, popular, discussed)
  - Frontend fetchApiFeed and fetchFeed sort parameter plumbing
affects: [09-02 useFeedState hook, feed UI sort controls]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-side sort with in-memory array sort on candidate set, Omit-based type narrowing for parsed DB rows]

key-files:
  created: []
  modified:
    - packages/shared/src/types/feed.ts
    - packages/server/src/routes/feed.ts
    - packages/frontend/src/services/api.ts
    - packages/frontend/src/services/feedService.ts

key-decisions:
  - "Sort applied to 500-item candidate set in-memory before pagination, not via SQL ORDER BY"
  - "engagementStats parsed only for popular sort mode to minimize JSON.parse overhead"
  - "Sort param only sent to server when not 'recommended' to reduce URL noise"

patterns-established:
  - "ParsedRow type: Use Omit<DBRow, 'field'> & { field: ParsedType } for type-safe JSON-parsed DB rows"
  - "Sort validation: validSorts.includes() with fallback to default for invalid values"

requirements-completed: [PERF-02]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 9 Plan 01: Server-Side Feed Sort Summary

**Server-side sort endpoint on /api/feed with 5 modes (recommended/newest/oldest/popular/discussed) and frontend API plumbing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T01:24:33Z
- **Completed:** 2026-03-03T01:29:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SortMode type union shared between server and frontend via @bts/shared
- Server sorts 500-item candidate set in-memory for non-recommended modes before paginating
- Frontend fetchApiFeed and fetchFeed accept and forward sort parameter
- All TypeScript packages compile cleanly
- Invalid sort values silently fall back to recommended ranking

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SortMode type and server-side sort endpoint** - `affcc4e` (feat)
2. **Task 2: Propagate sort param through frontend API client and feed service** - `635be8c` (feat)

## Files Created/Modified
- `packages/shared/src/types/feed.ts` - Added SortMode type union, sort field on FeedQuery
- `packages/server/src/routes/feed.ts` - Sort param validation, in-memory sorting for 4 non-recommended modes, ParsedRow type
- `packages/frontend/src/services/api.ts` - Added sort param to fetchApiFeed, conditional query string
- `packages/frontend/src/services/feedService.ts` - Added sort to FetchFeedOptions, passed through to fetchApiFeed

## Decisions Made
- Used Omit-based ParsedRow type to fix TypeScript intersection incompatibility when overriding engagementStats from string to Record
- Only parse engagementStats JSON for 'popular' sort mode (others don't need it)
- Sort param omitted from URL when 'recommended' (default) to keep URLs clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type incompatibility with ParsedRow**
- **Found during:** Task 1 (server-side sort implementation)
- **Issue:** Intersection type `typeof candidateRows[number] & { engagementStats: Record<string, number> | null }` fails because TypeScript cannot reconcile the overridden engagementStats (string -> Record) with the base row type
- **Fix:** Used `Omit<typeof candidateRows[number], 'engagementStats'> & { engagementStats: Record<string, number> | null }` pattern to properly exclude then re-add the field
- **Files modified:** packages/server/src/routes/feed.ts
- **Verification:** `npx tsc --noEmit -p packages/server/tsconfig.json` passes
- **Committed in:** affcc4e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type fix necessary for correctness. No scope creep.

## Issues Encountered
- Shared package needed `tsc -b` rebuild before server could resolve the new SortMode export (project references with composite mode)
- Pre-existing server startup error (ERR_MODULE_NOT_FOUND for @bts/shared/config/sources.js.ts via tsx) -- not caused by this plan's changes, did not fix

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sort endpoint fully functional, ready for Plan 02's useFeedState hook to wire sort into UI
- Frontend plumbing in place for sort parameter passthrough

---
*Phase: 09-api-contract-and-state-foundation*
*Completed: 2026-03-03*
