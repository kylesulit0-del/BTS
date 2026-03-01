---
phase: 01-foundation
plan: 04
subsystem: config
tags: [config-driven, css-custom-properties, skeleton-loading, auto-retry, theme]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: GroupConfig type system with members/sources/theme (01-02), source registry and feed orchestrator (01-03)
provides:
  - Zero hardcoded BTS references in hooks/components/pages/services
  - Runtime theme application via CSS custom properties from config
  - SkeletonCard loading placeholder component
  - Silent auto-retry on total feed outage (5s/10s intervals)
  - View original link on FeedCard to source URL
  - Config-derived member chips in BiasFilter
  - Config-derived member data in Members/MemberDetail pages
affects: [02-feed-expansion, 03-embed-support, ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [runtime-css-custom-properties, config-derived-ui, silent-retry-pattern, skeleton-loading]

key-files:
  created:
    - src/config/applyTheme.ts
    - src/components/SkeletonCard.tsx
  modified:
    - src/hooks/useFeed.ts
    - src/hooks/useBias.ts
    - src/components/BiasFilter.tsx
    - src/components/FeedCard.tsx
    - src/components/MemberCard.tsx
    - src/pages/Home.tsx
    - src/pages/News.tsx
    - src/pages/Members.tsx
    - src/pages/MemberDetail.tsx
    - src/App.css
    - src/main.tsx

key-decisions:
  - "sourceBadgeColors/sourceEmojis kept as local constants -- they are platform-themed (reddit=orange, youtube=red), not group-specific"
  - "FeedCard changed from <a> wrapper to <div> with internal View original link for better semantic structure"
  - "Auto-retry uses 5s then 10s delays with max 2 retries, no error messages during retry"
  - "Tours.tsx BTS WORLD TOUR title left as-is -- event-specific content, not group branding"

patterns-established:
  - "All group-specific text/data in components reads from getConfig() at module scope"
  - "CSS uses generic --theme-primary/accent/dark variables, overridden at runtime by applyTheme"
  - "Member data in pages comes from config.members, not src/data/members.ts"

requirements-completed: [CONFIG-02]

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 1 Plan 04: Config Wiring Summary

**Full config-driven UI with zero hardcoded BTS references, runtime CSS theming via applyTheme, skeleton loading cards, and silent auto-retry on feed outage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T06:34:22Z
- **Completed:** 2026-02-25T06:39:54Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Eliminated all hardcoded BTS references from hooks, components, pages, and services -- every group-specific value now flows through GroupConfig
- Created runtime theme application system: applyTheme sets CSS custom properties from config, replacing hardcoded --bts-purple variables with generic --theme-* names
- Built SkeletonCard component and silent auto-retry system for graceful feed loading and outage handling
- Added "View original" link on FeedCard per CONTEXT.md locked decision

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire config into hooks and create theme application** - `c8e2018` (feat)
2. **Task 2: Wire config into components and pages** - `1d0d882` (feat)
3. **Task 3: Skeleton loading cards and auto-retry on total outage** - `e77477b` (feat)

## Files Created/Modified
- `src/config/applyTheme.ts` - Runtime CSS custom property application from ThemeConfig
- `src/components/SkeletonCard.tsx` - Skeleton loading placeholder card with pulse animation
- `src/hooks/useFeed.ts` - Config-derived cache key, isLoading/isRetrying state, silent auto-retry
- `src/hooks/useBias.ts` - Config-derived storage key
- `src/components/BiasFilter.tsx` - Member chips derived from config.members
- `src/components/FeedCard.tsx` - View original link, sourceBadgeColors kept as platform-themed constants
- `src/components/MemberCard.tsx` - Uses MemberConfig type, reads color/emoji from config
- `src/pages/Home.tsx` - Group name, native name, tagline, logo, fandom name from config
- `src/pages/News.tsx` - Social links from config, SkeletonCard integration, retry indicator
- `src/pages/Members.tsx` - Member data from config instead of data/members.ts
- `src/pages/MemberDetail.tsx` - Member lookup and emoji from config
- `src/App.css` - Renamed --bts-purple to --theme-*, added skeleton-card and retry styles
- `src/main.tsx` - Calls applyTheme(getConfig().theme) before render

## Decisions Made
- sourceBadgeColors and sourceEmojis in FeedCard/SwipeFeed kept as local constants since they map to source platform brands (Reddit orange, YouTube red), not BTS-specific data
- FeedCard wrapper changed from `<a>` to `<div>` to accommodate the internal "View original" link without nested anchors
- Silent auto-retry fires at 5s then 10s intervals (max 2 retries) with no user-facing error messages -- only a subtle pulsing dot indicator
- Tours.tsx "BTS WORLD TOUR 'ARIRANG'" title left unchanged -- this is event-specific content data, not group branding that should come from config

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated MemberCard to use MemberConfig type**
- **Found during:** Task 2 (component wiring)
- **Issue:** MemberCard imported Member type from data/members.ts and had hardcoded memberColors/memberEmojis maps. Members.tsx passing config.members (MemberConfig[]) would cause type incompatibility.
- **Fix:** Updated MemberCard to import MemberConfig type, read color/emoji directly from member prop instead of hardcoded maps
- **Files modified:** src/components/MemberCard.tsx
- **Verification:** `npx tsc --noEmit` passes, `npm run build` succeeds
- **Committed in:** 1d0d882 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed useRef strict mode argument**
- **Found during:** Task 3 (build verification)
- **Issue:** `useRef<ReturnType<typeof setTimeout>>()` with no argument fails in `tsc -b` strict mode
- **Fix:** Changed to `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`
- **Files modified:** src/hooks/useFeed.ts
- **Verification:** `npm run build` succeeds
- **Committed in:** e77477b (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for type safety and build correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 Foundation complete -- config-driven architecture fully wired through all app layers
- App is clone-and-swappable: changing the config import in src/config/index.ts swaps all branding, members, sources, and theme
- Ready for Phase 2 feed expansion: new sources need only a fetcher module + config SourceEntry
- Ready for Phase 3 embed support: feed infrastructure stable with progressive loading and retry
- Remaining hardcoded BTS text: Tours.tsx event title (event data, not config scope) and src/data/ static files (deprecated, kept as reference)

## Self-Check: PASSED
