# Feature Research

**Domain:** Server-side content scraping engine, aggregation platform, LLM moderation pipeline, and smart blend ranking for K-pop fan feed
**Researched:** 2026-03-01
**Confidence:** HIGH (scraping/aggregation patterns well-established; LLM moderation is newer but well-documented; K-pop domain sources verified)

## Feature Landscape

### Table Stakes (Users Expect These)

Features the v2.0 backend must have to justify the migration from client-side fetching. Without these, the backend adds complexity for zero gain.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Scraping engine framework** | Core purpose of v2.0. Common interface for all scrapers: fetch, parse, normalize to `FeedItem`, store. Error handling, rate limiting, retry logic. Without this, each scraper is ad-hoc spaghetti. | MEDIUM | Abstract `Scraper` interface with `scrape(): Promise<ContentItem[]>`. Per-source implementations. Shared error handling, logging, rate limit tracking. Depends on: nothing (foundation layer). |
| **Reddit scraper (JSON endpoints)** | Already works client-side. Server-side removes CORS proxy dependency. Reddit's `old.reddit.com/r/{sub}/hot.json` returns structured JSON with full engagement stats, no API key needed. | LOW | Add 3-4s delay between subreddit requests to avoid rate limiting. Returns `score`, `num_comments`, `upvote_ratio`, `thumbnail`, `preview`, `created_utc`. Existing `sources.ts` config defines 6 subreddits. Depends on: scraping engine framework. |
| **YouTube scraper (RSS + optional API)** | Already works client-side. YouTube RSS feeds at `youtube.com/feeds/videos.xml?channel_id={id}` return latest 15 videos per channel. No auth. Free. | LOW | RSS gives titles, IDs, publish dates, thumbnails. For view counts/likes, optional YouTube Data API v3 key (free tier: 10K quota units/day, each `videos.list` call = 1 unit). Existing config defines 4 channels. Depends on: scraping engine framework. |
| **RSS/news site scrapers** | Already works client-side for Soompi and AllKPop. Standard RSS parsing. Server-side enables adding more K-pop news sources (Koreaboo, HELLOKPOP, KpopStarz -- all have RSS feeds). | LOW | Use `rss-parser` or `fast-xml-parser` npm packages. Extract: title, link, pubDate, description, og:image (from description HTML or separate fetch). RSS is the most stable scraping method -- rarely breaks. Depends on: scraping engine framework. |
| **Tumblr scraper (RSS feeds)** | Already works client-side. Tumblr public blogs expose `/rss` endpoint. Existing config has 5 Tumblr blogs. RSS returns post content plus note counts. | LOW | Same RSS parsing pipeline as news sites. Tumblr API v2 available as fallback (requires consumer key, returns 20 posts with richer metadata). Depends on: scraping engine framework. |
| **SQLite database** | Enables the entire pipeline: persistence, deduplication, historical engagement, LLM result storage, API serving. Without a database the scraping engine has nowhere to put data. | MEDIUM | SQLite: single file, zero config, no separate server process, sufficient for single-server scraping workload. Schema: `content_items` (scraped content), `engagement_snapshots` (time-series stats), `moderation_results` (LLM decisions), `scrape_runs` (audit log). Use `better-sqlite3` for synchronous API (simpler than async drivers for sequential scraping). Depends on: nothing (foundation layer). |
| **Scheduled scraping** | Content must stay fresh. 15-30 min cadence keeps the feed current without overwhelming sources. | LOW | `node-cron` for simple interval scheduling. No Redis-backed queues (BullMQ/Agenda) needed at this scale -- single server, sequential source scraping, <100 items per run. If load grows, BullMQ upgrade path exists. Depends on: scraping engine + database. |
| **URL-based deduplication** | Same content cross-posted to Reddit and news sites, or reposts within Reddit. Duplicates waste feed slots and confuse users. | LOW | Already implemented client-side (`normalizeUrl` in `feeds.ts`). Server-side: normalize URLs (strip tracking params), store canonical URL as UNIQUE constraint in `content_items` table. ON CONFLICT UPDATE engagement stats if newer data is better. Depends on: database. |
| **Engagement data collection** | Drives the ranking algorithm. Users already see upvotes/views/likes on v1.0 cards -- removing them in v2.0 would be a regression. | MEDIUM | Per-source extraction: Reddit (score, num_comments, upvote_ratio), YouTube (views, likes via API), Tumblr (notes), news (none -- no engagement from RSS). Store as snapshots for trend detection (engagement velocity). Depends on: scraping engine + database. |
| **REST API server** | Frontend needs a single clean endpoint instead of N CORS-proxied source fetches. This is how the frontend consumes the curated, ranked, moderated content. | MEDIUM | Fastify (faster, schema validation built-in) or Express. Key endpoints: `GET /api/feed` (paginated, filterable by source/type/member), `GET /api/feed/:id` (single item), `GET /api/sources/status` (scraper health). Serve pre-ranked content from DB. Depends on: database + smart blend ranking. |
| **Thumbnail/media URL extraction** | Feed cards need images. v1.0 already renders thumbnails from source data. Server-side must extract and store these URLs. | LOW | Reddit: `thumbnail` and `preview.images[0].source.url` fields. YouTube: RSS `media:thumbnail` element. News: parse `og:image` from RSS description HTML. Tumblr: first image in RSS content. Store URLs only -- never download/cache actual media files. Depends on: scraping engine. |
| **Config-driven group targeting** | Core architecture principle carried from v1.0. All scrape targets, keywords, member names defined in config. Swap config to scrape for any fandom. | MEDIUM | Server-side config mirrors existing `src/config/groups/bts/sources.ts` structure. Add: scrape intervals per source, LLM filter toggle per source, engagement normalization parameters. No hardcoded group references in scraper code. Depends on: nothing (design principle applied throughout). |
| **Content age windowing** | v1.0 has 30-day window. Server-side must enforce this to prevent unbounded DB growth. | LOW | Configurable max age (default 30 days). Periodic cleanup cron job to DELETE content older than window. Keep scrape_runs metadata longer for audit. Depends on: database + scheduled scraping. |

### Differentiators (Competitive Advantage)

Features that make the v2.0 backend genuinely better than what v1.0 client-side fetching can do, and better than "just open Reddit + YouTube in separate tabs."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **LLM relevance filtering** | Keyword matching ("BTS") catches "behind the scenes" articles, interview transcripts mentioning "BTS" in passing, etc. LLM understands context: "this is about the K-pop group BTS" vs "behind the scenes of a movie." Critical for `needsFilter: true` sources (r/kpop, AllKPop, HYBE channel, Koreaboo). | MEDIUM | Two-step pipeline: (1) wide-net scrape collects everything from source, (2) LLM classifies each item from filtered sources. Use cheap models: GPT-4o-mini at $0.15/$0.60 per M input/output tokens, or Claude Haiku at $1/$5 per M tokens. Batch items in single prompt (10-20 items per call). Estimated cost: <$1/day for hundreds of items. Structured JSON output: `{relevant: boolean, confidence: number, reason: string}`. Depends on: LLM provider interface + database (store results). |
| **LLM content moderation** | Fan spaces attract drama, shipping wars, hate content, NSFW material. Automated moderation protects feed quality without manual curation. "Policy-as-prompt" approach: encode moderation rules as natural language in the system prompt. | MEDIUM | Combine with relevance filter in single LLM call to minimize cost. Classify: `{relevant: bool, safe: bool, contentType: string}`. Configurable policies per group (BTS config might allow fan fiction discussion, another group might not). Depends on: LLM provider interface. |
| **LLM provider abstraction** | Avoid vendor lock-in. Optimize cost vs quality. Different providers have different strengths and pricing changes frequently. | MEDIUM | Interface: `moderate(items: ContentItem[]): Promise<ModerationResult[]>`. Implementations for Claude (Anthropic SDK), OpenAI (openai SDK), and potentially Gemini. Config selects provider + model. Batch support for cost efficiency. Depends on: nothing (interface layer). |
| **Smart blend ranking engine** | Current 50/50 recency+engagement is decent but naive. Multiple Reddit posts cluster together, news articles dominate during comeback season, fan content gets buried. Smart blend adds source diversity and content type variety. | MEDIUM | Multi-signal weighted scoring: recency (0-1, time decay), normalized engagement (0-1, per-source z-score), source diversity penalty (reduce score for Nth consecutive item from same source), content type bonus (boost underrepresented types in current page). Configurable weights in group config. YouTube's two-stage approach (candidate generation then re-ranking for diversity) is the right mental model. Depends on: engagement normalization + content type classification. |
| **Cross-source engagement normalization** | 1000 Reddit upvotes and 100K YouTube views are both "high engagement" but raw numbers are incomparable. Without normalization, YouTube views always dwarf Reddit scores in ranking. | MEDIUM | Per-source z-score normalization over a rolling 7-day window. For each source, compute mean and stddev of engagement. Normalize: `(raw - mean) / stddev`, then clamp to 0-1. Recompute parameters daily. Store normalization parameters in DB. Handles the "50 upvotes in r/heungtan is impressive; 50 upvotes in r/kpop is nothing" problem. Depends on: engagement data collection + database (enough historical data for statistics). |
| **Content type classification** | Automatically tag content as news, fan art, meme, video, discussion, translation, official. Enables content type diversity in blend algorithm AND client-side type filtering UI. | MEDIUM | Combined with relevance+moderation in single LLM call. Structured output: `{contentType: "news"|"fanart"|"meme"|"video"|"discussion"|"translation"|"official"|"other"}`. Minimal additional cost -- same API call, slightly longer output. Enables the smart blend to ensure a mix of content types per page. Depends on: LLM provider interface. |
| **Twitter/X scraper (server-side)** | Twitter is the #1 real-time platform for ARMY. Official member tweets, fan reactions, memes, translation threads. Current Nitter-based approach is broken. Server-side enables actual scraping. | HIGH | Twitter is the hardest source to scrape in 2026. Options by reliability: (1) Third-party API (Apify, SociaVault) at $25-50/mo -- most reliable; (2) Playwright headless scraping with session management -- 10-15 hrs/month maintenance as X rotates anti-bot measures every 2-4 weeks; (3) RSS bridge services -- unreliable. Recommend third-party API behind abstract interface. Depends on: scraping engine framework + budget allocation. |
| **TikTok scraper (server-side)** | TikTok is where short-form BTS fan content lives -- edits, fancams, dance covers. v1.0 iframe embeds degraded by CORS short URL issue. Server-side can resolve redirects, extract metadata. | HIGH | Use Playwright to load TikTok pages, extract `UNIVERSAL_DATA_FOR_REHYDRATION` JSON from script tag. Gets: video URL, thumbnail, caption, engagement (likes, shares, comments, views). Anti-bot measures rotate every few months -- expect periodic breakage. Search by hashtag (#BTS, #BTSARMY, #BTSArmy) for content discovery. Depends on: scraping engine + Playwright dependency. |
| **Instagram scraper (server-side)** | Instagram is a major ARMY platform: member posts (6 of 7 have accounts), fan art accounts, translation accounts. Descoped from v1.0 as impossible client-side. | HIGH | GraphQL endpoint scraping with `x-ig-app-id` header. `doc_id` parameters rotate every 2-4 weeks -- fragile. Instagram blocks cloud provider IPs; needs residential proxies ($20-50/mo) or third-party scraping API. Rate limit: ~200 req/hr per IP. Target: official BTS member IG accounts, top fan/translation accounts. Depends on: scraping engine + proxy infrastructure or third-party API. |
| **Bluesky scraper** | Active ARMY migration from Twitter to Bluesky in 2025-2026. Bluesky has a fully open AT Protocol with documented public API. Generous rate limits. No auth needed for public posts. This is genuinely easy. | LOW | `app.bsky.feed.searchPosts` endpoint with keyword queries. Returns structured JSON: text, author, timestamps, likes, reposts, replies. Rate limits are generous (public API, no key needed for reads). This is the easiest new social media source to add -- easier than Reddit. Depends on: scraping engine framework. |
| **Expanded K-pop news sources** | Beyond Soompi/AllKPop. Add Koreaboo, HELLOKPOP, KpopStarz, Seoulbeats, NetizenBuzz, Asian Junkie, The Korea Herald entertainment, Seoul Space. All have RSS except NetizenBuzz (HTML scraping). | LOW | Pure RSS scraping, same pattern as existing news sources. High value because RSS is the most stable scraping method -- rarely breaks, never blocks. 8+ additional sources for minimal effort. Depends on: RSS scraper. |
| **Fan translation account prioritization** | Translation accounts (bts-trans Tumblr, @btranslation_ on platforms) are extremely high-value -- they make Korean-only content accessible to international fans. These should rank higher than generic fan posts. | LOW | Add `priority_boost` field to source config. Translation accounts get a ranking boost. Already partially covered (bts-trans in Tumblr config). Expand: identify top 5-10 translation accounts across platforms. Depends on: config-driven sources + smart blend ranking. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Weverse scraping** | Primary official BTS platform. Fans desperately want this content. | No public API, no RSS, aggressive anti-scraping by HYBE. HMAC-authenticated private API with rotating secret keys. Legal risk (ToS violation). PROJECT.md already descoped. | Link to Weverse in sidebar/members page. Accept that Weverse is a walled garden. If HYBE ever releases a public API, revisit. |
| **Real-time WebSocket feed updates** | "I want to see new content the moment it's posted" | WebSocket server, connection management, reconnection logic, push infrastructure. Massive complexity for marginal benefit over 15-min polling. Content is not time-critical (fan memes, not stock prices). | Frontend polls REST API every 5-15 minutes. Server returns `Last-Modified` / `ETag` headers for efficient conditional requests. Content feels "fresh enough." |
| **User accounts and personalization** | "I only care about Jimin" or "Show me only fan art" | Authentication, user database, session management, GDPR compliance, password resets. Massive scope increase for a fan project serving a niche audience. | Member bias filtering already exists client-side (keyword matching). LLM content type tags enable client-side filtering by type. Store preferences in localStorage. No accounts needed. |
| **Full-text search** | "Let me search for specific moments or topics" | Requires search infrastructure (Elasticsearch, MeiliSearch, or Typesense), index maintenance, relevance tuning, search UI. Significant additional infrastructure. | Defer entirely. If demand arises, SQLite FTS5 extension handles basic full-text search without additional services. Add it as a v3 feature if validated. |
| **Scraping private/authenticated content** | "Get me member-only Weverse posts" or "Access locked Instagram stories" | Legal liability, ToS violations, DMCA risk. Scraping authenticated content crosses ethical and legal lines. Tokens expire, accounts get banned. | Only scrape publicly accessible content. Link to official platforms for gated content. This is a firm ethical boundary. |
| **Notification system (push)** | "Alert me when BTS posts something new" | FCM/APNs infrastructure, notification preferences UI, delivery reliability, battery/bandwidth impact on user devices, permission prompts. | Users check the feed on their own schedule. High-priority content (official posts) gets boosted by engagement naturally. The feed is the notification. |
| **Media caching/CDN proxy** | "Proxy all images through our server for speed" | Storage costs balloon fast (images, video thumbnails). Bandwidth costs. Copyright issues with hosting copies of media. Single server cannot compete with YouTube/Reddit/Instagram CDNs. | Store media URLs only. Frontend loads images/videos directly from source CDNs. Source CDN thumbnail URLs are stable. If a thumbnail 404s, show a fallback image. |
| **Automated proxy rotation** | "Handle IP bans from aggressive scraping" | Residential proxy services cost $20-100+/mo, add latency, introduce new failure modes. Only needed for adversarial platforms. | For most sources (Reddit JSON, YouTube RSS, RSS feeds, Tumblr RSS, Bluesky API), a single server IP with polite rate limiting works perfectly. Only consider proxies if/when Instagram or TikTok scraping is added AND starts getting blocked. |
| **Near-duplicate semantic detection** | "Detect when 5 news sites publish the same story" | SimHash/MinHash algorithms, text processing pipeline, similarity threshold tuning. Adds complexity to the dedup layer. | URL-based dedup handles exact reposts. LLM moderation can flag "this is substantially the same as another recent item" if content overlap becomes a real problem. Defer until it is. |
| **Multi-tenant group switching** | "BTS and BLACKPINK in one deployment" | Config-driven architecture means each clone is independent. Multi-tenant adds routing, per-group DB isolation, config management, resource contention. PROJECT.md descoped. | Keep clone-and-swap model. Deploy separate instances per group. Share the config template for community reuse. |

## Feature Dependencies

```
[SQLite Database]
    |
    +---required-by---> [REST API Server]
    +---required-by---> [Engagement Data Collection]
    +---required-by---> [URL Deduplication (persistent)]
    +---required-by---> [LLM Moderation Result Storage]
    +---required-by---> [Cross-source Engagement Normalization]
    +---required-by---> [Content Age Windowing / Cleanup]
    +---required-by---> [Scrape Run Audit Logging]

[Scraping Engine Framework]
    |
    +---required-by---> [Reddit Scraper]
    +---required-by---> [YouTube Scraper]
    +---required-by---> [RSS/News Scraper]
    +---required-by---> [Tumblr Scraper]
    +---required-by---> [Twitter/X Scraper]
    +---required-by---> [TikTok Scraper]
    +---required-by---> [Instagram Scraper]
    +---required-by---> [Bluesky Scraper]

[Scraping Engine] + [Database]
    +---required-by---> [Scheduled Scraping (node-cron)]

[LLM Provider Interface]
    |
    +---required-by---> [Relevance Filtering]
    +---required-by---> [Content Moderation]
    +---required-by---> [Content Type Classification]

[Engagement Data] + [Database (7-day history)]
    +---required-by---> [Cross-source Engagement Normalization]

[Engagement Normalization] + [Content Type Classification]
    +---required-by---> [Smart Blend Ranking Engine]

[Smart Blend Ranking] + [REST API]
    +---required-by---> [Frontend Migration to API]

[Config-Driven Group Targeting]
    +---required-by---> ALL scraper modules
    +---required-by---> LLM filter prompts (member names, keywords)
    +---required-by---> Smart blend weights

[Twitter/X Scraper] --conflicts-- [Budget] ($25-50/mo for third-party API)
[Instagram Scraper] --conflicts-- [Maintenance budget] (doc_id rotation every 2-4 weeks)
[TikTok Scraper] --conflicts-- [Maintenance budget] (anti-bot rotation)
```

### Dependency Notes

- **Database + Scraping Engine are twin foundations.** Nearly every downstream feature depends on both. They must be built in the same phase, ideally Phase 1.
- **LLM provider interface before any moderation features.** Abstract the LLM call first, then relevance/moderation/classification all use the same interface. Combine into single API call for cost efficiency.
- **Easy scrapers before hard scrapers.** Reddit/YouTube/RSS/Tumblr are LOW complexity and almost never break. Twitter/TikTok/Instagram are HIGH complexity with ongoing maintenance. Ship reliable sources first (Phase 1), add fragile sources later (Phase 3+).
- **Engagement normalization requires history.** Z-score normalization needs 7+ days of engagement data in the database. Cannot launch smart blend with normalization on day 1. Ship basic recency+raw engagement first, add normalization once data accumulates.
- **Smart blend ranking requires content type classification.** Diversity balancing by content type needs items to be classified first. LLM classification in Phase 2, smart blend in Phase 2 or 3.
- **Frontend migration is last.** Only switch the SPA from client-side fetching to REST API consumption once the backend reliably serves better content than the client fetches directly. The v1.0 client-side pipeline is the fallback.
- **Bluesky is a quick win.** Open AT Protocol, no auth, generous rate limits, growing ARMY presence. Can be added in any phase with minimal effort. Do it early to expand source coverage cheaply.

## MVP Definition

### Launch With (v2.0 Core)

The minimum to prove the server-side pipeline delivers better content than client-side fetching.

- [ ] **Scraping engine framework** -- common `Scraper` interface, error handling, rate limiting, retry logic
- [ ] **SQLite database** -- `content_items`, `engagement_snapshots`, `scrape_runs` tables, `better-sqlite3`
- [ ] **Reddit scraper** -- JSON endpoints for 6 configured subreddits, full engagement stats
- [ ] **YouTube scraper** -- RSS feeds for 4 configured channels + optional API for view counts
- [ ] **RSS/news scrapers** -- Soompi, AllKPop + add Koreaboo, HELLOKPOP
- [ ] **Tumblr scraper** -- RSS for 5 configured blogs
- [ ] **Scheduled scraping** -- `node-cron`, 15-30 min intervals, staggered per source type
- [ ] **URL deduplication** -- normalized URL UNIQUE constraint in DB
- [ ] **REST API server** -- `GET /api/feed` (paginated, filterable), `GET /api/sources/status`
- [ ] **Config-driven sources** -- all scrape targets in config, not code
- [ ] **LLM provider interface** -- abstract interface supporting Claude + OpenAI
- [ ] **LLM relevance filtering** -- classify items from `needsFilter: true` sources
- [ ] **Basic ranking** -- recency + raw engagement (same as v1.0 `computeFeedScore` but server-side)

### Add After Core Works (v2.x)

Add once the basic pipeline is validated and there is enough historical data for normalization.

- [ ] **LLM content moderation + type classification** -- combine with relevance in single call
- [ ] **Cross-source engagement normalization** -- z-score per source over 7-day rolling window
- [ ] **Smart blend ranking** -- multi-signal with diversity and type variety
- [ ] **Bluesky scraper** -- AT Protocol, easy win, growing ARMY community
- [ ] **Expanded news sources** -- KpopStarz, Seoulbeats, NetizenBuzz, Asian Junkie, Seoul Space
- [ ] **Fan translation account prioritization** -- `priority_boost` in config
- [ ] **Frontend migration** -- switch SPA from client-side fetching to REST API consumption
- [ ] **Engagement velocity tracking** -- detect trending content (rising engagement rate)

### Future Consideration (v3+)

Features to defer until the pipeline is production-stable and demand is validated.

- [ ] **Twitter/X scraper** -- requires third-party API ($25-50/mo) or heavy maintenance; defer until budget/ROI justifies
- [ ] **TikTok scraper** -- Playwright-based, fragile, high maintenance; defer until anti-bot landscape stabilizes
- [ ] **Instagram scraper** -- GraphQL rotation, proxy requirements; defer unless strong user demand
- [ ] **Near-duplicate semantic detection** -- SimHash/MinHash for similar-but-different-URL content
- [ ] **Content trend detection** -- engagement velocity analysis for "what's going viral now"
- [ ] **SQLite to PostgreSQL migration** -- only if concurrent writes become a bottleneck (unlikely for single-server)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Scraping engine framework | HIGH | MEDIUM | P1 |
| SQLite database + schema | HIGH | MEDIUM | P1 |
| Reddit scraper | HIGH | LOW | P1 |
| YouTube scraper (RSS + optional API) | HIGH | LOW | P1 |
| RSS/news scrapers (6+ sources) | HIGH | LOW | P1 |
| Tumblr scraper | MEDIUM | LOW | P1 |
| Scheduled scraping (node-cron) | HIGH | LOW | P1 |
| URL deduplication | HIGH | LOW | P1 |
| REST API server | HIGH | MEDIUM | P1 |
| Config-driven group targeting | HIGH | MEDIUM | P1 |
| LLM provider abstraction | MEDIUM | MEDIUM | P1 |
| LLM relevance filtering | HIGH | MEDIUM | P1 |
| Basic ranking (recency + engagement) | HIGH | LOW | P1 |
| LLM content moderation | MEDIUM | LOW (combined call) | P2 |
| Content type classification | MEDIUM | LOW (combined call) | P2 |
| Cross-source engagement normalization | MEDIUM | MEDIUM | P2 |
| Smart blend ranking | HIGH | MEDIUM | P2 |
| Bluesky scraper | MEDIUM | LOW | P2 |
| Expanded K-pop news sources | MEDIUM | LOW | P2 |
| Fan translation prioritization | MEDIUM | LOW | P2 |
| Frontend API migration | HIGH | MEDIUM | P2 |
| Engagement velocity / trending | LOW | MEDIUM | P2 |
| Twitter/X scraper | MEDIUM | HIGH | P3 |
| TikTok scraper | MEDIUM | HIGH | P3 |
| Instagram scraper | MEDIUM | HIGH | P3 |
| Near-duplicate detection | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch -- proves the pipeline works end-to-end
- P2: Should have, add once core pipeline is stable and historical data exists
- P3: Nice to have, defer until demand justifies ongoing maintenance cost

## K-pop Domain Source Analysis

Comprehensive source list for a BTS Army Feed, organized by scraping reliability and fan value.

### Tier 1: High reliability, high value (RSS/JSON, no auth needed)

| Source | Method | Content Type | Engagement Data | Notes |
|--------|--------|-------------|-----------------|-------|
| Reddit (r/bangtan, r/bts7, r/heungtan, r/kpop, r/kpoopheads, r/BTSWorld) | JSON (`/hot.json`) | Discussion, news, memes, fan art | score, num_comments, upvote_ratio | Most reliable scraping target. 3-4s delay between requests. Already configured. |
| YouTube (BANGTANTV, HYBE, Jackpot Army, DKDKTV) | RSS feed + optional API | MVs, behind-scenes, fan edits, reactions | views, likes (API only) | RSS: 15 latest videos, no auth. API free tier: 10K units/day. Already configured. |
| Soompi | RSS feed | K-pop news (high quality journalism) | None | `needsFilter: true`. Already configured. |
| AllKPop | RSS feed | K-pop news, gossip (high volume) | None | `needsFilter: true`. Already configured. |
| Koreaboo | RSS feed | K-pop news, viral content | None | `needsFilter: true`. NEW -- add to config. Good for trending BTS content. |
| HELLOKPOP | RSS feed | K-pop news | None | `needsFilter: true`. NEW -- add to config. |
| KpopStarz | RSS feed | K-pop news | None | `needsFilter: true`. NEW -- add to config. |
| Tumblr (bts-trans, kimtaegis, userparkjimin, namjin, jikook) | RSS feed | Translations, fan art, fan edits | notes (from RSS) | Translation accounts (bts-trans) are extremely high value. Already configured. |
| Bluesky | AT Protocol public API | Fan discussion, memes, reactions, updates | likes, reposts, replies | NEW -- growing ARMY community migrating from Twitter. Open protocol, no auth for public reads. Easiest new social source to add. |

### Tier 2: Medium reliability, high value (requires some effort)

| Source | Method | Content Type | Engagement Data | Notes |
|--------|--------|-------------|-----------------|-------|
| The Korea Herald (entertainment) | RSS feed | Mainstream Korean news about BTS | None | Adds mainstream credibility. `needsFilter: true`. |
| Seoulbeats | RSS feed | Analysis, opinion, reviews | None | Higher-quality writing, less clickbait than AllKPop. |
| NetizenBuzz | HTML scraping (Cheerio) | Translated Korean netizen comments | None | Unique content type -- Korean public opinion translated to English. No RSS, requires HTML scraping. |
| Asian Junkie | RSS feed | Irreverent K-pop commentary | None | Different editorial voice, adds variety. |
| Seoul Space | RSS feed | K-pop news and culture | None | Additional English-language coverage. |
| US BTS ARMY | Web scraping | Fan org news, projects, events | None | Official US fan organization. May have RSS. |
| Bangtan Base | Web scraping | Fan forum discussions | None | Dedicated BTS discussion forum. |

### Tier 3: High value but high maintenance (fragile scraping)

| Source | Method | Content Type | Engagement Data | Notes |
|--------|--------|-------------|-----------------|-------|
| Twitter/X | Third-party API ($25-50/mo) or Playwright | Real-time reactions, official tweets, fan content, translation threads | likes, retweets, replies | Most important real-time source. Hardest to scrape. Nitter is dead. X rotates anti-bot every 2-4 weeks. Budget third-party API or accept 10-15 hrs/mo maintenance. |
| TikTok | Playwright + REHYDRATION JSON | Short-form edits, fancams, dance covers, memes | likes, shares, comments, views | Search by hashtag (#BTS, #BTSARMY). Anti-bot rotates every few months. UNIVERSAL_DATA_FOR_REHYDRATION script tag extraction. |
| Instagram | GraphQL endpoint | Member posts (6/7 have IG), fan art, translation accounts | likes, comments | doc_id rotation every 2-4 weeks. Blocks cloud IPs. Needs residential proxy or third-party API. Highest-value targets: @j.m, @uarmyhope, @jin, @agaborasiddhartha, @thv, @rkive. |

### Sources NOT worth scraping

| Source | Why Not |
|--------|---------|
| Weverse | No public API, no RSS, HYBE actively blocks. Walled garden by design. |
| V Live | Shut down 2022, migrated to Weverse. Dead platform. |
| Daum Fancafe | Legacy platform, content moved to Weverse. Minimal activity. |
| Spotify / Apple Music | Streaming stats, not content. No feed-worthy items to scrape. |
| Pinterest | Low-signal reposts of fan art. No engagement context. Not where ARMY creates content. |
| Facebook | Declining K-pop fan presence. Scraping heavily blocked by Meta. |
| Weibo / Xiaohongshu | Chinese platforms. Language barrier, Great Firewall complications, not English-language ARMY. |

## Competitor Feature Analysis

| Feature | Weverse (official) | Stan Twitter Lists | Reddit (manual) | TheQoos | BTS Army Feed v2.0 |
|---------|-------------------|--------------------|-----------------|---------|--------------------|
| Multi-source aggregation | Single platform | Twitter only | Reddit only | News + some social | 9+ sources unified |
| Content moderation | HYBE-controlled | None | Community voting | Editorial | LLM-based relevance + safety |
| Ranking algorithm | Chronological | Algorithmic (opaque) | Upvote-based | Recency | Multi-signal smart blend |
| Source diversity balance | N/A | N/A | N/A | No | Explicit diversity scoring |
| Content type variety | N/A | N/A | N/A | No | Classified and balanced |
| Fan translations | Official subs only | Scattered | Linked in comments | Some | Prioritized translation accounts |
| Fan + official mix | Official only | Fan-curated | Fan + news | Mostly news | Both, classified and balanced |
| Engagement stats | Hidden | Likes/RTs visible | Upvotes visible | No | Normalized cross-source |
| Cross-platform | No | No | No | Partial | Yes -- core value proposition |
| Config-portable | No | No | No | No | Swap config for any fandom |

## Sources

### Scraping Ecosystem
- [ScrapingBee: Best JavaScript Scraping Libraries](https://www.scrapingbee.com/blog/best-javascript-web-scraping-libraries/)
- [Apify: Best JavaScript Scraping Libraries 2025](https://blog.apify.com/best-javascript-web-scraping-libraries/)
- [Proxyway: Cheerio vs Puppeteer 2026](https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping)
- [ScrapFly: Social Media Scraping 2026](https://scrapfly.io/blog/posts/social-media-scraping)

### Platform-Specific Scraping
- [PainOnSocial: Scrape Reddit Without API 2026](https://painonsocial.com/blog/scrape-reddit-without-api)
- [SociaVault: YouTube API Alternatives 2025](https://sociavault.com/blog/youtube-api-alternative-scraper-2026)
- [ScrapFly: How to Scrape TikTok 2026](https://scrapfly.io/blog/posts/how-to-scrape-tiktok-python-json)
- [ScrapFly: How to Scrape Instagram 2026](https://scrapfly.io/blog/posts/how-to-scrape-instagram)
- [ScrapFly: How to Scrape Twitter/X 2026](https://scrapfly.io/blog/posts/how-to-scrape-twitter)
- [Tumblr API v2 Documentation](https://www.tumblr.com/docs/en/api/v2)

### Content Moderation and LLM Pricing
- [Mistral Moderation API](https://mistral.ai/news/mistral-moderation)
- [IntuitionLabs: LLM API Pricing 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [TLDL: LLM API Pricing Feb 2026](https://www.tldl.io/resources/llm-api-pricing-2026)
- [arxiv: Policy-as-Prompt Content Moderation](https://arxiv.org/html/2502.18695v1)
- [SkyWork: Claude Haiku vs GPT-4o-mini vs Gemini Flash](https://skywork.ai/blog/claude-haiku-4-5-vs-gpt4o-mini-vs-gemini-flash-vs-mistral-small-vs-llama-comparison/)

### Recommendation and Ranking
- [Hightouch: What is a Recommendation System](https://hightouch.com/blog/recommendation-system)
- [Shaped.ai: How YouTube's Algorithm Works](https://www.shaped.ai/blog/how-youtubes-algorithm-works)
- [Knight Columbia: Social Media Recommendation Algorithms](https://knightcolumbia.org/content/understanding-social-media-recommendation-algorithms)

### Deduplication
- [Trafilatura: Deduplication Documentation](https://trafilatura.readthedocs.io/en/latest/deduplication.html)
- [HuggingFace: Large-scale Near-dedup Behind BigCode](https://huggingface.co/blog/dedup)

### K-pop Domain Sources
- [Feedspot: Top 60 Kpop RSS Feeds](https://rss.feedspot.com/kpop_rss_feeds/)
- [Feedspot: 60 Best Kpop Blogs 2026](https://bloggers.feedspot.com/kpop_blogs/)
- [SeoulSpace: Top 10 English K-pop News Sites](https://seoulspace.com/the-top-10-english-based-k-pop-news-sites-worth-checking-out/)
- [US BTS ARMY](https://www.usbtsarmy.com/)
- [The BTS Effect: New Fan Guide](https://www.thebtseffect.com/new-fan-guide)
- [KpopSource Forum](https://kpopsource.com/)

### Database
- [SQLite: Appropriate Uses](https://sqlite.org/whentouse.html)
- [SitePoint: SQLite on the Edge 2026](https://www.sitepoint.com/sqlite-edge-production-readiness-2026/)
- [DataCamp: SQLite vs PostgreSQL](https://www.datacamp.com/blog/sqlite-vs-postgresql-detailed-comparison)

### Job Scheduling
- [AppSignal: Bull or Agenda](https://blog.appsignal.com/2023/09/06/job-schedulers-for-node-bull-or-agenda.html)
- [BetterStack: BullMQ Scheduled Tasks](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)

---
*Feature research for: BTS Army Feed v2.0 Content Scraping Engine*
*Researched: 2026-03-01*
