---
phase: 06-scraper-expansion
verified: 2026-03-02T02:01:38Z
status: gaps_found
score: 10/14 must-haves verified
re_verification: false
gaps:
  - truth: "All four scraper types (reddit, youtube, rss, tumblr, bluesky) are registered in the server"
    status: failed
    reason: "TumblrScraper and BlueskyScraper are NOT imported or instantiated in packages/server/src/index.ts. The scrapers array only contains RedditScraper, YouTubeScraper, and RssNewsScraper. Commit 2b13e2c claimed to 'register all 5 scrapers' but the diff shows it only added YouTubeScraper and RssNewsScraper — TumblrScraper and BlueskyScraper were never wired."
    artifacts:
      - path: "packages/server/src/index.ts"
        issue: "Missing imports and instantiation of TumblrScraper and BlueskyScraper. scrapers array has 3 items, not 5."
    missing:
      - "Add: import { TumblrScraper } from './scrapers/tumblr.js';"
      - "Add: import { BlueskyScraper } from './scrapers/bluesky.js';"
      - "Add new TumblrScraper(config) and new BlueskyScraper(config) to the scrapers array"

  - truth: "Bluesky scraper authenticates via app password and handles auth failure gracefully"
    status: partial
    reason: "BlueskyScraper.ts exists and is correctly implemented with graceful credential degradation. However it is not registered in the server (see above gap), so it never runs on schedule."
    artifacts:
      - path: "packages/server/src/scrapers/bluesky.ts"
        issue: "File is correct and substantive. Gap is purely the missing registration in index.ts."
    missing:
      - "Register BlueskyScraper in packages/server/src/index.ts (see gap above)"

  - truth: "Tumblr blog posts from config produce content items with first-image thumbnails"
    status: partial
    reason: "TumblrScraper.ts exists and is correctly implemented. However it is not registered in the server (see above gap), so it never runs on schedule and produces no database content."
    artifacts:
      - path: "packages/server/src/scrapers/tumblr.ts"
        issue: "File is correct and substantive. Gap is purely the missing registration in index.ts."
    missing:
      - "Register TumblrScraper in packages/server/src/index.ts (see gap above)"

  - truth: "Feed cards display thumbnail images from all sources and gracefully hide broken images"
    status: partial
    reason: "FeedCard.tsx has onError + useState broken image handling, satisfying the graceful degradation requirement. However the plan's key link (FeedCard -> shared FeedItem.thumbnailUrl) does not hold: the frontend uses its own local FeedItem type with field 'thumbnail' (not 'thumbnailUrl'), and there is no code path from server-scraped thumbnailUrl to the frontend feed display. Server thumbnails (from YouTube/RSS/Tumblr/Bluesky scrapers) cannot currently appear in feed cards because the frontend operates entirely in client-side mode with no API feed consumer."
    artifacts:
      - path: "packages/frontend/src/components/FeedCard.tsx"
        issue: "Uses item.thumbnail from local FeedItem type. No mapping from server API FeedItem.thumbnailUrl exists. The plan's key link pattern 'thumbnailUrl' is absent from FeedCard."
    missing:
      - "Either: add a server API consumer in the frontend feed that maps thumbnailUrl -> thumbnail when VITE_API_URL is set (this is API-02 scope, deferred)"
      - "Or: explicitly document that server-scraped thumbnails are only visible via API mode which is deferred to Phase 8"
human_verification:
  - test: "Trigger a scrape and confirm Tumblr and Bluesky scrapers run after fixing index.ts"
    expected: "Tumblr items appear in database with thumbnails. Bluesky logs a credential warning if not configured, or produces items with likes if configured."
    why_human: "Requires running the server and triggering a scrape cycle"
  - test: "Navigate to /status in browser and verify traffic light indicators display correctly"
    expected: "Each source (reddit, youtube, rss) shows a colored dot with health status, last run time, and items found"
    why_human: "Visual layout and auto-refresh behavior cannot be verified programmatically"
  - test: "View feed cards for YouTube and RSS items and verify thumbnails display"
    expected: "Feed cards for YouTube items show 16/9 thumbnails; a broken URL causes the image area to collapse"
    why_human: "Requires client-side rendering and may require server API mode (API-02) to surface server thumbnails"
---

# Phase 6: Scraper Expansion Verification Report

**Phase Goal:** Full source coverage -- all configured sources scraped on schedule with engagement stats, thumbnails extracted, and stale content cleaned up
**Verified:** 2026-03-02T02:01:38Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Content items can store thumbnail URLs, flexible engagement stats (JSON), and soft-delete timestamps | VERIFIED | schema.ts lines 15-17: thumbnailUrl, engagementStats, deletedAt columns present with correct types |
| 2 | Feed API excludes soft-deleted items and returns thumbnail/engagement data | VERIFIED | feed.ts line 26: `isNull(contentItems.deletedAt)` always applied; lines 77-78: thumbnailUrl and engagementStats mapped in response |
| 3 | Content older than 14 days is soft-deleted after each scrape cycle | VERIFIED | base.ts lines 197-204: `fourteenDaysAgo`, `db.update(contentItems).set({ deletedAt: new Date() })` with `isNull(deletedAt)` guard |
| 4 | Existing Reddit items have engagement_stats migrated to JSON | VERIFIED | base.ts line 150: idempotent UPDATE for reddit items with NULL engagement_stats |
| 5 | scrape_runs tracks duration and error stack traces | VERIFIED | schema.ts lines 40-41: duration and errorStack columns; base.ts lines 162, 183: populated on success and error |
| 6 | YouTube channels from config produce items with video thumbnails and no engagement stats | VERIFIED | youtube.ts lines 71-73: `img.youtube.com/vi/${videoId}/mqdefault.jpg` thumbnail; line 83: `engagementStats: null` |
| 7 | RSS/news sites from config produce items with extracted og:image thumbnails | VERIFIED | rss-news.ts uses extractOgImage, extractRssThumbnail, validateThumbnail with progressive strategy |
| 8 | All source URLs live in getBtsScrapingConfig(), not hardcoded in scraper files | VERIFIED | sources.ts lines 127-149: 2 YouTube, 8 RSS, 5 Tumblr, 1 Bluesky sources defined |
| 9 | Tumblr blog posts from config produce content items with first-image thumbnails | PARTIAL | TumblrScraper implementation is correct (tumblr.ts lines 67-69: img regex). NOT REGISTERED in index.ts -- never runs |
| 10 | Bluesky keyword search produces items with like counts and embedded image thumbnails | PARTIAL | BlueskyScraper implementation is correct (bluesky.ts lines 95, 114: `engagementStats: { likes }`, `thumbnailUrl`). NOT REGISTERED in index.ts -- never runs |
| 11 | Bluesky scraper authenticates via app password and handles auth failure gracefully | PARTIAL | bluesky.ts lines 33-60: credential check + graceful degradation. NOT REGISTERED in index.ts -- never runs |
| 12 | All four scraper types (reddit, youtube, rss, tumblr, bluesky) are registered in the server | FAILED | index.ts scrapers array only has RedditScraper, YouTubeScraper, RssNewsScraper. TumblrScraper and BlueskyScraper missing. |
| 13 | Health API returns recent run history per source with traffic light data | VERIFIED | health.ts lines 81-133: GET /health/sources with calculateTrafficLight(), recentRuns array, per-source data |
| 14 | Feed cards display thumbnail images from all sources and gracefully hide broken images | PARTIAL | FeedCard.tsx has onError + useState(false) imageError handling (plan requirement met). Key link to server FeedItem.thumbnailUrl broken: frontend uses local type with field `thumbnail`, no server API consumer exists |

**Score:** 10/14 truths verified (3 partial, 1 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/server/src/db/schema.ts` | thumbnailUrl, engagementStats, deletedAt, duration, errorStack | VERIFIED | All columns present with correct types and index |
| `packages/shared/src/types/feed.ts` | thumbnailUrl and engagementStats on FeedItem | VERIFIED | Lines 27-28: both fields present |
| `packages/server/src/scrapers/base.ts` | ScrapedItem with thumbnailUrl/engagementStats, 14-day soft delete, three-state tracking | VERIFIED | Full implementation including scrape_runs 7-day cleanup |
| `packages/server/src/routes/feed.ts` | isNull(deletedAt) filter, thumbnail/engagement in response | VERIFIED | Both counts query and items query filter on deletedAt IS NULL |
| `packages/server/drizzle/0001_phase6_schema_evolution.sql` | ALTER TABLE statements for new columns | VERIFIED | All 6 statements present including CREATE INDEX |
| `packages/shared/src/config/sources.ts` | YouTube, RSS/news, Tumblr, Bluesky source entries | VERIFIED | 23 total sources: 7 reddit, 2 youtube, 8 rss, 5 tumblr, 1 bluesky |
| `packages/server/src/scrapers/thumbnail.ts` | extractOgImage, validateThumbnail, extractFirstArticleImage, isKnownLogo, extractRssThumbnail | VERIFIED | All 5 functions present and substantive |
| `packages/server/src/scrapers/youtube.ts` | YouTubeScraper class | VERIFIED | Implements Scraper, filters by type=youtube, builds mqdefault.jpg thumbnails |
| `packages/server/src/scrapers/rss-news.ts` | RssNewsScraper class | VERIFIED | Implements Scraper, progressive thumbnail extraction, filters by type=rss |
| `packages/server/src/scrapers/tumblr.ts` | TumblrScraper class | VERIFIED (stub risk: ORPHANED) | Class is substantive and correct. Not registered in index.ts -- never executes |
| `packages/server/src/scrapers/bluesky.ts` | BlueskyScraper class | VERIFIED (stub risk: ORPHANED) | Class is substantive and correct. Not registered in index.ts -- never executes |
| `packages/server/src/routes/health.ts` | /health/sources with traffic light data | VERIFIED | Lines 81-133: full implementation with calculateTrafficLight() |
| `packages/frontend/src/pages/Status.tsx` | Traffic light indicators per source | VERIFIED | Fetches /api/health/sources, renders colored dots, auto-refresh 60s |
| `packages/frontend/src/components/FeedCard.tsx` | Thumbnail display with broken image handling | PARTIAL | onError + useState present. Uses `item.thumbnail` (local type), not `item.thumbnailUrl` (server type). No path from server scraper thumbnails to frontend display. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scrapers/base.ts` | `db/schema.ts` | upsert uses engagementStats and thumbnailUrl columns | VERIFIED | Lines 124-135: `thumbnailUrl: item.thumbnailUrl`, `engagementStats: JSON.stringify(...)`, conflict update includes both |
| `routes/feed.ts` | `db/schema.ts` | isNull(contentItems.deletedAt) | VERIFIED | Lines 26, 54: applied to both feed list and count queries |
| `scrapers/youtube.ts` | `config/sources.ts` | filter by type === 'youtube' | VERIFIED | Line 33: `.filter((s) => s.type === 'youtube' && s.enabled !== false)` |
| `scrapers/rss-news.ts` | `scrapers/thumbnail.ts` | imports extractOgImage | VERIFIED | Line 14: `import { extractOgImage, extractRssThumbnail, validateThumbnail } from './thumbnail.js'` |
| `index.ts` | `scrapers/youtube.ts` | new YouTubeScraper | VERIFIED | Line 16-17, 30: imported and instantiated |
| `index.ts` | `scrapers/tumblr.ts` | new TumblrScraper | NOT_WIRED | TumblrScraper not imported or instantiated in index.ts. scrapers array = [Reddit, YouTube, Rss] only |
| `index.ts` | `scrapers/bluesky.ts` | new BlueskyScraper | NOT_WIRED | BlueskyScraper not imported or instantiated in index.ts |
| `scrapers/bluesky.ts` | `@atproto/api` | BskyAgent.login() + searchPosts() | VERIFIED | Lines 11, 46, 83: BskyAgent imported, agent.login(), agent.app.bsky.feed.searchPosts() |
| `pages/Status.tsx` | `routes/health.ts` | fetch /api/health/sources | VERIFIED | Line 119: `fetch(${apiUrl}/api/health/sources)` |
| `components/FeedCard.tsx` | `shared/types/feed.ts` | FeedItem.thumbnailUrl for image display | NOT_WIRED | FeedCard uses local frontend FeedItem.thumbnail (not shared type). No server API feed consumer exists in frontend. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCRAPE-02 | 06-02 | YouTube scraper via RSS feeds | SATISFIED | YouTubeScraper registered and producing items from BANGTANTV and HYBE LABELS channels |
| SCRAPE-03 | 06-02 | RSS/news site scrapers (Soompi, AllKPop, Koreaboo, etc.) | SATISFIED | RssNewsScraper handles 7 enabled RSS sources with keyword filtering |
| SCRAPE-04 | 06-03 | Tumblr scraper via RSS feeds (5+ blogs) | BLOCKED | TumblrScraper.ts exists with correct implementation. Not registered in index.ts -- never runs |
| SCRAPE-05 | 06-03 | Bluesky scraper via AT Protocol public API | BLOCKED | BlueskyScraper.ts exists with correct implementation. Not registered in index.ts -- never runs |
| SCRAPE-06 | 06-02 | Expanded K-pop news sources (Seoulbeats, Asian Junkie, etc.) | SATISFIED | sources.ts has rss-seoulbeats and rss-asianjunkie enabled; Seoul Space added as disabled pending URL verification |
| SCRAPE-07 | 06-02, 06-04 | Thumbnail and media URL extraction per source | SATISFIED | thumbnail.ts utilities complete; YouTube uses mqdefault.jpg; RSS uses progressive extraction; FeedCard has onError handling |
| INFRA-06 | 06-01 | Content age windowing with configurable max age and periodic cleanup | SATISFIED | 14-day soft delete in base.ts; scrape_runs 7-day hard delete cleanup |
| API-03 | 06-01 | Engagement data collection and storage with per-source stat extraction | SATISFIED | engagementStats JSON column; Reddit migrates score/comments; Bluesky stores likes; YouTube/RSS/Tumblr store null |

**Requirements fully satisfied:** 6/8
**Requirements blocked:** 2/8 (SCRAPE-04, SCRAPE-05 -- implementation exists but not wired into server)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/server/src/index.ts` | 28-32 | scrapers array missing TumblrScraper and BlueskyScraper | Blocker | Tumblr and Bluesky scrapers are dead code -- they exist but never run on schedule |

### Human Verification Required

**1. Status Page Visual**

**Test:** Start server, start frontend (npm run dev), navigate to /status
**Expected:** Traffic light cards render per source with green/yellow/red dots, last run time, items found count, and run history dots. Auto-refreshes every 60 seconds.
**Why human:** Visual layout and timer behavior cannot be verified programmatically

**2. Scraper Registration Fix + End-to-End Verification**

**Test:** After fixing index.ts to add TumblrScraper and BlueskyScraper, trigger a scrape (`curl -X POST http://localhost:3001/api/scrape`)
**Expected:** Tumblr items appear in database. Bluesky logs a credential warning (or produces items if credentials are set). All 5 sources appear in `/api/health/sources`.
**Why human:** Requires running server, network access to Tumblr RSS feeds, and optional Bluesky credentials

**3. Feed Card Thumbnail Display**

**Test:** With frontend running in client-side mode, check feed cards for any items that have thumbnails (depends on client-side scrapers populating `item.thumbnail`)
**Expected:** Cards show 16/9 thumbnails with lazy loading. Broken thumbnail URLs cause image area to collapse, leaving text-only card.
**Why human:** Requires browser rendering; thumbnail availability depends on client-side scraper output

## Gaps Summary

**Root cause: Single missed commit.** The commit `2b13e2c` (plan 03, task 2) was supposed to register all 5 scrapers but only added YouTubeScraper and RssNewsScraper. TumblrScraper and BlueskyScraper files exist and are correct implementations, but are orphaned -- they are never imported or called by the server.

**Impact on phase goal:** The phase goal states "all configured sources scraped on schedule." With only 3 scrapers registered (Reddit, YouTube, RSS), Tumblr (5 sources) and Bluesky (1 source) never run. This is 6/23 configured sources that are silently skipped on every scrape cycle.

**Secondary finding:** The `FeedCard.thumbnailUrl` key link from plan 04 does not hold. The frontend uses a client-side `FeedItem` type with `thumbnail` field (not `thumbnailUrl`). Server-scraped thumbnails cannot reach the FeedCard because no API consumer exists in the frontend. This is technically in scope for API-02 (Phase 8, deferred), but plan 04 described it as complete. The broken image handling (`onError` + `useState`) is present and functional for client-side thumbnails.

**Fix required:** Add 4 lines to `packages/server/src/index.ts`:
```typescript
import { TumblrScraper } from './scrapers/tumblr.js';
import { BlueskyScraper } from './scrapers/bluesky.js';
// And in scrapers array:
new TumblrScraper(config),
new BlueskyScraper(config),
```

---

_Verified: 2026-03-02T02:01:38Z_
_Verifier: Claude (gsd-verifier)_
