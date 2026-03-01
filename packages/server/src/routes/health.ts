/**
 * GET /health -- Source health endpoint.
 *
 * Returns the last scrape run status for each unique source,
 * plus server uptime.
 */

import type { FastifyInstance } from 'fastify';
import { desc, eq, sql } from 'drizzle-orm';
import { scrapeRuns } from '../db/schema.js';
import type { Db } from '../db/index.js';

export function registerHealthRoutes(server: FastifyInstance, db: Db) {
  server.get('/health', async (_request, reply) => {
    // Get distinct sources from scrape_runs
    const distinctSources = db
      .selectDistinct({ source: scrapeRuns.source })
      .from(scrapeRuns)
      .all();

    // For each source, get the latest scrape run
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
        lastRun: lastRun?.completedAt instanceof Date
          ? lastRun.completedAt.toISOString()
          : lastRun?.completedAt
            ? new Date(lastRun.completedAt as unknown as number * 1000).toISOString()
            : null,
        status: lastRun?.status ?? 'unknown',
        itemsFound: lastRun?.itemsFound ?? 0,
      };
    });

    return reply.send({
      sources,
      uptime: process.uptime(),
    });
  });
}
