/**
 * CLI entry point for manual scraping: `npm run scrape`
 *
 * Initializes the database, creates a Reddit scraper with BTS config,
 * runs all scrapers, logs results, and exits.
 */

import { initDb } from './db/index.js';
import { RedditScraper } from './scrapers/reddit.js';
import { runAllScrapers } from './scrapers/base.js';
import { getBtsScrapingConfig } from '@bts/shared/config/sources.js';

async function main() {
  console.log('[scrape-cli] Starting manual scrape...');

  const db = initDb();
  const config = getBtsScrapingConfig();
  const scraper = new RedditScraper(config);

  const stats = await runAllScrapers(db, [scraper]);

  console.log('\n[scrape-cli] Scrape complete:');
  console.log(`  Items found:   ${stats.totalFound}`);
  console.log(`  Items new:     ${stats.totalNew}`);
  console.log(`  Items updated: ${stats.totalUpdated}`);
  console.log(`  Duration:      ${stats.duration}ms`);

  if (stats.totalErrors.length > 0) {
    console.log(`  Errors (${stats.totalErrors.length}):`);
    for (const err of stats.totalErrors) {
      console.log(`    - ${err}`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('[scrape-cli] Fatal error:', error);
  process.exit(1);
});
