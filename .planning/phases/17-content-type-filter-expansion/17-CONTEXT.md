# Phase 17: Content Type Filter Expansion - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can filter the feed by expanded content type categories. New types (fan_fiction, music, and others) are added to the LLM classification pipeline, source-level defaults skip LLM for known sources, FilterSheet displays all types with correct badge colors, and server-side filtering works for all new values.

</domain>

<decisions>
## Implementation Decisions

### Content type taxonomy
- Full expanded type set: News, Discussion, Social Posts, Fan Art, Fan Fiction, Music, Media, General
- Media merges video and photo content into one type (no separate Video type)
- General is a visible filter option in FilterSheet (not hidden)
- FilterSheet chips ordered by volume (most common content type first, dynamically)
- LLM classifies each Reddit post granularly based on content (a meme = Fan Art, a news link = News, a text post = Discussion)
- Music covers strictly audio/MV releases and Spotify links. Dance practices and concert clips are Media.
- Only original fan art gets classified as Fan Art. Reblogs of others' art go to Social Posts or General.
- Translations classified by what they're translating (translated interview = News, translated lyrics = Music)

### Badge colors & labels
- Colors grouped by vibe: creative types (Fan Art, Fan Fiction, Music) share warm tones; informational types (News, Discussion) share cool tones; social is neutral
- Combined pill badge: "Source · Content Type" format (e.g., "Reddit · Fan Art")
- Pill color = content type color. Source name is text-only inside the pill.
- General items show source-only badge with no content type suffix (cleaner for uncategorized)

### Classification edge cases
- Low-confidence LLM results default to General (better uncategorized than wrong)
- Single content type per item only (no multi-type, no primary/secondary)
- Existing items reclassified on next scrape (gradual migration via upsert, no batch job)
- LLM receives title + description for classification (uses Phase 16 description field)

### Source-level defaults
- Hard defaults that skip LLM entirely:
  - AO3 → fan_fiction
  - Google News → news
  - YouTube → media
  - Bluesky → social_posts
- Reddit and Tumblr have no defaults — every post goes through LLM
- RSS sources have no defaults — LLM classifies each item
- Hard defaults are final (LLM does not run for these sources, no override)

### Claude's Discretion
- Where to store source-level default content type config (in sources.ts or separate mapping)
- Exact badge color hex values within the warm/cool grouping constraint
- LLM prompt engineering for the expanded type set
- Confidence threshold mechanics for General fallback

</decisions>

<specifics>
## Specific Ideas

- Combined pill badge format: "Reddit · Fan Art" with content type color as pill background
- Dynamic chip ordering in FilterSheet by item volume
- Warm/cool color grouping creates visual coherence across the badge palette

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-content-type-filter-expansion*
*Context gathered: 2026-03-06*
