# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Social Media & Content Platforms:**
- Reddit - Real-time community discussions and BTS fan posts
  - Integration: Direct API calls via feed proxy to `https://www.reddit.com/r/{subreddit}/hot.json?limit=15`
  - Subreddits fetched: `bangtan`, `kpop`, `heungtan`, `bts7`
  - Implementation: `src/services/feeds.ts` - `fetchSubreddit()`, `fetchReddit()` functions
  - Filter: BTS keyword matching applied to kpop subreddit

- YouTube - Official BTS and HYBE channel feeds
  - Integration: Atom XML feed parsing from `https://www.youtube.com/feeds/videos.xml?channel_id={channelId}`
  - Channels: BANGTANTV (UCLkAepWjdylmXSltofFvsYQ), HYBE LABELS (UCx2hOXK_cGnRolCRilNUfA)
  - Implementation: `src/services/feeds.ts` - `fetchYouTubeChannel()`, `fetchYouTube()` functions
  - Thumbnail generation: Uses YouTube thumbnail URL pattern `https://img.youtube.com/vi/{videoId}/mqdefault.jpg`

- Twitter/X - Real-time tweets via Nitter (privacy-focused proxy)
  - Integration: HTML scraping of `https://nitter.net/search?q=BTS&f=tweets`
  - Implementation: `src/services/feeds.ts` - `fetchTwitter()` function
  - Parsing: Regex extraction of tweet content, links, and usernames from Nitter HTML
  - Output links: Redirects to `https://x.com/{username}/status/{tweetId}`

**News Aggregators:**
- Soompi - K-pop and K-drama news
  - Integration: RSS feed from `https://www.soompi.com/feed`
  - Implementation: `src/services/feeds.ts` - `fetchNews()` function
  - Filter: BTS keyword matching applied to all items

- AllKPop - K-pop industry news
  - Integration: RSS feed from `https://www.allkpop.com/feed`
  - Implementation: `src/services/feeds.ts` - `fetchAllKPop()` function
  - Filter: BTS keyword matching applied to all items

## Data Storage

**Local Storage:**
- Uses browser LocalStorage API
  - Cache key: `bts-feed-cache`
  - TTL: 5 minutes
  - Purpose: Caching feed items to reduce API calls
  - Implementation: `src/hooks/useFeed.ts` - `getCache()`, `setCache()` functions
  - Fallback: Stale cache used if live fetch fails

**Databases:**
- None - All data is either hardcoded (members, events) or fetched from external sources

**File Storage:**
- Local public assets only (`/public/members/` directory contains member photos)
- Static manifest.json for PWA configuration

**Caching:**
- Browser LocalStorage with 5-minute TTL for feed items
- Service Worker caching via vite-plugin-pwa (auto-update mode in `vite.config.ts`)

## Authentication & Identity

**Auth Provider:**
- None - Application is fully public with no user authentication
- No login or user state management

## Monitoring & Observability

**Error Tracking:**
- None detected - Local error handling only

**Logs:**
- Console logging only (browser developer tools)
- No error reporting service integrated

## CI/CD & Deployment

**Hosting:**
- Static site hosting compatible (Vite SPA build output to `/dist/`)
- Suitable for: GitHub Pages, Netlify, Vercel, AWS S3 + CloudFront, etc.

**CI Pipeline:**
- None detected - No CI configuration files found

**Build Output:**
- `npm run build` produces optimized bundle in `/dist/` directory
- Vite configuration in `vite.config.ts` controls bundling and optimization

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables

**Secrets location:**
- No secrets used

## Webhooks & Callbacks

**Incoming:**
- None - Application is a read-only client

**Outgoing:**
- None - No server-side calls or webhook dispatching

## CORS & Proxy Strategy

**Cross-Origin Handling:**
- Application runs on client-side only with fetch requests to external APIs
- CORS limitations addressed with proxy fallback chain:
  - Primary: `https://api.allorigins.win/raw?url={target}`
  - Secondary: `https://api.codetabs.com/v1/proxy?quest={target}`
  - Tertiary: `https://corsproxy.io/?{target}`
- Fetch timeout: 7 seconds per proxy attempt
- Implementation: `src/utils/corsProxy.ts` - `fetchWithProxy()` function with retry logic

**Proxy Behavior:**
- Automatically cycles through proxies if one fails
- All proxies are public, free services
- May have rate limits - no rate limit handling implemented

## Feed Aggregation

**Feed Merging:**
- Incremental loading pattern: Items displayed as each source resolves
- Implementation: `src/services/feeds.ts` - `fetchAllFeedsIncremental()`, `fetchAllFeeds()`
- Promise.allSettled() pattern ensures one failing source doesn't block others
- Results: Up to 20 Reddit posts + 15 YouTube videos + 10 Soompi + 10 AllKPop + 10 Twitter = ~65 items max per load

**Keyword Filtering:**
- BTS keyword regex: `/\bbts\b|bangtan|방탄|jimin|jungkook|taehyung|namjoon|yoongi|hoseok|seokjin|agust\s*d|j-hope|suga\b/i`
- Member-specific filtering: `src/types/feed.ts` - `MEMBER_KEYWORDS` maps member IDs to keyword arrays
- Filter applied at source level (Reddit, YouTube, Nitter) and UI level (component filtering)

---

*Integration audit: 2026-02-25*
