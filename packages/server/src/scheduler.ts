/**
 * Cron scheduler for automated scraping.
 *
 * Schedules scraping at a configurable interval (via CRON_SCHEDULE env var,
 * defaults to every 20 minutes) and triggers an initial scrape on startup
 * so content is available immediately.
 */

import cron from 'node-cron';
import { runAllScrapers } from './scrapers/base.js';
import type { Scraper } from './scrapers/base.js';
import type { Db } from './db/index.js';

const DEFAULT_CRON_SCHEDULE = '*/20 * * * *';

/**
 * Start the scraper scheduler.
 *
 * - Runs an initial scrape immediately on startup
 * - Schedules recurring scrapes via node-cron using CRON_SCHEDULE env var
 *   (defaults to every 20 minutes if unset or invalid)
 * - Returns the cron task for stopping in tests/shutdown
 */
export function startScheduler(db: Db, scrapers: Scraper[]) {
  // Determine cron schedule from env, validate, fall back to default
  let schedule = process.env.CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE;
  if (!cron.validate(schedule)) {
    console.warn(
      `[scheduler] Invalid CRON_SCHEDULE "${schedule}", falling back to default: ${DEFAULT_CRON_SCHEDULE}`
    );
    schedule = DEFAULT_CRON_SCHEDULE;
  }

  // Run initial scrape on startup (non-blocking -- don't await)
  console.log('[scheduler] Running initial scrape on startup...');
  runAllScrapers(db, scrapers).catch((error) => {
    console.error('[scheduler] Initial scrape failed:', error);
  });

  // Schedule recurring scrapes
  const task = cron.schedule(schedule, async () => {
    console.log(`[scheduler] Starting scheduled scrape (${schedule})...`);
    try {
      await runAllScrapers(db, scrapers);
    } catch (error) {
      console.error('[scheduler] Scheduled scrape failed:', error);
    }
  });

  console.log(`[scheduler] Scrape scheduled with cron expression: ${schedule}`);
  return task;
}
