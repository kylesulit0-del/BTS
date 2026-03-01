# Architecture Research

**Domain:** Backend scraping engine integration with existing React SPA -- server-side content aggregation, database storage, LLM moderation, REST API, smart blend engine
**Researched:** 2026-03-01
**Confidence:** HIGH (existing codebase fully audited, technology choices verified against official docs and community consensus)

## Existing Architecture (Baseline)

The current system is a client-side-only React SPA that fetches content through CORS proxies.

```
src/
  config/
    types.ts             GroupConfig, SourceEntry, MemberConfig, ThemeConfig
    index.ts             Re-exports active group config (btsConfig)
    groups/bts/
      index.ts           Assembles btsConfig (satisfies GroupConfig)
      sources.ts         21 SourceEntry items (reddit, youtube, rss, twitter, tumblr)
      members.ts         7 MemberConfig objects
      theme.ts           ThemeConfig (colors, branding)
      labels.ts          GroupLabels (UI strings, source labels)
      events.ts          Event[] (tour dates)
      news.ts            NewsItem[] (static fallback)
  types/feed.ts          FeedItem, FeedStats, VideoType, BiasId
  services/
    feeds.ts             fetchAllFeedsIncremental, applyFeedPipeline, scoring
    sources/
      registry.ts        getFetcher() lookup: type string -> SourceFetcher function
      reddit.ts          fetchRedditSource (JSON via CORS proxy)
      youtube.ts         fetchYouTubeSource (Atom XML via CORS proxy)
      rss.ts             fetchRssSource (RSS XML via CORS proxy)
      twitter.ts         fetchTwitterSource (Nitter HTML scrape via CORS proxy)
      tumblr.ts          fetchTumblrSource (RSS via CORS proxy)
  hooks/
    useFeed.ts           Caching (localStorage, 5m TTL), incremental loading, filtering
    useBias.ts           Bias selection persistence (localStorage)
  utils/
    corsProxy.ts         3-proxy fallback chain (Promise.any)
    xmlParser.ts         parseRSS, parseAtom
    sanitize.ts          DOMPurify-based HTML sanitization
    videoDetect.ts       YouTube Shorts / TikTok URL detection
  components/            FeedCard, SwipeFeed, FeedFilter, BiasFilter, etc.
  pages/                 Home, News, Members, MemberDetail, Tours
```

### Current Data Flow

```
[Browser] ──────────────────────────────────────────────────────
    |
    News.tsx ──> useFeed(filter, biases) hook
                    |
                    +--> fetchAllFeedsIncremental(onItems)
                    |      |
                    |      +--> 21 sources from config.sources
                    |      |    each: getFetcher(type) -> fetcher(source)
                    |      |    each fetcher: fetchWithProxy(url) -> parse -> FeedItem[]
                    |      |    (parallel, Promise.allSettled)
                    |      |
                    |      +--> applyFeedPipeline: dedupe -> cap -> engagement-score -> sort
                    |      +--> onItems callback: incremental UI updates
                    |
                    +--> localStorage cache (5m TTL)
                    +--> client-side filter by source type + member bias keywords
```

### Key Types (Existing)

```typescript
// src/types/feed.ts
interface FeedItem {
  id: string;
  title: string;
  url: string;
  source: FeedSource;        // string
  sourceName: string;
  timestamp: number;
  preview?: string;
  thumbnail?: string;
  author?: string;
  stats?: FeedStats;         // { upvotes, comments, views, likes, notes }
  videoType?: VideoType;     // "youtube-short" | "tiktok"
  videoId?: string;
}

// src/config/types.ts
interface SourceEntry {
  type: string;              // "reddit" | "youtube" | "rss" | "twitter" | "tumblr"
  id: string;                // "reddit-bangtan", "yt-bangtantv"
  label: string;
  url: string;
  needsFilter: boolean;      // Apply keywords regex to filter irrelevant content
  fetchCount?: number;
  refreshInterval?: number;
  priority?: number;
  enabled?: boolean;
}

interface GroupConfig {
  members: MemberConfig[];
  sources: SourceEntry[];
  theme: ThemeConfig;
  keywords: RegExp;          // Content relevance filter
  labels: GroupLabels;
  events: Event[];
  news: NewsItem[];
}
```

## Target Architecture (v2.0)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (existing SPA)                        │
│                                                                         │
│  React 19 + Vite 7 + react-router-dom v7                               │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐              │
│  │ FeedCard │  │SwipeFeed │  │FeedFilter │  │BiasFilter│              │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘              │
│       └──────────────┴──────────────┴──────────────┘                    │
│                          |                                              │
│                    useFeed hook                                         │
│                     (MODIFIED)                                          │
│                          |                                              │
│              ┌───────────┴────────────┐                                 │
│              │ API client (NEW)       │                                 │
│              │ GET /api/feed          │                                 │
│              │ GET /api/feed?source=  │                                 │
│              │ GET /api/feed?member=  │                                 │
│              └───────────┬────────────┘                                 │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │ HTTP (same origin or proxied)
┌──────────────────────────┼──────────────────────────────────────────────┐
│                     SERVER (NEW)                                        │
│                                                                         │
│  ┌───────────────────────┴────────────────────────────┐                 │
│  │                   REST API Layer                    │                 │
│  │              Fastify + TypeScript                   │                 │
│  │                                                     │                 │
│  │  GET /api/feed       (paginated, filtered, blended) │                 │
│  │  GET /api/feed/stats (source counts, last scrape)   │                 │
│  │  GET /api/config     (group config for frontend)    │                 │
│  └──────────────┬───────────────────┬──────────────────┘                 │
│                 │                   │                                    │
│  ┌──────────────┴───────┐  ┌───────┴───────────────────┐                │
│  │   Smart Blend Engine │  │   Query Layer             │                │
│  │                      │  │   Drizzle ORM             │                │
│  │ recency weighting    │  │                            │                │
│  │ engagement scoring   │  │  content_items table       │                │
│  │ source diversity     │  │  scrape_runs table         │                │
│  │ content type variety │  │  moderation_log table      │                │
│  └──────────────────────┘  └───────────┬───────────────┘                │
│                                        │                                │
│  ┌─────────────────────────────────────┴───────────────────────────┐    │
│  │                        SQLite Database                          │    │
│  │                    (better-sqlite3 driver)                      │    │
│  │                                                                 │    │
│  │  content_items: raw scraped content + engagement + moderation   │    │
│  │  scrape_runs: per-source scrape history and health              │    │
│  │  moderation_log: LLM decisions with reasoning                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Scheduler (node-cron)                       │    │
│  │                                                                 │    │
│  │  Every 15-30 min:                                               │    │
│  │    1. Run scrapers for each enabled source                      │    │
│  │    2. Deduplicate against existing content                      │    │
│  │    3. Queue new items for LLM moderation                        │    │
│  │    4. Update engagement stats for recent items                  │    │
│  └──────────────┬──────────────────────────────────────────────────┘    │
│                 │                                                       │
│  ┌──────────────┴──────────────────────────────────────────────────┐    │
│  │                     Scraper Engine                               │    │
│  │                                                                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │ Reddit   │ │ YouTube  │ │   RSS    │ │ Twitter  │           │    │
│  │  │ Scraper  │ │ Scraper  │ │ Scraper  │ │ Scraper  │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │    │
│  │  │ Tumblr   │ │ TikTok   │ │Instagram │                        │    │
│  │  │ Scraper  │ │ Scraper  │ │ Scraper  │                        │    │
│  │  └──────────┘ └──────────┘ └──────────┘                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                 │                                                       │
│  ┌──────────────┴──────────────────────────────────────────────────┐    │
│  │                   LLM Moderation Pipeline                        │    │
│  │                                                                  │    │
│  │  raw content ──> relevance check ──> safety check ──> finalized  │    │
│  │                                                                  │    │
│  │  Provider-agnostic: Claude / OpenAI / Gemini via adapter         │    │
│  │  Batch processing: groups of 10-20 items per LLM call            │    │
│  │  Fallback: if LLM unavailable, items stay in "pending" state     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   Shared Package (@bts/shared)                   │    │
│  │                                                                  │    │
│  │  FeedItem, FeedStats, SourceEntry, GroupConfig types             │    │
│  │  Shared by frontend + server via npm workspaces                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Scraper Engine | Fetch raw content from external sources on a schedule | Per-source scraper modules, server-side HTTP (no CORS issues) |
| Database (SQLite) | Persist all scraped content with engagement metrics and moderation status | Drizzle ORM + better-sqlite3, file-based, zero ops |
| LLM Moderation Pipeline | Filter/classify content for relevance and safety | Provider-agnostic adapter pattern, batch processing |
| Smart Blend Engine | Compute feed ordering from recency, engagement, source diversity, content type | Scoring algorithm applied at query time |
| REST API (Fastify) | Serve finalized content to the frontend | Typed routes, cursor pagination, filter params |
| Scheduler (node-cron) | Orchestrate scraping cadence per source | Cron expressions, staggered to avoid bursts |
| Shared Types Package | Single source of truth for TypeScript types | npm workspace package, imported by both frontend and server |
| API Client (frontend) | Replace client-side fetching with API consumption | Thin fetch wrapper in useFeed hook |

## Monorepo Structure

Use npm workspaces (built into npm 7+, already the package manager). No Turborepo or pnpm needed -- the project has two packages and a shared types library. Turborepo adds complexity that is not justified here.

```
bts/
├── package.json                    # Root: workspaces config
├── tsconfig.json                   # Root: project references
│
├── packages/
│   ├── shared/                     # @bts/shared -- types + utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── feed.ts         # FeedItem, FeedStats (MOVED from src/types/)
│   │       │   ├── config.ts       # GroupConfig, SourceEntry (MOVED from src/config/types.ts)
│   │       │   └── api.ts          # API request/response types (NEW)
│   │       └── index.ts            # Re-exports all types
│   │
│   ├── frontend/                   # Existing React SPA (MOVED from root src/)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── config/             # Group configs (existing, unchanged)
│   │       ├── components/         # React components (existing)
│   │       ├── hooks/              # useFeed (MODIFIED), useBias (existing)
│   │       ├── pages/              # Page components (existing)
│   │       ├── services/
│   │       │   ├── api.ts          # NEW: API client (replaces feeds.ts for API mode)
│   │       │   └── feeds.ts        # KEPT: fallback for offline/dev mode
│   │       └── utils/              # Existing utilities
│   │
│   └── server/                     # NEW: Backend scraping engine
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Entry point: start Fastify + scheduler
│           ├── api/
│           │   ├── server.ts       # Fastify instance setup
│           │   └── routes/
│           │       ├── feed.ts     # GET /api/feed (paginated, filtered, blended)
│           │       ├── stats.ts    # GET /api/feed/stats (health/counts)
│           │       └── config.ts   # GET /api/config (group config for frontend)
│           ├── db/
│           │   ├── client.ts       # Drizzle + better-sqlite3 connection
│           │   ├── schema.ts       # Table definitions
│           │   └── migrations/     # Drizzle Kit generated migrations
│           ├── scrapers/
│           │   ├── base.ts         # BaseScraper abstract class
│           │   ├── reddit.ts       # Reddit scraper (server-side, no CORS proxy)
│           │   ├── youtube.ts      # YouTube scraper (Atom + optional Data API)
│           │   ├── rss.ts          # Generic RSS scraper (Soompi, AllKPop)
│           │   ├── twitter.ts      # Twitter/X scraper (Nitter or direct)
│           │   ├── tumblr.ts       # Tumblr RSS scraper
│           │   ├── tiktok.ts       # TikTok scraper (public pages)
│           │   ├── instagram.ts    # Instagram scraper (public profiles)
│           │   └── registry.ts     # Maps source type -> scraper class
│           ├── moderation/
│           │   ├── pipeline.ts     # Orchestrates: raw -> relevance -> safety -> finalized
│           │   ├── providers/
│           │   │   ├── base.ts     # LLMProvider interface
│           │   │   ├── claude.ts   # Claude adapter
│           │   │   ├── openai.ts   # OpenAI adapter
│           │   │   └── mock.ts     # Mock provider for testing/dev
│           │   └── prompts.ts      # Moderation prompt templates
│           ├── blend/
│           │   └── engine.ts       # Smart blend scoring + ordering
│           ├── scheduler/
│           │   └── cron.ts         # node-cron job definitions
│           └── config/
│               └── index.ts        # Server config (env vars, LLM keys, DB path)
```

### Structure Rationale

- **packages/shared/**: Types that must be identical between frontend and server. The frontend's `FeedItem` must match what the API returns. Npm workspaces make this a zero-config internal dependency (`"@bts/shared": "workspace:*"` in package.json).
- **packages/frontend/**: The existing SPA, moved into a workspace. Minimal changes -- the import paths for types change from `../types/feed` to `@bts/shared`, and `useFeed` gains an API-fetch mode.
- **packages/server/**: The entire backend is new. Separated from frontend because it has different dependencies (better-sqlite3, node-cron, LLM SDKs), different tsconfig (Node target, not browser), and different build/run lifecycle.
- **server/scrapers/**: Mirrors the existing `services/sources/` pattern. Each source type gets one file. Server-side scrapers have no CORS limitations and can use native `fetch` or `cheerio` for HTML parsing.
- **server/moderation/providers/**: Adapter pattern for LLM providers. The pipeline calls a generic `LLMProvider.moderate(items)` method; the concrete adapter translates to Claude/OpenAI/etc.
- **server/blend/**: Separated from API routes because blend scoring is reusable logic that the scheduler might also invoke (pre-compute blend scores after moderation).

## Architectural Patterns

### Pattern 1: Scraper Plugin Architecture

**What:** Each content source is a class extending `BaseScraper`. The base class handles common concerns (error handling, rate limiting, source config loading). Concrete scrapers implement `scrape()` which returns normalized content items. A registry maps `SourceEntry.type` to the scraper class.

**When to use:** When you have N data sources with similar lifecycle but different parsing logic.

**Trade-offs:** Adds class hierarchy overhead, but scrapers are the core domain of this backend. The structure pays for itself immediately because each scraper needs error handling, retry logic, and health tracking.

**Example:**
```typescript
// server/scrapers/base.ts
import type { SourceEntry } from "@bts/shared";

export interface ScrapedItem {
  externalId: string;          // Source-specific unique ID
  source: string;              // "reddit", "youtube", etc.
  sourceId: string;            // SourceEntry.id (e.g. "reddit-bangtan")
  sourceName: string;          // SourceEntry.label
  title: string;
  url: string;
  content?: string;            // Full text/HTML for moderation
  preview?: string;            // Short preview text
  thumbnail?: string;
  author?: string;
  publishedAt: Date;
  engagement: {
    upvotes?: number;
    comments?: number;
    views?: number;
    likes?: number;
    shares?: number;
  };
  videoType?: string;
  videoId?: string;
  raw?: Record<string, unknown>;  // Original API response for debugging
}

export abstract class BaseScraper {
  constructor(protected source: SourceEntry) {}

  abstract scrape(): Promise<ScrapedItem[]>;

  protected get sourceType(): string {
    return this.source.type;
  }

  protected get limit(): number {
    return this.source.fetchCount ?? 15;
  }
}

// server/scrapers/reddit.ts
export class RedditScraper extends BaseScraper {
  async scrape(): Promise<ScrapedItem[]> {
    // Server-side: direct fetch, no CORS proxy needed
    const url = `https://www.reddit.com/r/${this.source.url}/hot.json?limit=${this.limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "bts-feed-scraper/2.0" },
    });
    const data = await res.json();
    const posts = data?.data?.children ?? [];

    return posts
      .filter((p: any) => !p.data.stickied)
      .map((p: any) => ({
        externalId: p.data.id,
        source: "reddit",
        sourceId: this.source.id,
        sourceName: this.source.label,
        title: p.data.title,
        url: `https://www.reddit.com${p.data.permalink}`,
        content: p.data.selftext || undefined,
        preview: p.data.selftext?.slice(0, 200) || undefined,
        thumbnail: this.extractImage(p.data),
        author: `u/${p.data.author}`,
        publishedAt: new Date(p.data.created_utc * 1000),
        engagement: {
          upvotes: p.data.score,
          comments: p.data.num_comments,
        },
      }));
  }

  private extractImage(d: any): string | undefined {
    // Reuse existing image extraction logic from frontend reddit.ts
    // (same logic, no CORS proxy needed for the scraper itself)
  }
}

// server/scrapers/registry.ts
import type { SourceEntry } from "@bts/shared";
import { BaseScraper } from "./base";
import { RedditScraper } from "./reddit";
import { YouTubeScraper } from "./youtube";
// ... etc

const scraperMap: Record<string, new (source: SourceEntry) => BaseScraper> = {
  reddit: RedditScraper,
  youtube: YouTubeScraper,
  rss: RssScraper,
  twitter: TwitterScraper,
  tumblr: TumblrScraper,
  tiktok: TikTokScraper,
  instagram: InstagramScraper,
};

export function createScraper(source: SourceEntry): BaseScraper | undefined {
  const ScraperClass = scraperMap[source.type];
  if (!ScraperClass) return undefined;
  return new ScraperClass(source);
}
```

### Pattern 2: Three-Stage Content Pipeline

**What:** Content flows through three stages: `raw` (scraped but unmoderated), `pending` (queued for LLM moderation), `approved`/`rejected` (LLM decision made). The API serves only `approved` content. This decouples scraping speed from moderation speed.

**When to use:** When content must be filtered before serving, and the filter (LLM) is slower/costlier than the ingestion.

**Trade-offs:** Adds a `status` column and complicates queries slightly. But it means the scraper can run fast without waiting for LLM responses, and the frontend always gets clean data.

**Example:**
```typescript
// Content status lifecycle
type ContentStatus = "raw" | "pending" | "approved" | "rejected";

// In scheduler:
// 1. Scraper runs -> inserts items with status "raw"
// 2. Moderation job picks up "raw" items -> sets to "pending"
// 3. LLM returns decisions -> sets to "approved" or "rejected"
// 4. API query: WHERE status = 'approved'

// server/moderation/pipeline.ts
export class ModerationPipeline {
  constructor(private provider: LLMProvider, private db: Database) {}

  async processNewItems(): Promise<void> {
    // 1. Get unmoderated items
    const rawItems = await this.db.getItemsByStatus("raw");
    if (rawItems.length === 0) return;

    // 2. Mark as pending
    await this.db.updateStatus(rawItems.map(i => i.id), "pending");

    // 3. Batch moderate (10-20 items per LLM call for cost efficiency)
    const batches = chunk(rawItems, 15);
    for (const batch of batches) {
      const decisions = await this.provider.moderate(batch);
      for (const decision of decisions) {
        await this.db.updateModeration(
          decision.itemId,
          decision.approved ? "approved" : "rejected",
          decision.reason,
          decision.relevanceScore,
        );
      }
    }
  }
}
```

### Pattern 3: Provider-Agnostic LLM Adapter

**What:** An interface that abstracts the LLM provider. Concrete adapters for Claude, OpenAI, etc. implement the same `moderate()` method. The active provider is set by environment variable.

**When to use:** When the project explicitly requires "configurable LLM provider" and you want to avoid vendor lock-in.

**Trade-offs:** Slight abstraction overhead, but the interface is tiny (one method). Worth it because LLM pricing changes rapidly and you want to switch providers without rewriting moderation logic.

**Example:**
```typescript
// server/moderation/providers/base.ts
export interface ModerationDecision {
  itemId: string;
  approved: boolean;
  relevanceScore: number;   // 0-1, how relevant to the fandom
  reason: string;            // LLM's reasoning (stored for debugging)
}

export interface ModerationInput {
  id: string;
  title: string;
  content?: string;
  source: string;
  url: string;
}

export interface LLMProvider {
  moderate(items: ModerationInput[]): Promise<ModerationDecision[]>;
}

// server/moderation/providers/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ModerationInput, ModerationDecision } from "./base";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async moderate(items: ModerationInput[]): Promise<ModerationDecision[]> {
    const prompt = buildModerationPrompt(items);  // From prompts.ts
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    return parseModerationResponse(response, items);
  }
}

// Selection via env var
// server/config/index.ts
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  switch (provider) {
    case "claude":
      return new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
    case "openai":
      return new OpenAIProvider(process.env.OPENAI_API_KEY!);
    default:
      return new MockProvider();  // Approves everything -- for dev/testing
  }
}
```

### Pattern 4: Smart Blend Scoring

**What:** A scoring function that weights content by recency, engagement, source diversity, and content type variety. Applied at query time (not at scrape time) so the blend adapts as new content arrives.

**When to use:** When the feed should surface a diverse, engaging mix rather than being dominated by one source or content type.

**Trade-offs:** Query-time scoring adds computation per API request. For the expected scale (hundreds of items, not millions), this is negligible. Pre-computing scores would add staleness.

**Example:**
```typescript
// server/blend/engine.ts
interface BlendConfig {
  recencyWeight: number;       // 0.35 -- newer is better
  engagementWeight: number;    // 0.30 -- higher engagement is better
  diversityWeight: number;     // 0.20 -- penalize source concentration
  varietyWeight: number;       // 0.15 -- penalize content type concentration
}

const DEFAULT_BLEND: BlendConfig = {
  recencyWeight: 0.35,
  engagementWeight: 0.30,
  diversityWeight: 0.20,
  varietyWeight: 0.15,
};

export function computeBlendScore(
  item: ContentItem,
  allItems: ContentItem[],
  config: BlendConfig = DEFAULT_BLEND,
): number {
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Recency: linear decay over maxAge
  const recency = Math.max(0, 1 - (now - item.publishedAt.getTime()) / maxAge);

  // Engagement: log-normalized (same approach as current computeFeedScore)
  const engValue = normalizeEngagement(item);
  const engagement = engValue > 0 ? Math.log10(1 + engValue) / 6 : 0;

  // Source diversity: penalize if this source already has many items in top N
  const sourceCount = allItems
    .filter(i => i.source === item.source)
    .length;
  const diversity = 1 / Math.sqrt(sourceCount);

  // Content type variety: penalize if this type (video/article/image) dominates
  const typeCount = allItems
    .filter(i => i.contentType === item.contentType)
    .length;
  const variety = 1 / Math.sqrt(typeCount);

  return (
    config.recencyWeight * recency +
    config.engagementWeight * engagement +
    config.diversityWeight * diversity +
    config.varietyWeight * variety
  );
}
```

### Pattern 5: Frontend Transition Strategy (Dual-Mode useFeed)

**What:** The `useFeed` hook gains a mode switch: `api` mode (fetch from REST API) or `client` mode (existing client-side fetching). This enables a gradual transition where the frontend can fall back to client-side fetching if the API is unavailable.

**When to use:** During the transition period and for development without the server running.

**Trade-offs:** Maintaining two code paths temporarily adds complexity. But it de-risks the migration -- the frontend works with or without the backend.

**Example:**
```typescript
// packages/frontend/src/hooks/useFeed.ts (modified)
import { fetchFeedFromAPI } from "../services/api";
import { fetchAllFeedsIncremental } from "../services/feeds";

const API_BASE = import.meta.env.VITE_API_URL; // undefined = no backend

export function useFeed(filter = "all", biases: string[] = []) {
  // ... existing state setup ...

  const load = useCallback(async (force = false) => {
    // ...
    if (API_BASE) {
      // v2.0 mode: fetch from REST API
      const data = await fetchFeedFromAPI(API_BASE, { filter, biases });
      setAllItems(data.items);
    } else {
      // v1.0 fallback: client-side fetching
      const finalItems = await fetchAllFeedsIncremental((items) => {
        setAllItems(items);
      });
      setCache(finalItems);
    }
    // ...
  }, [filter, biases]);

  // ... rest unchanged ...
}

// packages/frontend/src/services/api.ts (NEW)
import type { FeedItem } from "@bts/shared";

interface FeedResponse {
  items: FeedItem[];
  cursor?: string;
  total: number;
}

export async function fetchFeedFromAPI(
  baseUrl: string,
  params: { filter?: string; biases?: string[]; cursor?: string; limit?: number },
): Promise<FeedResponse> {
  const url = new URL("/api/feed", baseUrl);
  if (params.filter && params.filter !== "all") {
    url.searchParams.set("source", params.filter);
  }
  if (params.biases?.length) {
    url.searchParams.set("members", params.biases.join(","));
  }
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  }
  url.searchParams.set("limit", String(params.limit ?? 50));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

## Database Schema

### Table Design

```typescript
// server/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const contentItems = sqliteTable("content_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Identity
  externalId: text("external_id").notNull(),          // Reddit post ID, YouTube video ID, etc.
  source: text("source").notNull(),                    // "reddit", "youtube", "rss", etc.
  sourceId: text("source_id").notNull(),               // SourceEntry.id ("reddit-bangtan")
  sourceName: text("source_name").notNull(),           // SourceEntry.label ("r/bangtan")

  // Content
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content"),                            // Full text for moderation
  preview: text("preview"),                            // Truncated preview
  thumbnail: text("thumbnail"),
  author: text("author"),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),

  // Engagement (updated on re-scrape)
  upvotes: integer("upvotes"),
  comments: integer("comments"),
  views: integer("views"),
  likes: integer("likes"),
  shares: integer("shares"),

  // Video metadata
  videoType: text("video_type"),                       // "youtube-short", "tiktok"
  videoId: text("video_id"),

  // Moderation
  status: text("status").notNull().default("raw"),     // "raw" | "pending" | "approved" | "rejected"
  relevanceScore: real("relevance_score"),             // 0-1, from LLM
  moderationReason: text("moderation_reason"),         // LLM reasoning

  // Metadata
  scrapedAt: integer("scraped_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull(),               // SourceEntry.id
  source: text("source").notNull(),                    // Source type
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  itemsFound: integer("items_found").default(0),
  itemsNew: integer("items_new").default(0),
  status: text("status").notNull(),                    // "running" | "success" | "error"
  errorMessage: text("error_message"),
});

export const moderationLog = sqliteTable("moderation_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentItemId: integer("content_item_id").notNull(),
  provider: text("provider").notNull(),                // "claude", "openai", "mock"
  model: text("model"),                                // "claude-sonnet-4-20250514", etc.
  decision: text("decision").notNull(),                // "approved" | "rejected"
  relevanceScore: real("relevance_score"),
  reason: text("reason"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costUsd: real("cost_usd"),                           // Track LLM spend
  processedAt: integer("processed_at", { mode: "timestamp" }).notNull(),
});

// Indexes
// CREATE UNIQUE INDEX idx_content_external ON content_items(source, external_id);
// CREATE INDEX idx_content_status ON content_items(status);
// CREATE INDEX idx_content_published ON content_items(published_at);
// CREATE INDEX idx_content_source ON content_items(source);
// CREATE INDEX idx_scrape_source ON scrape_runs(source_id);
```

### Schema Design Rationale

- **Flat engagement columns** instead of a JSON blob: enables SQL-based sorting/filtering by engagement metrics. `ORDER BY upvotes DESC` is a simple index scan, not a JSON extraction.
- **`externalId` + `source` unique constraint**: deduplication at the database level. If a Reddit post is scraped twice, the second insert is rejected or triggers an engagement update.
- **`status` column on content_items**: the three-stage pipeline state machine. The API filter `WHERE status = 'approved'` is the core safety gate.
- **`scrape_runs` table**: operational visibility. "When was the last successful scrape for r/bangtan?" and "Which sources are failing?" are answerable from this table.
- **`moderation_log` table**: audit trail. Tracks which LLM provider made which decision, at what cost. Essential for debugging false positives/negatives and tracking LLM spend.

## Data Flow (Target v2.0)

### Scraping Flow (Server-Side, Scheduled)

```
[Scheduler] ─── every 15-30 min ───> [Scraper Engine]
                                          |
    For each enabled source in config.sources:
        |
        createScraper(source) -> scraper.scrape()
        |
        +--> Direct HTTP fetch (no CORS proxy needed server-side)
        +--> Parse response (JSON, XML, HTML depending on source)
        +--> Return ScrapedItem[]
        |
        +--> Deduplicate against DB (check externalId + source)
        +--> INSERT new items with status = "raw"
        +--> UPDATE engagement stats for existing items
        +--> Log scrape_run (items found, items new, errors)
```

### Moderation Flow (Server-Side, Post-Scrape)

```
[Scheduler] ─── after scrape completes ───> [Moderation Pipeline]
                                                  |
    1. SELECT * FROM content_items WHERE status = "raw" LIMIT 50
    2. Set status = "pending"
    3. Batch items (15 per LLM call)
    4. For each batch:
        |
        +--> Build prompt:
        |    "You are a content moderator for a BTS fan community.
        |     For each item, decide: is this relevant to BTS/ARMY?
        |     Return JSON: { items: [{ id, approved, relevance, reason }] }"
        |
        +--> Call LLM provider (Claude / OpenAI / mock)
        +--> Parse structured response
        +--> UPDATE content_items SET status, relevance_score, moderation_reason
        +--> INSERT moderation_log (provider, model, tokens, cost)
    5. If LLM unavailable:
        |
        +--> Items stay "pending" (not "raw" -- won't be re-picked)
        +--> Next scheduler run retries pending items
        +--> Fallback: if items are pending > 1 hour, auto-approve
             (configurable: `AUTO_APPROVE_AFTER_MS`)
```

### API Feed Serving Flow

```
[Frontend] ──> GET /api/feed?source=reddit&members=jimin&limit=50&cursor=abc123
                    |
    [Fastify Route Handler]
        |
        +--> Query DB: SELECT FROM content_items
        |    WHERE status = 'approved'
        |    AND (source = 'reddit' OR no source filter)
        |    AND (title/content matches member keywords OR no member filter)
        |    ORDER BY blend_score(recency, engagement, diversity) DESC
        |    LIMIT 51  (fetch one extra to detect hasMore)
        |
        +--> Apply Smart Blend Engine (re-score for diversity in this result set)
        +--> Build cursor from last item's (published_at, id)
        +--> Transform DB rows to FeedItem[] (shared type)
        +--> Return { items, cursor, total }
```

### Frontend Consumption Flow (Modified)

```
[Browser] ──────────────────────────────────────────────────────
    |
    News.tsx ──> useFeed(filter, biases) hook
                    |
                    +--> if VITE_API_URL is set:
                    |      fetchFeedFromAPI(apiUrl, { filter, biases, cursor })
                    |      Returns FeedItem[] from server (pre-moderated, blended)
                    |      No client-side dedup/scoring needed
                    |      Cursor-based pagination for "load more"
                    |
                    +--> else (no backend, dev/offline mode):
                    |      fetchAllFeedsIncremental (existing client-side path)
                    |      Same as current v1.0 behavior
                    |
                    +--> setAllItems(items)
                    +--> Filter by source type + bias (may be done server-side too)
```

## REST API Design

### Endpoints

```
GET /api/feed
  Query params:
    source    string    Filter by source type ("reddit", "youtube", etc.)
    members   string    Comma-separated member IDs for bias filter ("jimin,v")
    limit     number    Items per page (default 50, max 100)
    cursor    string    Opaque cursor for pagination (base64 of publishedAt:id)
    sort      string    "blend" (default) | "recent" | "engagement"
  Response:
    {
      items: FeedItem[],
      cursor: string | null,
      total: number,
      sources: { type: string, count: number }[]
    }

GET /api/feed/stats
  Response:
    {
      totalItems: number,
      bySource: { [source: string]: { total: number, approved: number, lastScrape: string } },
      moderationStats: { pending: number, approved: number, rejected: number },
      lastScrapeAt: string
    }

GET /api/config
  Response:
    {
      group: { name, tagline, fandomName },
      sources: SourceEntry[],
      members: { id, stageName, emoji, color }[],
      theme: ThemeConfig
    }
```

### Cursor-Based Pagination

Use cursor-based (keyset) pagination, not offset-based. Why: offset pagination is O(n) for large offsets because the DB must skip rows. Cursor pagination is O(1) because it uses an indexed WHERE clause.

```typescript
// Cursor format: base64("timestamp:id")
// Example: "MTcwOTkzNzYwMDAwMDoxMjM=" -> "1709937600000:123"

function decodeCursor(cursor: string): { publishedAt: number; id: number } {
  const decoded = Buffer.from(cursor, "base64").toString();
  const [ts, id] = decoded.split(":");
  return { publishedAt: Number(ts), id: Number(id) };
}

function encodeCursor(publishedAt: number, id: number): string {
  return Buffer.from(`${publishedAt}:${id}`).toString("base64");
}

// In SQL:
// WHERE (published_at < :cursorTs OR (published_at = :cursorTs AND id < :cursorId))
// ORDER BY published_at DESC, id DESC
// LIMIT :limit + 1
```

## Scheduler Architecture

```typescript
// server/scheduler/cron.ts
import cron from "node-cron";
import { getConfig } from "../config";
import { createScraper } from "../scrapers/registry";
import { ModerationPipeline } from "../moderation/pipeline";
import { db } from "../db/client";

export function startScheduler() {
  const config = getConfig();

  // Stagger scraping: each source gets its own cron offset
  // to avoid hitting all sources simultaneously
  config.sources
    .filter(s => s.enabled !== false)
    .forEach((source, i) => {
      const minuteOffset = (i * 3) % 30; // Stagger by 3 minutes
      const interval = source.refreshInterval ?? 30; // Default: 30 min

      cron.schedule(`${minuteOffset} */${interval} * * *`, async () => {
        const scraper = createScraper(source);
        if (!scraper) return;

        const runId = await db.startScrapeRun(source.id, source.type);
        try {
          const items = await scraper.scrape();
          const newCount = await db.upsertItems(items);
          await db.completeScrapeRun(runId, items.length, newCount, "success");
        } catch (err) {
          await db.completeScrapeRun(runId, 0, 0, "error", String(err));
        }
      });
    });

  // Moderation: run every 5 minutes (process any raw items)
  cron.schedule("*/5 * * * *", async () => {
    const pipeline = new ModerationPipeline(createLLMProvider(), db);
    await pipeline.processNewItems();
  });

  // Engagement refresh: update stats for items < 24h old
  cron.schedule("0 * * * *", async () => {
    // Re-scrape recent items to get updated engagement numbers
    const recentItems = await db.getRecentItems(24 * 60 * 60 * 1000);
    // Group by source, re-fetch, update engagement columns
  });
}
```

### Config-Driven Group Targeting

The server uses the same `GroupConfig` and `SourceEntry` types as the frontend. The BTS config (`packages/shared/` or imported from `packages/frontend/src/config/groups/bts/`) drives which sources are scraped and what keywords filter content.

```typescript
// server/config/index.ts
import { btsConfig } from "@bts/shared/config";
// OR: import { btsConfig } from "../../frontend/src/config/groups/bts";

export function getGroupConfig(): GroupConfig {
  return btsConfig;
}

export function getServerConfig() {
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: process.env.DB_PATH ?? "./data/bts.db",
    llmProvider: process.env.LLM_PROVIDER ?? "mock",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    autoApproveAfterMs: Number(process.env.AUTO_APPROVE_AFTER_MS ?? 3600000),
  };
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user, development | SQLite file, mock LLM provider, all scrapers enabled. Total DB size ~10MB after months. |
| 1-10 concurrent users | SQLite handles reads fine (it is a read-heavy workload). Fastify serves static-ish data. No changes needed. |
| 10-100 concurrent users | Consider caching API responses in memory (5-minute TTL, same as current client cache). SQLite WAL mode for concurrent reads. |
| 100+ concurrent users | This is unlikely for a personal fan app. If needed: move to Postgres, add Redis cache layer. But SQLite will handle hundreds of reads/sec. |

### Scaling Priorities

1. **First bottleneck: LLM API rate limits and cost.** At 15 items per batch, 5 batches per scrape cycle, that is 5 LLM calls every 15-30 minutes. Claude Sonnet at ~$3/M input tokens is roughly $0.01/day. Not a cost issue, but rate limits (especially free-tier keys) could throttle moderation. **Mitigation:** The `auto_approve_after_ms` fallback ensures content flows even if the LLM is unavailable.

2. **Second bottleneck: Source rate limiting.** Reddit allows 10 req/min unauthenticated, 60 req/min with OAuth. With 6 Reddit sources at 30-minute intervals, that is 6 requests every 30 minutes -- well under the limit. YouTube has no documented rate limit for public Atom feeds. **Mitigation:** Stagger scraper schedules. Add per-source rate limiting in `BaseScraper`.

3. **Third bottleneck: SQLite write contention.** SQLite serializes writes. If a scrape run inserts 50 items while the API is reading, the write blocks the read. With WAL mode enabled, reads and writes can happen concurrently. **Mitigation:** Enable WAL mode at database creation (`PRAGMA journal_mode=WAL`).

## Anti-Patterns

### Anti-Pattern 1: Scraping and Serving from the Same Process Without Queuing

**What people do:** The API route handler triggers a scrape when the cache is stale, making the user wait for the scrape to complete.

**Why it's wrong:** Scraping is slow (5-30 seconds for multiple sources). Users see long load times. If the scrape fails, the API request fails.

**Do this instead:** Scraping runs on a cron schedule, writing to the database. The API serves from the database. These are decoupled -- the API never waits for a scrape.

### Anti-Pattern 2: Storing Content in Separate Tables Per Source

**What people do:** Create `reddit_posts`, `youtube_videos`, `tweets` tables with source-specific columns.

**Why it's wrong:** The feed API needs to query across all sources, sort, paginate, and blend. Querying N tables with UNION ALL is slower, harder to paginate, and harder to maintain. Adding a new source means a new migration.

**Do this instead:** One `content_items` table with nullable columns for source-specific data. Every source normalizes to the same row shape. Source-specific metadata can go in a JSON `raw` column if needed for debugging.

### Anti-Pattern 3: Running LLM Moderation Synchronously Per Item

**What people do:** After scraping each item, immediately call the LLM to moderate it before inserting into the database.

**Why it's wrong:** LLM calls are slow (1-3 seconds each). With 100 items, that is 100-300 seconds of sequential moderation. It also prevents batching, which is cheaper (fewer API calls, less prompt overhead per item).

**Do this instead:** Insert all scraped items as `raw`, then batch-moderate in groups of 10-20 items per LLM call. The moderation prompt includes all items and returns structured decisions for each.

### Anti-Pattern 4: Using the Frontend Config Format Directly for Server Config

**What people do:** Import the `GroupConfig` with its `RegExp` keywords field directly into the server.

**Why it's wrong:** `RegExp` objects do not serialize across package boundaries cleanly (they are not JSON-serializable, and TypeScript project references may not preserve them). Also, the server needs additional config (DB path, API keys) that does not belong in the frontend config.

**Do this instead:** The shared types package exports the type definitions. The server imports the BTS config module that constructs the `GroupConfig` at runtime (with `RegExp` built from string patterns). Server-specific config (env vars) lives separately in `server/config/`.

## Integration Points

### What Changes in the Existing Frontend

| File | Change | Risk |
|------|--------|------|
| `src/hooks/useFeed.ts` | Add API-fetch mode alongside existing client-side fetch. Check `VITE_API_URL` env var. | LOW -- additive, existing path preserved |
| `src/services/api.ts` | NEW file: thin fetch wrapper for REST API. | NONE -- new file |
| `src/types/feed.ts` | MOVED to `packages/shared/src/types/feed.ts`. Frontend import path changes. | LOW -- mechanical |
| `src/config/types.ts` | MOVED to `packages/shared/src/types/config.ts`. | LOW -- mechanical |
| `package.json` | MOVED to `packages/frontend/package.json`. Add `@bts/shared` workspace dependency. | LOW |
| `vite.config.ts` | Add `server.proxy` to proxy `/api` to backend in dev mode. | LOW |

### What is Entirely New (Server Side)

| Component | Dependencies | Notes |
|-----------|-------------|-------|
| Fastify server | fastify, @fastify/cors | REST API, serves on port 3001 |
| Drizzle ORM | drizzle-orm, better-sqlite3, drizzle-kit | Schema, queries, migrations |
| Scrapers (7+ modules) | cheerio (HTML parsing), xml2js or fast-xml-parser (RSS/Atom) | Server-side, no CORS issues |
| LLM moderation | @anthropic-ai/sdk, openai | Provider-agnostic adapter |
| Scheduler | node-cron | Lightweight, in-process cron |
| Server config | dotenv | Env vars for API keys, DB path |

### External Services

| Service | Server-Side Pattern | Notes |
|---------|---------------------|-------|
| Reddit | Direct JSON API fetch (no CORS proxy) | Rate limit: 10 req/min unauthed. Use `User-Agent` header. |
| YouTube | Direct Atom feed fetch + optional Data API v3 | Atom: no auth. Data API: API key for view counts. |
| RSS (Soompi, AllKPop) | Direct HTTP fetch | No auth, no rate limits. |
| Twitter/X | Nitter scrape or direct scraping | Fragile, best-effort. Consider fallback sources. |
| Tumblr | Direct RSS feed fetch | No auth, standard RSS. |
| TikTok | Public page scraping (Playwright for JS-rendered) | Rate limited, may need rotating User-Agent. |
| Instagram | Public profile page scraping (Playwright) | Aggressive bot detection. Consider as low-priority. |
| Claude API | Batch moderation calls | Track token usage and cost in moderation_log. |
| OpenAI API | Alternative moderation provider | Same adapter interface. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> Server | HTTP REST API (JSON) | Same origin in production (Fastify serves static frontend) or proxied in dev |
| Server <-> Database | Drizzle ORM (synchronous better-sqlite3) | Single file, zero ops, no connection pool needed |
| Scrapers <-> Database | Via scheduler orchestration | Scrapers return data; scheduler handles DB writes |
| Moderation <-> Database | Direct (reads raw, writes approved/rejected) | Pipeline owns the status transition |
| Shared Types <-> Both | npm workspace import | Build-time type checking, no runtime overhead |

## Suggested Build Order

Dependencies drive order. Risk-validate uncertain integrations early.

**Phase 1: Foundation (monorepo + database + first scraper)**
1. Restructure into npm workspaces monorepo (root package.json, packages/frontend, packages/shared, packages/server)
2. Move shared types to `@bts/shared` package, update imports
3. Set up server package: Fastify hello-world, Drizzle schema, better-sqlite3 connection
4. Implement first scraper (Reddit -- most familiar, existing logic to port from frontend)
5. Write scheduler with one source running
6. Minimal GET /api/feed endpoint returning DB content
7. Wire frontend `useFeed` to API mode with `VITE_API_URL`

**Phase 2: Scraper expansion**
8. Port remaining scrapers: YouTube, RSS, Tumblr, Twitter
9. Add new scrapers: TikTok (Playwright for JS-rendered pages), Instagram (public profiles, best-effort)
10. Engagement stat updating (re-scrape recent items hourly)
11. Deduplication at DB level (UNIQUE on externalId + source)

**Phase 3: LLM moderation pipeline**
12. LLM provider adapter interface + mock provider
13. Claude adapter implementation
14. Moderation prompt design and testing
15. Batch processing pipeline (raw -> pending -> approved/rejected)
16. Auto-approve fallback for LLM unavailability
17. Moderation log with cost tracking

**Phase 4: Smart blend + API polish**
18. Blend scoring engine (recency + engagement + diversity + variety)
19. Cursor-based pagination
20. Source/member filtering in API
21. Feed stats endpoint
22. API response caching (in-memory, 5-minute TTL)

**Phase 5: Production readiness**
23. Frontend fully on API mode (remove client-side fallback if desired, or keep for resilience)
24. Fastify serves the built frontend static files in production
25. Environment configuration (`.env.example`, deployment docs)
26. Health check endpoint
27. Graceful shutdown (drain scheduler, close DB)

**Phase ordering rationale:**
- Phase 1 comes first because everything depends on the monorepo structure, database, and at least one working scraper
- Phase 2 before Phase 3 because you need content in the DB before you can moderate it
- Phase 3 before Phase 4 because the blend engine needs `approved` content (unapproved items should not appear in feed)
- Phase 5 is polish that can happen incrementally alongside 3-4

## Sources

- [npm workspaces docs](https://docs.npmjs.com/cli/v10/using-npm/workspaces) -- built-in monorepo support, npm 7+
- [TypeScript monorepo with npm workspaces](https://yieldcode.blog/post/npm-workspaces/) -- project references setup
- [Setting up monorepo with npm workspaces and TypeScript project references](https://medium.com/@cecylia.borek/setting-up-a-monorepo-using-npm-workspaces-and-typescript-project-references-307841e0ba4a)
- [Drizzle ORM - SQLite](https://orm.drizzle.team/docs/get-started-sqlite) -- better-sqlite3 driver integration
- [Drizzle ORM overview](https://orm.drizzle.team/docs/overview) -- why Drizzle: type-safe, lightweight, SQL-first
- [Getting Started with Drizzle ORM](https://betterstack.com/community/guides/scaling-nodejs/drizzle-orm/)
- [Fastify TypeScript support](https://fastify.dev/docs/latest/Reference/TypeScript/) -- first-class TS, schema validation
- [Express vs Fastify 2025 comparison](https://betterstack.com/community/guides/scaling-nodejs/fastify-express/) -- Fastify 2-3x faster
- [Node.js schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) -- node-cron for simplicity
- [Best JavaScript web scraping libraries 2025](https://blog.apify.com/best-javascript-web-scraping-libraries/) -- Cheerio for static, Playwright for dynamic
- [Crawlee - web scraping framework](https://github.com/apify/crawlee) -- unified Cheerio/Playwright/Puppeteer
- [Reddit API rate limits 2025](https://painonsocial.com/blog/reddit-api-rate-limits-guide) -- 10 req/min unauthenticated
- [Reddit scraping without auth](https://medium.com/@jjoe81372/how-to-scrape-reddit-5-proven-methods-for-2025-f0ca75491a5e)
- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch) -- batch moderation processing
- [Claude API vs OpenAI API 2025](https://collabnix.com/claude-api-vs-openai-api-2025-complete-developer-comparison-with-benchmarks-code-examples/)

---
*Architecture research for: BTS Army Feed v2.0 Content Scraping Engine*
*Researched: 2026-03-01*
