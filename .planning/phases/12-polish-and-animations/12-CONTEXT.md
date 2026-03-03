# Phase 12: Polish and Animations - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Premium polish for the snap feed: card entrance animations, engagement stats bar, and skeleton loading state. Does not include new features, new content types, or new interaction patterns. This is the final phase of milestone v3.0.

</domain>

<decisions>
## Implementation Decisions

### Card Transitions
- Entrance animation: slide up from below + fade in (translateY: +30px → 0, opacity: 0 → 1)
- Duration ~250ms, ease-out easing — snappy and quick
- No exit animation — card simply leaves the viewport on scroll away
- Animation plays every time a card snaps into view, including when scrolling back to previous cards
- First card on page load also animates in (after skeleton disappears)

### Engagement Stats Bar
- Horizontal bar along the bottom of each card (not vertical/right-side)
- Stats shown: upvotes, comments, views — with abbreviated counts (1.2k, 3.4M format)
- Stats are display-only, not tappable (source link already exists for opening original post)
- If a stat is zero or unavailable (e.g. no view count from Reddit), hide that stat entirely — don't show icon with dash/zero
- Only show stats that have real data

### Skeleton Loading
- Shimmer blocks style: gray blocks with left-to-right shimmer animation (YouTube/Facebook pattern)
- Single full-viewport skeleton card (one card, since snap feed shows one at a time)
- Generic layout — large block at top, text lines below. Not specific to any card type
- Skeleton only shows on initial page load, not on sort/filter changes

### Overall Motion Feel
- Snappy and quick personality — fast transitions (~200-250ms), sharp easing
- Respect prefers-reduced-motion: skip entrance animations but keep subtle motion (shimmer, fades)
- Engagement stats bar animates in with the card (no staggered delay)
- Control bar slides down into place on initial load (coordinated with card slide-up)

### Claude's Discretion
- Exact shimmer gradient colors and animation speed
- Specific icons for upvotes/comments/views
- Skeleton block proportions and spacing
- Whether to use CSS animations or a motion library
- Exact easing curves

</decisions>

<specifics>
## Specific Ideas

- Card entrance should feel TikTok-like — energetic slide up, not slow/floaty
- Shimmer should be the standard modern pattern users recognize from YouTube/Facebook
- Stats bar is informational only — no interaction, just surface the numbers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-polish-and-animations*
*Context gathered: 2026-03-03*
