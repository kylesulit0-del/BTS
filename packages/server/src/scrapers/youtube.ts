/**
 * YouTube scraper via public RSS/Atom feeds.
 *
 * Fetches videos from configured YouTube channels using their RSS feeds.
 * Thumbnail URLs are constructed from videoId (not parsed from media:thumbnail,
 * which has a known rss-parser bug). No engagement stats are available from
 * RSS feeds -- YouTube Data API is deferred per user decision.
 */

import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import Parser from 'rss-parser';
import { delay } from './utils.js';

const INTER_CHANNEL_DELAY_MS = 1000;

export class YouTubeScraper implements Scraper {
  name = 'youtube';
  private config: GroupScrapingConfig;
  private parser: Parser;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.parser = new Parser({
      customFields: {
        item: [['yt:videoId', 'videoId']],
      },
    });
  }

  async scrape(): Promise<ScraperResult[]> {
    const ytSources = this.config.sources
      .filter((s) => s.type === 'youtube' && s.enabled !== false)
      .sort((a, b) => a.priority - b.priority);

    const results: ScraperResult[] = [];

    for (let i = 0; i < ytSources.length; i++) {
      const source = ytSources[i];
      const start = Date.now();
      const errors: string[] = [];

      // Add delay between channels (skip before first)
      if (i > 0) {
        await delay(INTER_CHANNEL_DELAY_MS);
      }

      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}`;
        console.log(`[youtube] Fetching ${source.label}...`);

        const feed = await this.parser.parseURL(feedUrl);
        const feedItems = feed.items.slice(0, source.fetchCount);

        // Apply keyword filtering if needed
        let filteredItems = feedItems;
        if (source.needsFilter) {
          const keywords = this.config.keywords;
          filteredItems = feedItems.filter((item) =>
            keywords.some((keyword) =>
              (item.title || '').toLowerCase().includes(keyword.toLowerCase()),
            ),
          );
        }

        const items: ScrapedItem[] = filteredItems.map((item) => {
          const videoId = (item as any).videoId as string | undefined;
          const url = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : item.link || '';
          const thumbnailUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            : null;

          return {
            externalId: `yt-${videoId || item.id || ''}`,
            url,
            title: item.title || '',
            source: 'youtube',
            sourceDetail: source.label,
            score: 0,
            commentCount: 0,
            engagementStats: null,
            thumbnailUrl,
            flair: null,
            contentType: null,
            publishedAt: new Date(item.isoDate || Date.now()),
            scrapedAt: new Date(),
          };
        });

        results.push({
          items,
          source: 'youtube',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });

        console.log(`[youtube] ${source.label}: found ${items.length} items`);
      } catch (error) {
        const msg = `Failed to scrape ${source.label}: ${error}`;
        console.error(`[youtube] ${msg}`);
        errors.push(msg);

        results.push({
          items: [],
          source: 'youtube',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      }
    }

    return results;
  }
}
