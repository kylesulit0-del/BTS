/**
 * Admin API routes for the LLM moderation pipeline.
 *
 * Endpoints:
 * - GET /pipeline/stats — Pipeline overview for status page
 * - GET /pipeline/rejected — Inspect rejected items with decision details
 * - POST /pipeline/override/:id — Manually approve/reject items
 */

import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, sql, desc, gte } from 'drizzle-orm';
import { contentItems, pipelineRuns, pipelineDecisions } from '../db/schema.js';
import type { Db } from '../db/index.js';

export function registerPipelineRoutes(server: FastifyInstance, db: Db) {

  // GET /pipeline/stats — pipeline overview for status page
  server.get('/pipeline/stats', async (_request, reply) => {
    // Aggregate pipeline run stats
    const runStats = db
      .select({
        totalRuns: sql<number>`count(*)`,
        itemsProcessed: sql<number>`coalesce(sum(${pipelineRuns.itemsProcessed}), 0)`,
        itemsApproved: sql<number>`coalesce(sum(${pipelineRuns.itemsApproved}), 0)`,
        itemsRejected: sql<number>`coalesce(sum(${pipelineRuns.itemsRejected}), 0)`,
        totalInputTokens: sql<number>`coalesce(sum(${pipelineRuns.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${pipelineRuns.outputTokens}), 0)`,
        estimatedCostUsd: sql<string>`coalesce(sum(cast(${pipelineRuns.estimatedCost} as real)), 0)`,
      })
      .from(pipelineRuns)
      .get();

    // Today's runs
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStats = db
      .select({ count: sql<number>`count(*)` })
      .from(pipelineRuns)
      .where(gte(pipelineRuns.startedAt, todayStart))
      .get();

    // Most recent run (for fallback mode check and lastRunAt)
    const lastRun = db
      .select({
        fallbackMode: pipelineRuns.fallbackMode,
        startedAt: pipelineRuns.startedAt,
        provider: pipelineRuns.provider,
      })
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.id))
      .limit(1)
      .get();

    // Content item counts by moderation status
    const statusCounts = db
      .select({
        status: contentItems.moderationStatus,
        count: sql<number>`count(*)`,
      })
      .from(contentItems)
      .where(isNull(contentItems.deletedAt))
      .groupBy(contentItems.moderationStatus)
      .all();

    const contentCounts: Record<string, number> = { raw: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of statusCounts) {
      contentCounts[row.status] = row.count;
    }

    return reply.send({
      totalRuns: runStats?.totalRuns ?? 0,
      todayRuns: todayStats?.count ?? 0,
      itemsProcessed: runStats?.itemsProcessed ?? 0,
      itemsApproved: runStats?.itemsApproved ?? 0,
      itemsRejected: runStats?.itemsRejected ?? 0,
      totalInputTokens: runStats?.totalInputTokens ?? 0,
      totalOutputTokens: runStats?.totalOutputTokens ?? 0,
      estimatedCostUsd: parseFloat(String(runStats?.estimatedCostUsd ?? '0')),
      inFallbackMode: lastRun?.fallbackMode ?? false,
      contentCounts,
      lastRunAt: lastRun?.startedAt
        ? (lastRun.startedAt instanceof Date
          ? lastRun.startedAt.toISOString()
          : new Date((lastRun.startedAt as unknown as number) * 1000).toISOString())
        : null,
      provider: lastRun?.provider ?? null,
    });
  });

  // GET /pipeline/rejected — inspect rejected items with decision details
  server.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/pipeline/rejected', async (request, reply) => {
    let limit = parseInt(request.query.limit || '50', 10);
    if (isNaN(limit) || limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    let offset = parseInt(request.query.offset || '0', 10);
    if (isNaN(offset) || offset < 0) offset = 0;

    const rows = db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        url: contentItems.url,
        source: contentItems.source,
        sourceDetail: contentItems.sourceDetail,
        relevant: pipelineDecisions.relevant,
        safe: pipelineDecisions.safe,
        contentType: pipelineDecisions.contentType,
        decidedAt: pipelineDecisions.decidedAt,
      })
      .from(contentItems)
      .leftJoin(
        pipelineDecisions,
        eq(contentItems.id, pipelineDecisions.contentItemId),
      )
      .where(
        and(
          eq(contentItems.moderationStatus, 'rejected'),
          isNull(contentItems.deletedAt),
        )
      )
      .orderBy(desc(contentItems.id))
      .limit(limit)
      .offset(offset)
      .all();

    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceDetail: row.sourceDetail,
      decision: row.decidedAt
        ? {
            relevant: row.relevant,
            safe: row.safe,
            contentType: row.contentType,
            decidedAt: row.decidedAt instanceof Date
              ? row.decidedAt.toISOString()
              : new Date((row.decidedAt as unknown as number) * 1000).toISOString(),
          }
        : null,
    }));

    return reply.send(items);
  });

  // POST /pipeline/override/:id — manually approve/reject items
  server.post<{
    Params: { id: string };
    Body: { status: string };
  }>('/pipeline/override/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid item ID' });
    }

    const { status } = request.body || {};
    if (status !== 'approved' && status !== 'rejected') {
      return reply.status(400).send({ error: 'Invalid status. Must be "approved" or "rejected".' });
    }

    // Check item exists
    const item = db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .get();

    if (!item) {
      return reply.status(404).send({ error: 'Item not found' });
    }

    // Update moderation status
    db.update(contentItems)
      .set({
        moderationStatus: status,
        moderatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .run();

    return reply.send({ success: true, id, newStatus: status });
  });
}
