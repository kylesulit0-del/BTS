/**
 * Cron scheduler for automated scraping.
 *
 * Schedules scraping to run every hour and triggers an initial scrape on startup
 * so content is available immediately.
 */

import cron from 'node-cron';
import { runAllScrapers } from './scrapers/base.js';
import type { Scraper } from './scrapers/base.js';
import type { Db } from './db/index.js';

/**
 * Start the scraper scheduler.
 *
 * - Runs an initial scrape immediately on startup
 * - Schedules hourly scrapes via node-cron (at minute 0)
 * - Returns the cron task for stopping in tests/shutdown
 */
export function startScheduler(db: Db, scrapers: Scraper[]) {
  // Run initial scrape on startup (non-blocking -- don't await)
  console.log('[scheduler] Running initial scrape on startup...');
  runAllScrapers(db, scrapers).catch((error) => {
    console.error('[scheduler] Initial scrape failed:', error);
  });

  // Schedule hourly scrapes
  const task = cron.schedule('0 * * * *', async () => {
    console.log('[scheduler] Starting hourly scrape...');
    try {
      await runAllScrapers(db, scrapers);
    } catch (error) {
      console.error('[scheduler] Scheduled scrape failed:', error);
    }
  });

  console.log('[scheduler] Hourly scrape scheduled (0 * * * *)');
  return task;
}
