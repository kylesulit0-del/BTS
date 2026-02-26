---
phase: 03-short-form-video
plan: 02
subsystem: ui
tags: [video-embed, youtube-shorts, tiktok, iframe, autoplay, intersection-observer, postmessage]

# Dependency graph
requires:
  - phase: 03-short-form-video
    provides: Video URL detection utility and FeedItem videoType/videoId fields
provides:
  - VideoEmbed component rendering YouTube Shorts and TikTok iframes with 9:16 aspect ratio
  - useVideoAutoplay hook with IntersectionObserver-driven play/pause and one-at-a-time enforcement
  - FeedCard and SwipeFeed integration for inline video playback
  - Video type badges (Shorts/TikTok) on feed cards
  - YouTube Shorts detection via oEmbed dimension heuristic in channel feeds
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [iframe postMessage API for cross-origin video control, IntersectionObserver autoplay, oEmbed dimension heuristic for Shorts detection]

key-files:
  created: [src/components/VideoEmbed.tsx, src/hooks/useVideoAutoplay.ts]
  modified: [src/components/FeedCard.tsx, src/components/SwipeFeed.tsx, src/App.css, src/services/sources/youtube.ts]

key-decisions:
  - "YouTube Shorts in channel feeds detected via oEmbed dimensions (height > width = vertical = Shorts)"
  - "postMessage API used to control YouTube and TikTok iframes for autoplay/pause"
  - "Module-level currentlyPlaying state enforces one-video-at-a-time across all VideoEmbed instances"
  - "Videos start muted (browser autoplay policy), unmute on user tap"

patterns-established:
  - "iframe postMessage control: YouTube uses JSON event/command format, TikTok uses x-tiktok-player typed messages"
  - "IntersectionObserver at 0.5 threshold for autoplay trigger"
  - "Video cards render inside existing feed-card structure, not as standalone cards"

requirements-completed: [EMBED-01, EMBED-02, EMBED-03]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 3 Plan 2: Video Embed UI Summary

**VideoEmbed component with 9:16 iframe rendering, IntersectionObserver autoplay, and YouTube Shorts oEmbed detection**

## Performance

- **Duration:** ~8 min (across checkpoint pause)
- **Started:** 2026-02-26
- **Completed:** 2026-02-26
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- Built VideoEmbed component rendering YouTube Shorts and TikTok as 9:16 vertical iframe players
- Created useVideoAutoplay hook with IntersectionObserver-driven autoplay and one-video-at-a-time enforcement via postMessage API
- Integrated VideoEmbed into FeedCard (with video type badges) and SwipeFeed
- Added CSS for video embed cards: aspect ratio, loading placeholder, spinner, mute button, fallback card, badge styling
- Fixed YouTube Shorts detection in channel feeds via oEmbed dimension heuristic (height > width = Shorts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create VideoEmbed component and useVideoAutoplay hook** - `bfdd92d` (feat)
2. **Task 2: Integrate VideoEmbed into FeedCard and SwipeFeed with styling** - `bcb6015` (feat)
3. **Task 3: Verify video embed experience** - checkpoint:human-verify, approved
4. **Deviation fix: Detect YouTube Shorts in channel feeds via oEmbed dimensions** - `d3635db` (feat)

## Files Created/Modified
- `src/components/VideoEmbed.tsx` - Unified video embed component for YouTube Shorts and TikTok iframes
- `src/hooks/useVideoAutoplay.ts` - IntersectionObserver-driven autoplay with one-at-a-time enforcement via postMessage
- `src/components/FeedCard.tsx` - Conditional VideoEmbed rendering when item has videoType, video type badge
- `src/components/SwipeFeed.tsx` - VideoEmbed integration for swipe feed view
- `src/App.css` - Video embed styles: 9:16 aspect ratio, placeholder, spinner, mute button, fallback, badge
- `src/services/sources/youtube.ts` - oEmbed dimension-based YouTube Shorts detection for channel feeds

## Decisions Made
- YouTube Shorts in channel feeds detected via oEmbed API dimensions (height > width indicates vertical/Shorts format) since YouTube Atom feeds don't distinguish Shorts from regular videos
- postMessage API used for cross-origin iframe control: YouTube JSON event/command format, TikTok x-tiktok-player typed messages
- Module-level `currentlyPlaying` state enforces single active video across all VideoEmbed instances
- Videos start muted per browser autoplay policy; user tap triggers unmute via sendMuteCommand
- Video cards render inside existing `.feed-card` structure maintaining full metadata display (source badge, title, stats, author, link)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] YouTube Shorts not detected in channel feeds**
- **Found during:** Task 3 (human verification checkpoint)
- **Issue:** YouTube channel feed videos were all appearing as regular videos, not Shorts, because channel Atom feeds don't include video type metadata
- **Fix:** Added oEmbed dimension check in YouTube fetcher -- fetches oEmbed data and uses height > width heuristic to detect vertical (Shorts) format
- **Files modified:** src/services/sources/youtube.ts
- **Verification:** Human verified Shorts now display correctly with 9:16 embed players
- **Committed in:** d3635db

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for Shorts detection to work with channel feeds. No scope creep.

## Issues Encountered
None beyond the Shorts detection deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Short-form video embedding fully functional for YouTube Shorts and TikTok content
- Phase 3 complete -- ready for Phase 4
- TikTok compilation YouTube channel remains enabled:false from Plan 01 (pending verified channel ID)

## Self-Check: PASSED

All 6 files verified present. All 3 commits verified in git log.

---
*Phase: 03-short-form-video*
*Completed: 2026-02-26*
