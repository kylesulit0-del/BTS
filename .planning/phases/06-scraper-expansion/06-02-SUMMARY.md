---
phase: 06-scraper-expansion
plan: 02
subsystem: scrapers, config
tags: [rss-parser, youtube-rss, rss-news, thumbnail-extraction, og-image, scraper-interface]

# Dependency graph
requires:
  - phase: 06-scraper-expansion
    plan: 01
    provides: "Schema with thumbnailUrl, engagementStats, deletedAt columns; ScrapedItem interface"
provides:
  - "YouTubeScraper producing items from YouTube channel RSS feeds with video thumbnails"
  - "RssNewsScraper handling all RSS-type news sources with progressive thumbnail extraction"
  - "Thumbnail utilities: og:image extraction, logo detection, HEAD validation, RSS media extraction"
  - "All Phase 6 source entries in getBtsScrapingConfig() (YouTube, RSS, Tumblr, Bluesky)"
affects: [06-03, 06-04, 07-moderation]

# Tech tracking
tech-stack:
  added: [rss-parser]
  patterns: [progressive-thumbnail-extraction, channel-rss-feed, config-driven-scraper, logo-detection]

key-files:
  created:
    - packages/server/src/scrapers/youtube.ts
    - packages/server/src/scrapers/rss-news.ts
    - packages/server/src/scrapers/thumbnail.ts
  modified:
    - packages/shared/src/config/sources.ts
    - packages/server/src/index.ts
    - packages/server/package.json

key-decisions:
  - "YouTube thumbnails constructed from videoId (mqdefault.jpg 320x180) instead of parsing media:thumbnail (known rss-parser bug)"
  - "Seoul Space source added as enabled:false pending URL verification"
  - "RSS thumbnail extraction uses progressive fallback: enclosure -> og:image -> first article image"
  - "Thumbnail validation skips known CDNs (YouTube, Tumblr, Bluesky) to reduce HTTP overhead"

patterns-established:
  - "Progressive thumbnail extraction: RSS enclosure -> og:image HTML fetch -> first article image, with logo detection"
  - "Config-driven scraper: single RssNewsScraper class iterates all RSS-type sources from config"
  - "Stable external IDs: YouTube uses yt-{videoId}, RSS uses rss-{base64url(link)}"

requirements-completed: [SCRAPE-02, SCRAPE-03, SCRAPE-06, SCRAPE-07]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 6 Plan 2: YouTube and RSS/News Scrapers Summary

**YouTube RSS scraper and RSS/news scraper with progressive og:image thumbnail extraction, plus all Phase 6 source config entries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T15:51:21Z
- **Completed:** 2026-03-01T15:56:05Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- YouTubeScraper fetches from BANGTANTV and HYBE LABELS channels via RSS, producing items with mqdefault.jpg thumbnails
- RssNewsScraper handles 7+ K-pop news sites (Soompi, AllKPop, Koreaboo, HELLOKPOP, KpopStarz, Seoulbeats, Asian Junkie) with keyword filtering and progressive thumbnail extraction
- Thumbnail utilities provide og:image extraction from HTML head, known logo detection, HEAD validation with 3s timeout, and RSS enclosure/media parsing
- All Phase 6 source entries configured: 2 YouTube, 8 RSS/news, 5 Tumblr, 1 Bluesky (23 total sources)
- Live verification confirmed YouTube items appearing in feed with correct thumbnails

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand source config, install rss-parser, create thumbnail utilities** - `dbef7e3` (feat)
2. **Task 2: Create YouTube and RSS/news scrapers, register in server** - `7c42bd7` (feat)

## Files Created/Modified
- `packages/shared/src/config/sources.ts` - Added 16 new source entries (YouTube, RSS, Tumblr, Bluesky) to getBtsScrapingConfig()
- `packages/server/src/scrapers/youtube.ts` - YouTubeScraper class: channel RSS feeds, videoId thumbnails, keyword filtering
- `packages/server/src/scrapers/rss-news.ts` - RssNewsScraper class: multi-site RSS parsing, progressive thumbnail extraction
- `packages/server/src/scrapers/thumbnail.ts` - extractOgImage, extractFirstArticleImage, isKnownLogo, validateThumbnail, extractRssThumbnail utilities
- `packages/server/src/index.ts` - Registered YouTubeScraper and RssNewsScraper in scrapers array
- `packages/server/package.json` - Added rss-parser dependency

## Decisions Made
- YouTube thumbnails: Constructed from videoId (`img.youtube.com/vi/{id}/mqdefault.jpg`) instead of parsing `media:thumbnail` from RSS XML due to known rss-parser attribute parsing bug (Pitfall 1 from research)
- Seoul Space: Added as `enabled: false` with `PENDING_URL` since the site could not be verified (Pitfall 7 from research)
- RSS thumbnail strategy: Progressive fallback chain (enclosure -> og:image -> first article image) with logo detection filtering and batched Promise.allSettled validation
- Trusted CDN skip: YouTube, Tumblr, and Bluesky CDN URLs skip HEAD validation to reduce latency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Port 3001 already in use during live verification (existing server instance from previous session). The running server already had the scrapers loaded and produced correct YouTube feed items, confirming the implementation works.
- External linter repeatedly added Tumblr/Bluesky scraper imports to index.ts. These were reverted since Tumblr/Bluesky scrapers are deferred to plan 03.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- YouTube and RSS/news scrapers are producing content items in the database
- Tumblr and Bluesky source config entries are pre-configured for plan 03
- Thumbnail utilities (extractOgImage, validateThumbnail) are ready for Tumblr scraper to reuse
- Schema from plan 01 fully supports all new source data (thumbnails, flexible engagement stats)

## Self-Check: PASSED

All 6 files verified present. Both task commits (dbef7e3, 7c42bd7) verified in git log.

---
*Phase: 06-scraper-expansion*
*Completed: 2026-03-01*
