# Phase 6: Scraper Expansion - Research

**Researched:** 2026-03-01
**Domain:** Multi-source web scraping (RSS/Atom feeds, AT Protocol, thumbnail extraction, content lifecycle)
**Confidence:** HIGH (RSS/YouTube/Tumblr), MEDIUM (Bluesky), HIGH (schema/cleanup/observability)

## Summary

Phase 6 extends the scraping engine from Reddit-only to full source coverage: YouTube (RSS), 8+ RSS/news sites, Tumblr (RSS), and Bluesky (AT Protocol). The existing Phase 5 infrastructure (`Scraper` interface, `runAllScrapers()` orchestrator, `scrape_runs` tracking, `fetchWithRetry()`, URL normalization) is well-designed and supports this expansion cleanly. Each new scraper implements the same `Scraper` interface.

The key technical challenges are: (1) the DB schema needs new columns for thumbnails and flexible engagement stats (currently hardcoded to `score`/`commentCount`), (2) RSS feeds from news sites lack images in the feed XML itself, requiring og:image extraction via HTML fetching, (3) the Bluesky public API has cursor/pagination issues for unauthenticated requests, so authentication via `@atproto/api` with an app password is likely required, and (4) content cleanup needs to change from hard DELETE to soft delete with a 14-day window. The status page is a new frontend route showing traffic-light health indicators.

**Primary recommendation:** Build each scraper as a standalone file implementing the existing `Scraper` interface, add `rss-parser` for RSS/Atom XML parsing (server-side, no DOMParser), add `@atproto/api` for Bluesky, and use lightweight regex-based og:image extraction to avoid heavy DOM parsing dependencies on the server. Evolve the DB schema with a Drizzle migration adding `thumbnail_url`, `engagement_stats` (JSON), and `deleted_at` columns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sources with no engagement data store null -- feed cards simply don't show engagement for those sources
- YouTube: RSS only for this phase (title, description, thumbnail). Data API for view counts deferred to future enhancement
- Bluesky: capture likes only (not reposts)
- Reddit: continues using existing upvotes + comment count from Phase 5
- Storage format: named JSON blob per content item (e.g., `{upvotes: 42, comments: 5}`) -- typed per source
- Direct hotlink to source CDNs -- no proxying or caching images
- Text-only posts (no image available): no image area on card, text preview fills the space naturally
- YouTube: use medium resolution thumbnails (320x180)
- Tumblr: first image from the post only
- News sites: extract og:image from RSS; if RSS lacks image, fetch article HTML for og:image
- Generic logo detection: if og:image matches known site logo patterns, fall back to first in-article image
- Validate thumbnail URLs with HEAD request before storing -- handle broken images client-side by hiding the image area on load failure
- Broken image client-side handling: detect load failure, collapse image area so card becomes text-only
- 14-day retention window, same for all sources
- Cleanup runs after each scrape cycle (not separate schedule)
- Soft delete -- set `deleted_at` timestamp rather than hard DELETE. Feed queries exclude soft-deleted items
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

### Deferred Ideas (OUT OF SCOPE)
- YouTube Data API integration for view/like counts -- future enhancement after RSS-only scraper ships
- Bluesky repost counts -- may add later if ranking phase needs it
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCRAPE-02 | YouTube scraper via RSS feeds with optional Data API for view counts | YouTube RSS feeds at `youtube.com/feeds/videos.xml?channel_id=X` return Atom XML with `yt:videoId`, `media:thumbnail`, `published`. Use `rss-parser` with custom fields to extract. Data API deferred per CONTEXT.md |
| SCRAPE-03 | RSS/news site scrapers (Soompi, AllKPop, Koreaboo, HELLOKPOP, KpopStarz, and more) | Standard RSS 2.0 feeds. Soompi (`soompi.com/feed`), Koreaboo (`koreaboo.com/feed`), HELLOKPOP (`hellokpop.com/feed`). AllKPop may lack RSS feed -- needs fallback. Use `rss-parser` for XML parsing. og:image extraction needed for thumbnails |
| SCRAPE-04 | Tumblr scraper via RSS feeds (5+ blogs from config) | Tumblr RSS at `{blog}.tumblr.com/rss`. Standard RSS 2.0, images embedded as HTML `<img>` in `<description>` CDATA. Extract first image via regex or minimal HTML parsing |
| SCRAPE-05 | Bluesky scraper via AT Protocol public API (keyword-based post search) | `app.bsky.feed.searchPosts` endpoint. Public API has cursor 403 issues -- use `@atproto/api` with authenticated session. App password auth via `createSession`. Captures post text, likes, timestamps, and embedded images |
| SCRAPE-06 | Expanded K-pop news sources via RSS (Seoulbeats, Asian Junkie, Korea Herald entertainment, Seoul Space) | Seoulbeats (`seoulbeats.com/feed`), Asian Junkie (`asianjunkie.com/feed`). WordPress-based sites use standard `/feed/` pattern. Seoul Space not found as a known site -- may need verification or removal |
| SCRAPE-07 | Thumbnail and media URL extraction per source for feed card display | YouTube: construct from videoId (`img.youtube.com/vi/{id}/mqdefault.jpg`). RSS/News: og:image from feed or HTML fetch. Tumblr: first `<img>` from description HTML. Bluesky: embedded image URL from post view. Validate with HEAD request |
| INFRA-06 | Content age windowing with configurable max age and periodic cleanup | Change from current 30-day hard DELETE to 14-day soft delete (`deleted_at` timestamp). Cleanup runs after each scrape cycle. Add 7-day `scrape_runs` cleanup |
| API-03 | Engagement data collection and storage with per-source stat extraction | Add `engagement_stats` JSON column to `content_items`. Store source-typed JSON: Reddit `{upvotes, comments}`, Bluesky `{likes}`, others null. Migrate existing `score`/`commentCount` to JSON format |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rss-parser | ^3.13 | Parse RSS 2.0 and Atom XML feeds on the server | 1.5k GitHub stars, MIT, TypeScript types, handles namespaced elements, custom fields support. Only dependency is xml2js. Avoids needing DOMParser on server |
| @atproto/api | ^0.14+ | Bluesky/AT Protocol client SDK | Official SDK from Bluesky team. Typed lexicon methods, session management, handles auth token refresh automatically |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none -- use built-in fetch) | N/A | HTTP requests for og:image HTML fetching | Already using Node.js native fetch via `fetchWithRetry()` in scrapers/utils.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rss-parser | fast-xml-parser | Faster but no RSS-specific field mapping; more manual work |
| rss-parser | feedparser (node-feedparser) | More robust but stream-based API is more complex, callback-heavy |
| @atproto/api | Raw HTTP fetch | Possible but loses typed responses, session management, token refresh |
| cheerio (og:image) | Regex extraction | Regex is simpler, no dependency; cheerio adds ~1MB. Regex is sufficient for `<meta property="og:image"` extraction |
| open-graph-scraper | Regex extraction | Full OG library is overkill when we only need og:image from `<head>` section |

**Installation:**
```bash
cd packages/server && npm install rss-parser @atproto/api
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── scrapers/
│   ├── base.ts           # Scraper interface + runAllScrapers() (existing)
│   ├── utils.ts           # fetchWithRetry, normalizeUrl, delay (existing)
│   ├── reddit.ts          # Reddit scraper (existing)
│   ├── youtube.ts         # NEW: YouTube RSS scraper
│   ├── rss-news.ts        # NEW: Generic RSS news scraper (Soompi, Koreaboo, etc.)
│   ├── tumblr.ts          # NEW: Tumblr RSS scraper
│   ├── bluesky.ts         # NEW: Bluesky AT Protocol scraper
│   └── thumbnail.ts       # NEW: og:image extraction + HEAD validation utilities
├── db/
│   ├── schema.ts          # Add thumbnail_url, engagement_stats, deleted_at columns
│   └── index.ts           # Unchanged
├── routes/
│   ├── feed.ts            # Add deleted_at exclusion filter, add engagement_stats to response
│   ├── health.ts          # Enhance for status page data (recent run history per source)
│   └── scrape.ts          # Unchanged
```

### Pattern 1: One Scraper Class Per Source Type
**What:** Each source type (youtube, rss-news, tumblr, bluesky) gets its own file implementing the `Scraper` interface. The generic RSS scraper handles all news sites through config, not separate classes.
**When to use:** Always. This matches the existing RedditScraper pattern.
**Example:**
```typescript
// packages/server/src/scrapers/youtube.ts
import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import Parser from 'rss-parser';
import { delay } from './utils.js';

export class YouTubeScraper implements Scraper {
  name = 'youtube';
  private config: GroupScrapingConfig;
  private parser: Parser;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:group', 'mediaGroup'],
          ['yt:videoId', 'videoId'],
        ],
      },
    });
  }

  async scrape(): Promise<ScraperResult[]> {
    const ytSources = this.config.sources
      .filter((s) => s.type === 'youtube' && s.enabled !== false)
      .sort((a, b) => a.priority - b.priority);

    const results: ScraperResult[] = [];
    for (const source of ytSources) {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}`;
      // ... parse feed, extract items, build ScrapedItem with thumbnail
    }
    return results;
  }
}
```

### Pattern 2: Flexible Engagement Stats via JSON Column
**What:** Store engagement data as a JSON string in a single column, typed per source. This avoids adding source-specific columns.
**When to use:** For the `engagement_stats` field on `content_items`.
**Example:**
```typescript
// Schema addition
engagementStats: text('engagement_stats'), // JSON string, nullable

// Reddit: '{"upvotes":42,"comments":5}'
// Bluesky: '{"likes":15}'
// YouTube RSS: null (no stats from RSS feed)
// News/Tumblr: null

// Type definitions in @bts/shared
type RedditEngagement = { upvotes: number; comments: number };
type BlueskyEngagement = { likes: number };
type EngagementStats = RedditEngagement | BlueskyEngagement | null;
```

### Pattern 3: Progressive Thumbnail Extraction for News Sites
**What:** Try RSS feed first for images, then fetch article HTML for og:image, then try first in-article image, with logo detection filtering.
**When to use:** For RSS news scrapers (Soompi, Koreaboo, etc.).
**Example:**
```typescript
// packages/server/src/scrapers/thumbnail.ts
export async function extractThumbnailFromHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(url);
    const html = await response.text();
    // Only parse <head> for og:image
    const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
    const head = headMatch?.[0] ?? html;
    const ogMatch = head.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
                 || head.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
    if (ogMatch?.[1]) {
      if (!isKnownLogo(ogMatch[1])) return ogMatch[1];
      // Fall back to first article image
      return extractFirstArticleImage(html);
    }
    return null;
  } catch { return null; }
}

export async function validateThumbnail(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    return resp.ok && (resp.headers.get('content-type')?.startsWith('image/') ?? false);
  } catch { return false; }
}
```

### Pattern 4: Soft Delete with Excluded Queries
**What:** Add `deleted_at` column. Cleanup sets timestamp instead of deleting rows. All feed queries add `WHERE deleted_at IS NULL`.
**When to use:** Content age windowing (INFRA-06).
**Example:**
```typescript
// Schema
deletedAt: integer('deleted_at', { mode: 'timestamp' }),

// Cleanup in runAllScrapers
const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
db.update(contentItems)
  .set({ deletedAt: new Date() })
  .where(and(
    lt(contentItems.publishedAt, fourteenDaysAgo),
    isNull(contentItems.deletedAt),
  ))
  .run();

// Feed query
.where(and(
  isNull(contentItems.deletedAt),
  ...otherConditions,
))
```

### Pattern 5: Bluesky Authenticated Search
**What:** Use `@atproto/api` with app password authentication to search posts. The public API has pagination issues (cursor returns 403).
**When to use:** Bluesky scraper.
**Example:**
```typescript
import { BskyAgent } from '@atproto/api';

export class BlueskyScraper implements Scraper {
  name = 'bluesky';
  private agent: BskyAgent;
  private config: GroupScrapingConfig;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.agent = new BskyAgent({ service: 'https://bsky.social' });
  }

  async scrape(): Promise<ScraperResult[]> {
    // Authenticate with app password
    await this.agent.login({
      identifier: process.env.BLUESKY_HANDLE!,
      password: process.env.BLUESKY_APP_PASSWORD!,
    });

    // Search for BTS-related posts
    const keywords = this.config.keywords.slice(0, 5); // Use top keywords
    const results: ScraperResult[] = [];

    for (const keyword of keywords) {
      const response = await this.agent.app.bsky.feed.searchPosts({
        q: keyword,
        limit: 25,
        sort: 'latest',
      });
      // Map response.data.posts to ScrapedItem[]
    }
    return results;
  }
}
```

### Anti-Patterns to Avoid
- **One class per news site:** Do NOT create separate scraper classes for Soompi, Koreaboo, etc. Use a single `RssNewsScraper` that iterates all RSS-type sources from config.
- **DOMParser on server:** Node.js has no native DOMParser. Do NOT import jsdom or similar heavy DOM libraries just for XML parsing. Use `rss-parser` (xml2js-based) instead.
- **Storing images locally:** Per user decision, hotlink to source CDNs. Do NOT download or proxy images.
- **Hardcoded source URLs:** All source URLs belong in `@bts/shared/config/sources.ts`, not hardcoded in scraper files.
- **Blocking thumbnail validation:** Do NOT make the scrape fail if HEAD validation times out. Thumbnail validation should be best-effort with a short timeout.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS/Atom XML parsing | Custom XML parser or DOMParser shim | `rss-parser` npm package | Handles RSS 2.0, Atom, namespaced elements (media:, yt:), encoding, CDATA. Edge cases in XML parsing are numerous |
| Bluesky API client | Raw HTTP fetch with manual auth | `@atproto/api` official SDK | Session management, token refresh, typed responses, lexicon validation. Auth flow is non-trivial |
| URL normalization | Custom normalizer | Existing `normalizeUrl()` in scrapers/utils.ts | Already built and tested in Phase 5 |
| HTTP retry/backoff | Custom retry logic | Existing `fetchWithRetry()` in scrapers/utils.ts | Already built with 429/5xx handling |

**Key insight:** The scraper infrastructure from Phase 5 (interface, orchestrator, utils) was designed for exactly this expansion. The main new dependencies are `rss-parser` for XML and `@atproto/api` for Bluesky. Everything else (fetch, retry, normalization, DB upsert, run tracking) is reusable.

## Common Pitfalls

### Pitfall 1: rss-parser and YouTube media:thumbnail
**What goes wrong:** `rss-parser` has a known issue where `media:thumbnail` returns `{$: undefined}` instead of the URL attribute.
**Why it happens:** Namespaced XML attributes (like `url` on `<media:thumbnail url="...">`) are parsed differently by xml2js.
**How to avoid:** For YouTube, construct thumbnail URLs from the videoId instead: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`. This is more reliable than parsing the feed's media:thumbnail element. The frontend already uses this pattern.
**Warning signs:** Thumbnail URLs are undefined or empty objects after parsing.

### Pitfall 2: AllKPop RSS Feed May Be Unavailable
**What goes wrong:** AllKPop reportedly removed their main RSS feed during a site redesign.
**Why it happens:** Sites change their RSS availability without notice.
**How to avoid:** Test each RSS feed URL at implementation time. If AllKPop's feed is dead, either use their forums RSS (`allkpop.com/forums/categories/k-pop/feed.rss`) or mark the source as disabled in config. Do not build a custom HTML scraper for it.
**Warning signs:** 404 or HTML response instead of XML when fetching the feed URL.

### Pitfall 3: Bluesky Public API Cursor 403
**What goes wrong:** Unauthenticated requests to `app.bsky.feed.searchPosts` return 403 when a cursor parameter is included for pagination.
**Why it happens:** Bluesky restricted public API access for search pagination as of early 2025. Multiple GitHub issues document this as an ongoing limitation.
**How to avoid:** Use authenticated sessions via `@atproto/api` with app password. Even without pagination, a single search returns up to 100 posts per keyword, which is sufficient for a 20-minute scrape cycle. Requires `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` environment variables.
**Warning signs:** 403 responses after the first page of results.

### Pitfall 4: og:image Returns Site Logos
**What goes wrong:** Many news sites set their og:image to the site's logo/branding image rather than the article's featured image.
**Why it happens:** Generic og:image is set as a fallback in the site's template, not per-article.
**How to avoid:** Maintain a list of known logo URL patterns (e.g., `/logo`, `/brand`, `/default-og`) and fall back to the first in-article `<img>` when the og:image matches these patterns.
**Warning signs:** Many articles from the same source have identical thumbnail URLs.

### Pitfall 5: Excessive HTTP Requests for Thumbnail Validation
**What goes wrong:** HEAD-requesting every thumbnail URL significantly slows down scraping, especially for news sites where you may also need to fetch the article HTML for og:image.
**Why it happens:** Each thumbnail validation adds network latency.
**How to avoid:** Use a short timeout (3 seconds) for HEAD requests. Batch thumbnail validation with `Promise.allSettled()` rather than sequential requests. Only validate URLs that look suspicious (very long, unusual domains). Skip validation for known CDN patterns (YouTube, Tumblr).
**Warning signs:** Scrape durations exceeding 60 seconds due to thumbnail processing.

### Pitfall 6: Schema Migration with Existing Data
**What goes wrong:** Adding `engagement_stats` JSON column while existing rows still use `score`/`commentCount` creates data inconsistency.
**Why it happens:** Old Reddit items have data in the old columns but not the new one.
**How to avoid:** Write a data migration that populates `engagement_stats` from existing `score`/`commentCount` values for all existing Reddit items. Keep `score`/`commentCount` columns temporarily for backward compatibility, then remove in a follow-up migration after feed route is updated.
**Warning signs:** Feed cards show no engagement stats for older Reddit items.

### Pitfall 7: Seoul Space Source May Not Exist
**What goes wrong:** "Seoul Space" is listed in SCRAPE-06 requirements but could not be found as a real K-pop news blog with an RSS feed.
**Why it happens:** May be a placeholder name, defunct site, or misspelling.
**How to avoid:** Verify the URL before implementation. If it doesn't exist, add the source entry to config as `enabled: false` with a comment explaining it's pending URL verification.
**Warning signs:** No search results for "Seoul Space kpop blog."

## Code Examples

### YouTube RSS Feed Parsing with rss-parser
```typescript
// Verified pattern from rss-parser docs + YouTube feed structure
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['yt:videoId', 'videoId'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

const feed = await parser.parseURL(
  'https://www.youtube.com/feeds/videos.xml?channel_id=UCLkAepWjdylmXSltofFvsYQ'
);

for (const item of feed.items) {
  const videoId = (item as any).videoId;  // from custom field
  const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;  // 320x180
  const title = item.title;
  const published = item.isoDate;  // ISO 8601 string
  const link = item.link;
}
```

### Tumblr RSS Image Extraction
```typescript
// Tumblr puts images in description CDATA as HTML <img> tags
const parser = new Parser();
const feed = await parser.parseURL('https://bts-trans.tumblr.com/rss');

for (const item of feed.items) {
  const description = item.content || item['content:encoded'] || '';
  // Extract first image via regex (no DOM needed on server)
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  const thumbnail = imgMatch?.[1] ?? null;
}
```

### Bluesky Post Search
```typescript
// Using @atproto/api official SDK
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });
await agent.login({
  identifier: process.env.BLUESKY_HANDLE!,
  password: process.env.BLUESKY_APP_PASSWORD!,
});

const res = await agent.app.bsky.feed.searchPosts({
  q: 'BTS',
  limit: 25,
  sort: 'latest',
});

for (const post of res.data.posts) {
  const text = post.record.text;        // Post text content
  const likes = post.likeCount ?? 0;    // Like count
  const uri = post.uri;                 // at://did/app.bsky.feed.post/rkey
  const url = `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`;
  const createdAt = post.record.createdAt;  // ISO timestamp

  // Extract embedded image if present
  const embed = post.embed;
  const thumbnail = embed?.images?.[0]?.thumb ?? null;
}
```

### og:image Extraction Without Heavy Dependencies
```typescript
// Lightweight regex-based og:image extraction
export async function extractOgImage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(articleUrl, {
      headers: { 'Accept': 'text/html' },
    });
    const html = await response.text();

    // Only scan <head> to avoid parsing full document
    const headEnd = html.indexOf('</head>');
    const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 5000);

    // Match og:image in either attribute order
    const match =
      head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
```

### Drizzle Schema Migration for New Columns
```typescript
// packages/server/src/db/schema.ts additions
export const contentItems = sqliteTable('content_items', {
  // ... existing columns ...
  thumbnailUrl: text('thumbnail_url'),                           // NEW: hotlinked image URL
  engagementStats: text('engagement_stats'),                     // NEW: JSON blob per source
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),       // NEW: soft delete timestamp
}, (table) => [
  // ... existing indexes ...
  index('idx_deleted_at').on(table.deletedAt),                   // NEW: for cleanup queries
]);

// scrape_runs additions
export const scrapeRuns = sqliteTable('scrape_runs', {
  // ... existing columns ...
  duration: integer('duration'),                                 // NEW: milliseconds
  errorStack: text('error_stack'),                               // NEW: full stack trace
});
```

### RSS Feed URLs for Config
```typescript
// Sources to add to getBtsScrapingConfig() in @bts/shared/config/sources.ts
// YouTube sources (from frontend config, verified channel IDs)
{ id: 'yt-bangtantv', type: 'youtube', label: 'BANGTANTV', url: 'UCLkAepWjdylmXSltofFvsYQ', needsFilter: false, fetchCount: 15, priority: 10, enabled: true },
{ id: 'yt-hybe', type: 'youtube', label: 'HYBE LABELS', url: 'UC3IZKseVpdzPSBaWxBxundA', needsFilter: true, fetchCount: 15, priority: 11, enabled: true },

// RSS/news sources (WordPress standard /feed/ pattern)
{ id: 'rss-soompi', type: 'rss', label: 'Soompi', url: 'https://www.soompi.com/feed', needsFilter: true, fetchCount: 20, priority: 20, enabled: true },
{ id: 'rss-allkpop', type: 'rss', label: 'AllKPop', url: 'https://www.allkpop.com/feed', needsFilter: true, fetchCount: 20, priority: 21, enabled: true },
{ id: 'rss-koreaboo', type: 'rss', label: 'Koreaboo', url: 'https://www.koreaboo.com/feed/', needsFilter: true, fetchCount: 20, priority: 22, enabled: true },
{ id: 'rss-hellokpop', type: 'rss', label: 'HELLOKPOP', url: 'https://www.hellokpop.com/feed/', needsFilter: true, fetchCount: 20, priority: 23, enabled: true },
{ id: 'rss-kpopstarz', type: 'rss', label: 'KpopStarz', url: 'https://www.kpopstarz.com/rss', needsFilter: true, fetchCount: 20, priority: 24, enabled: true },
{ id: 'rss-seoulbeats', type: 'rss', label: 'Seoulbeats', url: 'https://seoulbeats.com/feed/', needsFilter: true, fetchCount: 20, priority: 25, enabled: true },
{ id: 'rss-asianjunkie', type: 'rss', label: 'Asian Junkie', url: 'https://www.asianjunkie.com/feed/', needsFilter: true, fetchCount: 20, priority: 26, enabled: true },
{ id: 'rss-seoulspace', type: 'rss', label: 'Seoul Space', url: 'PENDING_URL', needsFilter: true, fetchCount: 20, priority: 27, enabled: false },

// Tumblr sources (from frontend config)
{ id: 'tumblr-bts-trans', type: 'tumblr', label: 'bts-trans', url: 'https://bts-trans.tumblr.com/rss', needsFilter: false, fetchCount: 10, priority: 30, enabled: true },
{ id: 'tumblr-kimtaegis', type: 'tumblr', label: 'kimtaegis', url: 'https://kimtaegis.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 31, enabled: true },
// ... more Tumblr blogs from frontend config

// Bluesky
{ id: 'bluesky-bts', type: 'bluesky', label: 'Bluesky BTS', url: 'BTS', needsFilter: false, fetchCount: 25, priority: 40, enabled: true },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom XML parsing per source | `rss-parser` npm with custom fields | Stable since 2020+ | Handles RSS 2.0 + Atom + namespaces uniformly |
| Bluesky unauthenticated public API | Authenticated `@atproto/api` SDK | Feb 2025 (public API cursor restricted) | Must use app password auth for search |
| Hard DELETE for content cleanup | Soft delete with `deleted_at` | User decision for Phase 6 | Enables undo, audit trail; requires query filter |
| Flat engagement columns (score, commentCount) | JSON blob per content item | Phase 6 design decision | Supports arbitrary per-source stats without schema changes |

**Deprecated/outdated:**
- Bluesky unauthenticated search: Public API `searchPosts` now returns 403 with cursor. Must authenticate.
- `rss-parser` v2 API: Use v3+ which requires `new Parser()` instantiation and uses `feed.items` not `feed.entries`.

## Open Questions

1. **AllKPop RSS feed availability**
   - What we know: Reports indicate AllKPop removed their main RSS feed. The frontend config uses `https://www.allkpop.com/feed`.
   - What's unclear: Whether the feed is actually live or returns 404/HTML.
   - Recommendation: Test the URL during implementation. If dead, use forums RSS or disable the source.

2. **Seoul Space identity**
   - What we know: Listed in SCRAPE-06 as a required source. Could not find a K-pop blog/news site by this name.
   - What's unclear: Whether this is a real site, a misspelling, or a placeholder.
   - Recommendation: Add to config as `enabled: false` with pending URL. Ask user if they can provide the URL.

3. **Bluesky app password security**
   - What we know: App passwords are stored as environment variables. The `@atproto/api` uses `createSession` which is being deprecated in favor of OAuth.
   - What's unclear: Whether app password auth will continue to work long-term for server-side bots.
   - Recommendation: Use app password for now (simplest for server-side). OAuth client flow is designed for user-facing apps. Monitor deprecation timeline.

4. **Korea Herald entertainment RSS**
   - What we know: SCRAPE-06 mentions "Korea Herald entertainment." Korea Herald is a major English-language Korean newspaper.
   - What's unclear: Whether they have a dedicated entertainment RSS feed or just a general feed.
   - Recommendation: Try `https://www.koreaherald.com/rss` or category-specific feeds. Test during implementation.

5. **rss-parser media:thumbnail attribute extraction**
   - What we know: GitHub issue #130 documents that `media:thumbnail` URL attribute returns undefined.
   - What's unclear: Whether this has been fixed in recent versions.
   - Recommendation: For YouTube, use videoId-based URL construction (already proven in frontend). For other feeds, fall back to og:image HTML extraction.

## Sources

### Primary (HIGH confidence)
- Bluesky API docs: `app.bsky.feed.searchPosts` endpoint, rate limits, auth guide -- https://docs.bsky.app/docs/api/app-bsky-feed-search-posts
- Bluesky rate limits -- https://docs.bsky.app/docs/advanced-guides/rate-limits
- rss-parser GitHub README -- https://github.com/rbren/rss-parser (custom fields, TypeScript, API)
- Existing codebase: Phase 5 scraper infrastructure (`base.ts`, `reddit.ts`, `utils.ts`, `schema.ts`)
- Existing codebase: Frontend v1.0 scrapers (`youtube.ts`, `tumblr.ts`, `rss.ts`) for reference patterns

### Secondary (MEDIUM confidence)
- Bluesky cursor 403 issue -- https://github.com/bluesky-social/bsky-docs/issues/296, https://github.com/bluesky-social/atproto/issues/3583
- YouTube RSS feed format -- https://peerlist.io/blog/engineering/how-to-embed-youtube-videos-using-rss-feed
- rss-parser media:thumbnail issue -- https://github.com/rbren/rss-parser/issues/130
- K-pop RSS feed directory -- https://rss.feedspot.com/kpop_rss_feeds/

### Tertiary (LOW confidence)
- AllKPop RSS removal -- WebSearch only, single unverified source from 2014 blog post. Needs live verification.
- Seoul Space existence -- Could not find via multiple search queries. LOW confidence this is a real site.
- Korea Herald entertainment RSS URL -- Not verified, inferred from standard patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- rss-parser and @atproto/api are well-documented, actively maintained
- Architecture: HIGH -- Follows established Phase 5 patterns, clear extension points
- Pitfalls: HIGH (RSS/YouTube), MEDIUM (Bluesky pagination) -- Documented issues with evidence
- Source availability: MEDIUM -- Most RSS feeds verified, but AllKPop and Seoul Space need live testing
- Thumbnail extraction: MEDIUM -- og:image regex approach is simple but untested at scale against these specific sites

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, RSS feeds don't change fast; Bluesky API evolving faster)
