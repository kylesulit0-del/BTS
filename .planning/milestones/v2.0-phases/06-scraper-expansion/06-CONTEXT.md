# Phase 6: Scraper Expansion - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Full source coverage — YouTube, RSS/news (Soompi, AllKPop, Koreaboo, HELLOKPOP, KpopStarz, Seoulbeats, Asian Junkie, Seoul Space), Tumblr, and Bluesky scrapers producing content items with source-appropriate engagement stats. Thumbnail extraction for all sources. Content age cleanup. Scrape health observability via `scrape_runs` table and simple frontend status page.

</domain>

<decisions>
## Implementation Decisions

### Engagement stats per source
- Sources with no engagement data store null — feed cards simply don't show engagement for those sources
- YouTube: RSS only for this phase (title, description, thumbnail). Data API for view counts deferred to future enhancement
- Bluesky: capture likes only (not reposts)
- Reddit: continues using existing upvotes + comment count from Phase 5
- Storage format: named JSON blob per content item (e.g., `{upvotes: 42, comments: 5}`) — typed per source

### Thumbnail & media extraction
- Direct hotlink to source CDNs — no proxying or caching images
- Text-only posts (no image available): no image area on card, text preview fills the space naturally
- YouTube: use medium resolution thumbnails (320x180)
- Tumblr: first image from the post only
- News sites: extract og:image from RSS; if RSS lacks image, fetch article HTML for og:image
- Generic logo detection: if og:image matches known site logo patterns, fall back to first in-article image
- Validate thumbnail URLs with HEAD request before storing — handle broken images client-side by hiding the image area on load failure
- Broken image client-side handling: detect load failure, collapse image area so card becomes text-only

### Content age & cleanup
- 14-day retention window, same for all sources
- Cleanup runs after each scrape cycle (not separate schedule)
- Soft delete — set `deleted_at` timestamp rather than hard DELETE. Feed queries exclude soft-deleted items

### Scrape health & observability
- Three-state run tracking: success (items found), empty (fetch worked, zero new items), error (request/parse failure)
- `scrape_runs` stores: timestamp, source, status, item count, duration, and full error message + stack trace on failure
- Retain last 7 days of run history, clean up older entries
- Frontend status page with simple traffic light indicators (green/yellow/red) per source based on recent run health
- Existing `/api/health/sources` endpoint continues to serve detailed data

### Claude's Discretion
- Loading skeleton design for status page
- Exact traffic light thresholds (what ratio of errors = yellow vs red)
- Tumblr RSS parsing details
- Bluesky AT Protocol query parameters and keyword search strategy
- Rate limiting and retry timing per source
- Soft-delete purge schedule (when to hard-delete soft-deleted items, if ever)

</decisions>

<specifics>
## Specific Ideas

- RSS-first approach for YouTube and Tumblr — use existing feed infrastructure rather than custom APIs
- News site scrapers should try progressively harder for good thumbnails (RSS -> og:image -> first article image)
- Status page should be quick-glance friendly from a phone — traffic lights, not data tables

</specifics>

<deferred>
## Deferred Ideas

- YouTube Data API integration for view/like counts — future enhancement after RSS-only scraper ships
- Bluesky repost counts — may add later if ranking phase needs it

</deferred>

---

*Phase: 06-scraper-expansion*
*Context gathered: 2026-03-01*
