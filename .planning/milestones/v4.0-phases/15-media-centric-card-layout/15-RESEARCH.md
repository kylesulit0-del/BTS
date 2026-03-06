# Phase 15: Media-Centric Card Layout - Research

**Researched:** 2026-03-04
**Domain:** CSS layout, React component refactoring, mobile-first card UI
**Confidence:** HIGH

## Summary

This phase restructures all three card variants (video, image, text) into a unified two-zone layout: media filling the top ~60% of the viewport and a structured info panel in the bottom ~40%. The codebase already has this 60/40 split partially implemented in `SnapCardImage` (via `flex: 0 0 60%` on `.snap-card-image-hero`), so the main work is extending this pattern to video and text cards, unifying the info panel content across all card types, and removing the `SeeMoreSheet` component.

The existing component structure (`SnapCard` -> `SnapCardVideo`/`SnapCardImage`/`SnapCardText`) is well-suited for this refactoring. Each variant component already receives the `FeedItem` and renders its own layout. The `SnapCardMeta` component in `SnapCard.tsx` handles metadata display (title + source dot + author + time) and will need to be redesigned to match the new info panel spec (bold title, date + engagement stats, snippet + show more link).

**Primary recommendation:** Refactor all three card variants to share a common two-zone container (60% media / 40% info panel), extract a new unified `InfoPanel` component, and remove `SeeMoreSheet` entirely.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Large bold title, truncated to 1-2 lines with ellipsis
- Metadata row: upload date + all available engagement stats (likes, comments, views) -- show what each source provides
- Small source icon next to date in the metadata row
- Text snippet: first 100-150 characters of description, followed by inline "(Show More)" link that opens source URL in new tab
- When post has no description: show "View on [Source]" link instead of snippet area
- Purple gradient placeholder fills the 60% media zone -- gradient only, no overlaid content
- Vertical (top-to-bottom) gradient direction
- Deep violet (#6B21A8) at top to lighter purple (#A855F7) at bottom
- Same purple gradient used as fallback when images fail to load
- All card types use 60/40 split -- including video cards (consistent layout)
- Images use object-fit: cover (crop to fill, no empty space)
- Shimmer/skeleton placeholder while images load
- Purple gradient fallback when images fail to load (same as text-only cards)
- Hard edge between media zone and info panel -- clean straight line
- Info panel background matches current dark theme -- seamless, no card distinction
- Full-screen sections -- no borders, shadows, or card boundaries (TikTok/Stories feel)

### Claude's Discretion
- Exact typography sizes and line heights for title/metadata/snippet
- Padding and spacing within the info panel
- Shimmer animation implementation
- How engagement stats are formatted (e.g., "1.2K views" vs "1,234 views")
- Source icon size and style in metadata row

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CARD-01 | Media asset rendered at top of card, filling ~60% of viewport height | Extend existing `snap-card-image-hero` flex pattern (`flex: 0 0 60%`) to all card types. Video cards currently use full viewport; need to constrain iframe to 60% zone. |
| CARD-02 | Post title displayed bold below media for all card types | New unified info panel component replaces per-variant metadata. Use `-webkit-line-clamp: 2` for ellipsis truncation (already used in `snap-card-meta-title`). |
| CARD-03 | Metadata row below title showing upload date and available engagement stats | Merge existing `SnapStatsBar` stat rendering logic (icons + `abbreviateNumber`) into the metadata row. Currently stats are in a separate floating bar at card bottom. |
| CARD-04 | Auto-snippet of first 100-150 characters of post description below metadata | Use `item.preview` field (already available). Truncate with JS `slice(0, 150)` rather than CSS clamp, since we need exact character control and inline "(Show More)" link. |
| CARD-05 | "(Show More)" link at end of snippet opens source URL in new tab | Replace `onSeeMore` prop (which opened `SeeMoreSheet`) with direct `window.open(item.url, '_blank')`. Inline anchor/button after truncated text. |
| CARD-06 | Text-only posts display branded gradient placeholder in 60% media zone | Currently text cards use full `bg-card` background. Add the 60% media zone with `background: linear-gradient(to bottom, #6B21A8, #A855F7)`. |
| CARD-07 | Remove SeeMoreSheet component (replaced by source URL link) | Delete `SeeMoreSheet.tsx`, remove `seeMoreOpen` state from `SnapCard`, remove `onSeeMore` props from `SnapCardImage`/`SnapCardText`. Delete associated CSS classes. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component rendering | Already in project |
| CSS (App.css) | N/A | Single stylesheet approach | Project convention -- all styles in one file |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `abbreviateNumber` utility | N/A | Format engagement stats (1.2k, 1.5M) | Already exists at `src/utils/formatNumber.ts` |

### Alternatives Considered
No new dependencies needed. This is purely CSS layout + React component restructuring using existing patterns.

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
packages/frontend/src/components/snap/
├── SnapCard.tsx           # MODIFY: remove SeeMoreSheet usage, remove seeMoreOpen state
├── SnapCardVideo.tsx      # MODIFY: constrain to 60% media zone + add info panel below
├── SnapCardImage.tsx      # MODIFY: update info panel content, remove onSeeMore prop
├── SnapCardText.tsx       # MODIFY: add gradient media zone, restructure to two-zone layout
├── SnapStatsBar.tsx       # REMOVE or INLINE: merge stat rendering into info panel
├── SeeMoreSheet.tsx       # DELETE: replaced by inline source URL link
└── SnapFeed.tsx           # UNCHANGED
```

### Pattern 1: Unified Two-Zone Card Layout
**What:** All three card variants share a common flexbox column structure: `.media-zone` (60%) + `.info-panel` (40%).
**When to use:** Every card type.
**Example:**
```typescript
// Shared structure across all card variants
<div className="snap-card-two-zone">
  {/* Media zone: 60% of card height */}
  <div className="snap-card-media-zone">
    {/* Variant-specific: iframe | img | gradient */}
  </div>
  {/* Info panel: remaining 40% */}
  <div className="snap-card-info-panel">
    <h3 className="snap-card-info-title">{item.title}</h3>
    <div className="snap-card-info-meta">
      <span className="snap-card-source-dot" style={{background: sourceColor}} />
      <span className="snap-card-info-date">{timeAgo(item.timestamp)}</span>
      {/* inline engagement stats */}
    </div>
    <div className="snap-card-info-snippet">
      {snippetText}
      <a href={item.url} target="_blank" rel="noopener">(Show More)</a>
    </div>
  </div>
</div>
```

### Pattern 2: Video Card 60/40 Constraint
**What:** Video cards currently take full viewport. They need to be constrained to 60% media zone while keeping iframe, touch overlay, mute button, and progress bar functional.
**When to use:** `SnapCardVideo` component.
**Example:**
```css
/* Video card adopts same two-zone layout */
.snap-card-video {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.snap-card-video-media {
  flex: 0 0 60%;
  position: relative;
  overflow: hidden;
}

/* iframe, touch overlay, mute btn, progress bar all inside media zone */
```

**Key consideration:** The touch overlay (`.snap-video-touch-overlay`) and mute button must remain within the 60% media zone, not span full viewport. The video metadata overlay at the bottom of the video (`.snap-card-video-overlay`) should be removed since metadata now lives in the info panel.

### Pattern 3: Image Loading States
**What:** Shimmer while loading, purple gradient on error. Already partially implemented.
**When to use:** `SnapCardImage` media zone.
**Example:**
```css
/* Shimmer effect - reuse existing snap-shimmer keyframe */
.snap-card-image-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: snap-shimmer 1.5s ease-in-out infinite;
}
```
The `@keyframes snap-shimmer` animation already exists in App.css (line 2017-2019).

### Pattern 4: Purple Gradient Placeholder
**What:** Branded gradient for text-only posts and failed image loads.
**When to use:** Text cards (always), image cards (on error).
**Example:**
```css
.snap-card-gradient-placeholder {
  background: linear-gradient(to bottom, #6B21A8, #A855F7);
  width: 100%;
  height: 100%;
}
```

### Anti-Patterns to Avoid
- **Separate metadata components per variant:** Don't create `VideoInfoPanel`, `ImageInfoPanel`, `TextInfoPanel`. Use ONE shared info panel that receives the `FeedItem` and renders identically for all types.
- **CSS clamp for snippet truncation:** Don't use `-webkit-line-clamp` for the snippet because we need to append "(Show More)" inline after exactly 100-150 characters. Use JS string slicing instead.
- **Keeping SeeMoreSheet "just in case":** Delete it completely. Dead code is tech debt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number abbreviation | Custom formatter | `abbreviateNumber()` from `src/utils/formatNumber.ts` | Already handles k/M formatting with trailing zero cleanup |
| Time formatting | New time ago function | `timeAgo()` from `SnapCard.tsx` | Already handles seconds/minutes/hours/days/dates |
| Shimmer animation | Custom keyframes | `@keyframes snap-shimmer` from App.css | Already defined and working |

**Key insight:** This phase is almost entirely component restructuring and CSS changes. No new utilities or external libraries are needed.

## Common Pitfalls

### Pitfall 1: Video iframe z-index chaos when constrained to 60%
**What goes wrong:** Iframe, touch overlay, mute button, progress bar, and tap icon all use z-index values (1, 3, 10, 15). When the video is moved into a 60% container, these elements may overlap into the info panel zone.
**Why it happens:** Current video card assumes full-viewport layout. The touch overlay uses `position: absolute; inset: 0;` which will correctly constrain to the new 60% parent IF that parent has `position: relative; overflow: hidden`.
**How to avoid:** Ensure the 60% media zone has `position: relative; overflow: hidden` so all absolutely-positioned children (iframe, overlay, mute btn, progress) stay within bounds.
**Warning signs:** Mute button or progress bar visible in the info panel area.

### Pitfall 2: SnapStatsBar positioned at bottom conflicts with info panel
**What goes wrong:** `SnapStatsBar` currently positions itself at the absolute bottom of the card with a gradient overlay (`position: absolute; bottom: 0`). This will overlap the info panel.
**Why it happens:** Stats rendering was designed for full-viewport cards where stats float over the media.
**How to avoid:** Inline the stat rendering logic into the info panel metadata row rather than using the floating `SnapStatsBar` component. Remove or repurpose `SnapStatsBar`.
**Warning signs:** Double stats display (once in floating bar, once in metadata row).

### Pitfall 3: Video facade/loading states not constrained
**What goes wrong:** `SnapCardVideo` has a facade (thumbnail + play icon for inactive state) and a loading state (thumbnail + spinner). Both use `width: 100%; height: 100%` and `position: absolute; inset: 0`. If the parent restructuring isn't careful, these may not fit the 60% zone.
**Why it happens:** Facade and loading states were designed for full-viewport video cards.
**How to avoid:** The facade and loading states should be children of the 60% media zone container, not the full card container.
**Warning signs:** Facade covers entire card instead of just the media zone.

### Pitfall 4: Snippet text length calculation
**What goes wrong:** `item.preview` may be undefined, empty, or shorter than 100 characters. The "(Show More)" link should only appear when text is truncated.
**Why it happens:** Not all feed items have a `preview` field. Some sources provide very short or no descriptions.
**How to avoid:** Check `item.preview` existence. Only truncate and show "(Show More)" if preview length exceeds the threshold. When no preview exists, show "View on [Source]" using `item.sourceName`.
**Warning signs:** "(Show More)" link on very short posts that don't need it.

### Pitfall 5: Source icon in metadata row
**What goes wrong:** The context specifies "small source icon next to date" but the codebase currently uses colored dots (`snap-card-source-dot`), not actual source icons/logos.
**Why it happens:** There are no source icon assets in the project -- only colored dots representing each source.
**How to avoid:** Continue using the colored dot pattern (which already maps to `sourceBadgeColors` in `SnapCard.tsx`) as the "source icon." This is the existing convention and no icon assets need to be created.
**Warning signs:** Trying to find/create SVG icons for each source platform.

## Code Examples

Verified patterns from the existing codebase:

### Current Image Card 60/40 Split (already works)
```css
/* Source: packages/frontend/src/App.css lines 1788-1810 */
.snap-card-image {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.snap-card-image-hero {
  flex: 0 0 60%;
  background-size: cover;
  background-position: center;
}

.snap-card-image-panel {
  flex: 1;
  background: var(--bg-card, #1a1a2e);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
```

### Existing Stats Rendering Logic
```typescript
// Source: packages/frontend/src/components/snap/SnapStatsBar.tsx
// Key pattern: check each stat exists and meets threshold, render icon + abbreviateNumber
if (stats.views != null && stats.views >= MIN_STAT_THRESHOLD) {
  entries.push({ key: "views", value: stats.views, icon: <svg>...</svg> });
}
// Render: {entries.map(e => <span>{e.icon} {abbreviateNumber(e.value)}</span>)}
```

### Source Color Mapping
```typescript
// Source: packages/frontend/src/components/snap/SnapCard.tsx lines 10-17
const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
  tumblr: "#001935",
  bluesky: "#0085FF",
};
```

### Shimmer Keyframe (reusable)
```css
/* Source: packages/frontend/src/App.css lines 2017-2019 */
@keyframes snap-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### FeedItem Data Shape
```typescript
// Source: packages/frontend/src/types/feed.ts
export interface FeedItem {
  id: string;
  title: string;        // -> bold title in info panel
  url: string;          // -> "(Show More)" link target
  source: FeedSource;   // -> source dot color lookup
  sourceName: string;   // -> "View on [Source]" fallback
  timestamp: number;    // -> upload date via timeAgo()
  preview?: string;     // -> snippet text (100-150 chars)
  thumbnail?: string;   // -> image/video thumbnail
  author?: string;      // -> optional, currently in meta row
  stats?: FeedStats;    // -> engagement stats in meta row
  videoType?: VideoType;
  videoId?: string;
}

export interface FeedStats {
  upvotes?: number;
  comments?: number;
  views?: number;
  likes?: number;
  notes?: number;       // Tumblr-specific
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-viewport video cards | 60/40 split for ALL cards | This phase | Video cards lose bottom-of-screen metadata overlay, gain structured info panel |
| `SeeMoreSheet` bottom sheet | Inline "(Show More)" source URL link | This phase | Simpler UX, fewer components, direct navigation to source |
| Floating `SnapStatsBar` | Stats inline in metadata row | This phase | Consolidated info display, no floating overlay |
| Per-variant metadata layout | Unified info panel for all variants | This phase | Consistent user experience across all card types |

**Deprecated/outdated:**
- `SeeMoreSheet.tsx`: Being removed entirely in this phase
- `SnapStatsBar.tsx`: May be removed or refactored -- stats logic moves inline to info panel
- `SnapCardMeta` component: Will be redesigned to match new info panel spec

## Open Questions

1. **Author field in info panel**
   - What we know: Current `SnapCardMeta` shows author when available. New spec focuses on title + date + stats + snippet.
   - What's unclear: Whether author should still appear in the new metadata row. CONTEXT.md doesn't mention it.
   - Recommendation: Omit author from the new info panel. The metadata row is: source icon + date + engagement stats. Author info was secondary and removing it keeps the row clean.

2. **`notes` stat from Tumblr**
   - What we know: `FeedStats` has a `notes` field specific to Tumblr. Current `SnapStatsBar` doesn't render it.
   - What's unclear: Whether Tumblr notes should be shown in the metadata row.
   - Recommendation: Treat `notes` like `likes` -- if present and above threshold, display with appropriate icon. Aligns with "show what each source provides."

3. **Video card inactive/facade state**
   - What we know: When a video card is not the active card in the feed, it shows a thumbnail facade with a play icon. This facade currently fills the full card.
   - What's unclear: Should the facade also be constrained to 60% with an info panel below, or can it remain full-card since it's not the active view?
   - Recommendation: Constrain to 60/40 even in facade state for layout consistency during scroll transitions.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/frontend/src/components/snap/SnapCard.tsx` -- main card orchestrator
- Codebase analysis: `packages/frontend/src/components/snap/SnapCardVideo.tsx` -- video variant (224 lines)
- Codebase analysis: `packages/frontend/src/components/snap/SnapCardImage.tsx` -- image variant with existing 60/40 split
- Codebase analysis: `packages/frontend/src/components/snap/SnapCardText.tsx` -- text variant (41 lines)
- Codebase analysis: `packages/frontend/src/components/snap/SeeMoreSheet.tsx` -- component to delete (75 lines)
- Codebase analysis: `packages/frontend/src/components/snap/SnapStatsBar.tsx` -- stats rendering (82 lines)
- Codebase analysis: `packages/frontend/src/App.css` -- all styles (2390 lines, snap-card styles at 1557+)
- Codebase analysis: `packages/frontend/src/types/feed.ts` -- FeedItem type definition

### Secondary (MEDIUM confidence)
- CSS Flexbox 60/40 split pattern verified working in existing `snap-card-image-hero` implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, pure refactoring of existing code
- Architecture: HIGH -- patterns already partially exist (image card 60/40), extending to other variants is straightforward
- Pitfalls: HIGH -- identified through direct codebase analysis of z-index layering, absolute positioning, and component dependencies

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- CSS/React patterns, no external dependencies)
