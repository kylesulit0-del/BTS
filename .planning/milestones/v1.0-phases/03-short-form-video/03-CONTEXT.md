# Phase 3: Short-Form Video - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Embed YouTube Shorts and TikTok videos as playable content directly in the feed. Videos autoplay on scroll, display in vertical format with full metadata, and use platform thumbnails as loading placeholders. TikTok content detected from Reddit posts and TikTok compilation YouTube channels.

</domain>

<decisions>
## Implementation Decisions

### Video Player Behavior
- Autoplay on scroll into view — no click required to start
- Mini inline video scrubber for play/pause control
- Sound on by default
- Loop continuously when video ends
- Pause when scrolled off-screen, resume when scrolled back
- One video plays at a time — starting a new video pauses any currently playing one

### Embed Presentation
- Video stays within regular card container — consistent with other feed cards
- Tall vertical card for 9:16 content — full aspect ratio, no capping
- Full metadata displayed — source badge, title, stats (overlaid or below video)
- Video type badge on cards — "Shorts" or "TikTok" label (not a play icon overlay)

### TikTok Detection & Sources
- Detect TikTok URLs in both Reddit link posts and post body/selftext
- Handle all TikTok URL formats: tiktok.com/@user/video/ID, vm.tiktok.com/abc, short-link redirects
- Also add YouTube channels that post BTS TikTok compilations as feed sources
- Fallback when TikTok embed fails: link card with TikTok thumbnail image + title + external link to open in TikTok

### Loading & Thumbnails
- Platform thumbnails from YouTube/TikTok APIs (not Reddit thumbnails)
- While iframe loads: keep showing thumbnail with a loading spinner overlay
- Autoplay only — no manual play trigger needed

### Claude's Discretion
- Intersection Observer threshold for triggering autoplay
- Exact scrubber/controls styling
- TikTok thumbnail API approach (oEmbed, scraping, or proxy)
- YouTube Shorts detection regex for URL patterns
- Which BTS TikTok compilation YouTube channels to add

</decisions>

<specifics>
## Specific Ideas

- Video experience should feel like Instagram Reels — one video at a time, autoplay on scroll, sound on
- TikTok fallback cards should still feel useful — show thumbnail + title so user can tap through to TikTok

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-short-form-video*
*Context gathered: 2026-02-25*
