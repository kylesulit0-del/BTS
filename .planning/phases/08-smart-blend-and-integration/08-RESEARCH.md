# Phase 8: Smart Blend and Integration - Research

**Researched:** 2026-03-02
**Domain:** Feed ranking algorithms, engagement normalization, source diversity, frontend API integration
**Confidence:** HIGH

## Summary

Phase 8 adds a multi-signal ranking/blend system to the server-side feed and connects the frontend to consume the API as its primary data source. The ranking system must normalize engagement across heterogeneous sources (Reddit upvotes vs YouTube views vs Tumblr notes), apply time decay, enforce source/content-type diversity, and support configurable priority boosts for fan translation accounts. The frontend must seamlessly switch between API-driven and client-side modes based on `VITE_API_URL`.

The codebase is well-positioned for this. The server already has a `/api/feed` endpoint returning paginated `FeedItem[]` with `engagementStats` JSON per item. The frontend already has a client-side ranking pipeline in `packages/frontend/src/services/feeds.ts` with `computeFeedScore()` that blends recency and engagement. The Status page already uses `VITE_API_URL` to fetch from the API. The main work is: (1) build a server-side ranking module, (2) update the feed endpoint to use it, (3) add priority boost config, and (4) create a dual-mode data layer in the frontend.

**Primary recommendation:** Build a pure-function `rankFeed()` module on the server that scores, normalizes, diversity-interleaves, and returns ranked items. Wire it into the existing feed route. On the frontend, create an API service that maps server `FeedItem` to the frontend's `FeedItem` type, with fallback to the existing client-side fetchers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Blend signal weights**: Balanced blend, no single signal dominates. Moderate time decay (~6 hours noticeable drop). Strong source diversity (never >2 consecutive from same source). Mix content types too.
- **Engagement normalization**: Percentile within source. Primary metric only per source (Reddit: upvotes, YouTube: views, Twitter: likes). RSS gets neutral/middle-of-the-pack score. Per-fetch batch percentile (recalculated each request).
- **Priority boost behavior**: Moderate boost (meaningful edge but can be outranked). Configured in group config with numeric weight (e.g., priority: 1.5 or 2.0). Boost applies to entire source/account. All posts from boosted account get the boost.
- **API fallback experience**: Seamless (no visual difference). Auto-fallback (silently switch). Server-side ranking returns pre-ranked feed. Client-side fallback uses basic blend (diversity + recency, skip full normalization).

### Claude's Discretion
- Exact blend formula and signal weight values
- Normalization algorithm details
- How diversity interleaving is implemented (post-sort reordering vs scoring penalty)
- Error handling and retry logic for API fallback

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RANK-01 | Cross-source engagement normalization via per-source percentile | Percentile-rank algorithm: group items by source, rank within group, scale to 0-1. RSS items default to 0.5. See "Engagement Normalization" pattern below. |
| RANK-02 | Smart blend scoring -- weighted combination of recency, normalized engagement, source diversity, content type variety | Multi-signal scoring function + post-sort diversity interleaving. See "Blend Scoring" and "Diversity Interleaving" patterns below. |
| RANK-03 | Fan translation account prioritization via configurable priority boost | Add `boost` field to `ScrapingSource` interface. Multiply blend score by boost factor. See "Priority Boost" pattern below. |
| API-02 | Dual-mode frontend -- API mode when `VITE_API_URL` is set, client-side fallback otherwise | Adapter pattern in frontend service layer. Status page already demonstrates `VITE_API_URL` usage. See "Dual-Mode Frontend" pattern below. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.x | DB queries for ranking data (already installed) | Already in use; ranking queries are standard SQL with ORDER BY |
| TypeScript | 5.9.x | Type-safe scoring functions | Already in use across all packages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All ranking logic is pure math; no external libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom percentile | `simple-statistics` npm | Overkill for a single percentile function on <500 items |
| Custom interleaving | - | No library exists for content feed diversity interleaving; must be custom |

**Installation:**
```bash
# No new dependencies needed. All ranking is pure TypeScript math.
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── ranking/
│   ├── normalize.ts      # Engagement normalization (percentile within source)
│   ├── scoring.ts         # Blend score computation (recency + engagement + boost)
│   ├── interleave.ts      # Post-sort diversity interleaving
│   └── index.ts           # rankFeed() orchestrator: normalize -> score -> sort -> interleave
├── routes/
│   └── feed.ts            # Updated to call rankFeed() before returning items
packages/shared/src/
├── config/
│   └── sources.ts         # Add `boost` field to ScrapingSource interface
packages/frontend/src/
├── services/
│   ├── api.ts             # NEW: API client (fetch from server, map types)
│   ├── feeds.ts           # Existing client-side fetching (fallback mode)
│   └── feedService.ts     # NEW: Dual-mode orchestrator (API vs client-side)
├── hooks/
│   └── useFeed.ts         # Updated to use feedService instead of feeds.ts directly
```

### Pattern 1: Engagement Normalization (Percentile Within Source)
**What:** Convert raw engagement metrics (upvotes, views, notes) to a 0-1 percentile score relative to other items from the same source in the current batch.
**When to use:** Before blend scoring, applied to all items in the feed query result.
**Example:**
```typescript
// packages/server/src/ranking/normalize.ts

interface ScoredItem {
  id: number;
  source: string;
  engagementStats: Record<string, number> | null;
  publishedAt: Date | number;
  contentType: string | null;
  sourceDetail: string;
  // ... other FeedItem fields
}

/** Primary engagement metric per source type. */
const PRIMARY_METRIC: Record<string, string> = {
  reddit: 'upvotes',
  youtube: 'views',
  tumblr: 'notes',
  twitter: 'likes',
  bluesky: 'likes',
};

/** Extract the primary engagement value for a source. */
function getPrimaryEngagement(item: ScoredItem): number | null {
  if (!item.engagementStats) return null;
  const metric = PRIMARY_METRIC[item.source];
  if (!metric) return null; // RSS and unknown sources
  return item.engagementStats[metric] ?? null;
}

/**
 * Assign percentile rank (0-1) within each source group.
 * Items with no engagement data (RSS) get 0.5 (middle of the pack).
 * Returns a Map of item.id -> normalized engagement score.
 */
export function normalizeEngagement(items: ScoredItem[]): Map<number, number> {
  const scores = new Map<number, number>();

  // Group by source
  const groups = new Map<string, ScoredItem[]>();
  for (const item of items) {
    const group = groups.get(item.source) ?? [];
    group.push(item);
    groups.set(item.source, group);
  }

  for (const [source, group] of groups) {
    const withEngagement = group
      .map(item => ({ item, value: getPrimaryEngagement(item) }))
      .filter((e): e is { item: ScoredItem; value: number } => e.value !== null);

    if (withEngagement.length === 0) {
      // No engagement data for this source (e.g., RSS) -- all get 0.5
      for (const item of group) {
        scores.set(item.id, 0.5);
      }
      continue;
    }

    // Sort by engagement value ascending
    withEngagement.sort((a, b) => a.value - b.value);

    // Assign percentile rank: position / (count - 1), or 0.5 if only 1 item
    const count = withEngagement.length;
    for (let i = 0; i < count; i++) {
      const percentile = count > 1 ? i / (count - 1) : 0.5;
      scores.set(withEngagement[i].item.id, percentile);
    }

    // Items in this source group with null engagement get 0.5
    for (const item of group) {
      if (!scores.has(item.id)) {
        scores.set(item.id, 0.5);
      }
    }
  }

  return scores;
}
```

### Pattern 2: Blend Scoring (Multi-Signal)
**What:** Compute a single score per item from recency, normalized engagement, and optional priority boost.
**When to use:** After normalization, before sorting.
**Example:**
```typescript
// packages/server/src/ranking/scoring.ts

/** Blend weights -- should sum to ~1.0 for the base signals. */
const WEIGHTS = {
  recency: 0.40,
  engagement: 0.35,
  contentTypeVariety: 0.10,
  sourceDiversity: 0.15,
};

/** Time decay: score drops to ~0.3 at 6 hours, ~0.1 at 24 hours. */
function recencyScore(publishedAt: number, now: number): number {
  const ageHours = (now - publishedAt) / (1000 * 60 * 60);
  // Exponential decay: e^(-age/8) gives ~0.47 at 6h, ~0.05 at 24h
  // Tuned so 6h old content drops "noticeably" per user decision
  return Math.exp(-ageHours / 8);
}

/**
 * Content type variety bonus: items of rare content types
 * in the batch score higher to promote variety.
 */
function contentTypeVarietyScore(
  contentType: string | null,
  typeCounts: Map<string, number>,
  totalItems: number,
): number {
  if (!contentType) return 0.5;
  const count = typeCounts.get(contentType) ?? 1;
  // Inverse frequency: rare types score higher
  return 1 - (count / totalItems);
}

/**
 * Source diversity bonus: items from underrepresented sources score higher.
 */
function sourceDiversityScore(
  source: string,
  sourceCounts: Map<string, number>,
  totalItems: number,
): number {
  const count = sourceCounts.get(source) ?? 1;
  return 1 - (count / totalItems);
}

export function computeBlendScore(
  item: ScoredItem,
  engagementPercentile: number,
  typeCounts: Map<string, number>,
  sourceCounts: Map<string, number>,
  totalItems: number,
  now: number,
  boostFactor: number = 1.0,
): number {
  const publishedMs = item.publishedAt instanceof Date
    ? item.publishedAt.getTime()
    : (item.publishedAt as number) * 1000;

  const r = recencyScore(publishedMs, now);
  const e = engagementPercentile;
  const ct = contentTypeVarietyScore(item.contentType, typeCounts, totalItems);
  const sd = sourceDiversityScore(item.source, sourceCounts, totalItems);

  const baseScore =
    WEIGHTS.recency * r +
    WEIGHTS.engagement * e +
    WEIGHTS.contentTypeVariety * ct +
    WEIGHTS.sourceDiversity * sd;

  return baseScore * boostFactor;
}
```

### Pattern 3: Diversity Interleaving (Post-Sort Reordering)
**What:** After scoring and sorting, reorder the list so no more than 2 consecutive items share the same source. Also interleave content types.
**When to use:** Final step before returning the feed.
**Rationale:** Post-sort reordering is simpler and more predictable than trying to encode diversity as a scoring penalty. It guarantees the constraint (max 2 consecutive from same source) is always met.
**Example:**
```typescript
// packages/server/src/ranking/interleave.ts

interface RankedItem {
  id: number;
  source: string;
  contentType: string | null;
  blendScore: number;
}

/**
 * Reorder items so no more than maxConsecutive items from the same source
 * appear in a row. Preserves relative score ordering as much as possible.
 */
export function interleaveBySource<T extends RankedItem>(
  items: T[],
  maxConsecutive: number = 2,
): T[] {
  if (items.length <= maxConsecutive) return items;

  const result: T[] = [];
  const remaining = [...items]; // Already sorted by blendScore desc

  while (remaining.length > 0) {
    // Count consecutive items from same source at end of result
    let consecutiveCount = 0;
    const lastSource = result.length > 0 ? result[result.length - 1].source : null;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].source === lastSource) consecutiveCount++;
      else break;
    }

    if (consecutiveCount >= maxConsecutive && lastSource) {
      // Find the highest-scored item from a different source
      const idx = remaining.findIndex(item => item.source !== lastSource);
      if (idx >= 0) {
        result.push(remaining.splice(idx, 1)[0]);
      } else {
        // All remaining items are same source; just append
        result.push(remaining.shift()!);
      }
    } else {
      result.push(remaining.shift()!);
    }
  }

  return result;
}
```

### Pattern 4: Priority Boost Configuration
**What:** Add a `boost` field to `ScrapingSource` in the shared config. Default 1.0, fan translation accounts get higher values (e.g., 1.5).
**When to use:** Applied during blend scoring as a multiplier.
**Example:**
```typescript
// In @bts/shared/config/sources.ts, add to ScrapingSource:
export interface ScrapingSource {
  // ... existing fields ...
  boost?: number; // Default 1.0. Fan translation accounts: 1.5-2.0
}

// In getBtsScrapingConfig(), add boost to specific sources:
{
  id: 'tumblr-bts-trans',
  type: 'tumblr',
  label: 'bts-trans',
  // ... other fields ...
  boost: 1.5, // Fan translation priority boost
},
```

### Pattern 5: Dual-Mode Frontend (API vs Client-Side)
**What:** A service layer that checks `VITE_API_URL`, fetches from the server API if available, falls back to client-side fetching if not.
**When to use:** Replaces direct `fetchAllFeedsIncremental()` calls in `useFeed`.
**Key considerations:**
- The frontend `FeedItem` type differs from the server's `FeedItem` type (id is string vs number, different field names like `sourceName` vs `sourceDetail`, `timestamp` vs `publishedAt`, `thumbnail` vs `thumbnailUrl`, `stats` vs `engagementStats`)
- The Status page already demonstrates `VITE_API_URL` usage pattern (line 306 of Status.tsx)
- Must map server response to frontend `FeedItem` shape for zero visual changes
**Example:**
```typescript
// packages/frontend/src/services/api.ts
import type { FeedItem as ApiFeedItem, FeedResponse } from '@bts/shared/types/feed.js';
import type { FeedItem } from '../types/feed';

const API_URL = import.meta.env.VITE_API_URL;

/** Map server FeedItem to frontend FeedItem. */
function mapApiFeedItem(item: ApiFeedItem): FeedItem {
  return {
    id: String(item.id),
    title: item.title,
    url: item.url,
    source: item.source,
    sourceName: item.sourceDetail, // Map sourceDetail -> sourceName
    timestamp: new Date(item.publishedAt).getTime(),
    thumbnail: item.thumbnailUrl ?? undefined,
    stats: item.engagementStats ? {
      upvotes: item.engagementStats.upvotes,
      comments: item.engagementStats.comments,
      views: item.engagementStats.views,
      likes: item.engagementStats.likes,
      notes: item.engagementStats.notes,
    } : undefined,
    contentType: item.contentType ?? undefined,
  };
}

export async function fetchApiFeed(params?: {
  cursor?: string;
  limit?: number;
  source?: string;
  contentType?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null; hasMore: boolean }> {
  const url = new URL(`${API_URL}/api/feed`);
  if (params?.cursor) url.searchParams.set('cursor', params.cursor);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.source) url.searchParams.set('source', params.source);
  if (params?.contentType) url.searchParams.set('contentType', params.contentType);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: FeedResponse = await res.json();

  return {
    items: data.items.map(mapApiFeedItem),
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
  };
}

export function isApiMode(): boolean {
  return !!API_URL;
}
```

### Anti-Patterns to Avoid
- **Encoding diversity as a scoring penalty:** Trying to reduce scores for items from overrepresented sources makes the algorithm hard to tune and impossible to guarantee "max 2 consecutive." Use post-sort interleaving instead.
- **Global engagement normalization:** Normalizing Reddit upvotes and YouTube views against each other directly (e.g., 1 upvote = 100 views) creates brittle magic numbers. Percentile-within-source avoids this entirely.
- **Fetching all items for ranking:** Only rank the items in the current page query, not the entire database. The feed endpoint already limits to `limit + 1` rows.
- **Breaking the frontend FeedItem type:** The frontend has its own `FeedItem` with `timestamp` (number), `sourceName`, `thumbnail`, `stats` etc. The server's `FeedItem` uses `publishedAt` (ISO string), `sourceDetail`, `thumbnailUrl`, `engagementStats`. Map at the boundary, don't change the frontend type.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Percentile calculation | Complex statistical library | Simple `position / (count - 1)` formula | Only need ordinal percentile rank, not interpolated percentiles; items are already sorted |
| Time decay | Custom logarithmic decay | `Math.exp(-ageHours / k)` | Exponential decay is well-understood, single parameter `k` controls decay rate |
| API client | Custom HTTP abstraction | Plain `fetch()` with error handling | One endpoint, simple GET with query params; no need for axios/ky |

**Key insight:** Feed ranking is mostly pure math on small datasets (<500 items per page request). Every algorithm here is a few lines of TypeScript. The complexity is in choosing the right formulas and weights, not in implementation.

## Common Pitfalls

### Pitfall 1: Timestamp Format Mismatch
**What goes wrong:** The `publishedAt` field in SQLite is stored as a Unix timestamp (seconds) via Drizzle's `{ mode: 'timestamp' }`. When read back, it may come as a `Date` object or a raw number depending on context. The existing feed route already handles this with a conditional check.
**Why it happens:** Drizzle's better-sqlite3 driver returns `Date` objects in some contexts and raw epoch seconds in others.
**How to avoid:** Always normalize timestamps to milliseconds before scoring. Copy the existing pattern from `feed.ts` lines 91-96.
**Warning signs:** Recency scores are all 0 or all 1 (indicating timestamps are in wrong units).

### Pitfall 2: Empty Engagement Stats
**What goes wrong:** RSS/news items and YouTube items (scraped via RSS, no Data API) have `null` engagement_stats. If not handled, percentile calculation breaks or these items always rank last.
**Why it happens:** RSS feeds don't expose engagement metrics. YouTube RSS feeds don't include view counts.
**How to avoid:** Explicitly assign 0.5 (neutral) engagement percentile to items with null engagement stats, per user decision.
**Warning signs:** RSS articles never appear in the feed despite being recent and relevant.

### Pitfall 3: Pagination Breaks After Re-Ranking
**What goes wrong:** The current feed endpoint uses cursor-based pagination on `contentItems.id` (descending). If ranking reorders items, the cursor (which is an item ID) no longer guarantees stable pagination -- items can be skipped or duplicated across pages.
**Why it happens:** Cursor pagination assumes a stable sort order. Re-ranking changes the order.
**How to avoid:** Two options: (1) Rank the full candidate set first, then paginate the ranked result, or (2) use offset-based pagination for ranked feeds. Option 1 is better for small datasets (<1000 items). For this app, the total approved items in a 14-day window should be manageable.
**Warning signs:** Users see duplicate items or missing items when scrolling through paginated results.

### Pitfall 4: Frontend Type Mapping Gaps
**What goes wrong:** The server `FeedItem` (from `@bts/shared`) and the frontend `FeedItem` (from `packages/frontend/src/types/feed.ts`) have different shapes. Missing or incorrect field mapping causes runtime errors or blank cards.
**Why it happens:** The frontend was built for client-side fetching with its own type; the server was built with a shared type for the API. They diverged naturally.
**How to avoid:** Create an explicit mapping function (`mapApiFeedItem`) at the API boundary. Test both modes. Key differences:
  - `id`: number (server) vs string (frontend)
  - `sourceDetail` (server) vs `sourceName` (frontend)
  - `publishedAt` ISO string (server) vs `timestamp` number (frontend)
  - `thumbnailUrl` (server) vs `thumbnail` (frontend)
  - `engagementStats` Record (server) vs `stats` FeedStats (frontend)
**Warning signs:** Feed cards show "undefined" for source name or time.

### Pitfall 5: Boost Factor in Source Config vs DB
**What goes wrong:** The boost factor is in the scraping config (`ScrapingSource.boost`), but the feed endpoint queries `content_items` which stores `sourceDetail` (e.g., "bts-trans"). The ranking module needs to look up the boost for each item's `sourceDetail` from the config.
**Why it happens:** The config is in memory (loaded at server start), but the items come from DB without boost info.
**How to avoid:** Build a `Map<sourceDetail, boostFactor>` from the scraping config at startup and pass it to the ranking module.
**Warning signs:** Boosted accounts don't actually rank higher.

### Pitfall 6: Client-Side Fallback Rank Quality
**What goes wrong:** The user decided client-side fallback should use "basic blend (diversity + recency)" but the existing `computeFeedScore()` in `feeds.ts` uses 50/50 recency/engagement with no diversity. If left unchanged, the fallback doesn't match user expectations.
**Why it happens:** The existing client-side scoring was built in v1.0 before diversity requirements existed.
**How to avoid:** Update the client-side `applyFeedPipeline()` to add simple source interleaving. Don't need full normalization, just basic diversity post-sort.
**Warning signs:** Client-side mode produces a feed dominated by Reddit (highest volume source).

## Code Examples

### Orchestrating the Full Ranking Pipeline
```typescript
// packages/server/src/ranking/index.ts
import { normalizeEngagement } from './normalize.js';
import { computeBlendScore } from './scoring.js';
import { interleaveBySource } from './interleave.js';

export interface RankableItem {
  id: number;
  source: string;
  sourceDetail: string;
  contentType: string | null;
  engagementStats: Record<string, number> | null;
  publishedAt: Date | number;
  // ... other fields passed through
}

export function rankFeed<T extends RankableItem>(
  items: T[],
  boostMap: Map<string, number>,  // sourceDetail -> boost factor
): T[] {
  if (items.length === 0) return [];

  const now = Date.now();

  // Step 1: Normalize engagement (percentile within source)
  const engagementScores = normalizeEngagement(items);

  // Step 2: Compute distribution counts for variety/diversity signals
  const typeCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const item of items) {
    typeCounts.set(item.contentType ?? 'unknown', (typeCounts.get(item.contentType ?? 'unknown') ?? 0) + 1);
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
  }

  // Step 3: Score each item
  const scored = items.map(item => ({
    item,
    blendScore: computeBlendScore(
      item,
      engagementScores.get(item.id) ?? 0.5,
      typeCounts,
      sourceCounts,
      items.length,
      now,
      boostMap.get(item.sourceDetail) ?? 1.0,
    ),
    source: item.source,
    contentType: item.contentType,
    id: item.id,
  }));

  // Step 4: Sort by blend score descending
  scored.sort((a, b) => b.blendScore - a.blendScore);

  // Step 5: Diversity interleaving (max 2 consecutive from same source)
  const interleaved = interleaveBySource(scored, 2);

  // Return original items in new order
  return interleaved.map(s => s.item);
}
```

### Updating the Feed Route to Use Ranking
```typescript
// Key changes to packages/server/src/routes/feed.ts

import { rankFeed } from '../ranking/index.js';
import { getBtsScrapingConfig } from '@bts/shared/config/sources.js';

// Build boost map once at registration time
const config = getBtsScrapingConfig();
const boostMap = new Map<string, number>();
for (const source of config.sources) {
  if (source.boost && source.boost !== 1.0) {
    boostMap.set(source.label, source.boost);
  }
}

// Inside the GET /feed handler, after querying items:
// 1. Fetch a larger candidate set (e.g., 200 items)
// 2. Rank them
// 3. Paginate the ranked result
// This replaces the current .orderBy(desc(contentItems.scrapedAt))
```

### Client-Side Basic Blend (Fallback Mode)
```typescript
// Update to packages/frontend/src/services/feeds.ts
// Add simple diversity interleaving to applyFeedPipeline()

function interleaveSimple(items: FeedItem[]): FeedItem[] {
  const result: FeedItem[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    let lastSource = result.length > 0 ? result[result.length - 1].source : null;
    let prevSource = result.length > 1 ? result[result.length - 2].source : null;

    // If last 2 are same source, find next from different source
    if (lastSource && lastSource === prevSource) {
      const idx = remaining.findIndex(i => i.source !== lastSource);
      if (idx >= 0) {
        result.push(remaining.splice(idx, 1)[0]);
        continue;
      }
    }
    result.push(remaining.shift()!);
  }
  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global engagement normalization (magic ratios) | Percentile within source | 2020s industry standard | Eliminates cross-source metric comparison; each source compared to itself |
| Chronological feed | Multi-signal blend | All major platforms 2015+ | Better content surfacing at cost of implementation complexity |
| Score-based diversity | Post-sort interleaving | Common in recommendation systems | Guarantees diversity constraints are met; easier to reason about |
| Client-side only fetching | Server-side ranking with client fallback | This phase | Pre-ranked feed is consistent across devices; client-side is unreliable (CORS, rate limits) |

**Deprecated/outdated:**
- Hacker News-style `(P-1)/(T+2)^G` formula: Too simple for multi-source feeds; no diversity signal. Good reference for time decay concept but not directly applicable.
- Reddit's hot ranking (`log10(max(|score|, 1)) + sign(score) * seconds / 45000`): Designed for single-source ranking. Doesn't work across sources with different engagement scales.

## Open Questions

1. **Pagination strategy for ranked feeds**
   - What we know: Current cursor-based pagination uses item ID descending. Ranking reorders items, breaking cursor stability.
   - What's unclear: Whether offset-based pagination is acceptable for this app, or if we need a more complex approach.
   - Recommendation: Use offset-based pagination (`?page=1&limit=50`) for the ranked feed. The total item count is small enough (<1000 in a 14-day window) that this won't cause performance issues. The frontend's infinite scroll can track the page number instead of a cursor. Alternatively, rank the full candidate set, assign stable positions, and use position-based cursors.

2. **Engagement data availability for YouTube and Bluesky**
   - What we know: YouTube items are scraped via RSS and have no engagement stats (Data API deferred). Bluesky items may or may not have likes in AT Proto response.
   - What's unclear: How many items in practice will have null engagement stats.
   - Recommendation: This is handled by the "RSS gets 0.5 neutral score" decision. YouTube and any source without stats gets the same treatment. Monitor after deployment.

3. **Per-fetch batch percentile vs cached historical percentile**
   - What we know: User decided "per-fetch batch percentile" -- recalculated each request.
   - What's unclear: Whether this means per-API-request or per-scrape-run.
   - Recommendation: Calculate percentile on the items returned by the DB query for each API request. This is simplest and matches the user decision. With ~200-500 items in the candidate set, the percentile distribution is stable enough.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `packages/server/src/routes/feed.ts` -- current feed endpoint implementation
- Codebase analysis of `packages/server/src/db/schema.ts` -- content_items schema with engagementStats
- Codebase analysis of `packages/frontend/src/services/feeds.ts` -- existing client-side ranking pipeline
- Codebase analysis of `packages/frontend/src/hooks/useFeed.ts` -- current data fetching pattern
- Codebase analysis of `packages/frontend/src/pages/Status.tsx` -- existing VITE_API_URL usage pattern
- Codebase analysis of `packages/shared/src/config/sources.ts` -- ScrapingSource interface (where boost field goes)
- Codebase analysis of `packages/shared/src/types/feed.ts` -- server FeedItem type
- Codebase analysis of `packages/frontend/src/types/feed.ts` -- frontend FeedItem type (different shape)

### Secondary (MEDIUM confidence)
- [Hacker News ranking algorithm](https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d) -- time decay formula reference
- [Reddit ranking algorithm](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9) -- engagement scoring reference
- [Herman's blog: A better ranking algorithm](https://herman.bearblog.dev/a-better-ranking-algorithm/) -- time decay tuning insights

### Tertiary (LOW confidence)
- General industry practice for percentile normalization and diversity interleaving -- based on training data, not verified against specific implementations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. All ranking is pure TypeScript math on existing data structures.
- Architecture: HIGH -- Clear patterns from codebase analysis. Server-side ranking module structure is straightforward. Dual-mode frontend follows existing patterns (Status page already uses `VITE_API_URL`).
- Pitfalls: HIGH -- Identified from direct codebase analysis (timestamp formats, type mismatches, pagination breaks, empty engagement stats). All are verifiable by reading the code.
- Scoring formulas: MEDIUM -- Weight values (0.40 recency, 0.35 engagement, etc.) and decay constant (k=8) are reasonable starting points but will need tuning with real data. The formulas themselves are well-established.

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable domain, no external dependency changes expected)
