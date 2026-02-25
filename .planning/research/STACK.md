# Stack Research

**Domain:** Fan content aggregator -- feed expansion (engagement stats, short-form video embeds, new sources, config-driven architecture)
**Researched:** 2026-02-25
**Confidence:** HIGH (core stack) / MEDIUM (embed strategies) / LOW (Weverse feasibility)

## Existing Stack (DO NOT CHANGE)

Already validated. Listed for reference only -- these are not recommendations, they are facts.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.1 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |

## Recommended Stack Additions

### Social Media Embeds

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `react-social-media-embed` | ^2.5.18 | Embed TikTok, Instagram, YouTube Shorts content inline | No API tokens required for any platform. Supports all three target platforms (TikTok, Instagram, YouTube). React 19 compatible (peer deps explicitly include ^19.0.0). Single dependency instead of three separate embed libraries. Wraps platform embed scripts (TikTok embed.js, Instagram embed.js, YouTube iframe API) in React components with proper lifecycle management. |

**Components used:**
- `<TikTokEmbed url={...} />` -- renders TikTok's blockquote + embed.js player
- `<InstagramEmbed url={...} />` -- renders Instagram blockquote + embed.js (works for Reels, no Meta API token needed for client-side blockquote approach)
- `<YouTubeEmbed url={...} />` -- renders YouTube iframe (works with Shorts video IDs via standard `/embed/{id}` URL)

**Why this over manual embed implementation:**
The app already has a YouTube iframe embed in `SwipeFeed.tsx`. For TikTok and Instagram, the embed lifecycle (loading platform JS, processing blockquotes, handling script re-initialization on SPA navigation) is tricky to get right. `react-social-media-embed` handles this correctly. The alternative is managing three platform embed scripts manually, which is error-prone in a React SPA where DOM nodes are created/destroyed by the virtual DOM.

**Confidence:** MEDIUM -- Library has 311 GitHub stars and last published ~1 year ago. The underlying platform embed scripts (TikTok embed.js, Instagram embed.js) are maintained by the platforms themselves. If the library becomes unmaintained, the fallback is straightforward: manually load platform embed scripts and render blockquote HTML. The library is thin enough that this migration would be low-effort.

### HTML Sanitization

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `dompurify` | ^3.3.1 | Sanitize HTML from RSS feeds and scraped content | The existing `stripHtml` function in `feeds.ts` uses `div.innerHTML = html` which is a known XSS vector (noted in PROJECT.md codebase audit). DOMPurify is the industry standard -- DOM-only, no dependencies, 3KB gzipped, TypeScript types bundled. Needed now because new sources (Tumblr HTML-rich RSS, Reddit selftext HTML) increase the attack surface. |

**Integration point:** Replace `stripHtml()` in `src/services/feeds.ts` and use for any new HTML content from Tumblr RSS or other sources.

**Confidence:** HIGH -- DOMPurify is the standard. 14K+ GitHub stars, actively maintained by cure53 (a security audit firm), bundled TypeScript types.

### No Other New Dependencies Required

Everything else the milestone needs can be built with the existing stack plus browser APIs. See "What NOT to Add" below for rationale.

## Installation

```bash
# New dependencies
npm install react-social-media-embed dompurify

# TypeScript types (DOMPurify bundles its own; react-social-media-embed has types)
# No @types packages needed
```

Total addition: 2 packages. Keeps the dependency footprint minimal.

## Platform-Specific Technical Details

### Engagement Stats Extraction (No New Dependencies)

Engagement stats come from the data sources themselves. No new libraries needed.

| Source | How Stats Are Available | Fields | Implementation |
|--------|------------------------|--------|----------------|
| **Reddit** | Already in `.json` response | `score`, `upvote_ratio`, `num_comments` | Add fields to `fetchSubreddit()` -- data is in `post.data` already being parsed. Zero additional fetches. |
| **YouTube (Atom feed)** | NOT in Atom feed | None in feed | YouTube Atom feeds (`/feeds/videos.xml`) do not include view/like counts. Two options below. |
| **YouTube (oEmbed)** | `https://www.youtube.com/oembed?url={videoUrl}` | `title`, `author_name`, `thumbnail_url` | No auth required. No engagement stats in response either. Useful for metadata but NOT for view counts. |
| **YouTube (Data API v3)** | `videos.list?part=statistics&id={videoId}` | `viewCount`, `likeCount`, `commentCount` | Requires free API key from Google Cloud Console. 10,000 units/day quota (1 unit per read). Key is safe to expose client-side (restricted by HTTP referrer). |
| **Soompi/AllKPop RSS** | Not available | None | News RSS feeds don't include engagement metrics. Skip -- news articles don't benefit from view counts. |
| **Tumblr RSS** | `note_count` in some feeds | Notes count | Available in some Tumblr RSS feeds as a custom element. Parse if present, treat as optional. |
| **Twitter/Nitter** | Not reliably available | None | Nitter HTML scraping is already fragile. Adding engagement stat scraping would increase fragility. Skip. |

**YouTube Stats Decision:**
Use the YouTube Data API v3 for view/like counts. This is the only reliable path. The API key is free, the quota (10,000 units/day) is more than sufficient for a fan app fetching stats on ~15-30 videos per refresh. The key can be restricted to the app's domain via Google Cloud Console referrer restrictions, making it safe for client-side use.

This is the ONE case where an API key is needed. Store it in the config object (see Config-Driven Architecture below) so it can be swapped per clone. Do NOT hardcode it.

**Confidence:** HIGH for Reddit (verified -- the fields exist in the JSON response the app already parses). MEDIUM for YouTube Data API (well-documented, but adds API key management complexity). HIGH for "skip news/Twitter" (no viable path).

### TikTok Embed (via react-social-media-embed)

**How it works:** TikTok provides a free, unauthenticated oEmbed endpoint at `https://www.tiktok.com/oembed?url={videoUrl}`. The response includes HTML with a `<blockquote class="tiktok-embed">` element. The platform's `embed.js` script processes this into an interactive player. `react-social-media-embed` handles the script loading and lifecycle.

**Feed item source:** TikTok content will come from manually curated URLs in the config (fan-discovered viral BTS TikToks) or from fan translation Twitter accounts that share TikTok links. There is no TikTok RSS feed or public API for searching. This is an embed-only feature -- the app renders TikTok embeds for items that have a TikTok URL, not a TikTok feed fetcher.

**No authentication required.** No API keys. No rate limits documented for the oEmbed endpoint.

**Confidence:** HIGH -- TikTok oEmbed is well-documented and unauthenticated.

### Instagram Reels Embed (via react-social-media-embed)

**Critical finding:** Meta retired unauthenticated oEmbed in April 2025. The official Meta oEmbed Read API now requires a Facebook Developer app, app review, and access tokens.

**However:** The client-side blockquote approach still works. By rendering a `<blockquote class="instagram-media" data-instgrm-permalink="{url}">` element and loading Instagram's `embed.js` script, public posts (including Reels) render without any API token. This is what `react-social-media-embed`'s `<InstagramEmbed>` component does internally.

**Risk:** Meta could break the client-side blockquote approach at any time, since it's the embed script (not a sanctioned API) doing the work. The oEmbed API change in 2025 signals Meta is tightening control. Treat Instagram embeds as a "nice to have" that may degrade.

**Feed item source:** Same as TikTok -- curated URLs in config or discovered via fan accounts. No Instagram feed scraping (blocked by Meta, and explicitly out of scope per PROJECT.md).

**Confidence:** MEDIUM -- Works today via blockquote approach, but Meta's track record suggests potential future breakage.

### YouTube Shorts Embed (via existing iframe pattern)

**How it works:** YouTube Shorts use the same video ID system as regular YouTube videos. The existing `SwipeFeed.tsx` already embeds YouTube videos via `https://www.youtube.com/embed/{videoId}`. Shorts work with the exact same URL pattern. The only difference is aspect ratio: Shorts are 9:16 (315x560px optimal) vs regular videos at 16:9.

**No new library needed for embedding.** The existing iframe approach works. `react-social-media-embed` provides a `<YouTubeEmbed>` but it's optional -- the existing code already handles this.

**What's needed:** Detection of whether a YouTube URL is a Short (URL contains `/shorts/`), and if so, render with vertical aspect ratio instead of horizontal.

**Confidence:** HIGH -- YouTube's embed system is stable and well-documented.

### Tumblr Integration (No New Dependencies)

**How it works:** Every public Tumblr blog exposes an RSS feed at `https://{blogname}.tumblr.com/rss`. Tagged feeds are available at `https://{blogname}.tumblr.com/tagged/{tag}/rss`. The feed format is standard RSS 2.0 XML with full HTML content in `<description>` elements.

**Integration point:** The existing `parseRSS()` function in `src/utils/xmlParser.ts` already handles RSS 2.0 XML. Tumblr feeds can be fetched and parsed identically to Soompi/AllKPop feeds. Use DOMPurify on the HTML content (Tumblr descriptions are rich HTML with images, embeds, and formatting).

**No new dependencies.** The existing CORS proxy chain + RSS parser handles this.

**Confidence:** HIGH -- Tumblr RSS is a long-standing, stable feature. Standard RSS format.

### Weverse Content (INFEASIBLE for Client-Side)

**Critical finding:** Weverse requires authentication for ALL content. There is no public RSS feed, no public API, and no anonymous web access. The internal API uses HMAC-SHA1 authentication with dynamically extracted secret keys from their JavaScript bundles. This is fundamentally server-side work requiring:
1. A Weverse account
2. Bearer token authentication
3. Dynamic secret extraction from JS bundles
4. HMAC-SHA1 signature generation per request

**This cannot be done client-side.** CORS would block the API calls, and the auth flow requires server-side secret management.

**Recommended alternative:** Instead of direct Weverse integration, aggregate Weverse content indirectly through:
1. **Fan translation Twitter/X accounts** (e.g., @BTSWeverseTrans, @BTS_Trans) -- these accounts post Weverse content translations in near-real-time
2. **Fan blogs on Tumblr/WordPress** (e.g., doyoubangtan.wordpress.com) that archive Weverse translations
3. Mark these as "Weverse (via fan translation)" in the source attribution

This is the pragmatic approach given the no-backend constraint. These fan accounts are a core part of BTS fandom infrastructure and have been reliably active for years.

**Confidence:** HIGH that direct Weverse integration is infeasible client-side. MEDIUM that fan translation accounts are a viable alternative (they're community-maintained, not guaranteed).

### Fan YouTube Channels (No New Dependencies)

**How it works:** The existing `fetchYouTubeChannel()` function in `feeds.ts` already supports fetching any channel's Atom feed via `https://www.youtube.com/feeds/videos.xml?channel_id={id}`. Adding fan channels is purely a configuration change -- add channel IDs to the config, set `needsFilter: false` (fan channels are already BTS-focused).

**No new dependencies.** No code changes needed beyond config-driven refactoring.

**Confidence:** HIGH -- this is existing proven functionality.

### Expanded Reddit Sources (No New Dependencies)

**How it works:** The existing `fetchSubreddit()` function already supports any subreddit with optional keyword filtering. Adding meme subreddits (e.g., r/btsmemes, r/heungtan) or fan discussion subreddits is purely a configuration change.

**No new dependencies.** No code changes needed beyond config-driven refactoring.

**Confidence:** HIGH -- this is existing proven functionality.

### Config-Driven Architecture (No New Dependencies)

**Pattern:** Create a single TypeScript config object that contains ALL group-specific data. No JSON file needed -- TypeScript gives you type checking, autocomplete, and compile-time validation.

**Config structure (recommended):**

```typescript
// src/config/group.ts
export interface GroupConfig {
  name: string;
  hashtag: string;
  keywords: RegExp;
  members: MemberConfig[];
  sources: {
    reddit: SubredditConfig[];
    youtube: YouTubeChannelConfig[];
    news: RSSSourceConfig[];
    tumblr: TumblrBlogConfig[];
    twitter: TwitterSearchConfig[];
    embeds: EmbedConfig[];  // curated TikTok/Instagram URLs
  };
  apiKeys?: {
    youtubeDataApi?: string;  // optional, for engagement stats
  };
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}
```

**What gets extracted from current hardcoded values:**
- `BTS_KEYWORDS` regex in `feeds.ts` --> `config.keywords`
- Subreddit array in `fetchReddit()` --> `config.sources.reddit`
- Channel IDs in `fetchYouTube()` --> `config.sources.youtube`
- News RSS URLs in `fetchNews()`/`fetchAllKPop()` --> `config.sources.news`
- `MEMBER_KEYWORDS` in `feed.ts` --> `config.members[].keywords`
- Member data in `members.ts` --> `config.members[]`
- `BiasId` type --> derived from config members

**Implementation approach:**
1. Define `GroupConfig` interface with full typing
2. Create `src/config/bts.ts` that exports the BTS-specific config
3. Create `src/config/index.ts` that re-exports the active config
4. Refactor `feeds.ts` to accept config as parameter instead of using hardcoded values
5. Refactor `feed.ts` types to be derived from config
6. Refactor `members.ts` to use config data

**Why TypeScript over JSON:** The config contains RegExp patterns, which can't be represented in JSON. TypeScript also gives you type checking at build time -- if a config is missing a required field, the build fails. JSON would require runtime validation.

**No new dependencies.** TypeScript is already in the stack.

**Confidence:** HIGH -- this is a well-understood refactoring pattern.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `react-social-media-embed` | Manual embed script management | Manual approach requires handling script loading, DOM mutations, and SPA lifecycle for 3 platforms. Library is thin and handles this correctly. |
| `react-social-media-embed` | `react-lite-youtube-embed` + separate TikTok/IG libs | Would need 3 separate libraries. `react-social-media-embed` covers all three with one dependency. |
| `dompurify` | `sanitize-html` | `sanitize-html` is 10x larger (it bundles a full HTML parser for Node). DOMPurify uses the browser's native DOMParser -- smaller, faster, browser-native. |
| `dompurify` | Built-in browser Sanitizer API | The Sanitizer API is still experimental and not available in all browsers (no Safari support). DOMPurify is the safe choice until Sanitizer API stabilizes. |
| YouTube Data API v3 (for stats) | Scraping YouTube pages for view counts | YouTube aggressively blocks scraping. The Data API is free, has generous quotas, and is the sanctioned approach. |
| YouTube Data API v3 | YouTube oEmbed for stats | YouTube oEmbed does NOT return engagement stats (views, likes). It only returns embed HTML and basic metadata. |
| TypeScript config file | JSON config file | Config contains RegExp patterns, which JSON cannot represent. TypeScript gives compile-time type checking. |
| Fan translation accounts for Weverse | Direct Weverse scraping | Weverse requires auth, HMAC signatures, and server-side access. Impossible client-side. Fan accounts are the established fandom pattern. |
| Skip Instagram oEmbed API | Use Meta oEmbed Read API | Requires Facebook Developer app, app review, and access tokens. Impossible for a client-side-only app without a backend to proxy tokens. The blockquote approach works without tokens. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `axios` | The app uses native `fetch` via `fetchWithProxy()`. Adding axios would create two HTTP patterns. | Native `fetch` (already working) |
| `@tanstack/react-query` | The `useFeed` hook already handles caching, loading states, and error handling adequately. Adding a query library for this milestone adds complexity without proportional benefit. Consider for a future milestone if feed source count exceeds 10+. | Existing `useFeed` hook pattern |
| `cheerio` / HTML parsing libraries | Runs in Node, not the browser. The app uses `DOMParser` (browser-native) for XML/HTML parsing. | Browser-native `DOMParser` (already in use) |
| `weverse` npm package | Requires server-side execution, authentication tokens, and HMAC secret management. Not viable client-side. | Fan translation accounts via existing Twitter/RSS scraping |
| `tiktok-api` npm package | Server-side only, requires authentication. The oEmbed approach is client-side friendly and sufficient for embeds. | TikTok oEmbed via `react-social-media-embed` |
| Any state management library (Redux, Zustand, Jotai) | Current app state is simple: feed items, loading, error, filter. React's built-in useState/useEffect handles this fine. Config is static -- no need for global state management. | React built-in state |
| `zod` or `joi` for config validation | Config is a TypeScript file with typed interface. The compiler validates it at build time. Runtime validation is unnecessary for a static config. | TypeScript interface + compiler |

## Stack Patterns by Feature

**If adding a new RSS-based source (Tumblr, fan blogs):**
- Use existing `parseRSS()` from `xmlParser.ts`
- Fetch via existing `fetchWithProxy()` from `corsProxy.ts`
- Sanitize HTML content with `DOMPurify.sanitize()`
- Add source config to `GroupConfig.sources`

**If adding a new embed type (future platforms):**
- Check if `react-social-media-embed` supports it (currently: Facebook, Instagram, LinkedIn, Pinterest, TikTok, X, YouTube)
- If supported, add a new embed component following the existing pattern
- If not, implement the platform's embed script manually (load script, render blockquote, call process)

**If adding a new JSON API source (like Reddit):**
- Fetch via `fetchWithProxy()`, parse with `JSON.parse()`
- Extract engagement stats from response
- Add source config to `GroupConfig.sources`

**If YouTube stats quota becomes a concern (unlikely for fan app scale):**
- Batch video IDs into single API calls (`videos.list` accepts comma-separated IDs, up to 50)
- Cache stats with longer TTL than feed items (stats don't change as fast)
- 10,000 units/day = 10,000 video stat lookups/day -- more than enough

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react-social-media-embed@^2.5.18` | `react@^19.2.0` | Explicit React 19 support in peer deps |
| `dompurify@^3.3.1` | Any (no framework deps) | Zero dependencies, browser-native DOMParser |
| YouTube Data API v3 | Browser `fetch` | REST API, no SDK needed. Direct fetch calls with API key as query param |
| TikTok oEmbed | Browser `fetch` | REST endpoint, no auth, CORS-friendly |
| YouTube oEmbed | Browser `fetch` | REST endpoint, no auth, CORS-friendly |

## New API Keys Required

| Key | Source | Cost | Client-Safe? | How to Restrict |
|-----|--------|------|--------------|-----------------|
| YouTube Data API v3 | Google Cloud Console | Free (10K units/day) | Yes | HTTP referrer restriction in Google Cloud Console. Restrict to your deployed domain. |

No other API keys needed. TikTok oEmbed and YouTube oEmbed are unauthenticated. Instagram embed uses client-side blockquote approach (no token). Reddit `.json` endpoint is unauthenticated.

## Sources

- [TikTok oEmbed Documentation](https://developers.tiktok.com/doc/embed-videos/) -- oEmbed endpoint, no auth required (HIGH confidence)
- [YouTube oEmbed](https://queen.raae.codes/2022-01-21-yt-oembed/) -- Endpoint format, no auth, no engagement stats in response (HIGH confidence)
- [YouTube Data API v3 - videos.list](https://developers.google.com/youtube/v3/docs/videos/list) -- Statistics part, quota costs (HIGH confidence)
- [YouTube Data API Quota System](https://docs.expertflow.com/cx/4.9/understanding-the-youtube-data-api-v3-quota-system) -- 10K units/day default, 1 unit per read (HIGH confidence)
- [Meta oEmbed Read changes](https://www.bluehost.com/blog/meta-oembed-read-explained/) -- Retired unauthenticated oEmbed April 2025 (HIGH confidence)
- [Instagram client-side embed approach](https://dev.to/ljcdev/embedding-an-instagram-post-in-your-website-3666) -- Blockquote + embed.js still works for public posts including Reels (MEDIUM confidence)
- [react-social-media-embed](https://github.com/justinmahar/react-social-media-embed) -- v2.5.18, React 19 compatible, no API tokens (MEDIUM confidence, library age)
- [DOMPurify](https://github.com/cure53/DOMPurify) -- v3.3.1, bundled TypeScript types, zero deps (HIGH confidence)
- [Weverse scraping via HMAC](https://gist.github.com/Xetera/d50af9c42615d66d55755b3708c2a70e) -- Requires server-side, auth tokens, HMAC signatures (HIGH confidence it's infeasible client-side)
- [Reddit JSON API fields](https://www.jcchouinard.com/documentation-on-reddit-apis-json/) -- score, num_comments, upvote_ratio available (HIGH confidence)
- [Tumblr RSS format](https://rss.feedspot.com/tumblr_rss_feeds/) -- Standard RSS at `{blog}.tumblr.com/rss` (HIGH confidence)
- [YouTube Shorts embedding](https://docs.document360.com/docs/embed-youtube-shorts) -- Same `/embed/{id}` pattern, 9:16 aspect ratio (HIGH confidence)

---
*Stack research for: BTS Army Feed Expansion v1.0*
*Researched: 2026-02-25*
