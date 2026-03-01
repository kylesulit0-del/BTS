/**
 * GET /health -- Basic health check (backward compatible).
 * GET /health/sources -- Per-source scrape health with traffic light indicators.
 *
 * Returns the last scrape run status for each unique source,
 * plus server uptime and traffic light status (green/yellow/red).
 */

import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { scrapeRuns } from '../db/schema.js';
import type { Db } from '../db/index.js';

/** Convert a drizzle timestamp field to ISO string (handles Date and unix epoch number). */
function toISOString(val: Date | number | null | undefined): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString();
  return new Date((val as number) * 1000).toISOString();
}

type TrafficLight = 'green' | 'yellow' | 'red';

/** Calculate traffic light status from recent runs. */
function calculateTrafficLight(
  recentRuns: Array<{ status: string; startedAt: Date | number | null }>,
): TrafficLight {
  // No runs in last 24 hours -> red
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const runsInLast24h = recentRuns.filter((r) => {
    if (r.startedAt == null) return false;
    const ts = r.startedAt instanceof Date ? r.startedAt.getTime() : (r.startedAt as number) * 1000;
    return ts >= oneDayAgo;
  });
  if (runsInLast24h.length === 0) return 'red';

  // Check last 3 runs for errors
  const last3 = recentRuns.slice(0, 3);
  const hasRecentError = last3.some((r) => r.status === 'error');

  if (!hasRecentError) return 'green';

  // Count errors in last 10 runs
  const errorCount = recentRuns.filter((r) => r.status === 'error').length;
  const errorRate = errorCount / recentRuns.length;

  return errorRate > 0.5 ? 'red' : 'yellow';
}

export function registerHealthRoutes(server: FastifyInstance, db: Db) {
  // Backward-compatible basic health endpoint
  server.get('/health', async (_request, reply) => {
    const distinctSources = db
      .selectDistinct({ source: scrapeRuns.source })
      .from(scrapeRuns)
      .all();

    const sources = distinctSources.map(({ source }) => {
      const lastRun = db
        .select()
        .from(scrapeRuns)
        .where(eq(scrapeRuns.source, source))
        .orderBy(desc(scrapeRuns.startedAt))
        .limit(1)
        .get();

      return {
        source,
        lastRun: toISOString(lastRun?.completedAt ?? null),
        status: lastRun?.status ?? 'unknown',
        itemsFound: lastRun?.itemsFound ?? 0,
      };
    });

    return reply.send({
      sources,
      uptime: process.uptime(),
    });
  });

  // Enhanced per-source health with traffic light indicators
  server.get('/health/sources', async (_request, reply) => {
    const distinctSources = db
      .selectDistinct({ source: scrapeRuns.source })
      .from(scrapeRuns)
      .all();

    // Find the most recent scrape across all sources
    const latestRun = db
      .select({ startedAt: scrapeRuns.startedAt })
      .from(scrapeRuns)
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(1)
      .get();

    const sources = distinctSources.map(({ source }) => {
      // Get last 10 runs for this source
      const recentRuns = db
        .select({
          status: scrapeRuns.status,
          startedAt: scrapeRuns.startedAt,
          itemsFound: scrapeRuns.itemsFound,
          duration: scrapeRuns.duration,
        })
        .from(scrapeRuns)
        .where(eq(scrapeRuns.source, source))
        .orderBy(desc(scrapeRuns.startedAt))
        .limit(10)
        .all();

      const lastRun = recentRuns[0] ?? null;
      const status = calculateTrafficLight(recentRuns);

      return {
        source,
        status,
        lastRun: toISOString(lastRun?.startedAt ?? null),
        lastStatus: lastRun?.status ?? 'unknown',
        itemsFound: lastRun?.itemsFound ?? 0,
        recentRuns: recentRuns.map((r) => ({
          status: r.status,
          startedAt: toISOString(r.startedAt),
          itemsFound: r.itemsFound ?? 0,
          duration: r.duration ?? 0,
        })),
      };
    });

    return reply.send({
      sources,
      uptime: process.uptime(),
      lastScrapeAt: toISOString(latestRun?.startedAt ?? null),
    });
  });
}
