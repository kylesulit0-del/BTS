# Phase 8: Smart Blend and Integration - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Rank the feed with a multi-signal blend that surfaces the best content across sources (recency, normalized engagement, source diversity, content type variety). Connect the frontend to the API as its primary data source with seamless fallback to client-side fetching.

</domain>

<decisions>
## Implementation Decisions

### Blend signal weights
- Balanced blend — no single signal (recency, engagement, diversity) dominates
- Moderate time decay — content older than ~6 hours drops noticeably, feed feels fresh but doesn't miss good posts
- Strong source diversity — actively interleave sources, never more than 2 consecutive items from the same source
- Mix content types too — alternate between videos, articles, tweets etc. for a varied feed experience

### Engagement normalization
- Percentile within source — rank each item relative to others from the same source (top 10% of Reddit = top 10% of YouTube)
- Primary metric only per source — Reddit: upvotes, YouTube: views, Twitter: likes. One metric per source, less noise.
- RSS items get a neutral/middle-of-the-pack score — they appear based on recency and diversity, never forced to top or bottom
- Per-fetch batch percentile — calculated on the current batch of fetched items, recalculated each time

### Priority boost behavior
- Moderate boost — boosted accounts get a meaningful edge but can still be outranked by very popular general content
- Configured in group config — add a priority/boost field to source/account entries in existing group config files
- Numeric weight — e.g., priority: 1.5 or priority: 2.0 — allows fine-tuning per account
- Boost applies to entire source — all posts from a boosted account get the boost, assumes the account is curated

### API fallback experience
- Seamless — no visual difference between API-mode and client-side fetching
- Auto-fallback — silently switch to client-side fetching if API is unreachable, always show something
- Server-side ranking — API returns pre-ranked, blended feed; client-side fallback does its own simpler ranking
- Client-side fallback uses basic blend — diversity + recency, skip full normalization; not just recency-only

### Claude's Discretion
- Exact blend formula and signal weight values
- Normalization algorithm details
- How diversity interleaving is implemented (post-sort reordering vs scoring penalty)
- Error handling and retry logic for API fallback

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-smart-blend-and-integration*
*Context gathered: 2026-03-02*
