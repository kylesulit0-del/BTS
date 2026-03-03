---
phase: 10-snap-feed-core
plan: 02
subsystem: ui
tags: [react, card-layouts, bottom-sheet, css, scroll-snap, dom-virtualization, content-types]

# Dependency graph
requires:
  - phase: 10-snap-feed-core
    provides: SnapFeed container, useSnapFeed hook, DOM_WINDOW_SIZE config, scroll-snap CSS
provides:
  - SnapCard type discriminator routing to image/video/text card variants
  - SnapCardImage with hero image + dark panel layout
  - SnapCardVideo with thumbnail facade and play icon overlay
  - SnapCardText with article-style reading layout
  - SeeMoreSheet bottom sheet overlay for truncated text
  - SnapCardMeta shared metadata component with source colors and stats
  - timeAgo utility function exported from SnapCard module
affects: [10-03 video playback and gestures, snap feed visual polish, card interaction patterns]

# Tech tracking
tech-stack:
  added: []
  patterns: [content-type discriminator pattern for card variants, portal-based bottom sheet with swipe-to-dismiss, CSS line-clamp truncation with overflow detection via scrollHeight comparison]

key-files:
  created:
    - packages/frontend/src/components/snap/SnapCard.tsx
    - packages/frontend/src/components/snap/SnapCardImage.tsx
    - packages/frontend/src/components/snap/SnapCardVideo.tsx
    - packages/frontend/src/components/snap/SnapCardText.tsx
    - packages/frontend/src/components/snap/SeeMoreSheet.tsx
  modified:
    - packages/frontend/src/components/snap/SnapFeed.tsx
    - packages/frontend/src/App.css

key-decisions:
  - "SeeMoreSheet rendered via createPortal to document.body to escape scroll-snap stacking context"
  - "Card type discriminator checks videoType+videoId first, then youtube source, then thumbnail, then falls back to text"
  - "Shared SnapCardMeta component used across all card variants for consistent metadata display"
  - "Video card accepts isActive prop but always renders facade pre-Plan 03 (iframe wiring deferred)"

patterns-established:
  - "Card variant pattern: getCardVariant discriminator function with FeedItem inspection for video/image/text routing"
  - "Bottom sheet pattern: portal + backdrop + swipe-down dismiss with 80px threshold and iOS-like cubic-bezier easing"
  - "Text truncation pattern: CSS line-clamp 5 + useRef scrollHeight > clientHeight overflow detection for See More trigger"

requirements-completed: [SNAP-03, SNAP-05, SNAP-06]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 10 Plan 02: Snap Card Layouts Summary

**Three adaptive card layouts (image/video/text) with type discriminator, metadata display, source link icon, and bottom sheet overlay for truncated text**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T03:26:46Z
- **Completed:** 2026-03-03T03:29:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Three card layout variants rendering real feed content based on type discrimination (video > image > text)
- Source link icon (external-link SVG) in top-right corner of every card with semi-transparent dark background circle
- Full metadata display: source color dot, author, relative timestamp, engagement stats (upvotes, comments, views, likes)
- Bottom sheet overlay (SeeMoreSheet) with portal rendering, swipe-down dismiss, and iOS-like animation easing
- SnapFeed now renders SnapCard components with isActive prop instead of placeholder cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SnapCard discriminator, three layout variants, and source link icon** - `6519451` (feat)
2. **Task 2: Wire SnapCard into SnapFeed, replace placeholder cards** - `5a536cc` (feat)

## Files Created/Modified
- `packages/frontend/src/components/snap/SnapCard.tsx` - Card shell with type discriminator, source link icon, shared SnapCardMeta component, timeAgo utility
- `packages/frontend/src/components/snap/SnapCardImage.tsx` - Hero image top 60%, dark panel with metadata and text truncation, image error fallback
- `packages/frontend/src/components/snap/SnapCardVideo.tsx` - Thumbnail facade with centered play icon overlay, gradient metadata overlay at bottom
- `packages/frontend/src/components/snap/SnapCardText.tsx` - Article-style left-aligned reading layout with large title, body text, metadata footer
- `packages/frontend/src/components/snap/SeeMoreSheet.tsx` - Bottom sheet via createPortal with swipe-down dismiss, backdrop tap close, 80vh max height
- `packages/frontend/src/components/snap/SnapFeed.tsx` - Replaced placeholder divs with SnapCard component, passes isActive via currentIndex comparison
- `packages/frontend/src/App.css` - CSS for all snap card variants, metadata, source link, video facade, text layout, bottom sheet

## Decisions Made
- SeeMoreSheet rendered via createPortal to escape scroll-snap container stacking context
- Card type discriminator priority: videoType+videoId > youtube source > thumbnail > text fallback
- Shared SnapCardMeta component avoids metadata duplication across card variants
- Video card play icon always shown pre-Plan 03; isActive prop accepted but facade-only for now
- Image error handling falls back to gradient background instead of breaking card layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created SeeMoreSheet in Task 1 instead of Task 2**
- **Found during:** Task 1 (SnapCard creation)
- **Issue:** SnapCard.tsx imports SeeMoreSheet -- TypeScript compilation fails without the component existing
- **Fix:** Implemented full SeeMoreSheet in Task 1 since it was needed for SnapCard imports to compile
- **Files modified:** packages/frontend/src/components/snap/SeeMoreSheet.tsx
- **Verification:** TypeScript compilation passes, portal rendering works
- **Committed in:** 6519451 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Task ordering adjusted for compilation dependency. No scope creep -- same total work delivered.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three card variants ready for Plan 03 video playback (SnapCardVideo accepts isActive prop)
- useSnapFeed hook provides currentIndex for determining active video card
- Bottom sheet overlay pattern established for potential reuse
- TypeScript compiles cleanly, Vite build succeeds

## Self-Check: PASSED

All 7 created/modified files verified present. Both task commits (6519451, 5a536cc) verified in git log.

---
*Phase: 10-snap-feed-core*
*Completed: 2026-03-03*
