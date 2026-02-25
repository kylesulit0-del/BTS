# Phase 2: Feed Expansion - Research

**Researched:** 2026-02-25
**Domain:** Feed source integration (Tumblr RSS, Reddit engagement, YouTube fan channels), engagement stats display, feed ordering
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 expands the feed from 9 sources to ~25+ by adding fan subreddits, fan YouTube channels, and Tumblr blogs. The existing architecture (`SourceEntry` config -> fetcher registry -> `FeedItem[]`) supports this cleanly. The main work areas are: (1) adding a Tumblr RSS fetcher, (2) extending `FeedItem` with optional engagement fields, (3) extracting engagement data from Reddit JSON and YouTube Atom feeds, (4) building engagement stats display on FeedCard, (5) implementing engagement-weighted ordering with deduplication, and (6) curating the specific sources.

Reddit's JSON API already returns `score`, `ups`, `num_comments`, and `upvote_ratio` in `post.data` -- the current fetcher ignores these. YouTube's Atom feed includes `media:statistics views="N"` and `media:starRating count="N"` inside `media:community` inside `media:group` -- the current parser ignores these. Tumblr's RSS feed at `{blog}.tumblr.com/rss` provides standard RSS items with HTML in `<description>`, but does NOT include note counts. Getting note counts requires Tumblr's API v2 with a consumer key (`api_key` param), which is a free registration but adds a secret to manage.

**Primary recommendation:** Use the existing RSS fetcher pattern for Tumblr (reusing `fetchRssSource` or a thin wrapper), extend `FeedItem` with optional `stats` object, extract engagement from Reddit JSON/YouTube Atom feeds at fetch time, and skip Tumblr note counts in this phase (RSS-only, no API key dependency) unless the user explicitly wants to add a Tumblr API key to config.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Tumblr card layout:** Text snippet + thumbnail, show latest reblog only (no chains), thumbnail-only for images (full on tap-through), source label shows "Tumblr" not individual blog names
- **Engagement stats placement:** Inline with existing metadata (timestamp/source label area), not a separate section
- **Stats format:** Icons + abbreviated numbers (arrow icon + "1.2k", speech bubble + "45"), abbreviate large numbers (1.2k, 15k, 1.2M)
- **Zero/missing stats:** Hide entirely -- no empty/zero displays
- **Reddit stats:** upvotes + comments
- **YouTube stats:** views + likes
- **Tumblr stats:** note count
- **Source counts:** Reddit 5-8 additional, YouTube all fan types, Tumblr 5-10 blogs
- **Each source:** `enabled` flag in config, per-source fetch frequency
- **Feed ordering:** Engagement-weighted, equal weight recency + engagement
- **Deduplication:** By URL, keep version with higher engagement
- **Max post age:** 7 days
- **Tumblr filter chip:** Add in this phase (not deferred)

### Claude's Discretion
- Quality filter approach for source curation (minimum subscriber/activity thresholds)
- Per-source post cap per batch (whether to limit any single source from dominating)
- Exact engagement score weighting formula
- Minimum stat threshold values

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRC-01 | User sees content from additional Reddit subreddits (memes, fan discussion) | Add `SourceEntry` objects for r/heungtan, r/bts7, r/kpoppers, r/kpoopheads (memes), r/bangtan already exists. Reddit fetcher already supports `needsFilter` for general subs. |
| SRC-02 | User sees content from fan YouTube channels (beyond official) | Add `SourceEntry` objects for fan channels. YouTube fetcher works with any channel_id. Need to curate 8-12 fan channels. |
| SRC-03 | User sees Tumblr fan blog posts with sanitized HTML | Tumblr serves RSS at `{blog}.tumblr.com/rss`. Reuse RSS fetcher or create thin Tumblr-specific wrapper. DOMPurify sanitization already exists in `sanitize.ts`. |
| SRC-04 | User can filter by Tumblr as source type | Add "tumblr" to `FeedSource` union type, add to `FeedFilter` chips, set `sourceBadgeColors` for tumblr. |
| STAT-01 | Reddit cards show upvote count | Reddit JSON `post.data.score` (or `ups`) already available -- extract in fetcher, add to `FeedItem.stats`. |
| STAT-02 | Reddit cards show comment count | Reddit JSON `post.data.num_comments` already available -- extract in fetcher, add to `FeedItem.stats`. |
| STAT-03 | Stats display gracefully (shown when available, hidden when not) | Conditional rendering in `FeedCard` -- only render stats section when `item.stats` exists with non-zero values. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMPurify | ^3.3.1 | HTML sanitization for Tumblr content | Already installed, SEC-01/SEC-02 pattern established |
| DOMParser (built-in) | Browser API | XML parsing for Tumblr RSS and YouTube Atom | Already used in `xmlParser.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | No new dependencies required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMParser for RSS | rss-parser npm | Extra dependency, DOMParser already works for existing RSS/Atom feeds |
| Manual number formatting | Intl.NumberFormat compact notation | Browser built-in, but "compact" notation may not give exact "1.2k" format -- hand-roll is simpler for this |
| Tumblr RSS | Tumblr API v2 + consumer key | Gets note counts but adds secret management, API key in config, CORS issues calling api.tumblr.com client-side |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/feed.ts                    # Extend FeedItem with stats, add "tumblr" to FeedSource
├── config/types.ts                  # Extend SourceEntry with enabled flag, refreshInterval
├── config/groups/bts/sources.ts     # Add new source entries (reddit, youtube, tumblr)
├── services/sources/
│   ├── registry.ts                  # Add "tumblr" fetcher mapping
│   ├── reddit.ts                    # Extract score + num_comments into FeedItem.stats
│   ├── youtube.ts                   # Extract media:statistics views into FeedItem.stats
│   ├── tumblr.ts                    # NEW: Tumblr RSS fetcher (thin wrapper or reuse rss.ts)
│   └── rss.ts                       # Unchanged (Soompi, AllKPop)
├── services/feeds.ts                # Add engagement scoring, deduplication, age filtering
├── utils/formatNumber.ts            # NEW: abbreviateNumber() utility
├── components/
│   ├── FeedCard.tsx                 # Add stats display (icons + abbreviated numbers)
│   ├── FeedFilter.tsx               # Add Tumblr chip
│   └── EngagementStats.tsx          # NEW (optional): extracted stats display component
└── hooks/useFeed.ts                 # May need minor updates for new filtering
```

### Pattern 1: Extending FeedItem with Optional Stats
**What:** Add optional `stats` object to `FeedItem` that each fetcher populates when data is available.
**When to use:** When different sources provide different engagement metrics.
**Example:**
```typescript
// In src/types/feed.ts
export interface FeedStats {
  upvotes?: number;
  comments?: number;
  views?: number;
  likes?: number;
  notes?: number;       // Tumblr note count (future, if API key added)
}

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  source: FeedSource;
  sourceName: string;
  timestamp: number;
  preview?: string;
  thumbnail?: string;
  author?: string;
  stats?: FeedStats;    // NEW: optional engagement data
}
```

### Pattern 2: Extracting Reddit Engagement Data
**What:** The Reddit JSON API returns engagement metrics in `post.data`. Extract them in the fetcher.
**When to use:** In `fetchRedditSource()` when mapping posts to `FeedItem[]`.
**Example:**
```typescript
// In src/services/sources/reddit.ts -- inside the mapping loop
items.push({
  id: `reddit-${d.id}`,
  title: d.title,
  // ... existing fields ...
  stats: {
    upvotes: d.score > 0 ? d.score : undefined,
    comments: d.num_comments > 0 ? d.num_comments : undefined,
  },
});
```
**Confidence:** HIGH -- Reddit's JSON API at `/r/{sub}/hot.json` returns `score`, `ups`, `downs`, `num_comments`, `upvote_ratio` in `post.data`. Verified via official Reddit API docs and multiple independent sources.

### Pattern 3: Extracting YouTube View Count from Atom Feed
**What:** YouTube's Atom feed includes `media:statistics views="N"` inside `media:group > media:community`. The current `parseAtom()` ignores this.
**When to use:** Extend `parseAtom()` to extract views from the media namespace.
**Example:**
```typescript
// In src/utils/xmlParser.ts -- inside parseAtom()
const mediaNS = "http://search.yahoo.com/mrss/";
const community = entry.getElementsByTagNameNS(mediaNS, "community");
const statistics = community.length > 0
  ? community[0].getElementsByTagNameNS(mediaNS, "statistics")
  : null;
const views = statistics?.[0]?.getAttribute("views");
const starRating = community.length > 0
  ? community[0].getElementsByTagNameNS(mediaNS, "starRating")
  : null;
const ratingCount = starRating?.[0]?.getAttribute("count"); // proxy for likes
```
**Confidence:** MEDIUM-HIGH -- Media RSS spec documents `media:community > media:statistics views="N"` and `media:starRating count="N"`. Multiple sources confirm YouTube feeds include these. The `media:starRating count` is a proxy for total ratings (not pure likes), but it's the best available without YouTube Data API.

### Pattern 4: Tumblr RSS Fetcher
**What:** Tumblr blogs serve RSS at `{blogname}.tumblr.com/rss`. Standard RSS format with HTML in `<description>`.
**When to use:** New `fetchTumblrSource()` or reuse `fetchRssSource()` with source type "tumblr".
**Example:**
```typescript
// Option A: Reuse RSS fetcher with type mapping
// In registry.ts, map "tumblr" to fetchRssSource
// SourceEntry URL would be full RSS URL: "https://btsfandom.tumblr.com/rss"
// FeedItem source would be "tumblr" (not "rss")

// Option B: Dedicated tumblr.ts (recommended -- allows future API upgrade)
export async function fetchTumblrSource(source: SourceEntry): Promise<FeedItem[]> {
  const url = source.url; // Full RSS URL like "https://btsfandom.tumblr.com/rss"
  const xml = await fetchWithProxy(url);
  const rssItems = parseRSS(xml);

  const config = getConfig();
  const limit = source.fetchCount ?? 10;

  return rssItems
    .filter((item) => !source.needsFilter || config.keywords.test(item.title + " " + item.description))
    .slice(0, limit)
    .map((item, i) => ({
      id: `tumblr-${source.id}-${i}-${Date.now()}`,
      title: item.title,
      url: item.link,
      source: "tumblr" as const,
      sourceName: "Tumblr",
      timestamp: new Date(item.pubDate).getTime() || Date.now(),
      preview: sanitizeHtml(item.description).slice(0, 200), // Sanitized HTML snippet
      thumbnail: extractFirstImage(item.description), // Extract img src from HTML
    }));
}
```
**Confidence:** HIGH for RSS access pattern. Tumblr RSS at `{blog}.tumblr.com/rss` is well-documented and stable.

### Pattern 5: Engagement-Weighted Feed Ordering
**What:** Sort feed items by a combined score of recency and engagement, with equal weighting.
**When to use:** In `feeds.ts` when producing the final sorted list.
**Example:**
```typescript
function computeFeedScore(item: FeedItem, now: number): number {
  // Recency score: 1.0 for just posted, 0.0 for 7 days old
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  const age = now - item.timestamp;
  const recencyScore = Math.max(0, 1 - age / maxAge);

  // Engagement score: normalize per-source, log scale to tame outliers
  const engagement = getEngagementValue(item);
  const engagementScore = engagement > 0 ? Math.log10(1 + engagement) / 6 : 0;
  // log10(1 + 1000000) ~= 6, so dividing by 6 normalizes to ~0-1

  // Equal weight
  return 0.5 * recencyScore + 0.5 * engagementScore;
}

function getEngagementValue(item: FeedItem): number {
  if (!item.stats) return 0;
  // Combine available stats -- different sources weight differently
  const { upvotes = 0, comments = 0, views = 0, likes = 0, notes = 0 } = item.stats;
  // Normalize: Reddit score + comments*2, YouTube views/100 + likes, Tumblr notes
  if (item.source === "reddit") return upvotes + comments * 2;
  if (item.source === "youtube") return views / 100 + likes;
  if (item.source === "tumblr") return notes;
  return 0;
}
```
**Confidence:** MEDIUM -- The formula is Claude's discretion per CONTEXT.md. The log-scale approach prevents viral posts from completely dominating. The per-source normalization is approximate and may need tuning.

### Pattern 6: URL-Based Deduplication
**What:** When the same content appears from multiple sources, keep the version with higher engagement.
**When to use:** Before final sorting in `feeds.ts`.
**Example:**
```typescript
function deduplicateByUrl(items: FeedItem[]): FeedItem[] {
  const seen = new Map<string, FeedItem>();
  for (const item of items) {
    const normalized = normalizeUrl(item.url);
    const existing = seen.get(normalized);
    if (!existing || getEngagementValue(item) > getEngagementValue(existing)) {
      seen.set(normalized, item);
    }
  }
  return Array.from(seen.values());
}

function normalizeUrl(url: string): string {
  // Strip tracking params, normalize www vs non-www, etc.
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("ref");
    return u.toString();
  } catch {
    return url;
  }
}
```

### Pattern 7: Number Abbreviation
**What:** Format large numbers as "1.2k", "15k", "1.2M".
**When to use:** In stats display on FeedCard.
**Example:**
```typescript
// src/utils/formatNumber.ts
export function abbreviateNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}
```

### Anti-Patterns to Avoid
- **Fetcher-level sorting:** Don't sort inside individual fetchers. Sort once in `feeds.ts` after all sources resolve.
- **Blocking on slow sources:** The incremental loading pattern (`fetchAllFeedsIncremental`) already handles this -- don't change it to `Promise.all`.
- **Hardcoding source lists in components:** FeedFilter chips should come from the `FeedSource` type or config, not a manual array.
- **Tumblr API without fallback:** If considering Tumblr API for note counts, always fall back to RSS-only if API key missing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex stripping | DOMPurify (already installed) | XSS vectors in Tumblr HTML are complex -- regex will miss edge cases |
| XML parsing | String manipulation / regex | DOMParser + getElementsByTagNameNS | Namespace-aware parsing needed for media: elements |
| Image extraction from HTML | Regex on img tags | DOMParser on description HTML | Handles malformed HTML, attribute variations |
| Number formatting | Complex Intl.NumberFormat config | Simple abbreviateNumber() helper | Compact notation doesn't give exact "1.2k" format, and the function is trivial |

**Key insight:** The existing stack (DOMParser, DOMPurify, fetchWithProxy) already handles the hard parts. The new work is mostly data extraction and UI display.

## Common Pitfalls

### Pitfall 1: Tumblr RSS Description Contains Full HTML
**What goes wrong:** Tumblr RSS `<description>` contains full post HTML including images, links, formatting. Rendering raw could cause XSS or broken layouts.
**Why it happens:** Tumblr puts the entire post body in the description field, not a summary.
**How to avoid:** Always sanitize with DOMPurify before rendering. For previews, use `stripToText()` for plain text snippets. Extract thumbnails separately.
**Warning signs:** Posts showing raw HTML tags, or images breaking card layout.

### Pitfall 2: Tumblr RSS Has No Note Count
**What goes wrong:** Building the Tumblr note count display, then discovering RSS feeds don't include engagement data.
**Why it happens:** Standard RSS spec doesn't include platform-specific engagement metrics. Tumblr's API v2 has note counts but requires authentication (consumer key).
**How to avoid:** Design Tumblr cards to gracefully hide stats (which aligns with STAT-03 requirement). If note counts are needed later, add Tumblr API key to config as optional field.
**Warning signs:** Empty or zero note count showing on Tumblr cards.

### Pitfall 3: YouTube media:statistics Namespace Parsing
**What goes wrong:** Using `querySelector("statistics")` without namespace returns null.
**Why it happens:** YouTube feed elements are in the `http://search.yahoo.com/mrss/` namespace. Non-namespace-aware queries won't find them.
**How to avoid:** Use `getElementsByTagNameNS("http://search.yahoo.com/mrss/", "statistics")` -- same pattern already used for `media:thumbnail` in the current code.
**Warning signs:** Views always showing as undefined despite data being present in XML.

### Pitfall 4: Reddit Score Fuzzing
**What goes wrong:** Expecting exact upvote counts -- Reddit fuzzes vote numbers to prevent spam detection.
**Why it happens:** Reddit's anti-spam system adds/subtracts random votes from display numbers while keeping `score` (net votes) accurate.
**How to avoid:** Use `score` field (accurate net value) rather than `ups` (fuzzed). Display as approximate ("~1.2k") or just use the number as-is since users expect Reddit's normal display behavior.
**Warning signs:** Not a visible issue -- just be aware scores are approximate.

### Pitfall 5: CORS Proxy Amplification
**What goes wrong:** Going from 9 to 25+ sources means 25+ CORS proxy requests in parallel. Proxies may rate-limit or timeout.
**Why it happens:** Free CORS proxies (allorigins, codetabs, corsproxy.io) have rate limits. 25+ simultaneous Promise.any() races = 75+ requests.
**How to avoid:** Use the `enabled` flag to disable sources that consistently fail. Consider staggering fetches or batching by source type. The existing parallel proxy pattern races 3 proxies per source -- with 25 sources that's 75 concurrent requests.
**Warning signs:** Many sources failing, proxy 429 errors, slow load times.

### Pitfall 6: Feed Dominated by One Source
**What goes wrong:** Reddit returns 15 posts * 8 subreddits = 120 items. YouTube returns 10 * 10 = 100. Tumblr returns 10 * 8 = 80. Feed is 40% Reddit.
**Why it happens:** More sources of one type = more items of that type.
**How to avoid:** Per-source post cap in config (`fetchCount`). Also consider a per-source-type cap in the feed mixing logic. The engagement weighting will help naturally if fan content gets high engagement.
**Warning signs:** Scrolling the feed and seeing mostly one source color badge.

### Pitfall 7: FeedSource Union Type Not Updated
**What goes wrong:** Adding Tumblr sources but FeedFilter doesn't show the chip, or filtering breaks.
**Why it happens:** `FeedSource` is a string literal union: `"reddit" | "youtube" | "news" | "rss" | "twitter"`. Need to add `"tumblr"`. The filter array in `FeedFilter.tsx` is hardcoded.
**How to avoid:** Update `FeedSource` type, update filter array, add badge color for tumblr.
**Warning signs:** TypeScript errors on `source: "tumblr"`, filter chip missing.

## Code Examples

### Extracting First Image from Tumblr HTML Description
```typescript
// Utility to extract first image URL from HTML content
function extractFirstImage(html: string): string | undefined {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const img = doc.querySelector("img");
    return img?.getAttribute("src") || undefined;
  } catch {
    return undefined;
  }
}
```

### Stats Display Component (FeedCard inline)
```typescript
// Inside FeedCard.tsx, in the feed-card-meta div
{item.stats && (
  <span className="feed-card-stats">
    {item.stats.upvotes != null && item.stats.upvotes >= MIN_STAT_THRESHOLD && (
      <span className="stat" title="Upvotes">
        <ArrowUpIcon /> {abbreviateNumber(item.stats.upvotes)}
      </span>
    )}
    {item.stats.comments != null && item.stats.comments >= MIN_STAT_THRESHOLD && (
      <span className="stat" title="Comments">
        <CommentIcon /> {abbreviateNumber(item.stats.comments)}
      </span>
    )}
    {item.stats.views != null && item.stats.views >= MIN_STAT_THRESHOLD && (
      <span className="stat" title="Views">
        <EyeIcon /> {abbreviateNumber(item.stats.views)}
      </span>
    )}
    {item.stats.likes != null && item.stats.likes >= MIN_STAT_THRESHOLD && (
      <span className="stat" title="Likes">
        <HeartIcon /> {abbreviateNumber(item.stats.likes)}
      </span>
    )}
  </span>
)}
```

### SourceEntry with Enabled Flag and Frequency
```typescript
// In src/config/types.ts -- extend SourceEntry
export interface SourceEntry {
  type: string;
  id: string;
  label: string;
  url: string;
  needsFilter: boolean;
  fetchCount?: number;
  refreshInterval?: number;  // Already exists
  priority?: number;
  enabled?: boolean;         // NEW: default true, allows toggling sources off
}
```

### Filtering Enabled Sources in Feed Orchestrator
```typescript
// In src/services/feeds.ts
const enabledSources = config.sources.filter((s) => s.enabled !== false);
const promises = enabledSources.map((source) => { /* ... */ });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RSS-only Tumblr | Tumblr API v2 + consumer key | Tumblr API v2 available since ~2012 | RSS has no note counts, API has note counts but needs auth |
| YouTube Data API for stats | YouTube Atom feed media:statistics | Always available | Atom feed gives views for free, no API key; Data API gives likes/dislikes but needs key |
| Reddit API v1 (OAuth) | Reddit JSON (.json suffix) | Still works, no OAuth needed | `.json` suffix on any Reddit URL returns post data with engagement stats, no auth required |

**Deprecated/outdated:**
- Tumblr API v1 (XML-based): Replaced by API v2 (JSON-based), but v1 XML endpoints may still work for some queries
- Reddit `ups`/`downs` accuracy: Vote fuzzing makes individual up/down counts unreliable; use `score` instead

## Source Curation Research

### Recommended Reddit Subreddits (Additional)
Currently in config: r/bangtan, r/kpop (with filter), r/heungtan, r/bts7

**Recommended additions:**
| Subreddit | Type | needsFilter | Rationale |
|-----------|------|-------------|-----------|
| r/kpoopheads | Memes | true | K-pop meme sub, active, filter for BTS keywords |
| r/kpoppers | Fan content | true | Fan-created content hub, filter for BTS keywords |
| r/BTSWorld | Game/fan | false | BTS World game community, all content is BTS |
| r/heungtan | Memes/fluff | false | Already in config -- the BTS meme sub |

**Note:** r/heungtan and r/bts7 are already in the config. The existing 4 subreddits (bangtan, kpop, heungtan, bts7) plus 2-3 additions reaches the 5-8 additional target from the baseline of r/bangtan alone.

**Quality threshold recommendation:** Subreddits with <1,000 subscribers or <1 post/week should be excluded. BTS-specific subs don't need keyword filtering; general K-pop subs do.

### Recommended YouTube Fan Channels
Currently in config: BANGTANTV (UCLkAepWjdylmXSltofFvsYQ), HYBE LABELS (UCx2hOXK_cGnRolCRilNUfA)

**Recommended additions (need channel ID verification):**
| Channel | Type | needsFilter | Notes |
|---------|------|-------------|-------|
| BANGTANSUBS | Translations | false | Fan translation team, all BTS content |
| WhatchaGot2Say | Reactions | true | Popular BTS reactor (358K subs), some non-BTS content |
| DKDKTV | K-pop commentary | true | Korean culture/K-pop channel, filter for BTS |
| Mexinese Family | Reactions | true | 229K subs, mostly BTS but some other K-pop |

**Channel ID resolution:** Channel IDs must be resolved before adding to config. Format is `UC...` (24 chars). Can be found via YouTube channel page source or YouTube Data API. The planner should include a task to verify and collect exact channel IDs.

**Quality threshold recommendation:** Channels with <50K subscribers or <1 video/month should be excluded. Reaction channels need keyword filtering since they cover multiple groups.

### Recommended Tumblr Blogs
| Blog | URL | Type | needsFilter |
|------|-----|------|-------------|
| btsfandom | btsfandom.tumblr.com/rss | News/updates | false |
| bangtan | bangtan.tumblr.com/rss | Official Tumblr | false |
| allforbts | allforbts.tumblr.com/rss | Fan content | false |
| 0613data | 0613data.tumblr.com/rss | Data/stats | false |
| beautifulpersonpeach | beautifulpersonpeach.tumblr.com/rss | Fan discussion | false |

**Quality threshold recommendation:** Blogs with <1 post/month or last post >3 months ago should be excluded. Verify blogs are still active before adding. All BTS-specific blogs don't need keyword filtering.

**Confidence:** LOW for specific blog/channel names -- these need validation at implementation time. Blogs may be inactive, channels may have changed focus. The planner should include verification as a task.

## Open Questions

1. **Tumblr note counts: RSS-only or add API key support?**
   - What we know: RSS provides all content but no engagement data. API v2 provides note counts but requires a free consumer key.
   - What's unclear: Whether the user wants to register a Tumblr app and add an API key to config.
   - Recommendation: Start with RSS-only (matches SRC-03 requirement). Tumblr cards will have no stats, which gracefully hides per STAT-03. Add API key support as optional enhancement if user requests it.

2. **YouTube `media:starRating count` as "likes" proxy**
   - What we know: YouTube Atom feed has `media:starRating count="N"` (total ratings) and `media:statistics views="N"`. There is no explicit "likes" field in the feed.
   - What's unclear: Whether `starRating count` is a meaningful proxy for likes, or if it includes dislikes too.
   - Recommendation: Use `views` as primary YouTube stat (HIGH confidence it's in the feed). Use `starRating count` as secondary "likes" only if verified to be meaningful after testing with a real feed. Worst case, show views-only for YouTube.

3. **CORS proxy rate limiting at 25+ sources**
   - What we know: Current 9 sources = 27 proxy requests (3 per source). 25 sources = 75 requests. Free proxies have undocumented limits.
   - What's unclear: Exact rate limits of allorigins, codetabs, corsproxy.io.
   - Recommendation: Monitor for failures. Use `enabled: false` to quickly disable problematic sources. Consider reducing to 2 proxy attempts for lower-priority sources, or adding small stagger delays between source batches.

4. **Exact YouTube fan channel IDs**
   - What we know: Channel names from search results.
   - What's unclear: Exact `UC...` channel IDs needed for the Atom feed URL.
   - Recommendation: Resolve channel IDs during implementation. Can be found by visiting channel page and checking page source for `channel_id` or using the `@handle` URL format to find the canonical channel ID.

## Sources

### Primary (HIGH confidence)
- Reddit JSON API: `post.data` contains `score`, `ups`, `downs`, `num_comments`, `upvote_ratio` -- verified via [Reddit API wiki](https://github.com/reddit-archive/reddit/wiki/JSON), [JC Chouinard](https://www.jcchouinard.com/documentation-on-reddit-apis-json/), [Simon Willison](https://til.simonwillison.net/reddit/scraping-reddit-json)
- Media RSS Specification: `media:community > media:statistics views="N"` and `media:starRating` -- verified via [RSS Board official spec](https://www.rssboard.org/media-rss)
- Tumblr RSS format: `{blog}.tumblr.com/rss` serves standard RSS -- verified via [Feedly docs](https://docs.feedly.com/article/360-how-to-follow-tumblr-feeds), [FeedSpot docs](https://docs.feedspot.com/article/137-how-to-follow-tumblr-feeds)
- Tumblr API v2: `/blog/{id}/posts` endpoint with `api_key` param returns `note_count` -- verified via [official Tumblr API docs](https://www.tumblr.com/docs/en/api/v2)
- Existing codebase: `src/services/sources/`, `src/config/`, `src/types/feed.ts` -- directly inspected

### Secondary (MEDIUM confidence)
- YouTube Atom feed contains `media:community` with `media:statistics views="N"` -- confirmed by Media RSS spec and multiple WebSearch sources, though not verified against a live YouTube feed in this research session
- BTS subreddit ecosystem (r/heungtan, r/bts7, r/kpoopheads, r/kpoppers) -- confirmed via [subredditstats.com](https://subredditstats.com/r/bangtan), WebSearch results

### Tertiary (LOW confidence)
- Specific YouTube fan channel names and subscriber counts -- from [Feedspot BTS YouTubers list](https://videos.feedspot.com/bts_youtube_channels/), Quora answers. Channel IDs not verified.
- Specific Tumblr blog activity/relevance -- from WebSearch results. Blogs may be inactive. Need verification at implementation time.
- `media:starRating count` as YouTube "likes" proxy -- spec says it's total ratings count, unclear if YouTube actually populates it or if it's meaningful.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extending existing patterns
- Architecture: HIGH -- extending existing `SourceEntry`/`FeedItem`/fetcher registry pattern
- Engagement data extraction: MEDIUM-HIGH -- Reddit JSON fields verified, YouTube media:statistics verified via spec but not live-tested
- Source curation: LOW -- specific blogs/channels need validation at implementation time
- Feed ordering algorithm: MEDIUM -- formula is reasonable but needs tuning post-implementation
- Pitfalls: HIGH -- based on direct codebase inspection and known API behaviors

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable domain, low churn)
