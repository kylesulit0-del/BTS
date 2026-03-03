# Phase 11: Sort and Filter Controls - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified control bar giving users sort modes (Recommended, Newest, Oldest, Most Popular, Most Discussed) and filters (source, member, content type) to control what appears in the snap feed. Auto-hides for immersion. Does not include new feed layouts, engagement features, or animations (those are Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Control Bar Layout
- Segmented tabs for sort modes + filter icon that opens a bottom sheet
- All 5 sort modes visible as tabs (horizontally scrollable if needed): Rec, New, Old, Pop, Disc
- Filter icon (hamburger/≡) at the right end of the tab row opens bottom sheet
- Bar overlays on top of snap card content with semi-transparent background — does not take its own vertical space

### Filter Bottom Sheet
- Tabbed sections inside the sheet: Source | Member | Type tabs
- Each tab shows its filter options as tappable chips
- Source: Reddit, YouTube, RSS, Tumblr, Bluesky
- Member: RM, Jin, Suga, j-hope, Jimin, V, Jungkook, OT7
- Type: Video, Image, News, Discussion
- No "Apply" button — filters apply live/instantly as chips are toggled
- Sheet can be dismissed by swiping down or tapping outside

### Filter Interaction
- Multi-select within all categories (source, member, type)
- Active filters shown two ways: badge count on filter icon + dismissible chips below sort tabs
- "Clear all" button to reset all filters at once (no individual × on chips outside the sheet)
- Active filter chips auto-hide with the bar on scroll

### Sort Mode Behavior
- Default sort: Recommended
- Active sort tab gets a filled/highlighted background (purple pill style), inactive tabs are text-only
- When switching sorts, try to keep the current card visible if it exists in new results; fall back to top if not
- Sort and filter selections persist in local storage (not URL params)

### Auto-Hide Behavior
- Bar visible on initial load (first card) so users discover controls exist
- Hides immediately when user starts scrolling down
- Reappears on tap of the top area of the screen (not scroll-up)
- Slide up/down animation for hide/show transitions

### Claude's Discretion
- Exact tab abbreviations and sizing
- Semi-transparent background opacity/blur
- Bottom sheet height and drag handle styling
- Tap target size for top-area reveal gesture
- Loading/transition state when sort/filters change
- Empty state when filters match no content

</decisions>

<specifics>
## Specific Ideas

- Sort tabs should feel like a native mobile segmented control — filled pill for active, clean text for inactive
- Filter sheet should be a standard bottom sheet pattern (drag handle, swipe to dismiss)
- "Tap top area to show controls" similar to how some video players reveal controls

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-sort-and-filter-controls*
*Context gathered: 2026-03-03*
