/**
 * RSS/news site scraper for K-pop news, Google News, and AO3 sources.
 *
 * A single scraper class handles all RSS-type sources from config: traditional
 * RSS (Soompi, AllKPop, etc.), Google News RSS feeds, and AO3 Atom feeds.
 * Uses progressive thumbnail extraction: RSS enclosure -> og:image -> first
 * article image, with logo detection and HEAD validation.
 *
 * Source types handled: 'rss', 'googlenews', 'ao3'
 */

import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import Parser from 'rss-parser';
import { delay } from './utils.js';
import { extractOgImage, extractRssThumbnail, validateThumbnail } from './thumbnail.js';

const INTER_SITE_DELAY_MS = 1000;

// Parser with custom fields for AO3 dc:language extraction
const ao3Parser = new Parser({
  customFields: {
    item: ['dc:language'],
  },
});

export class RssNewsScraper implements Scraper {
  name = 'rss';
  private config: GroupScrapingConfig;
  private parser: Parser;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.parser = new Parser();
  }

  async scrape(): Promise<ScraperResult[]> {
    const rssSources = this.config.sources
      .filter((s) => ['rss', 'googlenews', 'ao3'].includes(s.type) && s.enabled !== false)
      .sort((a, b) => a.priority - b.priority);

    const results: ScraperResult[] = [];

    for (let i = 0; i < rssSources.length; i++) {
      const source = rssSources[i];
      const start = Date.now();
      const errors: string[] = [];

      // Add delay between sites (skip before first)
      if (i > 0) {
        await delay(INTER_SITE_DELAY_MS);
      }

      try {
        console.log(`[rss] Fetching ${source.label}...`);

        // Use AO3-specific parser for dc:language extraction
        const parser = source.type === 'ao3' ? ao3Parser : this.parser;
        const feed = await parser.parseURL(source.url);
        let feedItems = feed.items.slice(0, source.fetchCount);

        // AO3 English-language filter: only keep English or untagged fics
        if (source.type === 'ao3') {
          feedItems = feedItems.filter(item => {
            const lang = (item as any)['dc:language'] || (item as any).language || '';
            return lang === '' || lang.startsWith('en');
          });
        }

        // Apply keyword filtering if needed
        if (source.needsFilter) {
          const keywords = this.config.keywords;
          feedItems = feedItems.filter((item) => {
            const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
            return keywords.some((keyword) =>
              text.includes(keyword.toLowerCase()),
            );
          });
        }

        // Extract thumbnails with progressive strategy
        // Step 1: Try RSS-level thumbnails first (fast, no HTTP)
        const thumbnailPromises = feedItems.map(async (item) => {
          // Try RSS enclosure/media elements first
          let thumbnail = extractRssThumbnail(item);

          // If no RSS thumbnail, try og:image from article HTML
          if (!thumbnail && item.link) {
            thumbnail = await extractOgImage(item.link);
          }

          return thumbnail;
        });

        const thumbnailResults = await Promise.allSettled(thumbnailPromises);

        // Step 2: Validate all found thumbnails in parallel
        const thumbnails: (string | null)[] = thumbnailResults.map((result) =>
          result.status === 'fulfilled' ? result.value : null,
        );

        const validationPromises = thumbnails.map(async (url) => {
          if (!url) return null;
          const valid = await validateThumbnail(url);
          return valid ? url : null;
        });

        const validatedThumbnails = await Promise.allSettled(validationPromises);

        // Build ScrapedItems
        const items: ScrapedItem[] = feedItems.map((item, idx) => {
          const validResult = validatedThumbnails[idx];
          const thumbnailUrl = validResult?.status === 'fulfilled' ? validResult.value : null;

          // Stable external ID from URL
          const idSource = item.link || item.guid || '';
          const externalId = `rss-${Buffer.from(idSource).toString('base64url').slice(0, 32)}`;

          return {
            externalId,
            url: item.link || '',
            title: item.title || '',
            description: item.contentSnippet?.slice(0, 300) || item.content?.slice(0, 300) || null,
            source: source.type,
            sourceDetail: source.label,
            score: 0,
            commentCount: 0,
            engagementStats: null,
            thumbnailUrl,
            flair: null,
            contentType: null,
            publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
            scrapedAt: new Date(),
          };
        });

        results.push({
          items,
          source: source.type,
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });

        console.log(`[rss] ${source.label}: found ${items.length} items`);
      } catch (error) {
        const msg = `Failed to scrape ${source.label}: ${error}`;
        console.error(`[rss] ${msg}`);
        errors.push(msg);

        results.push({
          items: [],
          source: source.type,
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      }
    }

    return results;
  }
}
