---
phase: 09-api-contract-and-state-foundation
plan: 02
subsystem: ui
tags: [feed-state, url-params, useReducer, useSearchParams, theme-tokens, css-custom-properties, config-driven]

# Dependency graph
requires:
  - phase: 09-api-contract-and-state-foundation
    provides: SortMode type, server-side /api/feed sort param, frontend fetchFeed sort plumbing
provides:
  - useFeedState hook with URL-synced sort/source/contentType via useReducer + useSearchParams
  - feedMode config flag ('snap' | 'list') on GroupConfig with conditional rendering
  - ThemeTokens interface and CSS custom property application for semantic design tokens
  - BTS dark theme token values (surfaces, text, radii, gradients, control bar)
affects: [10-snap-feed-container, 11-feed-animations, feed UI sort controls]

# Tech tracking
tech-stack:
  added: []
  patterns: [useReducer + useSearchParams for URL-synced page state, config-driven feed mode switching, semantic theme tokens as CSS custom properties]

key-files:
  created:
    - packages/frontend/src/hooks/useFeedState.ts
  modified:
    - packages/frontend/src/hooks/useFeed.ts
    - packages/frontend/src/pages/News.tsx
    - packages/frontend/src/config/types.ts
    - packages/frontend/src/config/applyTheme.ts
    - packages/frontend/src/config/groups/bts/theme.ts
    - packages/frontend/src/config/groups/bts/index.ts

key-decisions:
  - "useFeedState uses useRef to skip initial mount URL sync, avoiding unnecessary history entry"
  - "Only non-default values written to URL (omit sort=recommended, source=all, type=all) to keep URLs clean"
  - "Theme tokens mapped to existing CSS variable names (e.g. surfaceColor -> --bg-card) so existing CSS rules benefit"
  - "feedMode defaults to 'list' for backward compatibility; snap placeholder ready for Phase 10"

patterns-established:
  - "URL state pattern: useReducer for state transitions + useSearchParams for persistence, with replace:true to avoid history pollution"
  - "Theme token pattern: optional tokens object on ThemeConfig, applied conditionally via setProperty in applyTheme"
  - "Config-driven rendering: feedMode flag on GroupConfig controls which feed component renders"

requirements-completed: [PERF-03, CONF-01, CONF-02]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 9 Plan 02: URL-Synced Feed State, Feed Mode Config, and Theme Tokens Summary

**useFeedState hook syncing sort/source/contentType to URL params, feedMode config flag for snap/list switching, and semantic CSS custom properties from theme tokens**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T01:31:23Z
- **Completed:** 2026-03-03T01:34:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Feed state (sort, source, contentType) managed via useReducer + useSearchParams with URL persistence across page refresh
- feedMode config flag on GroupConfig with conditional rendering: snap placeholder vs existing list/swipe feed
- 11 semantic theme tokens applied as CSS custom properties on document root via applyTheme
- BTS dark theme values configured for surfaces, text, radii, gradients, and control bar
- All existing feed functionality (loading, filtering, bias, refresh, view toggle) preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useFeedState hook with URL sync and wire into feed pipeline** - `857d2ff` (feat)
2. **Task 2: Add feedMode config flag, theme tokens, and conditional feed rendering** - `0ef4518` (feat)

## Files Created/Modified
- `packages/frontend/src/hooks/useFeedState.ts` - New hook: useReducer + useSearchParams for URL-synced feed state
- `packages/frontend/src/hooks/useFeed.ts` - Changed signature to accept feedState object, forwards sort to server API
- `packages/frontend/src/pages/News.tsx` - Uses useFeedState dispatch, feedMode conditional rendering
- `packages/frontend/src/config/types.ts` - Added ThemeTokens interface, tokens on ThemeConfig, feedMode on GroupConfig
- `packages/frontend/src/config/applyTheme.ts` - Extended with CSS custom property application for 11 token types
- `packages/frontend/src/config/groups/bts/theme.ts` - Added BTS dark theme token values
- `packages/frontend/src/config/groups/bts/index.ts` - Added feedMode: 'list' to btsConfig

## Decisions Made
- Used useRef for initial mount skip in URL sync to avoid creating an unnecessary browser history entry on first render
- Only non-default values written to URL params (sort=recommended, source=all, type=all are omitted)
- Theme tokens mapped to existing CSS variable names (surfaceColor -> --bg-card) so existing CSS rules automatically benefit from config values
- feedMode set to 'list' in BTS config for backward compatibility until Phase 10 implements snap feed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useFeedState hook ready for UI sort controls (sort dropdown/selector)
- feedMode: 'snap' placeholder in place for Phase 10 snap feed container implementation
- CSS custom properties available for Phase 10/11 card styling and animations
- All TypeScript packages compile cleanly, Vite build succeeds

## Self-Check: PASSED

All 8 files verified present. Both task commits (857d2ff, 0ef4518) verified in git log.

---
*Phase: 09-api-contract-and-state-foundation*
*Completed: 2026-03-03*
