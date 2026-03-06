# Phase 13: Fixed Header & Sort Bottom Sheet - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the auto-hide control bar with a permanently visible fixed header containing "Army Feed" branding and sort/filter action buttons. Add a sort bottom sheet matching the existing filter bottom sheet design. Remove all old auto-hide control bar code (useControlBarVisibility, snap-reveal-zone). Feed viewport adjusts to remaining space below header.

</domain>

<decisions>
## Implementation Decisions

### Header appearance
- Solid dark opaque background, matching app dark theme
- "Army Feed" branding as bold white text only (no icon/logo), positioned top-left
- Sort and filter as icon-only buttons at top-right
- Subtle 1px border at bottom separating header from feed content

### Sort sheet interaction
- Tapping a sort option applies immediately (instant apply, no confirm button)
- Checkmark icon next to the currently active sort option
- "Sort By" title at top of sheet, matching filter sheet's header pattern
- Sheet closes by swiping down or tapping outside (does NOT auto-close on selection)

### Header-feed integration
- Feed area = viewport minus header height; cards fill remaining space, no overlap
- Compact header height (~44px) to maximize feed space on mobile
- Small colored dot indicator on sort icon when non-default sort is active
- Sort and filter indicators are independent (sort shows dot, filter shows its own count)

### Cleanup
- Clean removal of all old control bar code: useControlBarVisibility hook, snap-reveal-zone, and related components
- Filter button moves from old control bar into the new fixed header
- No card counter or other old control bar info carried over — header is branding + sort/filter only
- No concern about losing old control bar features

### Claude's Discretion
- Safe area / notch handling for iOS PWA (follow PWA best practices)
- Exact icon choices for sort and filter buttons
- Header typography sizing and spacing within the ~44px constraint
- Sort sheet animation timing and easing (match filter sheet)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches that match the existing dark-theme aesthetic and filter bottom sheet patterns already in the app.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-fixed-header-sort-bottom-sheet*
*Context gathered: 2026-03-04*
