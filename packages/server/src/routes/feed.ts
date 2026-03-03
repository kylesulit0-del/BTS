/**
 * GET /feed -- Ranked feed endpoint with offset-based pagination and source filtering.
 *
 * Returns FeedResponse matching the shared @bts/shared type contract:
 * { items: FeedItem[], nextCursor: string | null, hasMore: boolean, total: number }
 *
 * Pagination:
 * - page-based (new): ?page=1&limit=50 -- used for ranked feed
 * - cursor-based (backward compat): ?cursor=123&limit=50 -- falls back to old ID-descending logic
 */

import type { FastifyInstance } from 'fastify';
import { and, desc, lt, eq, sql, isNull } from 'drizzle-orm';
import { contentItems } from '../db/schema.js';
import type { Db } from '../db/index.js';
import type { FeedItem, FeedResponse, SortMode } from '@bts/shared/types/feed.js';
import { rankFeed } from '../ranking/index.js';
import { getBtsScrapingConfig } from '@bts/shared/config/sources.js';

// Build boost map once at module level from scraping config
const config = getBtsScrapingConfig();
const boostMap = new Map<string, number>();
for (const source of config.sources) {
  if (source.boost && source.boost > 1.0) {
    boostMap.set(source.label, source.boost);
  }
}

/** Map a DB row to a FeedItem response shape. */
function mapRowToFeedItem(row: {
  id: number;
  title: string;
  url: string;
  source: string;
  sourceDetail: string;
  score: number;
  commentCount: number;
  flair: string | null;
  contentType: string | null;
  thumbnailUrl: string | null;
  engagementStats: string | null;
  publishedAt: Date | number;
  scrapedAt: Date | number;
}): FeedItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    sourceDetail: row.sourceDetail,
    score: row.score,
    commentCount: row.commentCount,
    flair: row.flair,
    contentType: row.contentType as FeedItem['contentType'],
    thumbnailUrl: row.thumbnailUrl ?? null,
    engagementStats: row.engagementStats ? JSON.parse(row.engagementStats) : null,
    publishedAt: row.publishedAt instanceof Date
      ? row.publishedAt.toISOString()
      : new Date(row.publishedAt as unknown as number * 1000).toISOString(),
    scrapedAt: row.scrapedAt instanceof Date
      ? row.scrapedAt.toISOString()
      : new Date(row.scrapedAt as unknown as number * 1000).toISOString(),
  };
}

export function registerFeedRoutes(server: FastifyInstance, db: Db) {
  server.get<{
    Querystring: { cursor?: string; limit?: string; page?: string; source?: string; contentType?: string; sort?: string };
  }>('/feed', async (request, reply) => {
    const { cursor, source, contentType } = request.query;

    // Parse limit, clamp to 1-100, default 50
    let limit = parseInt(request.query.limit || '50', 10);
    if (isNaN(limit) || limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // Parse page param (default 1)
    let page = parseInt(request.query.page || '0', 10);
    const hasPageParam = request.query.page !== undefined && request.query.page !== '';

    // Determine pagination mode: page-based if page param provided, cursor-based if cursor provided but no page
    const useCursorMode = !hasPageParam && !!cursor;

    if (useCursorMode) {
      // === CURSOR-BASED FALLBACK (backward compat) ===
      const conditions = [
        isNull(contentItems.deletedAt),
        eq(contentItems.moderationStatus, 'approved'),
      ];
      const cursorId = parseInt(cursor!, 10);
      if (!isNaN(cursorId)) {
        conditions.push(lt(contentItems.id, cursorId));
      }
      if (source) {
        conditions.push(eq(contentItems.source, source));
      }
      if (contentType) {
        conditions.push(eq(contentItems.contentType, contentType));
      }

      const whereClause = and(...conditions);
      const rows = db
        .select()
        .from(contentItems)
        .where(whereClause)
        .orderBy(desc(contentItems.scrapedAt))
        .limit(limit + 1)
        .all();

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && items.length > 0
        ? String(items[items.length - 1].id)
        : null;

      // Count total
      const countConditions = [
        isNull(contentItems.deletedAt),
        eq(contentItems.moderationStatus, 'approved'),
      ];
      if (source) countConditions.push(eq(contentItems.source, source));
      if (contentType) countConditions.push(eq(contentItems.contentType, contentType));
      const total = db
        .select({ count: sql<number>`count(*)` })
        .from(contentItems)
        .where(and(...countConditions))
        .get()?.count ?? 0;

      const feedItems = items.map(mapRowToFeedItem);

      return reply.send({
        items: feedItems,
        nextCursor,
        hasMore,
        total,
      } satisfies FeedResponse);
    }

    // === PAGE-BASED RANKED FEED (default) ===
    if (!hasPageParam) page = 1;
    if (isNaN(page) || page < 1) page = 1;
    const offset = (page - 1) * limit;

    // Build WHERE conditions for candidate set (no cursor, no pagination -- fetch up to 500 recent items)
    const conditions = [
      isNull(contentItems.deletedAt),
      eq(contentItems.moderationStatus, 'approved'),
    ];
    if (source) {
      conditions.push(eq(contentItems.source, source));
    }
    if (contentType) {
      conditions.push(eq(contentItems.contentType, contentType));
    }

    const whereClause = and(...conditions);

    // Fetch candidate set: up to 500 recent approved items
    const candidateRows = db
      .select()
      .from(contentItems)
      .where(whereClause)
      .orderBy(desc(contentItems.scrapedAt))
      .limit(500)
      .all();

    // Validate sort param
    const validSorts = ['recommended', 'newest', 'oldest', 'popular', 'discussed'] as const;
    const sortMode: SortMode = validSorts.includes(request.query.sort as any)
      ? (request.query.sort as SortMode)
      : 'recommended';

    /** Normalize a publishedAt value (Date or epoch seconds) to epoch ms for comparison. */
    const toEpochMs = (v: Date | number): number =>
      v instanceof Date ? v.getTime() : (v as unknown as number) * 1000;

    /** Item shape after parsing engagementStats from JSON string. */
    type ParsedRow = Omit<typeof candidateRows[number], 'engagementStats'> & {
      engagementStats: Record<string, number> | null;
    };

    let sortedItems: ParsedRow[];

    if (sortMode === 'recommended') {
      // Parse engagementStats from JSON for ranking, then rank
      const rankableItems: ParsedRow[] = candidateRows.map(row => ({
        ...row,
        engagementStats: row.engagementStats ? JSON.parse(row.engagementStats) as Record<string, number> : null,
      }));

      sortedItems = rankFeed(rankableItems, boostMap);
    } else {
      // Non-recommended sorts: sort candidateRows in-memory
      // Only parse engagementStats for 'popular' sort
      const items: ParsedRow[] = candidateRows.map(row => ({
        ...row,
        engagementStats: sortMode === 'popular' && row.engagementStats
          ? JSON.parse(row.engagementStats) as Record<string, number>
          : null,
      }));

      switch (sortMode) {
        case 'newest':
          items.sort((a, b) => toEpochMs(b.publishedAt) - toEpochMs(a.publishedAt));
          break;
        case 'oldest':
          items.sort((a, b) => toEpochMs(a.publishedAt) - toEpochMs(b.publishedAt));
          break;
        case 'popular': {
          const sumStats = (stats: Record<string, number> | null): number => {
            if (!stats) return 0;
            return Object.values(stats).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          };
          items.sort((a, b) => sumStats(b.engagementStats) - sumStats(a.engagementStats));
          break;
        }
        case 'discussed':
          items.sort((a, b) => b.commentCount - a.commentCount);
          break;
      }

      sortedItems = items;
    }

    // Slice for requested page
    const pageItems = sortedItems.slice(offset, offset + limit);
    const hasMore = offset + limit < sortedItems.length;

    // Count total items matching filters (may be more than 500 candidate set)
    const countConditions = [
      isNull(contentItems.deletedAt),
      eq(contentItems.moderationStatus, 'approved'),
    ];
    if (source) countConditions.push(eq(contentItems.source, source));
    if (contentType) countConditions.push(eq(contentItems.contentType, contentType));
    const total = db
      .select({ count: sql<number>`count(*)` })
      .from(contentItems)
      .where(and(...countConditions))
      .get()?.count ?? 0;

    // Map to API response shape (engagementStats is already parsed, but mapRowToFeedItem expects string)
    const feedItems: FeedItem[] = pageItems.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceDetail: row.sourceDetail,
      score: row.score,
      commentCount: row.commentCount,
      flair: row.flair,
      contentType: row.contentType as FeedItem['contentType'],
      thumbnailUrl: row.thumbnailUrl ?? null,
      engagementStats: row.engagementStats,
      publishedAt: row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : new Date(row.publishedAt as unknown as number * 1000).toISOString(),
      scrapedAt: row.scrapedAt instanceof Date
        ? row.scrapedAt.toISOString()
        : new Date(row.scrapedAt as unknown as number * 1000).toISOString(),
    }));

    return reply.send({
      items: feedItems,
      nextCursor: null, // Page-based mode doesn't use cursor
      hasMore,
      total,
    } satisfies FeedResponse);
  });

  // Single-item endpoint: GET /feed/:id (unchanged)
  server.get<{ Params: { id: string } }>('/feed/:id', async (request, reply) => {
    const parsed = parseInt(request.params.id, 10);
    if (isNaN(parsed)) {
      return reply.status(400).send({ error: 'Invalid item ID' });
    }

    const row = db
      .select()
      .from(contentItems)
      .where(and(
        eq(contentItems.id, parsed),
        isNull(contentItems.deletedAt),
        eq(contentItems.moderationStatus, 'approved'),
      ))
      .get();

    if (!row) {
      return reply.status(404).send({ error: 'Item not found' });
    }

    const item = mapRowToFeedItem(row);
    return reply.send(item);
  });
}
