---
phase: 01-foundation
plan: 03
subsystem: feeds
tags: [registry-pattern, source-fetchers, config-driven, progressive-loading, dompurify]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: DOMPurify sanitization utility (01-01), GroupConfig with sources/keywords (01-02)
provides:
  - Source registry with registerFetcher/getFetcher pattern
  - Per-source fetcher modules (reddit, youtube, rss, twitter)
  - Config-driven feed orchestrator with progressive loading
  - Extensible source architecture (add fetcher + config entry = new source)
affects: [01-04, 02-feed-expansion, ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [self-registering-fetcher-modules, source-registry-pattern, config-driven-orchestration]

key-files:
  created:
    - src/services/sources/registry.ts
    - src/services/sources/reddit.ts
    - src/services/sources/youtube.ts
    - src/services/sources/rss.ts
    - src/services/sources/twitter.ts
  modified:
    - src/services/feeds.ts
    - src/types/feed.ts
    - src/hooks/useFeed.ts

key-decisions:
  - "Fetchers throw on error, orchestrator catches uniformly -- no per-fetcher try/catch"
  - "RSS fetcher is generic (handles Soompi, AllKPop, any future RSS) via SourceEntry"
  - "useFeed.ts bias filtering migrated from MEMBER_KEYWORDS to config.members.aliases"

patterns-established:
  - "Source extensibility: write fetcher file calling registerFetcher + add SourceEntry to config"
  - "All source-specific data (URLs, IDs, labels) in config, never in service code"
  - "Fetcher modules self-register via side-effect imports from registry.ts"

requirements-completed: [INFRA-02]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 03: Source Registry and Feed Refactor Summary

**Per-source fetcher modules with self-registering registry pattern and config-driven feed orchestrator replacing monolithic feeds.ts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T06:29:42Z
- **Completed:** 2026-02-25T06:31:55Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Split monolithic feeds.ts (240 lines of hardcoded fetch logic) into 5 modular source files with a registry
- All source-specific data (subreddit names, channel IDs, RSS URLs, Nitter URL) now comes from config, not code
- Progressive loading preserved -- items appear incrementally as each source resolves
- Unified RSS fetcher handles Soompi, AllKPop, and any future RSS source via generic SourceEntry

## Task Commits

Each task was committed atomically:

1. **Task 1: Create source registry and per-source fetcher modules** - `21896f9` (feat)
2. **Task 2: Refactor feeds.ts orchestrator to use registry and config** - `5550ee4` (feat)

## Files Created/Modified
- `src/services/sources/registry.ts` - Source registry with registerFetcher/getFetcher and side-effect imports
- `src/services/sources/reddit.ts` - Reddit fetcher using config keywords and stripToText sanitization
- `src/services/sources/youtube.ts` - YouTube fetcher reading channel ID from SourceEntry
- `src/services/sources/rss.ts` - Generic RSS fetcher for Soompi, AllKPop, and future RSS sources
- `src/services/sources/twitter.ts` - Twitter/Nitter fetcher with stripToText sanitization
- `src/services/feeds.ts` - Clean orchestrator using config.sources and getFetcher lookups (removed all hardcoded data)
- `src/types/feed.ts` - Added "rss" to FeedSource, removed MEMBER_KEYWORDS, kept BiasId with TODO
- `src/hooks/useFeed.ts` - Migrated bias filtering from MEMBER_KEYWORDS to config.members.aliases

## Decisions Made
- Fetchers throw on error, orchestrator catches uniformly -- follows user decision that "registry handles error handling/retries uniformly"
- RSS fetcher is generic rather than per-site (fetchNews/fetchAllKPop merged into single fetchRssSource)
- Migrated useFeed.ts bias filtering to config.members.aliases as part of MEMBER_KEYWORDS removal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed useFeed.ts broken import of removed MEMBER_KEYWORDS**
- **Found during:** Task 2 (build verification)
- **Issue:** useFeed.ts imports MEMBER_KEYWORDS from types/feed.ts which was removed per plan. Build fails with TS2305.
- **Fix:** Replaced MEMBER_KEYWORDS import with getConfig() from config; updated matchesBias to use config.members.find(m => m.id === biasId).aliases
- **Files modified:** src/hooks/useFeed.ts
- **Verification:** `npm run build` succeeds with zero errors
- **Committed in:** 5550ee4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for build correctness. The plan specified removing MEMBER_KEYWORDS but didn't account for the useFeed.ts consumer. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Source registry ready for Phase 2 feed expansion -- add a new source by writing a fetcher file and adding a SourceEntry to config
- feeds.ts orchestrator is source-agnostic and will automatically pick up new registered fetchers
- Plan 04 (UI config migration) can proceed -- BiasId kept with TODO for config-derived type
- All HTML sanitization uses DOMPurify utilities throughout the feed pipeline

## Self-Check: PASSED

- FOUND: src/services/sources/registry.ts
- FOUND: src/services/sources/reddit.ts
- FOUND: src/services/sources/youtube.ts
- FOUND: src/services/sources/rss.ts
- FOUND: src/services/sources/twitter.ts
- FOUND: src/services/feeds.ts
- FOUND: src/types/feed.ts
- FOUND: src/hooks/useFeed.ts
- FOUND: 01-03-SUMMARY.md
- FOUND: commit 21896f9
- FOUND: commit 5550ee4

---
*Phase: 01-foundation*
*Completed: 2026-02-25*
