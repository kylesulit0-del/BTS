# Pitfalls Research

**Domain:** Feed expansion for client-side React SPA (engagement stats, oEmbed/iframe embeds, new content sources, config-driven architecture)
**Researched:** 2026-02-25
**Confidence:** HIGH (based on codebase audit, official documentation, and multiple corroborating sources)

## Critical Pitfalls

### Pitfall 1: Instagram oEmbed Requires Server-Side Authentication -- Impossible Without a Backend

**What goes wrong:**
Instagram/Meta retired unauthenticated oEmbed in October 2025. The new Meta oEmbed Read API requires an access token generated from a registered Facebook app using `client_id` and `client_secret`. This means Instagram Reels embeds cannot be fetched client-side without exposing your app secret in the browser -- a security dealbreaker. Attempting to call the endpoint without a token returns 400 Bad Request. Embedding your app secret in client-side code exposes it to anyone who opens DevTools.

**Why it happens:**
Developers assume oEmbed endpoints are still unauthenticated like they were pre-2025. Meta changed this to require `access_token` on all `/instagram_oembed` Graph API calls. The old `/oembed` endpoint is fully deprecated.

**How to avoid:**
Accept that Instagram Reels embeds are not feasible in a pure client-side app without a backend proxy to hold the token. Two options:
1. Drop Instagram Reels from scope entirely -- use only TikTok and YouTube Shorts which have unauthenticated embed paths.
2. If Instagram is critical, deploy a minimal serverless function (Cloudflare Worker, Vercel Edge Function) that holds the Meta app token and proxies oEmbed requests. This is the smallest possible backend surface.

**Warning signs:**
- Planning Instagram embed work without checking current Meta API requirements
- Hardcoding a Meta access token in frontend source code
- 400 errors on Instagram oEmbed calls during development

**Phase to address:**
Phase 1 (Architecture/Planning) -- make the go/no-go decision on Instagram before writing any embed code.

---

### Pitfall 2: CORS Proxy Collapse Under Increased Load

**What goes wrong:**
The app currently uses 3 free CORS proxies (allorigins.win, codetabs.com, corsproxy.io) with a sequential fallback chain. Adding Tumblr, Weverse, more Reddit subreddits, and fan YouTube channels could double or triple the number of proxy requests per feed load. Free proxies have strict rate limits: CodeTabs caps at 5 requests/second with 5MB per response. AllOrigins has no SLA and periodic downtime. CorsProxy.io has blocked entire countries and non-text content types due to abuse. A feed load that currently makes ~7 proxied requests could balloon to 15-20, hitting rate limits and causing cascading timeouts that make the entire feed appear broken.

**Why it happens:**
Each new source is added independently ("just one more fetch"), but the aggregate load compounds. The 7-second timeout per proxy attempt means a single failed source can block the UI for 21 seconds (3 proxies x 7 seconds each) before giving up.

**How to avoid:**
1. Audit total proxy request count per feed load and set a hard budget (e.g., max 12 proxied requests).
2. Prioritize sources that do not need CORS proxies (Reddit `.json` endpoint may work directly, YouTube Atom feeds may need a proxy but are lightweight).
3. Implement parallel proxy attempts instead of sequential fallback -- try all 3 proxies simultaneously for each request, use the first successful response, abort the rest.
4. Add request deduplication -- if the same URL is requested twice during a feed load, reuse the in-flight promise.
5. Consider adding a 4th proxy or a self-hosted CORS proxy (cors-anywhere on a free Render/Railway instance) as a reliability buffer.

**Warning signs:**
- Feed load times increasing beyond 5 seconds
- `fetchWithProxy` throwing "All proxies failed" more than 10% of the time
- Users seeing empty feeds during peak hours (when proxy services are most strained)

**Phase to address:**
Phase 1 (Infrastructure) -- refactor `corsProxy.ts` before adding any new sources. The current sequential fallback architecture does not scale.

---

### Pitfall 3: XSS via stripHtml Gets Worse with More HTML Sources

**What goes wrong:**
The current `stripHtml` function in `feeds.ts` creates a DOM element, sets `innerHTML` to untrusted HTML from RSS feeds, then reads `textContent`. This is a known XSS vector: while `<script>` tags inserted via `innerHTML` do not execute, `<img src=x onerror="alert('xss')">` and `<iframe src="javascript:...">` tags DO execute during the innerHTML assignment. Currently the risk is limited to 2 RSS sources (Soompi, AllKPop). Adding Tumblr RSS feeds, fan forum content, and potentially Weverse HTML content dramatically increases the attack surface -- fan-created content on Tumblr is especially risky because users can embed arbitrary HTML in their posts.

**Why it happens:**
`div.innerHTML = html` looks innocuous and "just works" for extracting text. The XSS risk is non-obvious because `<script>` tags genuinely do not execute via innerHTML -- but other vectors like `onerror`, `onload`, and `javascript:` URIs do.

**How to avoid:**
Replace `stripHtml` with DOMPurify sanitization before any innerHTML assignment:
```typescript
import DOMPurify from 'dompurify';

function stripHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return clean;
}
```
For cases where you need to render HTML (Tumblr post content with formatting), use DOMPurify with a restrictive allowlist:
```typescript
const safeHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'src', 'alt'],
});
```

**Warning signs:**
- Any use of `innerHTML` with data from RSS/API responses
- Fan-sourced content (Tumblr, forums) rendered without sanitization
- No DOMPurify or equivalent in `package.json`

**Phase to address:**
Phase 1 (Security hardening) -- fix this before adding any new HTML content sources. This is a pre-existing vulnerability that gets amplified by expansion.

---

### Pitfall 4: TikTok oEmbed API Is Not CORS-Enabled for Client-Side Calls

**What goes wrong:**
TikTok's oEmbed endpoint (`https://www.tiktok.com/oembed`) does not include `Access-Control-Allow-Origin` headers, meaning direct client-side `fetch()` calls from a browser will be blocked by CORS policy. Developers assume that because oEmbed is a "standard," it works from anywhere -- but oEmbed was designed for server-to-server calls. The response returns the HTML embed snippet, but you cannot get that response in the browser without a CORS proxy.

**Why it happens:**
The oEmbed spec says nothing about CORS. TikTok's documentation does not mention CORS restrictions. Developers discover this only when testing in the browser and seeing CORS errors.

**How to avoid:**
Two approaches:
1. **CORS proxy the oEmbed call** -- use the existing `fetchWithProxy` to call TikTok's oEmbed endpoint, parse the HTML snippet from the response, and render the embed iframe. This adds one more proxy request per TikTok embed.
2. **Construct the embed iframe directly** -- TikTok embeds use a predictable URL pattern: `https://www.tiktok.com/embed/v2/{VIDEO_ID}`. If you already have the video URL, extract the ID and build the iframe `src` directly without calling oEmbed at all. This avoids the proxy entirely.

Option 2 is strongly preferred because it eliminates a proxy dependency entirely.

**Warning signs:**
- Planning to fetch oEmbed responses client-side without testing CORS
- CORS errors in console for `tiktok.com/oembed` requests
- Adding proxy load for embed metadata that could be derived from the URL

**Phase to address:**
Phase 2 (Embed implementation) -- decide the embed strategy before writing embed components.

---

### Pitfall 5: Config-Driven Refactor Breaks Existing Functionality Without Tests

**What goes wrong:**
The codebase has zero test coverage. Hardcoded BTS-specific values are scattered across `feeds.ts` (subreddit names, channel IDs, keyword regex) and `feed.ts` (member keywords, bias IDs). Extracting these into a config object means touching every feed-fetching function and the type system simultaneously. Without tests, there is no way to verify that the refactored code still produces the same feed results as the original. Subtle bugs (e.g., a regex that no longer matches because it was restructured, a subreddit that got dropped from the config) will be invisible until a user notices missing content.

**Why it happens:**
Config-driven architecture feels like a "clean refactor" -- just move strings into a config file. But it actually changes data flow: functions that previously had hardcoded values now receive them as parameters or read from an imported config. Every call site changes. Every type definition that referenced specific literal types (like `BiasId`) needs generalization.

**How to avoid:**
1. Write integration tests for the feed-fetching functions BEFORE starting the config refactor. Tests should capture: which subreddits are fetched, which channels are fetched, that keyword filtering works, that output matches the `FeedItem` shape.
2. Do the config extraction as a standalone phase, not bundled with new feature work. Extract existing hardcoded values into a config first, verify everything still works, THEN add new sources via config.
3. Use TypeScript's type system aggressively -- make the config schema a single typed interface so the compiler catches missing fields.

**Warning signs:**
- Combining "add Tumblr source" with "extract config" in the same PR
- No test files in the repository
- `FeedSource` type union still hardcoded after config work is "done"
- Config file exists but some values are still hardcoded in `feeds.ts`

**Phase to address:**
Phase 1 (Foundation) -- add basic feed integration tests, then do config extraction as a separate step before any new sources.

---

### Pitfall 6: Weverse Content Is Not Scrapeable from Client-Side

**What goes wrong:**
Weverse is a closed platform operated by HYBE. It has no public API, no RSS feeds, no oEmbed endpoint, and serves its web app as a React SPA itself -- meaning the content is dynamically rendered JavaScript, not static HTML that a CORS proxy can fetch and parse. Attempting to fetch `weverse.io` through a CORS proxy will return an empty app shell with no content. There is no documented method for extracting fan posts, artist posts, or community content from Weverse without authenticated browser sessions and JavaScript execution.

**Why it happens:**
Weverse looks like "just another website" in the feature list, but it is architecturally incompatible with client-side scraping. Unlike Reddit (which has `.json` endpoints), YouTube (which has Atom feeds), or Tumblr (which has RSS), Weverse exposes zero machine-readable endpoints.

**How to avoid:**
Remove Weverse from the client-side scraping scope entirely. Alternatives:
1. **Link aggregation only** -- search Reddit/Twitter for Weverse screenshot posts and link to those instead (content about Weverse, not from Weverse).
2. **Manual curation** -- a config-driven list of notable Weverse post URLs that open in a new tab.
3. **Future backend phase** -- if a backend is ever added, Weverse content could be fetched via headless browser automation, but this is far beyond current scope.

Do not spend development time attempting to scrape Weverse client-side. It will not work.

**Warning signs:**
- Empty responses when fetching Weverse URLs through CORS proxies
- Planning Weverse integration without verifying that content is accessible
- Investigating Weverse's internal API calls (these require authentication cookies)

**Phase to address:**
Phase 1 (Scope) -- explicitly descope Weverse content scraping. Document why and what the alternatives are.

---

### Pitfall 7: YouTube View Counts Require a Separate API Call That Needs an API Key

**What goes wrong:**
YouTube Atom feeds (`/feeds/videos.xml?channel_id=X`) provide video titles, links, and publish dates but NOT view counts, like counts, or comment counts. To get engagement stats for YouTube videos, you need the YouTube Data API v3 (`/youtube/v3/videos?part=statistics&id=VIDEO_ID`), which requires an API key. This API key should not be exposed in client-side code because YouTube Data API has a daily quota of 10,000 units (each `videos.list` call costs 1 unit), and anyone who extracts the key from your source can exhaust your quota.

**Why it happens:**
The feature spec says "engagement stats on feed cards" -- for Reddit this is trivial (upvotes/comments are in the JSON response), but for YouTube it requires an entirely different API with authentication. Developers discover this after implementing Reddit stats and then finding YouTube Atom feeds lack the same fields.

**How to avoid:**
1. **Skip YouTube engagement stats** -- show view counts only for Reddit (where they are free). YouTube cards show the video thumbnail and title but no stats. This is the simplest honest approach.
2. **Restricted API key** -- create a YouTube Data API key restricted to the YouTube Data API v3 and your app's referrer domain. This limits abuse if the key is extracted. Accept the 10,000 unit/day quota as sufficient for a fan app.
3. **Proxy the API call** -- use a serverless function to hold the API key, similar to the Instagram problem.

Option 1 is recommended for the initial expansion. Option 2 is acceptable if engagement stats are critical.

**Warning signs:**
- Assuming YouTube Atom feeds contain view/like counts
- Embedding an unrestricted Google API key in client-side JavaScript
- Hitting YouTube Data API quota limits

**Phase to address:**
Phase 2 (Engagement stats) -- design the engagement stats feature with source-specific availability in mind. Not every source will have stats.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Duplicated `timeAgo` and `sourceBadgeColors` in FeedCard and SwipeFeed | Ship fast without shared utils | Every new view mode duplicates the same logic; badge color map will drift when new sources are added | Never -- consolidate into shared utils before adding new sources |
| Sequential CORS proxy fallback | Simple to implement and reason about | 21-second worst-case timeout per request (3 proxies x 7s); blocks UI thread perception | Only acceptable during prototyping. Must switch to parallel before adding sources |
| `Date.now()` in feed item IDs (`news-soompi-${i}-${Date.now()}`) | Ensures unique IDs | IDs change on every fetch, breaking React key stability and making deduplication impossible across cache refreshes | Never -- use content-derived stable IDs (URL hash) |
| No error boundaries around feed sources | Fewer components to maintain | One bad source response can crash the entire feed rendering | Only for MVP. Add error boundaries before expanding sources |
| Hardcoded `.slice(0, N)` limits per source | Simple pagination | Different sources have different volumes; a global config should control per-source limits | Move to config alongside the config-driven refactor |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Reddit `.json` API | Not handling Reddit's rate-limit response (HTTP 429) -- app retries immediately and gets blocked | Check for 429 status, implement exponential backoff. Reddit allows 10 requests/minute for unauthenticated requests |
| TikTok embeds | Calling the oEmbed API client-side and getting CORS-blocked | Construct iframe `src` directly from video URL: `https://www.tiktok.com/embed/v2/{VIDEO_ID}` |
| Instagram Reels | Assuming oEmbed is unauthenticated like pre-2025 | Instagram oEmbed now requires Meta app access token. Not viable client-side without a backend proxy |
| YouTube Shorts embed | Using the `/shorts/VIDEO_ID` URL as iframe src | Replace `shorts` with `embed` in the URL: `https://www.youtube.com/embed/VIDEO_ID`. Shorts have no native embed button |
| Tumblr RSS | Assuming Tumblr RSS includes all post types | Tumblr RSS feeds may truncate long posts and exclude some media. Image-heavy posts may only include thumbnails. Parse `<description>` carefully |
| YouTube Atom feeds | Expecting engagement stats (views, likes) in the feed XML | Atom feeds contain only title, link, published date, and thumbnail. Engagement stats require YouTube Data API v3 with API key |
| Nitter/Twitter scraping | Continuing to rely on nitter.net as the Nitter instance | Nitter instances frequently go down or change domains. The regex-based HTML parsing in `fetchTwitter` is fragile and will break on any DOM change. Have a graceful degradation path |
| Tumblr API v2 | Trying to use the API for richer data and exposing the consumer key in client-side code | Use Tumblr RSS feeds (`{blog}.tumblr.com/rss`) instead of API v2. RSS is unauthenticated and CORS-proxyable |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Too many iframes on one page | Page becomes sluggish, scrolling stutters, memory climbs above 500MB | Lazy-load iframes only when visible (IntersectionObserver). Limit to 3 simultaneous iframes; replace off-screen iframes with thumbnails | More than 5-8 embed iframes rendered simultaneously |
| localStorage cache exceeds 5MB | `QuotaExceededError` thrown, cache writes silently fail, app stops caching without user knowing | Wrap localStorage writes in try/catch. Implement LRU eviction when approaching quota. With more sources, cached feed data grows fast | When total cached feed data (5+ sources x ~100KB each) plus thumbnails exceed 5MB |
| Re-sorting the entire feed array on every incremental source callback | Feed "jumps" as items re-sort -- items the user is reading shift position | Sort once at the end, or use insertion sort for incremental additions. The current `fetchAllFeedsIncremental` re-sorts the entire array on every callback | Noticeable with 100+ items from 8+ sources |
| Fetching all sources on every mount/refresh | Unnecessary proxy load, slow initial render, rate limiting | Implement stale-while-revalidate: show cached data immediately, fetch fresh data in background. The current 5-minute TTL cache helps but only if the component does not re-mount | When source count exceeds 8 and proxy response times are inconsistent |
| Embedding TikTok/YouTube players that autoload heavy JavaScript | Each embed player loads 1-3MB of JavaScript. 10 embeds = 10-30MB of external JavaScript | Use click-to-load pattern: show thumbnail + play button, only load iframe when user clicks | More than 3-5 video embeds visible in the feed |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `stripHtml` uses `div.innerHTML = untrustedHtml` | XSS via `<img onerror>`, `<svg onload>`, `<iframe src="javascript:">` vectors in RSS/Tumblr content | Replace with DOMPurify. Drop-in fix: `DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })` for text extraction |
| Embedding YouTube/TikTok iframes without `sandbox` attribute | Embedded content can navigate the parent page, access `window.top`, or open popups | Add `sandbox="allow-scripts allow-same-origin allow-presentation"` to all embed iframes. Never include `allow-top-navigation` |
| Exposing API keys (YouTube Data API, Meta app token) in client-side JavaScript | Anyone can extract keys from source/network tab, exhaust quotas, or impersonate your app | Either skip features requiring API keys, or proxy through a serverless function. If client-side key is unavoidable, restrict by HTTP referrer and API scope |
| CORS proxies can inject content | A compromised or malicious CORS proxy could modify the response, injecting scripts into RSS XML or JSON | Validate response structure before parsing. For JSON, check expected schema. For XML, parse with DOMParser and validate expected element structure. Never trust proxy responses as safe HTML |
| No Content Security Policy (CSP) | Without CSP, any injected script (via XSS) can exfiltrate data or load external resources | Add CSP headers: `frame-src https://www.youtube.com https://www.tiktok.com; script-src 'self'`. This also validates that only expected embed sources are loaded |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing engagement stats that are hours/days stale without indicating freshness | Users see "1.2M views" that was accurate 6 hours ago; feels misleading | Show relative freshness: "1.2M views (6h ago)" or omit stats older than a threshold |
| Empty embed placeholders when proxy fails or embed is blocked | User sees broken iframe or empty box with no explanation | Show a fallback card with thumbnail, title, and "Open on TikTok" link. Never show an empty iframe |
| Feed "flashes" as sources load incrementally | Items rearrange as each source resolves, losing the user's scroll position | Add new items below the current viewport, or batch updates. Show a "N new items" banner instead of injecting at top |
| Inconsistent card heights due to some cards having stats and others not | Feed looks messy; cards with stats are taller, creating a jagged layout | Reserve space for stats on all cards. Show a subtle "stats unavailable" indicator rather than omitting the stats section entirely |
| Video embeds auto-playing or loading heavy content on mobile data | Users on cellular connections experience unexpected data usage | Default to click-to-load for all video embeds. Show thumbnail + play overlay. Let users opt into auto-embed in settings |
| Too many new source types making the filter UI overwhelming | Source filter goes from 4 options to 8+, becoming unwieldy | Group sources into categories: "Social" (Reddit, Twitter, Tumblr), "Video" (YouTube, TikTok), "News" (Soompi, AllKPop). Filter by category, not individual source |

## "Looks Done But Isn't" Checklist

- [ ] **Config-driven architecture:** All group-specific values extracted -- verify no hardcoded BTS keywords remain in `feeds.ts` (search for "bts", "bangtan", "jimin", etc.)
- [ ] **Config-driven architecture:** The `FeedSource` type union and `BiasId` type are derived from config, not hardcoded string literals -- verify changing the config changes the types
- [ ] **Engagement stats:** Reddit upvotes/comments display on cards -- verify that `score` and `num_comments` are actually parsed from the Reddit JSON response (the current code ignores these fields)
- [ ] **TikTok embeds:** Embeds render in the feed -- verify they also work in the swipe view, which has different CSS constraints (9:16 aspect ratio in a horizontal swipe container)
- [ ] **YouTube Shorts embeds:** Shorts display correctly -- verify the aspect ratio is 9:16 (not 16:9 like regular YouTube embeds). Missing this makes Shorts look squished
- [ ] **Tumblr integration:** Posts appear in feed -- verify image-heavy Tumblr posts render thumbnails correctly (RSS may only include low-res thumbnails or no images)
- [ ] **CORS proxy resilience:** New sources work -- verify they still work when the first proxy in the chain is down (test by temporarily removing allorigins.win from the proxy list)
- [ ] **Feed deduplication:** Same content appearing from multiple sources (e.g., a YouTube video linked in a Reddit post) is deduplicated -- verify URL-based dedup is in place
- [ ] **Error boundaries:** One source failure does not crash the feed -- verify by blocking a single source URL and confirming other sources still render
- [ ] **localStorage cache:** Cache works with expanded data -- verify cache does not exceed 5MB by checking `JSON.stringify(cache).length` in DevTools after a full feed load

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| XSS vulnerability exploited via stripHtml | MEDIUM | 1. Add DOMPurify immediately. 2. Audit all innerHTML usage. 3. Add CSP headers. No data breach risk (no user data stored), but malicious redirects possible |
| CORS proxy service permanently shuts down | LOW | 1. Remove from proxy array. 2. Add replacement proxy. 3. The fallback chain means one proxy loss is survivable. Only critical if 2+ fail simultaneously |
| Instagram oEmbed stops working after building the feature | MEDIUM | 1. Gracefully degrade Instagram cards to link-only (no embed). 2. Show thumbnail + "View on Instagram" link. 3. Consider dropping Instagram from scope |
| Config refactor introduces regression | HIGH (without tests) / LOW (with tests) | Without tests: manual audit of every feed source, compare output before/after. With tests: run test suite, fix failures. This is why tests must come first |
| Weverse scraping fails after significant development investment | HIGH | Complete waste of development time. This is why feasibility must be verified before coding. Recovery = delete Weverse code, revert to link aggregation |
| localStorage quota exceeded in production | LOW | 1. Wrap all writes in try/catch (should already be done). 2. Implement cache eviction. 3. Reduce per-source cache size. 4. Consider IndexedDB for larger storage |
| YouTube Data API key leaked/quota exhausted | MEDIUM | 1. Rotate the API key in Google Cloud Console immediately. 2. Restrict new key by HTTP referrer. 3. Implement client-side quota tracking to warn before exhaustion |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| XSS via stripHtml | Phase 1: Security hardening | `grep -r "innerHTML" src/` returns zero instances using raw untrusted input; DOMPurify in package.json |
| CORS proxy collapse | Phase 1: Infrastructure | Parallel proxy fetch implemented; total proxied requests per feed load audited and documented |
| Instagram oEmbed auth requirement | Phase 1: Scope decisions | Decision documented in planning; no Instagram embed code in codebase (or serverless proxy deployed) |
| Weverse not scrapeable | Phase 1: Scope decisions | Weverse explicitly listed as out-of-scope with documented rationale and alternatives |
| No test coverage for config refactor | Phase 1: Foundation | Test files exist for feed-fetching functions; tests pass before and after config extraction |
| TikTok oEmbed CORS | Phase 2: Embed implementation | TikTok embeds use direct iframe construction, not oEmbed API calls |
| YouTube engagement stats need API key | Phase 2: Engagement stats | Design doc acknowledges per-source stat availability; YouTube stats either skipped or proxied |
| Multiple iframes performance | Phase 2: Embed implementation | IntersectionObserver-based lazy loading in place; click-to-load for video embeds |
| YouTube Shorts aspect ratio | Phase 2: Embed implementation | Visual QA confirms 9:16 rendering in both list and swipe views |
| localStorage quota | Phase 3: Polish | try/catch on all localStorage writes; LRU eviction implemented; total cache size monitored |
| Config refactor completeness | Phase 3: Config-driven architecture | Zero hardcoded group-specific strings in src/ (verified by grep); config schema fully typed |
| Feed UX (jumping, flashing) | Phase 3: Polish | Incremental loading does not re-sort visible items; new items added via banner or below viewport |

## Sources

- [Meta oEmbed Read API requirements (Bluehost)](https://www.bluehost.com/blog/meta-oembed-read-explained/) -- Instagram oEmbed now requires access token
- [Instagram oEmbed deprecation (Iframely)](https://iframely.com/updates/193071-facebook-and-instagram-oembed-thumbnail-deprecation) -- thumbnail and author fields removed
- [TikTok embed documentation](https://developers.tiktok.com/doc/embed-videos/) -- oEmbed endpoint docs (no CORS info)
- [CORS proxies list (2025)](https://gist.github.com/reynaldichernando/eab9c4e31e30677f176dc9eb732963ef) -- proxy reliability data
- [CodeTabs CORS proxy](https://codetabs.com/cors-proxy/cors-proxy.html) -- 5 req/sec rate limit, 5MB size limit
- [CorsProxy.io status](https://status.corsproxy.io/) -- uptime data and blocking policies
- [innerHTML XSS vulnerability (Sourcery)](https://www.sourcery.ai/vulnerabilities/innerHTML-xss-vulnerable) -- attack vectors via innerHTML
- [Sanitizer API in Firefox 148 (Mozilla Hacks)](https://hacks.mozilla.org/2026/02/goodbye-innerhtml-hello-sethtml-stronger-xss-protection-in-firefox-148/) -- modern sanitization approach
- [iframe security risks (Qrvey, 2026)](https://qrvey.com/blog/iframe-security/) -- iframe sandbox best practices
- [localStorage quota (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- 5MB per origin limit
- [YouTube Shorts embed guide (StreamWeasels)](https://www.streamweasels.com/how-to-embed-youtube-shorts-2022-guide/) -- URL modification for iframe embed
- [Tumblr RSS feed format (Feedly docs)](https://docs.feedly.com/article/360-how-to-follow-tumblr-feeds) -- public RSS at `{blog}.tumblr.com/rss`
- [React iframe best practices (LogRocket)](https://blog.logrocket.com/best-practices-react-iframes/) -- memory leak patterns with iframes
- [Client-side RSS reader CORS challenges (Cemre's Blog)](https://cemrekarakas.com/posts/2025/01/09/client-side-rss-reader) -- 80-90% proxy success rate
- Codebase audit: `src/services/feeds.ts`, `src/utils/corsProxy.ts`, `src/types/feed.ts` -- direct observation of current architecture

---
*Pitfalls research for: BTS Army Feed Expansion -- client-side React SPA feed features*
*Researched: 2026-02-25*
