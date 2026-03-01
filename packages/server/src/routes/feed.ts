/**
 * GET /feed -- Paginated feed endpoint with cursor-based pagination and source filtering.
 *
 * Returns FeedResponse matching the shared @bts/shared type contract:
 * { items: FeedItem[], nextCursor: string | null, hasMore: boolean, total: number }
 */

import type { FastifyInstance } from 'fastify';
import { and, desc, lt, eq, sql } from 'drizzle-orm';
import { contentItems } from '../db/schema.js';
import type { Db } from '../db/index.js';
import type { FeedItem, FeedResponse } from '@bts/shared/types/feed.js';

export function registerFeedRoutes(server: FastifyInstance, db: Db) {
  server.get<{
    Querystring: { cursor?: string; limit?: string; source?: string };
  }>('/feed', async (request, reply) => {
    const { cursor, source } = request.query;

    // Parse limit, clamp to 1-100, default 50
    let limit = parseInt(request.query.limit || '50', 10);
    if (isNaN(limit) || limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // Build WHERE conditions
    const conditions = [];
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        conditions.push(lt(contentItems.id, cursorId));
      }
    }
    if (source) {
      conditions.push(eq(contentItems.source, source));
    }

    // Query items (fetch limit + 1 to detect hasMore)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
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

    // Count total items (with source filter if applicable)
    const countWhere = source ? eq(contentItems.source, source) : undefined;
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(contentItems)
      .where(countWhere)
      .get();
    const total = countResult?.count ?? 0;

    // Map DB rows to FeedItem response shape
    const feedItems: FeedItem[] = items.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceDetail: row.sourceDetail,
      score: row.score,
      commentCount: row.commentCount,
      flair: row.flair,
      contentType: row.contentType as FeedItem['contentType'],
      publishedAt: row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : new Date(row.publishedAt as unknown as number * 1000).toISOString(),
      scrapedAt: row.scrapedAt instanceof Date
        ? row.scrapedAt.toISOString()
        : new Date(row.scrapedAt as unknown as number * 1000).toISOString(),
    }));

    const response: FeedResponse = {
      items: feedItems,
      nextCursor,
      hasMore,
      total,
    };

    return reply.send(response);
  });

  // Single-item endpoint: GET /feed/:id
  server.get<{ Params: { id: string } }>('/feed/:id', async (request, reply) => {
    const parsed = parseInt(request.params.id, 10);
    if (isNaN(parsed)) {
      return reply.status(400).send({ error: 'Invalid item ID' });
    }

    const row = db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, parsed))
      .get();

    if (!row) {
      return reply.status(404).send({ error: 'Item not found' });
    }

    const item: FeedItem = {
      id: row.id,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceDetail: row.sourceDetail,
      score: row.score,
      commentCount: row.commentCount,
      flair: row.flair,
      contentType: row.contentType as FeedItem['contentType'],
      publishedAt: row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : new Date(row.publishedAt as unknown as number * 1000).toISOString(),
      scrapedAt: row.scrapedAt instanceof Date
        ? row.scrapedAt.toISOString()
        : new Date(row.scrapedAt as unknown as number * 1000).toISOString(),
    };

    return reply.send(item);
  });
}
