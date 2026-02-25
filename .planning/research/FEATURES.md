# Feature Research

**Domain:** Fan content aggregation app -- feed expansion and config-driven architecture
**Researched:** 2026-02-25
**Confidence:** MEDIUM (varies by feature; see notes)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of a multi-source fan feed aggregator expect. Missing these makes the expansion feel incomplete relative to the existing app quality.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Engagement stats on Reddit cards (score, comments) | Reddit JSON API already returns `score`, `num_comments`, `upvote_ratio` in the same hot.json call the app already makes. Users see this on every Reddit client. Omitting it when the data is right there feels lazy. | LOW | Data is already in the API response at `post.data.score` and `post.data.num_comments`. Just needs to be mapped into `FeedItem` and displayed. No additional fetch required. Note: Reddit fuzzes vote counts to prevent spam bots, but score remains accurate. |
| Expanded Reddit sources (meme/discussion subs) | Current 4 subreddits miss significant fan activity. Adding subs like r/btsmemes, r/bts_army_lounge is trivial -- the `fetchSubreddit()` function already parameterizes subreddit names. | LOW | Literally adding entries to the `subreddits` array in `fetchReddit()`. The existing `needsFilter` flag handles mixed-content subs. This is a config change, not a code change -- which is exactly why config-driven architecture matters. |
| Fan YouTube channels | Only 2 channels (BANGTANTV, HYBE LABELS) currently. Fan channels like reaction channels, edit channels, and fan-run content channels are a massive part of the BTS YouTube ecosystem (70+ notable fan channels exist). | LOW | Same pattern as existing `fetchYouTubeChannel()` -- just add channel IDs to the `channels` array. The existing Atom feed + CORS proxy pipeline handles it. Discovery of channel IDs is the manual work, not the code. |
| Config-driven architecture | All BTS-specific data (subreddit names, channel IDs, member names/keywords, source URLs) is hardcoded across `feeds.ts`, `feed.ts`, and `members.ts`. The project goal explicitly states clone-and-swap for other fandoms. Without this, the app cannot be reused. | MEDIUM | Requires extracting hardcoded values from ~6 files into a single config object/file. The `BTS_KEYWORDS` regex in `feeds.ts`, the `MEMBER_KEYWORDS` map in `feed.ts`, the `subreddits` array, `channels` array, news feed URLs, and member data in `members.ts` all need to reference the config. Refactoring, not new functionality. |
| YouTube embed in feed (standard videos) | The SwipeFeed component already does this -- extracts video ID and renders an iframe. But FeedCard (list view) just shows thumbnails with external links. Users expect inline video for YouTube content in both views. | LOW | Port the `getYouTubeId()` + iframe pattern from SwipeFeed into FeedCard for YouTube source items. The pattern is already proven in the codebase. |

### Differentiators (Competitive Advantage)

Features that would set this apart from generic K-pop apps like TheQoos, Kpop Amino, or just browsing Reddit/YouTube directly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tumblr fan content integration | Tumblr is still a major hub for BTS fan art, edits, and long-form fan writing. No mainstream K-pop aggregator pulls Tumblr content. Every Tumblr blog exposes RSS at `https://{blogname}.tumblr.com/rss` and tagged posts at `https://{blogname}.tumblr.com/tagged/{tag}/rss`. The existing RSS parsing pipeline (`parseRSS` in `xmlParser.ts`) can handle this with zero new parsing code. | LOW-MEDIUM | LOW for RSS approach: same CORS proxy + RSS parse pattern as Soompi/AllKPop. MEDIUM if also using Tumblr v1 API (`/api/read`) for richer metadata (note counts, post types). The v1 API works without authentication for public blogs. Tagged RSS feeds enable keyword-based discovery (e.g., `tagged/bts` across multiple blogs). The config would store a list of curated Tumblr blog names + tags. |
| TikTok video embeds (oEmbed) | TikTok is where short-form BTS fan content lives -- edits, fancams, memes. The TikTok oEmbed API at `https://www.tiktok.com/oembed?url={video_url}` requires NO authentication and returns HTML embed markup. | MEDIUM | The oEmbed call itself is simple and auth-free. But: (1) You need TikTok URLs to embed -- the app has no TikTok feed source, so URLs must come from other sources (Reddit posts linking to TikTok, or curated lists). (2) TikTok's embed.js is a performance nightmare: 500KB JS + 3-5MB images + full video per embed = 8-12MB per embed on the wire. (3) The embed script must be reloaded each time (no manual init API unlike Instagram/Facebook). Use `react-social-media-embed` (36K weekly downloads, supports TikTok) or build a lazy-load wrapper that only loads embed.js when scrolled into view. |
| YouTube Shorts vertical embeds | Shorts are the dominant BTS fan content format on YouTube. YouTube's oEmbed endpoint does NOT natively support `/shorts/` URLs, but the video ID is the same. Convert `youtube.com/shorts/VIDEO_ID` to `youtube.com/embed/VIDEO_ID` and render in a vertical-aspect iframe (315x560). | LOW-MEDIUM | The URL rewriting is trivial. The UX challenge is rendering vertical video nicely in a horizontal feed layout. The SwipeFeed is actually a natural fit for Shorts (vertical cards). In list view, constrain to a max-height with letterboxing. YouTube Atom feeds do not distinguish Shorts from regular videos -- detection requires checking aspect ratio or video duration (Shorts are under 60s), which the Atom feed does NOT provide. May need to just embed all YouTube content uniformly and let the player handle it. |
| Engagement stats on YouTube cards (view count) | View count is the universal signal for YouTube content quality. Problem: YouTube Atom feeds (`/feeds/videos.xml`) do NOT include view counts. | HIGH | Getting view counts requires either: (1) YouTube Data API v3 -- free but needs API key, 10K units/day quota, each video detail costs 1 unit, so ~50 videos/day from multiple channels is feasible but adds API key management. (2) Third-party scrapers -- unreliable for client-side. (3) Skip it -- show "YouTube" badge without counts. Recommendation: defer YouTube view counts to a later phase or make the API key optional in config. The quota is generous enough for a fan app (10K units = 10K video lookups/day). |
| Engagement stats on news/Twitter cards | News articles don't expose share counts easily. Twitter/Nitter scraping already fragile. Adding engagement (likes, retweets) from Nitter HTML is possible but increases parsing complexity on an already-fragile source. | MEDIUM | For Twitter: the Nitter HTML scrape could extract like/RT counts from the tweet HTML with additional regex patterns. But Nitter instances are unreliable. For news: not feasible without backend -- news sites don't expose engagement in RSS. Recommendation: show engagement stats only for sources that natively provide them (Reddit, optionally YouTube). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Instagram Reels embeds | Instagram is a major BTS content platform. Fans want to see Reels inline. | Instagram oEmbed requires a registered Facebook app, app review/approval, access token, and the endpoint has CORS restrictions that prevent client-side calls. This contradicts the "no backend" constraint. Even with a token, rate limits apply and tokens expire. The old unauthenticated endpoint was removed April 2025. | Link to Instagram posts from other feed sources (Reddit posts often link to Instagram). Show Instagram thumbnails/previews without embedding. Consider Instagram as a future feature requiring backend support. |
| Weverse content integration | Weverse is THE official BTS fan platform with artist posts, fan community, and exclusive content. | Weverse has NO public API, NO RSS feeds, and NO oEmbed support. The only known scraping approach requires: (1) a user session bearer token, (2) a dynamically-extracted secret key from Weverse's JS bundle, (3) HMAC-SHA1 signature generation, and (4) the secret key changes periodically. This is reverse-engineering a private API -- fragile, possibly violates ToS, and impossible client-side without exposing auth tokens. The 2022 scraping gist is likely broken by now. | Link out to Weverse (the BTS community page is public at `weverse.io/bts/feed`). Include a "Weverse" button/section that deep-links to the app/site. Do NOT attempt to scrape or aggregate Weverse content. |
| Direct TikTok feed scraping | Users want a live TikTok feed of BTS content, not just embeds of known URLs. | TikTok actively blocks scraping. Their web pages require JavaScript execution, use anti-bot measures, and have no public feed API. The For You algorithm is session-based and not reproducible. Even with a CORS proxy, you get anti-scraping HTML, not content. | Embed TikTok videos that surface through other sources (Reddit, Twitter). Allow users to paste TikTok URLs for embedding. Curate a list of popular BTS TikTok creators in config and link out to their profiles. |
| Real-time feed updates (WebSocket/polling) | "Live" feed sounds exciting. | The app has no backend. Polling every source every 30 seconds through CORS proxies would hit rate limits, waste bandwidth, and likely get the proxy IPs blocked. The 5-minute TTL cache is already appropriate for aggregated fan content. | Keep the 5-minute cache with manual refresh button (already implemented). Consider reducing TTL to 3 minutes if users want fresher content. |
| Multi-group support in single instance | "Support all K-pop groups in one app" | Config-driven is specifically designed for clone-and-swap, not multi-tenant. Multi-group would require: routing/navigation per group, merged-but-filterable feeds, member profiles per group, and massively increased API/proxy load. This is a different product. | Ship config-driven single-group. Each fandom gets its own deployed instance. Share the config template so anyone can create a new group's instance. |

## Feature Dependencies

```
[Config-Driven Architecture]
    |
    |--enables--> [Expanded Reddit Sources] (subreddit list moves to config)
    |--enables--> [Fan YouTube Channels] (channel ID list moves to config)
    |--enables--> [Tumblr Integration] (blog names + tags move to config)
    |--enables--> [TikTok Embed URLs] (curated URL lists or creator lists in config)
    |--enables--> [Member Keywords] (keyword lists per member move to config)
    |
    +--required-by--> [Clone-and-Swap for Other Fandoms]

[FeedItem Type Extension]
    |
    |--required-by--> [Reddit Engagement Stats] (add score, commentCount, upvoteRatio)
    |--required-by--> [YouTube View Count] (add viewCount)
    |--required-by--> [Source Type Expansion] (add "tumblr" | "tiktok" to FeedSource)
    |
    +--required-by--> [FeedCard UI Updates] (display engagement stats)

[FeedCard UI Updates]
    |--requires--> [FeedItem Type Extension]
    |--enhances--> [Reddit Engagement Stats]
    |--enhances--> [YouTube View Count]

[Tumblr RSS Integration]
    |--reuses--> [Existing RSS Parse Pipeline] (parseRSS in xmlParser.ts)
    |--reuses--> [Existing CORS Proxy Chain] (fetchWithProxy)
    |--requires--> [FeedItem Type Extension] (new "tumblr" source type)
    |--requires--> [Config-Driven Architecture] (blog names in config)

[TikTok oEmbed Embeds]
    |--independent-of--> [TikTok Feed Source] (embeds known URLs, doesn't discover them)
    |--requires--> [FeedItem Type Extension] (new "tiktok" source type or embed URL field)
    |--performance-concern--> [embed.js loading] (8-12MB per embed)

[YouTube Shorts Embeds]
    |--reuses--> [Existing YouTube Embed Pattern] (SwipeFeed iframe approach)
    |--requires--> [URL Detection/Rewriting] (/shorts/ -> /embed/)
```

### Dependency Notes

- **Config-Driven Architecture is the foundation**: Nearly every new feature involves adding configurable data (subreddit names, channel IDs, blog names, curated URLs). Building features first then extracting to config means doing the work twice. Extract to config first.
- **FeedItem Type Extension is the data backbone**: Adding engagement fields (`score`, `commentCount`, `viewCount`) and new source types (`tumblr`, `tiktok`) to the `FeedItem` interface is a prerequisite for both data fetching and UI display.
- **Tumblr reuses existing infrastructure**: The RSS parsing and CORS proxy pipeline already handles Soompi and AllKPop. Tumblr RSS uses the same format. This is the lowest-friction new source to add.
- **TikTok embeds are independent of feed discovery**: You do not need a TikTok feed source to embed TikTok videos. Reddit posts frequently link to TikTok. Detecting TikTok URLs in Reddit post URLs and rendering them as embeds is viable without any TikTok API.
- **YouTube view counts conflict with "no API key" simplicity**: Adding view counts is the one feature that introduces API key management into an otherwise key-free app. Make it optional.

## MVP Definition

### Launch With (v1)

Minimum viable expansion -- highest value, lowest risk, builds on existing patterns.

- [ ] **Config-driven architecture** -- Extract all BTS-specific data to a single config file. This is the prerequisite for everything else and delivers the clone-and-swap promise. Refactor `feeds.ts`, `feed.ts`, `members.ts`, and source URLs.
- [ ] **Reddit engagement stats** -- Map `score` and `num_comments` from the already-fetched Reddit JSON into `FeedItem`. Display on FeedCard. Zero additional API calls.
- [ ] **Expanded Reddit sources** -- Add meme and discussion subreddits to the config. Existing `fetchSubreddit()` handles it.
- [ ] **Fan YouTube channels** -- Add fan channel IDs to the config. Existing `fetchYouTubeChannel()` handles it.
- [ ] **Tumblr fan content** -- Add Tumblr RSS feeds using the existing `parseRSS` + CORS proxy pipeline. Curate 3-5 popular BTS fan blogs in config.
- [ ] **FeedItem type extension** -- Add optional `score`, `commentCount`, `upvoteRatio` fields and expand `FeedSource` to include `"tumblr"`.

### Add After Validation (v1.x)

Features to add once the core expansion is working and the config pattern is proven.

- [ ] **TikTok URL detection and embed** -- Detect TikTok URLs in Reddit posts and render as lazy-loaded embeds. Use `react-social-media-embed` or a custom lazy wrapper to manage the 8-12MB per embed performance cost. Trigger: Reddit feed is working and users want richer media.
- [ ] **YouTube Shorts vertical rendering** -- Detect `/shorts/` URLs, rewrite to `/embed/`, render in vertical-aspect iframe. Trigger: fan YouTube channels are added and Shorts content is common.
- [ ] **YouTube inline embed in list view** -- Port the iframe embed pattern from SwipeFeed to FeedCard for YouTube items. Trigger: users want to watch videos without leaving the feed.
- [ ] **YouTube view counts (optional API key)** -- Add optional YouTube Data API v3 key to config. If present, enrich YouTube FeedItems with view counts via a batch `videos.list` call. If absent, display without counts. Trigger: users want to sort/filter by popularity.

### Future Consideration (v2+)

Features to defer until the ecosystem is mature.

- [ ] **Instagram content** -- Requires backend for oEmbed token management. Defer until/unless the "no backend" constraint is relaxed.
- [ ] **Weverse content** -- No viable integration path exists. Revisit only if Weverse releases a public API.
- [ ] **Cross-source engagement normalization** -- Reddit scores, YouTube views, and Tumblr notes are different scales. A normalized "popularity" score for cross-source sorting would be useful but requires tuning.
- [ ] **Additional Tumblr via v1 API** -- Richer metadata (note counts, post types, reblog info) via `{blogname}.tumblr.com/api/read` without authentication. Adds complexity but enables better Tumblr cards.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| Config-driven architecture | HIGH | MEDIUM | P1 | Nothing (enables everything) |
| Reddit engagement stats | HIGH | LOW | P1 | FeedItem type extension |
| Expanded Reddit sources | MEDIUM | LOW | P1 | Config-driven architecture |
| Fan YouTube channels | MEDIUM | LOW | P1 | Config-driven architecture |
| Tumblr fan content (RSS) | MEDIUM | LOW | P1 | Config, FeedItem type extension |
| FeedItem type extension | HIGH | LOW | P1 | Nothing (data model change) |
| TikTok URL embeds | MEDIUM | MEDIUM | P2 | Performance management |
| YouTube Shorts rendering | MEDIUM | LOW-MEDIUM | P2 | Fan YouTube channels |
| YouTube inline embed (list view) | LOW | LOW | P2 | Existing YouTube sources |
| YouTube view counts | LOW | HIGH | P3 | Optional API key in config |
| Instagram embeds | MEDIUM | HIGH | P3 | Backend (breaks constraint) |
| Weverse content | HIGH (users want it) | IMPOSSIBLE (client-side) | P3 | Public API (does not exist) |

**Priority key:**
- P1: Must have for this milestone -- delivers core value, low risk
- P2: Should have -- adds richness, moderate effort
- P3: Nice to have or blocked -- defer to future

## Competitor Feature Analysis

| Feature | TheQoos | Kpop Amino | Reddit (direct) | Our Approach |
|---------|---------|------------|-----------------|--------------|
| Multi-source feed | News + Twitter + some community | User-generated only | Single platform | 7+ sources in one feed (Reddit, YouTube, Tumblr, news, Twitter) |
| Engagement stats | Not visible on cards | Likes within platform | Native (upvotes, comments) | Surface native engagement per source on cards |
| Short-form video | Not embedded | Not embedded | Link out | Lazy-loaded TikTok embeds, YouTube Shorts inline |
| Member filtering | Group-level only | Community-based | Manual search | Keyword-based bias filter across all sources |
| Fan content (Tumblr) | Not included | Not included | Not included | RSS-based Tumblr fan blog integration |
| Fandom portability | Multi-group built-in | Multi-group built-in | N/A | Config-driven clone-and-swap (different product model) |
| Weverse content | Not included | Not included | Fan screenshots only | Link out only (no viable integration) |
| Offline/PWA | No | Native app | No | PWA with feed caching (existing) |

## Technical Implementation Notes

### Reddit Engagement Stats

The data is already being fetched. In `fetchSubreddit()`, the response `d = post.data` contains:
- `d.score` -- net upvotes (already fuzzed by Reddit)
- `d.num_comments` -- comment count
- `d.upvote_ratio` -- ratio of upvotes to total votes (0.0 to 1.0)

These just need to be added to the `FeedItem` push and displayed in the card UI.

**Confidence: HIGH** -- Verified from Reddit JSON API documentation and the existing code.

### Tumblr RSS Integration

URL pattern: `https://{blogname}.tumblr.com/rss` for all posts, `https://{blogname}.tumblr.com/tagged/{tag}/rss` for tagged posts.

The existing `parseRSS()` function in `xmlParser.ts` handles standard RSS. Tumblr RSS feeds are standard RSS 2.0. The `fetchWithProxy()` pipeline handles CORS. This is functionally identical to how Soompi and AllKPop are already fetched.

For richer data, Tumblr's v1 API at `https://{blogname}.tumblr.com/api/read` works without authentication for public blogs and returns post metadata including note counts.

**Confidence: HIGH** -- RSS format verified, v1 API auth-free access confirmed by multiple sources.

### TikTok oEmbed

Endpoint: `GET https://www.tiktok.com/oembed?url={video_url}` -- no authentication required.

Returns JSON with `html` field containing blockquote + script tag for rendering. The script (`embed.js`) must be loaded/reloaded for each embed. Performance cost is severe: 500KB JS + 3-5MB images + video = 8-12MB per embed.

The `react-social-media-embed` package (36K weekly npm downloads) wraps TikTok, Instagram, YouTube, and others with automatic retry and no API token requirement. It handles the script loading lifecycle.

**Confidence: MEDIUM** -- oEmbed endpoint is confirmed auth-free. Performance concerns are well-documented. The CORS proxy behavior for the oEmbed endpoint itself needs testing (the oEmbed returns JSON, but the blockquote HTML loads resources directly from TikTok which does not go through CORS proxy).

### Instagram oEmbed (Anti-Feature Rationale)

As of April 2025, Instagram oEmbed requires:
1. Registered Facebook Developer account
2. Registered Facebook App with oEmbed Read capability
3. App review and approval by Meta
4. Access token (App ID + Client Token) sent with every request
5. Server-side call (CORS restrictions on the endpoint)

This fundamentally requires a backend, violating the project's core constraint.

**Confidence: HIGH** -- Confirmed by Meta documentation, multiple GitHub issues, and community reports.

### Weverse Integration (Anti-Feature Rationale)

Weverse is a closed platform by HYBE Corporation with:
- No public API
- No RSS feeds
- No oEmbed support
- Active anti-scraping measures
- HMAC-authenticated private API with rotating secret keys

The only known scraping approach (from 2022) required extracting secret keys from Weverse's JavaScript bundles, generating HMAC-SHA1 signatures, and using bearer tokens from authenticated sessions. This is likely broken and definitely not viable for a client-side app.

**Confidence: HIGH** -- Confirmed by developer community analysis, the Xetera GitHub gist documenting the HMAC approach, and Weverse's documented platform control strategy.

### Config-Driven Architecture

The refactoring scope based on codebase analysis:

| File | What to Extract | Config Field |
|------|----------------|--------------|
| `feeds.ts` line 5 | `BTS_KEYWORDS` regex | `config.keywords` (build regex from array) |
| `feeds.ts` lines 42-47 | Subreddit names + filter flags | `config.reddit.subreddits` |
| `feeds.ts` lines 89-92 | YouTube channel IDs + names | `config.youtube.channels` |
| `feeds.ts` lines 108-109 | News feed URLs (Soompi) | `config.news.feeds` |
| `feeds.ts` line 132 | News feed URLs (AllKPop) | `config.news.feeds` |
| `feed.ts` lines 17-25 | `MEMBER_KEYWORDS` | `config.members[].keywords` |
| `members.ts` all | Member profiles | `config.members[].profile` |
| `data/events.ts` | Tour/event data | `config.events` |

The config would be a single TypeScript file exporting a typed object. New sources (Tumblr blogs, TikTok creator lists) would be additional config fields.

**Confidence: HIGH** -- Based on direct codebase analysis.

## Sources

- [TikTok oEmbed API Documentation](https://developers.tiktok.com/doc/embed-videos/) -- oEmbed endpoint, no auth required
- [Reddit JSON API Wiki](https://github.com/reddit-archive/reddit/wiki/JSON) -- Response structure with score, num_comments
- [Tumblr v1 API without auth](https://alexwlchan.net/til/2025/tumblr-api-sans-auth/) -- Confirmed v1 API works unauthenticated
- [Tumblr API v2 Documentation](https://www.tumblr.com/docs/en/api/v2) -- v2 requires OAuth
- [Instagram oEmbed access token requirement](https://github.com/spicywebau/craft-embedded-assets/issues/150) -- Confirmed token required since Oct 2020, old endpoint removed April 2025
- [Weverse HMAC scraping gist](https://gist.github.com/Xetera/d50af9c42615d66d55755b3708c2a70e) -- Documents complexity of Weverse private API
- [react-social-media-embed](https://github.com/justinmahar/react-social-media-embed) -- React component for TikTok/Instagram/YouTube embeds, 36K weekly downloads
- [TikTok embed performance analysis](https://justinribeiro.com/chronicle/2022/07/15/terrible-tiktok-embed-web-performance-and-my-imperfect-web-component-solution/) -- 8-12MB per embed documented
- [YouTube Embedded Players documentation](https://developers.google.com/youtube/player_parameters) -- iframe embed parameters
- [YouTube Data API v3](https://developers.google.com/youtube/v3) -- View counts require API key, 10K daily quota
- [BTS Fan YouTube Channels list](https://videos.feedspot.com/bts_youtube_channels/) -- 70+ notable fan channels
- [Reddit JSON API data fields](https://www.jcchouinard.com/documentation-on-reddit-apis-json/) -- Detailed field documentation

---
*Feature research for: BTS Army Feed Expansion -- feed expansion and config-driven architecture*
*Researched: 2026-02-25*
