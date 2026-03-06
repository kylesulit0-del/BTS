# Phase 15: Media-Centric Card Layout - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified two-zone card layout for all card types (video, image, text): media fills the top ~60% of viewport, structured info panel in the bottom ~40%. Every card shows title, metadata, and snippet with source link. Text-only posts get a branded gradient placeholder. SeeMoreSheet component is removed and replaced by inline "(Show More)" source URL link. This phase does NOT add new card interactions or new content sources.

</domain>

<decisions>
## Implementation Decisions

### Info panel content
- Large bold title, truncated to 1-2 lines with ellipsis
- Metadata row: upload date + all available engagement stats (likes, comments, views) — show what each source provides
- Small source icon next to date in the metadata row
- Text snippet: first 100-150 characters of description, followed by inline "(Show More)" link that opens source URL in new tab
- When post has no description: show "View on [Source]" link instead of snippet area

### Text-only card design
- Purple gradient placeholder fills the 60% media zone — gradient only, no overlaid content
- Vertical (top-to-bottom) gradient direction
- Deep violet (#6B21A8) at top to lighter purple (#A855F7) at bottom
- Same purple gradient used as fallback when images fail to load

### Media zone treatment
- All card types use 60/40 split — including video cards (consistent layout)
- Images use object-fit: cover (crop to fill, no empty space)
- Shimmer/skeleton placeholder while images load
- Purple gradient fallback when images fail to load (same as text-only cards)

### Card visual style
- Hard edge between media zone and info panel — clean straight line
- Info panel background matches current dark theme — seamless, no card distinction
- Full-screen sections — no borders, shadows, or card boundaries (TikTok/Stories feel)

### Claude's Discretion
- Exact typography sizes and line heights for title/metadata/snippet
- Padding and spacing within the info panel
- Shimmer animation implementation
- How engagement stats are formatted (e.g., "1.2K views" vs "1,234 views")
- Source icon size and style in metadata row

</decisions>

<specifics>
## Specific Ideas

- Cards should feel like full-screen sections (TikTok/Instagram Stories style) — no card chrome
- The 60/40 split applies to ALL card types for consistency, including videos (which currently use full viewport)
- Purple gradient is the universal fallback — text-only posts and failed image loads both use it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-media-centric-card-layout*
*Context gathered: 2026-03-04*
