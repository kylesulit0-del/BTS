---
phase: 04-config-driven-ui
plan: 02
subsystem: config
tags: [config-driven, pwa, manifest, vite, example-config, clone-and-swap]

# Dependency graph
requires:
  - phase: 04-config-driven-ui plan 01
    provides: GroupLabels, Event, NewsItem types; BTS labels/events/news in config
provides:
  - Fully config-driven UI with zero hardcoded BTS references outside config/groups/
  - Config-generated PWA manifest via vite-plugin-pwa
  - Config-injected HTML title/meta via Vite transformIndexHtml
  - Example group config template for clone-and-swap
  - Legacy src/data/ files deleted (data now in config)
affects: [any future group clone, deployment, PWA behavior]

# Tech tracking
tech-stack:
  added: []
  patterns: [config-driven PWA manifest, transformIndexHtml for build-time injection, example config template]

key-files:
  created:
    - src/config/groups/example/index.ts
  modified:
    - src/components/FeedFilter.tsx
    - src/components/BiasFilter.tsx
    - src/components/NewsCard.tsx
    - src/components/EventCard.tsx
    - src/pages/Home.tsx
    - src/pages/Tours.tsx
    - src/pages/News.tsx
    - vite.config.ts
    - index.html

key-decisions:
  - "vite.config.ts imports from src/config/index.ts (single swap point) not directly from groups/bts/"
  - "index.html keeps hardcoded values as dev-server fallbacks; transformIndexHtml overwrites at build time"
  - "Example config uses buildKeywords pattern matching BTS config for consistency"

patterns-established:
  - "Config swap: change import in src/config/index.ts to swap entire app identity"
  - "Build-time config injection: Vite plugin reads config for manifest and HTML meta"

requirements-completed: [CONFIG-03, CONFIG-04]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 04 Plan 02: Config-Driven UI Wiring Summary

**All UI components, pages, PWA manifest, and HTML meta wired to config; example group template created; legacy data files deleted; zero hardcoded BTS references outside config**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T03:54:39Z
- **Completed:** 2026-02-26T03:57:01Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- FeedFilter tabs derived dynamically from config.sources (adding a source type to config auto-creates a filter tab)
- All user-facing group text (labels, quotes, titles) reads from config.labels
- PWA manifest generated from config at build time (no static manifest.json)
- HTML title and apple-mobile-web-app-title injected from config via Vite plugin
- Example group config serves as permanent template with full TypeScript validation
- Legacy src/data/ files deleted -- all data now colocated in config/groups/bts/

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire UI components and pages to config** - `e35b602` (feat)
2. **Task 2: Config-driven build artifacts and example group config** - `cea816f` (feat)

## Files Created/Modified
- `src/components/FeedFilter.tsx` - Config-derived filter tabs from config.sources
- `src/components/BiasFilter.tsx` - Member filter label from config.labels.memberFilterLabel
- `src/components/NewsCard.tsx` - Type import moved to config/types
- `src/components/EventCard.tsx` - Type import moved to config/types
- `src/pages/Home.tsx` - Quote from config.labels.homeQuote
- `src/pages/Tours.tsx` - Title/subtitle/events from config
- `src/pages/News.tsx` - Fallback news from config.news
- `vite.config.ts` - PWA manifest from config, transformIndexHtml plugin
- `index.html` - Removed static manifest link (vite-plugin-pwa auto-injects)
- `src/config/groups/example/index.ts` - Clone-and-swap template config
- `public/manifest.json` - Deleted (replaced by config-generated manifest)
- `src/data/events.ts` - Deleted (data in config/groups/bts/events.ts)
- `src/data/news.ts` - Deleted (data in config/groups/bts/news.ts)
- `src/data/members.ts` - Deleted (data in config/groups/bts/members.ts)

## Decisions Made
- vite.config.ts imports from `src/config/index.ts` rather than directly from `groups/bts/` -- single swap point for both runtime and build-time config
- index.html retains hardcoded title as dev-server fallback; transformIndexHtml overwrites during build and dev serve
- Example config includes buildKeywords function matching the BTS config pattern for complete clone-and-swap fidelity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed EventCard.tsx import of deleted data file**
- **Found during:** Task 1 (wire UI components)
- **Issue:** EventCard.tsx imported `Event` type from `../data/events` which was being deleted
- **Fix:** Changed import to `../config/types` where Event interface now lives
- **Files modified:** src/components/EventCard.tsx
- **Verification:** `npx tsc --noEmit` passes, build succeeds
- **Committed in:** e35b602 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix -- EventCard would have had broken import after data file deletion. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config-driven architecture complete: changing the import in `src/config/index.ts` swaps the entire app
- Clone-and-swap workflow: copy `src/config/groups/example/`, fill in data, update import
- All phases complete -- v1.0 milestone achieved

---
*Phase: 04-config-driven-ui*
*Completed: 2026-02-26*
