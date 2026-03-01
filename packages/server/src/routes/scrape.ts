/**
 * POST /scrape -- Manual scrape trigger endpoint.
 *
 * Triggers runAllScrapers() and returns the result stats.
 * Uses a simple flag-based guard to prevent concurrent scrapes.
 */

import type { FastifyInstance } from 'fastify';
import { runAllScrapers } from '../scrapers/base.js';
import type { Scraper } from '../scrapers/base.js';
import type { Db } from '../db/index.js';

let scrapeRunning = false;

export function registerScrapeRoutes(server: FastifyInstance, db: Db, scrapers: Scraper[]) {
  server.post('/scrape', async (_request, reply) => {
    if (scrapeRunning) {
      return reply.send({ status: 'already_running' });
    }

    scrapeRunning = true;
    try {
      const stats = await runAllScrapers(db, scrapers);
      return reply.send({
        status: 'ok',
        results: {
          itemsFound: stats.totalFound,
          itemsNew: stats.totalNew,
          itemsUpdated: stats.totalUpdated,
        },
      });
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: String(error),
      });
    } finally {
      scrapeRunning = false;
    }
  });
}
