/**
 * Tumblr RSS scraper for fan translations and community content.
 *
 * Fetches posts from configured Tumblr blogs via RSS feeds, extracts
 * the first image from post content for thumbnails, and applies keyword
 * filtering for broader blogs.
 */

import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import Parser from 'rss-parser';
import { delay } from './utils.js';

// ── Tumblr Scraper ────────────────────────────────────────────────────

const INTER_BLOG_DELAY_MS = 1000; // 1 second between blogs

export class TumblrScraper implements Scraper {
  name = 'tumblr';
  private config: GroupScrapingConfig;
  private parser: Parser;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.parser = new Parser();
  }

  async scrape(): Promise<ScraperResult[]> {
    const tumblrSources = this.config.sources
      .filter((s) => s.type === 'tumblr' && s.enabled !== false)
      .sort((a, b) => a.priority - b.priority);

    const results: ScraperResult[] = [];

    for (let i = 0; i < tumblrSources.length; i++) {
      const source = tumblrSources[i];
      const start = Date.now();
      const errors: string[] = [];

      // Add delay between blogs (skip before first)
      if (i > 0) {
        await delay(INTER_BLOG_DELAY_MS);
      }

      try {
        console.log(`[tumblr] Fetching ${source.label}...`);
        const feed = await this.parser.parseURL(source.url);

        // Limit items to fetchCount
        const feedItems = feed.items.slice(0, source.fetchCount);

        // Apply keyword filtering if needed
        let filteredItems = feedItems;
        if (source.needsFilter) {
          const keywords = this.config.keywords;
          filteredItems = feedItems.filter((item) => {
            const title = (item.title || '').toLowerCase();
            const content = (item.content || item['content:encoded'] || '').toLowerCase();
            return keywords.some(
              (kw) => title.includes(kw.toLowerCase()) || content.includes(kw.toLowerCase()),
            );
          });
        }

        const items: ScrapedItem[] = filteredItems.map((item) => {
          // Extract first image from content HTML
          const description = item.content || item['content:encoded'] || '';
          const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
          const thumbnailUrl = imgMatch?.[1] ?? null;

          // Generate stable external ID from link or guid
          const rawId = item.link || item.guid || '';
          const externalId = 'tumblr-' + Buffer.from(rawId).toString('base64url').slice(0, 32);

          return {
            externalId,
            url: item.link || '',
            title: item.title || '(untitled)',
            source: 'tumblr',
            sourceDetail: source.label,
            score: 0,
            commentCount: 0,
            flair: null,
            contentType: null,
            thumbnailUrl,
            engagementStats: null,
            publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
            scrapedAt: new Date(),
          };
        });

        results.push({
          items,
          source: 'tumblr',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      } catch (error) {
        const msg = `Failed to scrape ${source.label}: ${error}`;
        console.error(`[tumblr] ${msg}`);
        errors.push(msg);

        // Push empty result with error so scrape_runs still tracks it
        results.push({
          items: [],
          source: 'tumblr',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      }
    }

    return results;
  }
}
