---
phase: 04-config-driven-ui
plan: 01
subsystem: config
tags: [typescript, config-driven, group-config, labels, events, news]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: GroupConfig type system with members/sources/theme/keywords
provides:
  - GroupLabels interface with all UI string fields
  - Event and NewsItem interfaces in config types
  - BTS labels, events, news data in config/groups/bts/
  - String-typed FeedSource and BiasId for config-driven filters
affects: [04-config-driven-ui plan 02, any future group clone]

# Tech tracking
tech-stack:
  added: []
  patterns: [config-driven labels, data colocation in group config]

key-files:
  created:
    - src/config/groups/bts/labels.ts
    - src/config/groups/bts/events.ts
    - src/config/groups/bts/news.ts
  modified:
    - src/config/types.ts
    - src/config/groups/bts/index.ts
    - src/types/feed.ts

key-decisions:
  - "Event/NewsItem interfaces use string types for region/status to keep config-driven flexibility"
  - "FeedSource and BiasId loosened from literal unions to string for config-driven source tabs and member chips"
  - "src/data/* files preserved unchanged; Plan 02 will migrate imports"

patterns-established:
  - "Group data colocation: labels, events, news alongside members/sources/theme in config/groups/{group}/"
  - "satisfies GroupLabels for compile-time validation of label objects"

requirements-completed: [CONFIG-03, CONFIG-04]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 04 Plan 01: Config Type Extension Summary

**Extended GroupConfig with labels/events/news fields and loosened FeedSource/BiasId to string types for config-driven UI**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T03:49:30Z
- **Completed:** 2026-02-26T03:52:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- GroupConfig now requires labels, events, and news fields -- any group config missing them is a compile error
- BTS-specific labels (appName, sourceLabels, homeQuote, tourTitle, etc.) colocated in config
- Events and news data moved into config/groups/bts/ alongside members/sources/theme
- FeedSource and BiasId are now string types enabling config-driven filter tabs and member chips

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend GroupConfig types and create BTS labels** - `c08affd` (feat)
2. **Task 2: Loosen FeedSource and BiasId to string types** - `45e1730` (feat)

## Files Created/Modified
- `src/config/types.ts` - Added GroupLabels, Event, NewsItem interfaces; expanded GroupConfig
- `src/config/groups/bts/labels.ts` - BTS-specific UI labels with satisfies GroupLabels
- `src/config/groups/bts/events.ts` - BTS tour events data (copied from src/data/events.ts)
- `src/config/groups/bts/news.ts` - BTS fallback news data (copied from src/data/news.ts)
- `src/config/groups/bts/index.ts` - Added labels, events, news imports and fields
- `src/types/feed.ts` - FeedSource and BiasId changed to string types

## Decisions Made
- Event/NewsItem interfaces use plain `string` for region/status fields (not literal unions) to keep config-driven flexibility across different groups
- FeedSource and BiasId loosened from hardcoded unions to `string` so source tabs and member chips are fully derived from config
- Original `src/data/events.ts` and `src/data/news.ts` preserved unchanged -- Plan 02 will migrate imports and delete the old files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config type foundation complete with all group-specific data colocated
- Plan 02 can now migrate page imports from src/data/* to config and delete old data files
- Clone-and-swap architecture ready: new group = new config/groups/{name}/ directory

---
*Phase: 04-config-driven-ui*
*Completed: 2026-02-26*
