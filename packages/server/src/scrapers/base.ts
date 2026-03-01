/**
 * Abstract scraper interface and orchestration for all source scrapers.
 *
 * All scrapers (Reddit now, YouTube/RSS/Tumblr/Bluesky in Phase 6) implement
 * the Scraper interface. runAllScrapers() handles DB upserts, deduplication,
 * scrape run tracking, and 30-day content retention cleanup.
 */

import { eq, sql, lt } from 'drizzle-orm';
import { contentItems, scrapeRuns } from '../db/schema.js';
import { normalizeUrl } from './utils.js';
import type { Db } from '../db/index.js';

// ── Scraper types ──────────────────────────────────────────────────────

export interface ScrapedItem {
  externalId: string;       // Reddit post ID (e.g., "t3_abc123")
  url: string;              // Original post URL
  title: string;
  source: string;           // 'reddit'
  sourceDetail: string;     // 'r/bangtan'
  score: number;
  commentCount: number;
  flair: string | null;     // Reddit post flair
  contentType: string | null; // null for now, Phase 7 fills this
  thumbnailUrl: string | null; // Hotlinked image URL, set by each scraper
  engagementStats: Record<string, number> | null; // Per-source typed JSON (e.g., {upvotes: 42, comments: 5})
  publishedAt: Date;
  scrapedAt: Date;
}

export interface ScraperResult {
  items: ScrapedItem[];
  source: string;
  sourceDetail: string;
  duration: number;         // milliseconds
  errors: string[];
}

export interface Scraper {
  name: string;
  scrape(): Promise<ScraperResult[]>;
}

// ── Orchestration ──────────────────────────────────────────────────────

interface RunStats {
  totalFound: number;
  totalNew: number;
  totalUpdated: number;
  totalErrors: string[];
  duration: number;
}

/**
 * Run all scrapers, upsert results into DB, and track each run in scrape_runs.
 *
 * For each ScrapedItem:
 * - Normalizes the URL
 * - Uses INSERT ... ON CONFLICT (normalized_url) DO UPDATE for atomic dedup
 * - New items get full insert; existing items get engagement stats refreshed
 *
 * After scraping, cleans up items older than 30 days.
 */
export async function runAllScrapers(db: Db, scrapers: Scraper[]): Promise<RunStats> {
  const overallStart = Date.now();
  const stats: RunStats = {
    totalFound: 0,
    totalNew: 0,
    totalUpdated: 0,
    totalErrors: [],
    duration: 0,
  };

  for (const scraper of scrapers) {
    console.log(`[scraper] Running ${scraper.name}...`);

    let results: ScraperResult[];
    try {
      results = await scraper.scrape();
    } catch (error) {
      const msg = `${scraper.name} failed: ${error}`;
      console.error(`[scraper] ${msg}`);
      stats.totalErrors.push(msg);
      continue;
    }

    for (const result of results) {
      // Create scrape_runs row
      const startedAt = new Date(Date.now() - result.duration);
      const run = db.insert(scrapeRuns).values({
        source: result.source,
        sourceDetail: result.sourceDetail,
        startedAt,
        status: 'running',
      }).returning().get();

      let itemsNew = 0;
      let itemsUpdated = 0;

      try {
        for (const item of result.items) {
          const normalizedUrl = normalizeUrl(item.url);
          const now = new Date();

          // Check if this normalized URL already exists (for new vs updated tracking)
          const existing = db.select({ id: contentItems.id })
            .from(contentItems)
            .where(eq(contentItems.normalizedUrl, normalizedUrl))
            .get();

          // Upsert: INSERT or UPDATE on normalized_url conflict
          db.insert(contentItems).values({
            url: item.url,
            normalizedUrl,
            title: item.title,
            source: item.source,
            sourceDetail: item.sourceDetail,
            score: item.score,
            commentCount: item.commentCount,
            flair: item.flair,
            contentType: item.contentType,
            externalId: item.externalId,
            publishedAt: item.publishedAt,
            scrapedAt: item.scrapedAt,
            updatedAt: now,
          }).onConflictDoUpdate({
            target: contentItems.normalizedUrl,
            set: {
              score: sql`excluded.score`,
              commentCount: sql`excluded.comment_count`,
              flair: sql`excluded.flair`,
              updatedAt: sql`unixepoch()`,
            },
          }).run();

          if (existing) {
            itemsUpdated++;
          } else {
            itemsNew++;
          }
        }

        // Update scrape_runs with success
        db.update(scrapeRuns)
          .set({
            itemsFound: result.items.length,
            itemsNew,
            itemsUpdated,
            status: 'success',
            completedAt: new Date(),
          })
          .where(eq(scrapeRuns.id, run.id))
          .run();

        stats.totalFound += result.items.length;
        stats.totalNew += itemsNew;
        stats.totalUpdated += itemsUpdated;

        if (result.errors.length > 0) {
          stats.totalErrors.push(...result.errors);
        }

        console.log(`[scraper] ${result.sourceDetail}: found=${result.items.length} new=${itemsNew} updated=${itemsUpdated}`);
      } catch (error) {
        // Update scrape_runs with error
        db.update(scrapeRuns)
          .set({
            status: 'error',
            error: String(error),
            completedAt: new Date(),
          })
          .where(eq(scrapeRuns.id, run.id))
          .run();

        const msg = `${result.sourceDetail} DB error: ${error}`;
        console.error(`[scraper] ${msg}`);
        stats.totalErrors.push(msg);
      }
    }
  }

  // 30-day content retention cleanup
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const deleted = db.delete(contentItems)
    .where(lt(contentItems.scrapedAt, thirtyDaysAgo))
    .run();
  if (deleted.changes > 0) {
    console.log(`[scraper] Cleaned up ${deleted.changes} items older than 30 days`);
  }

  stats.duration = Date.now() - overallStart;
  console.log(`[scraper] Complete: found=${stats.totalFound} new=${stats.totalNew} updated=${stats.totalUpdated} duration=${stats.duration}ms`);

  return stats;
}
