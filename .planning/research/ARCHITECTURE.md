# Architecture Research

**Domain:** Feed aggregation SPA expansion -- engagement stats, oEmbed embeds, new content sources, config-driven generalization
**Researched:** 2026-02-25
**Confidence:** HIGH (existing codebase fully audited, integration patterns verified against official docs)

## Current Architecture (Baseline)

Before specifying what changes, the existing system needs to be clearly mapped.

```
src/
  types/feed.ts          FeedItem, FeedSource, BiasId, MEMBER_KEYWORDS
  services/feeds.ts      5 fetcher functions + fetchAllFeeds/fetchAllFeedsIncremental
  utils/corsProxy.ts     3-proxy fallback chain (allorigins, codetabs, corsproxy.io)
  utils/xmlParser.ts     parseRSS, parseAtom for news/YouTube XML
  hooks/useFeed.ts       Caching (localStorage, 5m TTL), incremental loading, filtering
  hooks/useBias.ts       Bias selection persistence
  components/FeedCard    List view card
  components/SwipeFeed   Swipe view with YouTube iframe embedding
  components/FeedFilter  Source tab filter (hardcoded: all/reddit/youtube/news/twitter)
  components/BiasFilter  Member chip filter (hardcoded BTS members)
  data/members.ts        BTS member profiles (hardcoded)
  data/events.ts         Tour dates (hardcoded)
  data/news.ts           Static fallback news (hardcoded)
  pages/News.tsx         Orchestrator page wiring hooks to components
```

### Current Data Flow

```
[News.tsx page]
    |
    +--> useFeed(filter, biases) hook
    |      |
    |      +--> fetchAllFeedsIncremental(onItems)
    |      |      |
    |      |      +--> fetchReddit()     --> fetchWithProxy(reddit JSON) --> parse JSON
    |      |      +--> fetchYouTube()    --> fetchWithProxy(atom XML)    --> parseAtom()
    |      |      +--> fetchNews()       --> fetchWithProxy(RSS XML)     --> parseRSS()
    |      |      +--> fetchAllKPop()    --> fetchWithProxy(RSS XML)     --> parseRSS()
    |      |      +--> fetchTwitter()    --> fetchWithProxy(HTML)        --> regex parse
    |      |      |
    |      |      +--> each resolves --> onItems([...sorted]) --> setAllItems
    |      |
    |      +--> localStorage cache (5m TTL)
    |      +--> client-side filter by source + bias keywords
    |
    +--> FeedFilter (source tabs)
    +--> BiasFilter (member chips)
    +--> FeedCard (list) or SwipeFeed (swipe)
```

### Hardcoded BTS-Specific Values (Must Extract to Config)

| Location | What's Hardcoded | Extract To |
|----------|-----------------|------------|
| `feeds.ts` line 5 | `BTS_KEYWORDS` regex | `config.keywords.filterRegex` |
| `feeds.ts` lines 42-47 | Subreddit list (`bangtan`, `kpop`, `heungtan`, `bts7`) | `config.sources.reddit.subreddits` |
| `feeds.ts` lines 89-92 | YouTube channel IDs (BANGTANTV, HYBE) | `config.sources.youtube.channels` |
| `feeds.ts` lines 108, 132 | News feed URLs (soompi, allkpop) | `config.sources.news.feeds` |
| `feeds.ts` line 158 | Twitter/Nitter search query | `config.sources.twitter.searchQuery` |
| `feed.ts` lines 17-25 | `MEMBER_KEYWORDS` record | `config.members[].keywords` |
| `feed.ts` line 1 | `FeedSource` union type | Dynamic from config sources |
| `feed.ts` line 3 | `BiasId` union type | Dynamic from config member IDs |
| `BiasFilter.tsx` lines 3-11 | `memberChips` array (names, emojis, colors) | `config.members` |
| `FeedFilter.tsx` lines 8-14 | `filters` array (All/Reddit/YouTube/News/Twitter) | Generated from `config.sources` |
| `members.ts` all | BTS member data | `config.members` or separate config |
| `events.ts` all | BTS tour dates | `config.events` or separate config |
| `news.ts` all | Static fallback news | `config.fallbackNews` |
| `useFeed.ts` line 6 | `CACHE_KEY = "bts-feed-cache"` | `config.cacheKey` or derive from group ID |
| `useBias.ts` line 4 | `STORAGE_KEY = "bts-bias-selection"` | Derive from config group ID |
| `Home.tsx` | "BTS" branding, Korean text, tagline | `config.branding` |
| `News.tsx` lines 68-76 | Twitter follow link `@BTS_twt` | `config.social.twitter` |
| Various | `sourceBadgeColors` (duplicated in FeedCard + SwipeFeed) | `config.sources[].color` |

## System Overview (Target Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  FeedCard   │  │ SwipeFeed  │  │ EmbedCard   │  │ StatsBar    │  │
│  │ (MODIFY)   │  │ (MODIFY)   │  │ (NEW)       │  │ (NEW)       │  │
│  └────────────┘  └────────────┘  └─────────────┘  └─────────────┘  │
│  ┌────────────┐  ┌────────────┐                                     │
│  │ FeedFilter │  │ BiasFilter │  (MODIFY: config-driven)            │
│  │ (MODIFY)   │  │ (MODIFY)   │                                     │
│  └────────────┘  └────────────┘                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         Hook Layer                                  │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ useFeed (MODIFY)            │  │ useConfig (NEW)              │  │
│  │ - expanded FeedSource type  │  │ - loads/provides group config│  │
│  │ - engagement stats in items │  │ - React context provider     │  │
│  └─────────────────────────────┘  └──────────────────────────────┘  │
│  ┌─────────────────────────────┐                                    │
│  │ useBias (MODIFY)            │                                    │
│  │ - config-driven member IDs  │                                    │
│  └─────────────────────────────┘                                    │
├─────────────────────────────────────────────────────────────────────┤
│                         Service Layer                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ feeds.ts (MAJOR REFACTOR)                                    │   │
│  │ - All fetchers parameterized by config                       │   │
│  │ - fetchSubreddit/fetchYouTube accept source config objects   │   │
│  │ - Source registry: config.sources drives which fetchers run  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐    │
│  │ fetchTumblr │  │ fetchWeverse │  │ fetchEmbed (NEW)        │    │
│  │ (NEW)       │  │ (NEW)        │  │ - TikTok oEmbed         │    │
│  └─────────────┘  └──────────────┘  │ - YT Shorts embed URL   │    │
│                                      └─────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                         Config Layer (NEW)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ src/config/index.ts          -- exports active config        │   │
│  │ src/config/groups/bts.ts     -- BTS-specific config          │   │
│  │ src/config/types.ts          -- GroupConfig type definition   │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                         Utility Layer                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐    │
│  │ corsProxy  │  │ xmlParser  │  │ embedResolver (NEW)        │    │
│  │ (NO CHANGE)│  │ (NO CHANGE)│  │ - URL -> embed type + HTML │    │
│  └────────────┘  └────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status | Change Description |
|-----------|----------------|--------|-------------------|
| `config/types.ts` | TypeScript interfaces for GroupConfig, SourceConfig, MemberConfig | NEW | Defines the shape of all configurable data |
| `config/groups/bts.ts` | BTS-specific values extracted from hardcoded locations | NEW | Contains everything currently scattered across feeds.ts, feed.ts, members.ts, etc. |
| `config/index.ts` | Exports the active group config (import swap to change group) | NEW | Single import point for the whole app |
| `useConfig` hook | React context providing config to all components | NEW | Wraps app in ConfigProvider; components read config from context |
| `feeds.ts` | All source fetchers, now parameterized | REFACTOR | Every function takes config params instead of using hardcoded values |
| `FeedItem` type | Feed item data shape | MODIFY | Add `engagement?: EngagementStats` and `embedType?: EmbedType` fields |
| `FeedSource` type | Source discriminator | MODIFY | Add `"tumblr"`, `"weverse"`, `"embed"` to union; or make it `string` driven by config |
| `FeedCard` | List card display | MODIFY | Render engagement stats bar; detect embed-type items |
| `SwipeFeed` | Swipe card display | MODIFY | Render engagement stats; handle embed iframes for TikTok/Shorts |
| `EmbedCard` | Dedicated embed renderer for TikTok/YT Shorts | NEW | Renders oEmbed HTML or iframe; handles script loading |
| `StatsBar` | Engagement metrics display (upvotes, views, comments) | NEW | Reusable sub-component for both FeedCard and SwipeFeed |
| `FeedFilter` | Source filter tabs | MODIFY | Generate tabs from `config.sources` instead of hardcoded array |
| `BiasFilter` | Member filter chips | MODIFY | Generate chips from `config.members` instead of hardcoded array |
| `fetchTumblr` | Tumblr blog RSS fetcher | NEW | Uses existing `parseRSS` + `fetchWithProxy` pattern |
| `fetchWeverse` | Weverse content fetcher | NEW | See Weverse section below for feasibility caveats |
| `embedResolver` | URL-to-embed-type resolver | NEW | Detects TikTok/YT Shorts/Instagram URLs, returns embed metadata |

## Recommended Project Structure

```
src/
├── config/                    # NEW: Config-driven architecture
│   ├── types.ts               # GroupConfig, SourceConfig, MemberConfig interfaces
│   ├── index.ts               # Re-exports active config (swap import to change group)
│   └── groups/
│       └── bts.ts             # BTS config: keywords, subreddits, channels, members
├── services/
│   ├── feeds.ts               # REFACTOR: parameterized fetchers
│   ├── sources/               # NEW: one file per source type for cleanliness
│   │   ├── reddit.ts          # fetchReddit(config) with engagement stats
│   │   ├── youtube.ts         # fetchYouTube(config) for channels
│   │   ├── news.ts            # fetchNews(config) for RSS news sources
│   │   ├── twitter.ts         # fetchTwitter(config)
│   │   ├── tumblr.ts          # NEW: fetchTumblr(config) via RSS
│   │   ├── weverse.ts         # NEW: fetchWeverse(config) -- see caveats
│   │   └── embeds.ts          # NEW: fetchEmbeds(config) for TikTok/Shorts
│   └── registry.ts            # NEW: maps source type -> fetcher function
├── utils/
│   ├── corsProxy.ts           # NO CHANGE
│   ├── xmlParser.ts           # NO CHANGE
│   └── embedResolver.ts       # NEW: URL -> embed type detection + oEmbed fetch
├── types/
│   └── feed.ts                # MODIFY: add EngagementStats, EmbedType, expand FeedSource
├── hooks/
│   ├── useFeed.ts             # MODIFY: config-aware, expanded source types
│   ├── useBias.ts             # MODIFY: config-driven storage keys
│   └── useConfig.ts           # NEW: React context for config
├── components/
│   ├── FeedCard.tsx           # MODIFY: add StatsBar, embed detection
│   ├── SwipeFeed.tsx          # MODIFY: add StatsBar, embed rendering
│   ├── StatsBar.tsx           # NEW: engagement stats display
│   ├── EmbedCard.tsx          # NEW: TikTok/Shorts embed renderer
│   ├── FeedFilter.tsx         # MODIFY: config-driven tabs
│   ├── BiasFilter.tsx         # MODIFY: config-driven chips
│   └── ... (existing unchanged)
├── data/                      # DEPRECATE: move to config
│   ├── members.ts             # -> config/groups/bts.ts
│   ├── events.ts              # -> config/groups/bts.ts (or keep as data if shared structure)
│   └── news.ts                # -> config/groups/bts.ts
└── pages/
    ├── News.tsx               # MODIFY: read branding from config
    └── ... (minimal changes)
```

### Structure Rationale

- **config/groups/**: Each group gets one file. To clone for another fandom, copy `bts.ts` to `blackpink.ts`, edit values, update `config/index.ts` import. Zero code changes needed in services/components.
- **services/sources/**: Split the monolithic `feeds.ts` (currently 239 lines, 5 sources) into per-source modules. Each source is independently testable and follows the same interface: `(config: SourceConfig) => Promise<FeedItem[]>`.
- **services/registry.ts**: Maps source type strings to fetcher functions. When config says `sources: [{ type: "reddit", ... }, { type: "tumblr", ... }]`, the registry looks up the right fetcher. This is how new sources are added without touching orchestration code.
- **utils/embedResolver.ts**: Separate from feed fetching because embeds are a display concern -- a FeedItem from Reddit or Twitter might contain a TikTok link that should render as an embed.

## Architectural Patterns

### Pattern 1: Config-Driven Source Registry

**What:** A registry that maps source type strings to fetcher functions, driven by the group config. The orchestrator (feeds.ts) iterates config.sources, looks up each fetcher from the registry, and calls it with the source-specific config.

**When to use:** When the set of active data sources must be configurable without code changes.

**Trade-offs:** Adds indirection (source type -> function lookup) but eliminates hardcoded source lists. Worth it here because the whole point is clone-and-swap.

**Example:**
```typescript
// services/registry.ts
import { fetchReddit } from "./sources/reddit";
import { fetchYouTube } from "./sources/youtube";
import { fetchNews } from "./sources/news";
import { fetchTwitter } from "./sources/twitter";
import { fetchTumblr } from "./sources/tumblr";
import type { FeedItem } from "../types/feed";
import type { SourceConfig } from "../config/types";

type FeedFetcher = (config: SourceConfig) => Promise<FeedItem[]>;

const registry: Record<string, FeedFetcher> = {
  reddit: fetchReddit,
  youtube: fetchYouTube,
  news: fetchNews,
  twitter: fetchTwitter,
  tumblr: fetchTumblr,
};

export function getFetcher(sourceType: string): FeedFetcher | undefined {
  return registry[sourceType];
}

// services/feeds.ts (refactored orchestrator)
import type { GroupConfig } from "../config/types";
import { getFetcher } from "./registry";

export async function fetchAllFeedsIncremental(
  config: GroupConfig,
  onItems: FeedCallback
): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];

  const promises = config.sources.map((sourceConfig) => {
    const fetcher = getFetcher(sourceConfig.type);
    if (!fetcher) return Promise.resolve([]);

    return fetcher(sourceConfig)
      .then((items) => {
        allItems.push(...items);
        onItems([...allItems].sort((a, b) => b.timestamp - a.timestamp));
        return items;
      })
      .catch(() => [] as FeedItem[]);
  });

  await Promise.allSettled(promises);
  return allItems.sort((a, b) => b.timestamp - a.timestamp);
}
```

### Pattern 2: Engagement Stats as Optional Extension

**What:** Add an optional `engagement` field to `FeedItem` rather than making it required. Sources that provide stats (Reddit, YouTube) populate it; sources that don't (news RSS, Tumblr) leave it undefined. The UI gracefully shows stats when present, hides when absent.

**When to use:** When different data sources provide different levels of metadata richness.

**Trade-offs:** Optional fields mean null-checking in UI code, but this is far better than fake/zero stats or requiring all sources to provide engagement data.

**Example:**
```typescript
// types/feed.ts (additions)
export interface EngagementStats {
  upvotes?: number;       // Reddit score, YouTube likes
  comments?: number;      // Reddit num_comments, YouTube comment count
  views?: number;         // YouTube view count
  upvoteRatio?: number;   // Reddit upvote_ratio (0-1)
}

export type EmbedType = "tiktok" | "youtube-short" | "instagram-reel";

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  source: string;          // Was FeedSource union, now string for config flexibility
  sourceName: string;
  timestamp: number;
  preview?: string;
  thumbnail?: string;
  author?: string;
  engagement?: EngagementStats;  // NEW
  embedType?: EmbedType;         // NEW: if set, render as embed instead of link
  embedHtml?: string;            // NEW: oEmbed HTML for TikTok etc.
}
```

### Pattern 3: Embed Resolution as Post-Processing

**What:** After feed items are fetched, run a post-processor that inspects each item's URL. If it matches a known embed pattern (TikTok, YouTube Shorts), mark it with `embedType` and optionally fetch oEmbed HTML. This separates "what content exists" from "how to display it."

**When to use:** When embed-eligible content comes from multiple source types (a Reddit post linking to TikTok, a news article embedding a YouTube Short).

**Trade-offs:** Adds a processing step after fetch, but keeps fetchers simple. oEmbed fetches for TikTok require CORS proxy (same infrastructure already exists).

**Example:**
```typescript
// utils/embedResolver.ts
const EMBED_PATTERNS: { type: EmbedType; regex: RegExp }[] = [
  { type: "tiktok", regex: /tiktok\.com\/@[\w.-]+\/video\/(\d+)/ },
  { type: "youtube-short", regex: /youtube\.com\/shorts\/([\w-]{11})/ },
  { type: "youtube-short", regex: /youtu\.be\/([\w-]{11})/ },
];

export function detectEmbedType(url: string): EmbedType | undefined {
  for (const pattern of EMBED_PATTERNS) {
    if (pattern.regex.test(url)) return pattern.type;
  }
  return undefined;
}

export function getYouTubeShortsEmbedUrl(url: string): string | null {
  const match = url.match(/youtube\.com\/shorts\/([\w-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

// TikTok oEmbed must go through CORS proxy
export async function fetchTikTokOEmbed(videoUrl: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const text = await fetchWithProxy(oembedUrl);
    const data = JSON.parse(text);
    return data.html || null;
  } catch {
    return null;
  }
}
```

### Pattern 4: Config Object with Typed Structure

**What:** A single TypeScript interface that describes everything group-specific. One config file per group. The active config is re-exported from `config/index.ts`.

**When to use:** This specific project, where "clone-and-swap" generalization is a primary goal.

**Trade-offs:** Upfront effort to define and populate the config; but every hardcoded BTS reference already needs to move somewhere, and a typed config is the cleanest destination.

**Example:**
```typescript
// config/types.ts
export interface MemberConfig {
  id: string;
  stageName: string;
  realName: string;
  keywords: string[];       // For bias filtering
  emoji: string;            // For BiasFilter chip
  color: string;            // For BiasFilter chip
  birthday: string;
  role: string;
  position: string;
  image: string;
  gallery?: string[];
  bio: string;
  funFacts: string[];
  soloProjects: string[];
  socialMedia: { platform: string; handle: string; url?: string }[];
}

export interface SourceConfig {
  type: string;             // "reddit" | "youtube" | "news" | "twitter" | "tumblr" | "weverse"
  label: string;            // Display name for filter tab
  color: string;            // Badge color
  enabled: boolean;
  // Source-specific params stored as a typed union or generic record:
  params: RedditSourceParams | YouTubeSourceParams | NewsSourceParams
        | TwitterSourceParams | TumblrSourceParams;
}

export interface RedditSourceParams {
  subreddits: { name: string; filter: boolean }[];
  limit: number;
}

export interface YouTubeSourceParams {
  channels: { id: string; name: string; filter: boolean }[];
  limit: number;
}

export interface NewsSourceParams {
  feeds: { url: string; name: string }[];
  limit: number;
}

export interface TumblrSourceParams {
  blogs: { name: string; filter: boolean }[];
  tags?: string[];
  limit: number;
}

export interface TwitterSourceParams {
  searchQuery: string;
  limit: number;
}

export interface GroupConfig {
  id: string;                       // "bts", "blackpink", etc.
  name: string;                     // "BTS"
  subtitle?: string;                // Korean name, etc.
  tagline: string;
  filterRegex: RegExp;              // Global content filter
  members: MemberConfig[];
  sources: SourceConfig[];
  social: { platform: string; url: string; handle: string }[];
  branding: {
    heroImage: string;
    logoText: string;
  };
}
```

## Data Flow (Target)

### Feed Fetch Flow (Changed)

```
[News.tsx]
    |
    +--> useConfig()  -- reads GroupConfig from React context
    +--> useFeed(config, filter, biases)
           |
           +--> config.sources.forEach(sourceConfig => {
           |      registry.getFetcher(sourceConfig.type)(sourceConfig)
           |    })
           |
           |    Each fetcher:
           |    +--> fetchWithProxy(url built from sourceConfig.params)
           |    +--> parse response (JSON/RSS/Atom/HTML depending on type)
           |    +--> map to FeedItem[] WITH engagement stats where available
           |    +--> return items
           |
           +--> Post-process: detectEmbedType() on each item's URL
           +--> Cache with key derived from config.id
           +--> Filter by source + bias using config.members keywords
           |
           +--> return { items, loading, error, refresh }
```

### Engagement Stats Data Flow (New)

```
Reddit JSON response:
  post.data.score          --> engagement.upvotes
  post.data.num_comments   --> engagement.comments
  post.data.upvote_ratio   --> engagement.upvoteRatio

YouTube (Atom feed -- NO stats available):
  Stats require YouTube Data API v3 with API key
  Decision: skip YouTube engagement stats in v1 (API key = deployment friction)
  Alternative: show "Watch on YouTube" which implicitly signals engagement

Tumblr RSS:
  No engagement stats in RSS feeds
  Decision: no stats for Tumblr items

News RSS:
  No engagement stats in RSS
  Decision: no stats for news items

Twitter/Nitter:
  Nitter HTML may contain like/retweet counts but scraping is fragile
  Decision: best-effort parse, don't fail if missing
```

### Embed Rendering Flow (New)

```
FeedItem with embedType set:
    |
    +--> FeedCard/SwipeFeed checks item.embedType
    |
    +--> if "youtube-short":
    |      Render iframe with src="youtube.com/embed/{videoId}"
    |      Use 9:16 aspect ratio container (315x560 or responsive)
    |
    +--> if "tiktok":
    |      Insert item.embedHtml (blockquote from oEmbed)
    |      Load TikTok embed.js script (once, deduped)
    |      Or: render iframe fallback
    |
    +--> if "instagram-reel":
    |      BLOCKED: requires Meta developer app + access token
    |      Decision: skip Instagram embeds in v1, link out instead
    |
    +--> if no embedType:
           Existing behavior (thumbnail + link)
```

## Integration Points: What Changes vs What's New

### MODIFY: Existing Files That Change

| File | What Changes | Why | Risk |
|------|-------------|-----|------|
| `types/feed.ts` | Add `EngagementStats`, `EmbedType` interfaces; expand `FeedItem`; make `FeedSource` a string or wider union | New data fields need types | LOW -- additive, backward compatible |
| `services/feeds.ts` | Extract per-source fetchers to `sources/` dir; parameterize with config; add engagement stat extraction to Reddit fetcher | Config-driven architecture; engagement stats | MEDIUM -- largest refactor, touches all fetch logic |
| `hooks/useFeed.ts` | Accept config param; derive cache key from config.id; use registry instead of hardcoded source list | Config-driven | MEDIUM -- core hook changes |
| `hooks/useBias.ts` | Derive storage key from config.id; read member list from config | Config-driven | LOW -- small change |
| `components/FeedCard.tsx` | Add `StatsBar` rendering; detect embed items; read badge colors from config | Engagement stats display; config-driven | LOW -- additive UI change |
| `components/SwipeFeed.tsx` | Add `StatsBar`; handle TikTok/Shorts embeds; read colors from config | Same as FeedCard | MEDIUM -- embed rendering adds complexity |
| `components/FeedFilter.tsx` | Generate tabs from `config.sources` instead of hardcoded array | Config-driven | LOW -- straightforward |
| `components/BiasFilter.tsx` | Generate chips from `config.members` instead of hardcoded array | Config-driven | LOW -- straightforward |
| `pages/News.tsx` | Read branding/social from config; pass config to useFeed | Config-driven | LOW |
| `pages/Home.tsx` | Read group name, subtitle, tagline, hero image from config | Config-driven | LOW |

### NEW: Files That Don't Exist Yet

| File | Purpose | Depends On |
|------|---------|------------|
| `config/types.ts` | TypeScript interfaces for all config types | Nothing -- pure types |
| `config/groups/bts.ts` | BTS-specific config with all extracted values | `config/types.ts` |
| `config/index.ts` | Re-exports active group config | `config/groups/bts.ts` |
| `hooks/useConfig.ts` | React context for config distribution | `config/types.ts` |
| `services/registry.ts` | Source type to fetcher function mapping | Source modules |
| `services/sources/reddit.ts` | Reddit fetcher with engagement stats | `config/types.ts`, `corsProxy`, existing Reddit logic |
| `services/sources/youtube.ts` | YouTube Atom feed fetcher | `config/types.ts`, `corsProxy`, `xmlParser` |
| `services/sources/news.ts` | RSS news fetcher | `config/types.ts`, `corsProxy`, `xmlParser` |
| `services/sources/twitter.ts` | Twitter/Nitter scraper | `config/types.ts`, `corsProxy` |
| `services/sources/tumblr.ts` | Tumblr RSS fetcher | `config/types.ts`, `corsProxy`, `xmlParser` |
| `services/sources/weverse.ts` | Weverse content (limited -- see below) | `config/types.ts`, `corsProxy` |
| `services/sources/embeds.ts` | Embed content aggregator (TikTok, Shorts) | `config/types.ts`, `embedResolver` |
| `utils/embedResolver.ts` | URL pattern detection + oEmbed fetching | `corsProxy` |
| `components/StatsBar.tsx` | Engagement stats display sub-component | `types/feed.ts` |
| `components/EmbedCard.tsx` | TikTok/Shorts embed renderer | `types/feed.ts`, `embedResolver` |

## Source-Specific Integration Details

### Reddit: Engagement Stats (Easy, HIGH confidence)

Reddit's JSON API already returns engagement data in the same response we parse today. The `post.data` object includes `score`, `num_comments`, and `upvote_ratio`. Zero additional API calls needed.

**Change:** In `fetchSubreddit`, map these fields to `engagement`:
```typescript
engagement: {
  upvotes: d.score,
  comments: d.num_comments,
  upvoteRatio: d.upvote_ratio,
}
```

**Expanded subreddits** just means adding entries to `config.sources.reddit.subreddits`:
```typescript
// In bts.ts config
{ name: "btsmemes", filter: false },
{ name: "bts7", filter: false },
{ name: "bangtan", filter: false },
{ name: "kpop", filter: true },
// New:
{ name: "heungtan", filter: false },
{ name: "kpopmemes", filter: true },
```

### Tumblr: RSS Feed Integration (Easy, HIGH confidence)

Tumblr blogs expose RSS at `https://{blogname}.tumblr.com/rss`. Tagged posts at `https://{blogname}.tumblr.com/tagged/{tag}/rss`. This is exactly the same pattern as Soompi/AllKPop news -- fetch via CORS proxy, parse with existing `parseRSS()`.

**New fetcher:**
```typescript
// services/sources/tumblr.ts
export async function fetchTumblr(config: SourceConfig): Promise<FeedItem[]> {
  const params = config.params as TumblrSourceParams;
  const results = await Promise.allSettled(
    params.blogs.map(async (blog) => {
      const url = `https://${blog.name}.tumblr.com/rss`;
      const xml = await fetchWithProxy(url);
      const items = parseRSS(xml);
      return items
        .filter((item) => !blog.filter || filterRegex.test(item.title + item.description))
        .slice(0, params.limit)
        .map((item, i) => ({
          id: `tumblr-${blog.name}-${i}-${Date.now()}`,
          title: item.title || stripHtml(item.description).slice(0, 100),
          url: item.link,
          source: "tumblr",
          sourceName: blog.name,
          timestamp: new Date(item.pubDate).getTime() || Date.now(),
          preview: stripHtml(item.description).slice(0, 200),
        }));
    })
  );
  // ... flatten fulfilled results
}
```

No engagement stats available from Tumblr RSS.

### YouTube Channels: Fan Channels (Easy, HIGH confidence)

Identical to existing YouTube fetching -- just more channel IDs in config. Fan channels use the same Atom feed URL pattern: `youtube.com/feeds/videos.xml?channel_id={id}`.

**Config addition:**
```typescript
channels: [
  { id: "UCLkAepWjdylmXSltofFvsYQ", name: "BANGTANTV", filter: false },
  { id: "UCx2hOXK_cGnRolCRilNUfA", name: "HYBE LABELS", filter: true },
  // Fan channels:
  { id: "{channel_id}", name: "BangtanSubs", filter: false },
  { id: "{channel_id}", name: "KPOP VGK", filter: false },
]
```

**Engagement stats for YouTube:** NOT available from Atom feeds. Would require YouTube Data API v3 with an API key (10,000 quota units/day free). This adds deployment friction (every clone needs a Google API key). **Recommendation: defer YouTube engagement stats to a future phase.** Show subscriber count or nothing.

### TikTok Embeds via oEmbed (Medium, HIGH confidence)

TikTok's oEmbed endpoint (`https://www.tiktok.com/oembed?url={url}`) requires no authentication and returns HTML embed code. However, it does NOT have CORS headers, so it must go through the existing CORS proxy chain.

**Two approaches:**

1. **Curated TikTok URLs in config:** List specific TikTok accounts/hashtags to surface. Problem: TikTok has no RSS/feed equivalent, so we can't fetch a feed of videos from an account without their API (which requires app registration). TikTok videos will more likely arrive as links within Reddit posts or Twitter content.

2. **Post-processing detection:** When a Reddit post or tweet links to a TikTok video, detect the URL pattern and mark the FeedItem for embed rendering. This is the more realistic approach.

**Recommended approach:** Post-processing detection. Don't treat TikTok as a "source" but as an "embed type" that enriches items from other sources. Optionally, maintain a small curated list of TikTok video URLs in config for manual curation.

**Embed rendering:** Use the oEmbed `html` field (a `<blockquote>` element) plus TikTok's `embed.js` script. Load the script once, call `window.tiktokEmbed?.init()` after inserting HTML.

### YouTube Shorts Embeds (Easy, HIGH confidence)

YouTube Shorts use standard YouTube video IDs. Embedding is trivial: replace `/shorts/` with `/embed/` in the URL. No oEmbed call needed, no CORS issues.

```typescript
// In SwipeFeed/EmbedCard:
if (item.embedType === "youtube-short") {
  const videoId = item.url.match(/shorts\/([\w-]{11})/)?.[1];
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      style={{ aspectRatio: "9/16", width: "100%", maxWidth: 315 }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media"
      allowFullScreen
    />
  );
}
```

### Instagram Reels: BLOCKED (Do Not Build)

Instagram/Meta oEmbed requires a registered Facebook developer app, app review, and access tokens as of 2025. The old unauthenticated oEmbed endpoints were removed April 2025. This adds unacceptable deployment friction for a client-side-only app meant to be cloned.

**Decision: Do not implement Instagram Reel embeds.** If an item links to Instagram, render it as a regular link card. Revisit only if Meta relaxes requirements.

### Weverse: Limited Feasibility (MEDIUM confidence)

Weverse has no public API, no RSS feeds, and no oEmbed support. Existing open-source wrappers (MujyKun/Weverse on GitHub) require authenticated account tokens that expire every ~6 months. Weverse recently had a data breach incident (January 2026), making unofficial API access even more risky.

**Options (ranked by feasibility):**

1. **Curated links in config (recommended):** Maintain a small, manually curated list of Weverse post URLs or screenshots in the config. Display as static content cards linking to Weverse. No scraping, no auth, no breakage risk.

2. **RSS bridge service:** Use a third-party RSS-to-Weverse bridge (none currently reliable). NOT recommended.

3. **Authenticated scraping:** Use Weverse private API with account tokens. Requires server-side component (violates no-backend constraint), tokens expire, ToS violation risk. NOT recommended.

**Decision: Option 1 -- curated links.** The config for Weverse would be a simple array of link objects:
```typescript
weverse: {
  communityUrl: "https://weverse.io/bts/feed",
  curatedPosts: [
    { title: "Latest from Weverse", url: "https://weverse.io/bts/...", date: "..." }
  ]
}
```
This gives users a gateway to Weverse content without fragile scraping.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 5 sources (current) | Current proxy chain handles fine. ~5 parallel fetches. |
| 8-10 sources (after expansion) | CORS proxy load roughly doubles. allorigins.win may rate-limit. Add 1-2 more proxy fallbacks or consider a Cloudflare Worker proxy for reliability. |
| 15+ sources | localStorage cache becomes large (FeedItem[] serialized). Consider per-source caching or IndexedDB. |
| Clone-and-swap for 5+ groups | Config system handles this natively. No scaling concern -- each clone is independent. |

### Scaling Priorities

1. **First bottleneck: CORS proxy reliability.** Adding 3-4 new sources (Tumblr blogs, fan YouTube channels, expanded Reddit) means 3-4 more proxy requests per page load. The existing 3-proxy fallback helps, but free proxies have no SLA. **Mitigation:** Add a Cloudflare Worker as proxy option (free tier: 100K requests/day). Put it first in the chain.

2. **Second bottleneck: localStorage cache size.** With more sources and engagement data, the cached JSON grows. Currently ~50-70 items. With expansion, could be 100-150 items with engagement objects. Still fits localStorage (5MB limit, ~200KB for 150 items), but monitor.

3. **Third bottleneck: TikTok embed script loading.** Each TikTok embed loads `embed.js` which is ~500KB. If 10 TikTok embeds are visible, that is heavy. **Mitigation:** Lazy-load embeds (only initialize when scrolled into view via IntersectionObserver). The app already uses IntersectionObserver in SwipeFeed.

## Anti-Patterns

### Anti-Pattern 1: Making FeedSource a Union of All Possible Sources

**What people do:** `type FeedSource = "reddit" | "youtube" | "news" | "twitter" | "tumblr" | "weverse" | "embed"` -- and every time you add a source, you edit this type.

**Why it's wrong:** Defeats config-driven architecture. The whole point is that config defines what sources exist. A hardcoded union type means code changes for every new source.

**Do this instead:** Use `source: string` on FeedItem. Derive valid source types from `config.sources.map(s => s.type)` at runtime. Use the config as the source of truth, not the type system. If you want type safety for source-specific params, use discriminated unions in the config types (SourceConfig), not in FeedItem.

### Anti-Pattern 2: Fetching oEmbed for Every Item on Load

**What people do:** After fetching all feed items, loop through every URL and try to resolve oEmbed data. This means potentially dozens of additional CORS-proxied HTTP requests.

**Why it's wrong:** Multiplies load time and proxy usage. Most items are not embeddable. 95% of oEmbed attempts will be wasted.

**Do this instead:** Only call oEmbed for items that match known embed URL patterns (detected by regex, which is instant). And even then, prefer generating embed URLs client-side (YouTube Shorts -> `/embed/{id}`) over fetching oEmbed responses when possible. Only use oEmbed for TikTok where the embed HTML format is non-trivial.

### Anti-Pattern 3: Putting Group Config in Environment Variables

**What people do:** Use `VITE_GROUP_NAME=bts`, `VITE_SUBREDDITS=bangtan,kpop`, etc. in `.env` files for configuration.

**Why it's wrong:** Environment variables are flat strings. Config for this app is deeply nested (members with keywords, sources with params). Serializing/deserializing complex config from env vars is fragile and untyped. Also, Vite env vars are baked in at build time -- you can't change them at runtime.

**Do this instead:** Use TypeScript config files (`config/groups/bts.ts`). Full type safety, IDE autocomplete, easy to validate. The "swap" mechanism is changing one import in `config/index.ts`. This is a build-time swap (rebuild per group), which is fine because the constraint says "per-clone, not multi-tenant."

### Anti-Pattern 4: Duplicating Badge Colors and Helper Functions

**What people do:** The current codebase already has `sourceBadgeColors` duplicated in both `FeedCard.tsx` and `SwipeFeed.tsx`, and `timeAgo()` duplicated in both files.

**Why it's wrong:** Config-driven badge colors will need to be updated in 3+ places if this pattern continues.

**Do this instead:** Move `sourceBadgeColors` into config (`source.color`). Extract `timeAgo()` to `utils/format.ts`. Components read colors from config context or from the FeedItem's source config.

## Integration Points

### External Services

| Service | Integration Pattern | CORS Required | Auth Required | Notes |
|---------|---------------------|---------------|---------------|-------|
| Reddit JSON API | `r/{sub}/hot.json` via CORS proxy | YES | NO | Returns engagement stats natively |
| YouTube Atom Feeds | `youtube.com/feeds/videos.xml?channel_id=` via CORS proxy | YES | NO | No engagement stats in feed |
| YouTube Data API v3 | `googleapis.com/youtube/v3/videos?part=statistics` | NO (has CORS) | API KEY | 10K quota/day free. Defer to future phase. |
| Soompi/AllKPop RSS | Direct feed URLs via CORS proxy | YES | NO | Standard RSS parse |
| Tumblr RSS | `{blog}.tumblr.com/rss` via CORS proxy | YES | NO | Standard RSS parse, identical to news |
| TikTok oEmbed | `tiktok.com/oembed?url=` via CORS proxy | YES | NO | Returns HTML embed code |
| Instagram oEmbed | Meta Graph API oEmbed endpoint | N/A | YES (app + token) | BLOCKED -- do not implement |
| Weverse | No public API | N/A | YES (account token) | Use curated links only |
| Nitter/Twitter | HTML scraping via CORS proxy | YES | NO | Fragile, best-effort |
| CORS Proxies | allorigins.win, codetabs.com, corsproxy.io | N/A | NO | No SLA, add Cloudflare Worker |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Config <-> Components | React Context via `useConfig()` | Components never import config directly; always through hook |
| Config <-> Services | Direct import (services are not React) | `feeds.ts` receives config as function parameter |
| Registry <-> Source Modules | Function reference lookup | Registry maps string -> function, no coupling between sources |
| Feed Items <-> Embed Resolver | Post-processing step in useFeed | Items pass through embedResolver after fetch, before caching |
| StatsBar <-> FeedCard/SwipeFeed | Composed child component | StatsBar receives `engagement` prop, renders or returns null |
| EmbedCard <-> SwipeFeed | Composed child component | SwipeFeed delegates to EmbedCard when `embedType` is set |

## Suggested Build Order

Build order is driven by dependencies (what must exist before other things can use it) and risk (validate uncertain integrations early).

1. **Config types + BTS config extraction** -- Everything else depends on this. Define `GroupConfig`, `SourceConfig`, `MemberConfig` types. Create `bts.ts` with all extracted values. Wire up `config/index.ts`. No behavior change yet.

2. **Refactor feeds.ts into source modules + registry** -- Split monolithic `feeds.ts` into per-source files under `services/sources/`. Create registry. Refactor `fetchAllFeedsIncremental` to use registry + config. The app should work identically after this step.

3. **Config-drive all UI components** -- Wire `FeedFilter`, `BiasFilter`, `FeedCard`, `SwipeFeed`, `Home.tsx`, `News.tsx` to read from config instead of hardcoded values. Extract `timeAgo` and badge colors to shared utils/config. Add `useConfig` hook + context.

4. **Engagement stats on Reddit** -- Add `EngagementStats` to `FeedItem`. Update Reddit source to extract `score`, `num_comments`, `upvote_ratio`. Create `StatsBar` component. Wire into FeedCard + SwipeFeed. Lowest risk, highest visible impact.

5. **New sources: Tumblr + expanded Reddit + fan YouTube** -- Add source modules. Add entries to BTS config. These all follow existing patterns (RSS parse, JSON parse, Atom parse) so risk is low.

6. **Embed system: YouTube Shorts + TikTok** -- Create `embedResolver`. Add `EmbedCard` component. Wire embed detection into useFeed post-processing. YouTube Shorts is trivial (URL transform). TikTok needs oEmbed via proxy (test early).

7. **Weverse curated links** -- Simple config-driven static content. Low effort, low risk, do last.

## Sources

- Reddit JSON API fields: https://github.com/reddit-archive/reddit/wiki/JSON -- engagement stats (score, num_comments, upvote_ratio) confirmed in response payload
- TikTok oEmbed: https://developers.tiktok.com/doc/embed-videos/ -- no auth required, endpoint at `tiktok.com/oembed`, returns blockquote HTML
- TikTok embed CORS: https://github.com/iamcal/oembed/issues/302 -- oEmbed providers generally lack CORS headers; proxy required
- Instagram oEmbed (blocked): https://storrito.com/resources/Instagram-API-2026/ -- Meta requires developer app + access token as of 2025
- YouTube Shorts embedding: https://developers.google.com/youtube/player_parameters -- standard iframe embed, replace `/shorts/` with `/embed/`
- YouTube Data API v3 statistics: https://developers.google.com/youtube/v3/docs/videos/list -- view counts require API key
- Tumblr RSS: https://docs.feedly.com/article/360-how-to-follow-tumblr-feeds -- `{blog}.tumblr.com/rss` format confirmed
- Weverse: https://github.com/MujyKun/Weverse -- unofficial API requires auth tokens, expires ~6 months
- Weverse data breach: https://www.koreaherald.com/article/10648424 -- January 2026, additional risk for unofficial API use
- oEmbed CORS issues: https://github.com/bluesky-social/social-app/issues/7311 -- confirms server-side proxy needed for most oEmbed calls
- BTS fan YouTube channels: https://videos.feedspot.com/bts_youtube_channels/ -- 70+ channels identified

---
*Architecture research for: BTS Army Feed Expansion*
*Researched: 2026-02-25*
