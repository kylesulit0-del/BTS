# Phase 14: Video Touch Overlay - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Transparent gesture layer over video iframes enabling swipe navigation and tap play/pause. Users can swipe vertically through video cards just as smoothly as image/text cards, tap to play/pause, and swipe left to open source URL. This phase does NOT change card layout or add new gesture types.

</domain>

<decisions>
## Implementation Decisions

### Gesture thresholds
- TikTok-like sensitivity for swipe detection — match TikTok's feel for dead zones and trigger distances
- Card follows finger during swipe with snap-back animation if swipe doesn't cross threshold
- Always one card per swipe — no velocity-based multi-card scrolling regardless of flick force

### Play/pause feedback
- Autoplay muted when video card comes into view
- Tap toggles play/pause (not unmute) — volume is a separate concern
- Brief overlay icon (play/pause) fades in and out on tap — like YouTube/TikTok
- Mute toggle icon visible on video cards for audio control

### Conflict resolution
- Diagonal swipes are ignored — only clearly vertical or horizontal swipes are recognized
- Lock to first recognized direction once gesture starts — axis locked until touch ends
- Horizontal swipe threshold same as non-video cards — consistency across all card types
- Overlay covers entire video area — YouTube's built-in controls are hidden, all interaction goes through our gesture handler
- Swipe LEFT opens source URL (not right) — applies to all card types

### Video state on swipe
- Pause video automatically when swiped away from
- Resume from previous position when swiped back to a video card
- Only one video plays at a time — navigating to a new video card pauses any previously playing video
- Loop video when it reaches the end — TikTok-style continuous playback

### Claude's Discretion
- Overlay icon animation timing and style
- Mute toggle icon placement and design
- Exact dead zone pixel threshold (should match TikTok feel)
- Technical approach to intercepting touches over iframes

</decisions>

<specifics>
## Specific Ideas

- "It should match the same sensitivity as TikTok" — gesture feel is the reference point for thresholds, dead zones, and overall touch responsiveness
- TikTok is the primary UX reference: one card per swipe, autoplay muted, loop on end, tap to pause

</specifics>

<deferred>
## Deferred Ideas

- Swipe left opens source URL correction noted — if this differs from current behavior on non-video cards, the change should apply globally (may affect other phases)

</deferred>

---

*Phase: 14-video-touch-overlay*
*Context gathered: 2026-03-04*
