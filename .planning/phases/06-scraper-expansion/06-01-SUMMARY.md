---
phase: 06-scraper-expansion
plan: 01
subsystem: database, api
tags: [drizzle, sqlite, soft-delete, engagement-stats, migration]

# Dependency graph
requires:
  - phase: 05-foundation
    provides: "DB schema, scraper orchestration, feed route, shared types"
provides:
  - "Schema with thumbnailUrl, engagementStats, deletedAt columns for multi-source scraping"
  - "Three-state run tracking (success/empty/error) with duration and error stacks"
  - "14-day soft-delete content retention replacing 30-day hard delete"
  - "Feed API serving thumbnailUrl and engagementStats, excluding soft-deleted items"
  - "SQL migration 0001_phase6_schema_evolution"
affects: [06-02, 06-03, 06-04, 07-moderation]

# Tech tracking
tech-stack:
  added: []
  patterns: [soft-delete-with-isNull-filter, json-engagement-stats, three-state-scrape-tracking]

key-files:
  created:
    - packages/server/drizzle/0001_phase6_schema_evolution.sql
    - packages/server/drizzle/meta/0001_snapshot.json
  modified:
    - packages/server/src/db/schema.ts
    - packages/shared/src/types/feed.ts
    - packages/server/src/scrapers/base.ts
    - packages/server/src/scrapers/reddit.ts
    - packages/server/src/routes/feed.ts
    - packages/server/drizzle/meta/_journal.json

key-decisions:
  - "Soft delete uses publishedAt (not scrapedAt) to catch content published long ago but scraped recently"
  - "Reddit engagement_stats migration is idempotent -- runs on every Reddit scrape but only affects rows without engagement_stats"
  - "Existing score/commentCount fields kept for backward compatibility"

patterns-established:
  - "Soft delete pattern: add isNull(deletedAt) to all queries, never hard delete"
  - "Engagement stats: stored as JSON text in DB, parsed/serialized at route/orchestration boundary"
  - "Three-state run tracking: success (items found), empty (no items), error (exception)"

requirements-completed: [INFRA-06, API-03]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 6 Plan 1: Schema Evolution Summary

**Multi-source schema with thumbnailUrl, flexible engagement stats JSON, 14-day soft-delete retention, and three-state scrape run tracking**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T15:42:43Z
- **Completed:** 2026-03-01T15:47:54Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- contentItems table extended with thumbnail_url, engagement_stats (JSON), and deleted_at (soft delete)
- scrapeRuns table extended with duration (ms) and error_stack (full trace)
- Feed route excludes soft-deleted items and returns thumbnailUrl/engagementStats in response
- 14-day soft-delete replaces 30-day hard delete, filtering on publishedAt
- Three-state run tracking: success/empty/error with duration tracking
- Idempotent Reddit engagement_stats data migration populates existing rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Evolve DB schema and shared types for multi-source support** - `567c26b` (feat)
2. **Task 2: Update feed route, orchestration, and create DB migration** - `c8188af` (feat)

## Files Created/Modified
- `packages/server/src/db/schema.ts` - Added thumbnailUrl, engagementStats, deletedAt to contentItems; duration, errorStack to scrapeRuns
- `packages/shared/src/types/feed.ts` - Added thumbnailUrl, engagementStats to FeedItem interface
- `packages/server/src/scrapers/base.ts` - Updated ScrapedItem interface, upsert, soft-delete cleanup, three-state tracking
- `packages/server/src/scrapers/reddit.ts` - Populates new ScrapedItem fields (thumbnailUrl=null, engagementStats={upvotes, comments})
- `packages/server/src/routes/feed.ts` - isNull(deletedAt) filter, thumbnailUrl/engagementStats in response mapping
- `packages/server/drizzle/0001_phase6_schema_evolution.sql` - ALTER TABLE migration for new columns and index
- `packages/server/drizzle/meta/_journal.json` - Migration journal entry for 0001
- `packages/server/drizzle/meta/0001_snapshot.json` - Schema snapshot after migration

## Decisions Made
- Soft delete filters on publishedAt (not scrapedAt) so content that was scraped recently but published long ago still gets cleaned up
- Reddit engagement_stats migration is idempotent -- runs on every Reddit scrape but only touches rows without engagement_stats and with score > 0
- Existing score/commentCount fields retained on both ScrapedItem and FeedItem for backward compatibility with RedditScraper and frontend

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated RedditScraper to populate new ScrapedItem fields**
- **Found during:** Task 1 (Schema and type evolution)
- **Issue:** Adding thumbnailUrl and engagementStats as required fields on ScrapedItem broke the RedditScraper which constructs ScrapedItem objects without these fields
- **Fix:** Added `thumbnailUrl: null` and `engagementStats: { upvotes: post.score, comments: post.num_comments }` to the Reddit scraper's ScrapedItem construction
- **Files modified:** packages/server/src/scrapers/reddit.ts
- **Verification:** `npx tsc --noEmit` passes in both packages
- **Committed in:** 567c26b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to maintain compilability. No scope creep.

## Issues Encountered
- Shared package tsbuildinfo was stale after adding new fields to FeedItem; resolved by running `npx tsc --build` in packages/shared before type-checking server

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema supports all Phase 6 scraper data requirements (thumbnails, flexible engagement, soft delete)
- All Phase 6 scrapers (YouTube RSS, Bluesky, Tumblr) can now be built using the updated ScrapedItem interface
- Feed API contract ready to serve new fields from any source

## Self-Check: PASSED

All 9 files verified present. Both task commits (567c26b, c8188af) verified in git log.

---
*Phase: 06-scraper-expansion*
*Completed: 2026-03-01*
