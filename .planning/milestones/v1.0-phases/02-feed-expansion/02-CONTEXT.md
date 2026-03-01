# Phase 2: Feed Expansion - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Tumblr fan blogs, additional Reddit subreddits, and fan YouTube channels to the feed. Display engagement stats (upvotes, views, likes, notes) on feed cards. Add Tumblr filter chip. Implement engagement-weighted feed ordering with deduplication. All new sources configured with per-source enable/disable and fetch frequency.

</domain>

<decisions>
## Implementation Decisions

### Tumblr Content Presentation
- Text snippet + thumbnail layout — consistent with other card types
- Show latest reblog only (no reblog chains)
- Thumbnail-only for images — full images load on tap-through to Tumblr
- Source label shows "Tumblr" (not individual blog names)

### Engagement Stats Display
- Inline with existing metadata (timestamp/source label area), not a separate section
- Icons + abbreviated numbers format (arrow icon + "1.2k", speech bubble + "45")
- Abbreviate large numbers (1.2k, 15k, 1.2M)
- Hide stats entirely when zero or missing — no empty/zero displays
- Small minimum threshold before showing (Claude determines exact threshold)
- **Reddit:** upvotes + comments
- **YouTube:** views + likes
- **Tumblr:** note count
- All sources show stats where data is available

### Source Selection
- Claude researches and curates specific subreddits, YouTube channels, and Tumblr blogs
- **Reddit:** 5-8 additional subreddits (memes, discussion, fan art, news)
- **YouTube:** All fan content types — reactions, edits, compilations, translations, news
- **Tumblr:** 5-10 blogs across different content types (art, news, memes)
- Each source has an `enabled` flag in config for toggling
- Per-source fetch frequency in config (e.g. Reddit every 5 min, Tumblr every 30 min)

### Feed Mixing & Ordering
- Engagement-weighted ordering: equal weight between recency and engagement scores
- New sources appear naturally — no special "new" badges
- Deduplicate cross-source content by URL — show version with higher engagement
- Maximum post age: 30 days (revised from 7 days after UAT — YouTube/Tumblr posting cadences exceed 7 days)
- Add Tumblr filter chip to existing source filter UI in this phase (don't defer to Phase 4)

### Claude's Discretion
- Quality filter approach for source curation (minimum subscriber/activity thresholds)
- Per-source post cap per batch (whether to limit any single source from dominating)
- Exact engagement score weighting formula
- Minimum stat threshold values

</decisions>

<specifics>
## Specific Ideas

- Feed should feel balanced — not dominated by any single source even if one is more active
- Engagement-weighted ordering should blend recency and popularity equally — "newest items with most engagement" feel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-feed-expansion*
*Context gathered: 2026-02-25*
