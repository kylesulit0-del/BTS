---
phase: 10-snap-feed-core
plan: 03
subsystem: ui
tags: [react, video, youtube-iframe-api, swipe-gesture, postmessage, scroll-snap]

# Dependency graph
requires:
  - phase: 10-snap-feed-core/02
    provides: "SnapCardVideo facade component with isActive prop, SnapCard layout with source link icon"
provides:
  - "useSnapVideo hook: video lifecycle management with autoplay/pause, mute state, YouTube progress"
  - "useSwipeGesture hook: horizontal right-swipe gesture detection with axis locking"
  - "Active video iframe rendering in SnapCardVideo (single iframe in DOM, PERF-01)"
  - "Right-swipe to open source link on all snap cards"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session-level mute state via module-level variable (persists across video cards within session)"
    - "YouTube IFrame API progress tracking via postMessage listening events"
    - "Axis-locked horizontal swipe detection that doesn't interfere with vertical scroll-snap"

key-files:
  created:
    - packages/frontend/src/hooks/useSnapVideo.ts
    - packages/frontend/src/hooks/useSwipeGesture.ts
  modified:
    - packages/frontend/src/components/snap/SnapCardVideo.tsx
    - packages/frontend/src/components/snap/SnapCard.tsx
    - packages/frontend/src/hooks/useVideoAutoplay.ts
    - packages/frontend/src/App.css

key-decisions:
  - "Session mute starts muted (browser autoplay policy), auto-unmutes after first user interaction"
  - "Custom progress bar hidden for TikTok (native progress_bar=1 in iframe suffices)"
  - "iframe rendered directly in SnapCardVideo (not via VideoEmbed) to avoid conflicting IntersectionObservers"
  - "Right-swipe threshold 120px with axis locking ratio 1.5x to prevent accidental swipes"
  - "Exported sendCommand from useVideoAutoplay for reuse in snap feed context"

patterns-established:
  - "Module-level session state: mute preference persists via module-level variable, not React state"
  - "Conditional iframe rendering: isActive prop controls iframe mount/unmount for single-iframe enforcement"
  - "Swipe gesture with axis locking: dead zone + ratio check prevents horizontal/vertical conflict"

requirements-completed: [SNAP-07, PERF-01]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 10 Plan 03: Video Lifecycle & Swipe Gesture Summary

**Video autoplay/pause with single-iframe enforcement, session mute persistence, YouTube progress tracking, and right-swipe gesture to open source links**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T03:31:49Z
- **Completed:** 2026-03-03T03:35:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Videos autoplay muted when snapped into view, pause when scrolled away, with only one iframe in DOM at any time (PERF-01)
- Session mute state persists across videos -- after first unmute, subsequent videos auto-start unmuted
- Thin custom progress bar at bottom of YouTube video cards tracks playback position via IFrame API postMessage
- Right-swipe on any snap card slides it right with source-colored background, opening source link when threshold reached

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSnapVideo hook and wire active video playback into SnapCardVideo** - `546baff` (feat)
2. **Task 2: Create useSwipeGesture hook and wire right-swipe into all snap cards** - `081af4d` (feat)

## Files Created/Modified
- `packages/frontend/src/hooks/useSnapVideo.ts` - Video lifecycle hook: autoplay/pause, mute state, YouTube progress tracking
- `packages/frontend/src/hooks/useSwipeGesture.ts` - Right-swipe gesture detection with axis locking and spring-back animation
- `packages/frontend/src/components/snap/SnapCardVideo.tsx` - Video card with conditional iframe (active) or facade (inactive)
- `packages/frontend/src/components/snap/SnapCard.tsx` - Wired swipe gesture handlers and source-colored background reveal
- `packages/frontend/src/hooks/useVideoAutoplay.ts` - Exported sendCommand for reuse
- `packages/frontend/src/App.css` - Mute button, progress bar, swipe content wrapper styles

## Decisions Made
- Session mute starts muted per browser autoplay policy; auto-unmutes after first user interaction (matches TikTok behavior)
- Custom progress bar hidden for TikTok where native progress_bar=1 in iframe URL suffices
- iframe rendered directly in SnapCardVideo rather than via VideoEmbed to avoid conflicting IntersectionObservers
- Right-swipe threshold set to 120px with 1.5x axis locking ratio per research recommendation
- Exported sendCommand from useVideoAutoplay (was module-private) for reuse in snap feed context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported sendCommand from useVideoAutoplay**
- **Found during:** Task 1 (useSnapVideo hook creation)
- **Issue:** sendCommand was a private function in useVideoAutoplay.ts, but useSnapVideo needs to import it
- **Fix:** Changed `function sendCommand` to `export function sendCommand`
- **Files modified:** packages/frontend/src/hooks/useVideoAutoplay.ts
- **Verification:** TypeScript compilation passes, import works correctly
- **Committed in:** 546baff (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal change -- added export keyword to existing function. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (Snap Feed Core) is now complete with all 3 plans executed
- Video lifecycle, card layouts, virtualized scroll, and swipe gestures all wired together
- Ready for next phase

## Self-Check: PASSED

All 7 files verified present. Both task commits (546baff, 081af4d) confirmed in git log.

---
*Phase: 10-snap-feed-core*
*Completed: 2026-03-03*
