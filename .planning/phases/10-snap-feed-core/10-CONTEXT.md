# Phase 10: Snap Feed Core - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Immersive full-screen vertical snap feed where each content piece fills the viewport (100svh), users flick between posts one at a time (TikTok-style), videos play inline, and only a configurable number of items exist in the DOM. Content sources include reddit, youtube, rss, and twitter. Creating interactions, bookmarking, and filtering are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Card visual design
- **Image posts:** Cropped hero image takes top ~60%, dark panel below with title and metadata
- Title sits in the dark panel (not overlaid on image)
- **Text-heavy posts (no image/video):** Left-aligned article style — title at top, body text below, comfortable line width
- **Metadata shown:** Full details — source icon, title, author/subreddit, relative timestamp, score/upvotes, comment count
- **Metadata layout:** Two rows at bottom — title on first row, author/score/time/comments on second row
- **Source link icon:** Top-right corner, small, always visible — tapping opens original in new tab
- **Source distinction:** Colored source icon only (reddit orange, youtube red, etc) — otherwise same card layout
- **Title font size:** Medium/subtitle — clear but not dominant, balanced with other content

### Scroll & snap behavior
- **Snap type:** Hard mandatory snap — always snaps to exactly one post, can't rest between posts
- **Scroll speed:** Match TikTok's snap animation speed and feel
- **One at a time:** Each flick advances exactly one post, regardless of velocity — both up and down
- **No position indicator:** Clean full-screen experience, no scrollbar or counter
- **No pull-to-refresh:** Manual refresh only (button or page reload)
- **No haptic feedback:** Visual-only feedback on snap
- **End of feed:** Seamless loop back to first post — no visual indication of wrapping, fixed order on loop
- **Few posts edge case:** Show what's available even if fewer than DOM window size — loop still works
- **Preload adjacent:** Always have next/prev content ready — no visible loading between snaps

### Horizontal swipe gesture
- **Right-swipe only:** Swipe right to open original source link in new tab
- **Left-swipe:** Does nothing
- **Animation:** Slide-out — card slides right with colored background, opens link when threshold hit (no URL preview during slide)

### DOM virtualization
- **Window size:** Configurable constant, default to 5 items — document how to adjust
- **Feed ordering:** Claude's discretion — pick best ordering strategy (chronological vs interleaved)

### Video playback
- **Autoplay:** Sound on by default when snapped into view
- **Pause behavior:** Video pauses when scrolled away; at most one video iframe in DOM
- **Tap action:** Tap anywhere on video card to toggle play/pause
- **Mute control:** Mute/unmute icon in bottom-right corner of video cards
- **Progress:** Thin progress bar at bottom of video card
- **Loading state:** Video thumbnail as background with loading spinner overlay

### See More overlay
- **Truncation:** 5 lines of text before showing "See More"
- **Tap target:** Inline text link — "...See More" appended to truncated text
- **Overlay type:** Bottom sheet — slides up from bottom, covers ~80% of screen, swipe down to dismiss
- **Overlay content:** Full text only (no extra metadata or images)

### Claude's Discretion
- Feed ordering strategy (chronological vs interleaved by source)
- Exact animation easing curves and durations (matching TikTok feel)
- Loading skeleton design for initial feed load
- Error state handling
- Exact spacing, typography scale, and color values
- Slide-out animation threshold distance and background color

</decisions>

<specifics>
## Specific Ideas

- "Match TikTok's scroll/snap animation speed" — the snap transition should feel identical to TikTok's vertical feed
- Slide-out swipe animation for opening source links — card slides right, colored background revealed, no URL preview
- Seamless infinite loop — user should never notice they've looped back to the beginning
- DOM window size should be configurable for later tweaking — start at 5, document how to change

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-snap-feed-core*
*Context gathered: 2026-03-03*
