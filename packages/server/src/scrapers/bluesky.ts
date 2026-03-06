/**
 * Bluesky AT Protocol scraper for BTS-related post search.
 *
 * Authenticates via app password, searches for posts matching configured
 * keywords, extracts embedded images and like counts, and deduplicates
 * results across multiple keyword searches.
 */

import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import { BskyAgent } from '@atproto/api';
import { delay } from './utils.js';

// ── Bluesky Scraper ───────────────────────────────────────────────────

const INTER_KEYWORD_DELAY_MS = 500; // 500ms between keyword searches

export class BlueskyScraper implements Scraper {
  name = 'bluesky';
  private config: GroupScrapingConfig;
  private agent: BskyAgent;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
    this.agent = new BskyAgent({ service: 'https://bsky.social' });
  }

  async scrape(): Promise<ScraperResult[]> {
    const start = Date.now();
    const errors: string[] = [];

    // Auth check: graceful degradation if credentials not configured
    if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
      console.warn('[bluesky] Bluesky credentials not configured (BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)');
      return [{
        items: [],
        source: 'bluesky',
        sourceDetail: 'Bluesky',
        duration: Date.now() - start,
        errors: ['Bluesky credentials not configured (BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)'],
      }];
    }

    // Authenticate
    try {
      await this.agent.login({
        identifier: process.env.BLUESKY_HANDLE!,
        password: process.env.BLUESKY_APP_PASSWORD!,
      });
    } catch (error) {
      const msg = `Bluesky auth failed: ${error}`;
      console.error(`[bluesky] ${msg}`);
      return [{
        items: [],
        source: 'bluesky',
        sourceDetail: 'Bluesky',
        duration: Date.now() - start,
        errors: [msg],
      }];
    }

    const bluskySources = this.config.sources
      .filter((s) => s.type === 'bluesky' && s.enabled !== false);

    // Collect all items, deduplicating by post URI
    const seenUris = new Set<string>();
    const allItems: ScrapedItem[] = [];

    for (const source of bluskySources) {
      // Use source URL as primary keyword, plus top 5 config keywords
      const keywords = [source.url, ...this.config.keywords.slice(0, 5)];

      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];

        // Add delay between keyword searches (skip before first)
        if (i > 0) {
          await delay(INTER_KEYWORD_DELAY_MS);
        }

        try {
          console.log(`[bluesky] Searching for "${keyword}"...`);
          const response = await this.agent.app.bsky.feed.searchPosts({
            q: keyword,
            limit: source.fetchCount,
            sort: 'latest',
          });

          for (const post of response.data.posts) {
            // Deduplicate across keyword searches
            if (seenUris.has(post.uri)) continue;
            seenUris.add(post.uri);

            const text = (post.record as any).text as string;
            const likes = post.likeCount ?? 0;
            const createdAt = (post.record as any).createdAt as string;
            const rkey = post.uri.split('/').pop() || '';
            const webUrl = `https://bsky.app/profile/${post.author.handle}/post/${rkey}`;

            // Extract embedded image thumbnail
            const thumbnailUrl = this.extractThumbnail(post.embed);

            allItems.push({
              externalId: `bsky-${rkey}`,
              url: webUrl,
              title: text.slice(0, 200),
              description: null,
              source: 'bluesky',
              sourceDetail: 'Bluesky',
              score: 0,
              commentCount: 0,
              flair: null,
              contentType: null,
              thumbnailUrl,
              engagementStats: { likes },
              publishedAt: new Date(createdAt),
              scrapedAt: new Date(),
            });
          }
        } catch (error) {
          const msg = `Bluesky search failed for "${keyword}": ${error}`;
          console.error(`[bluesky] ${msg}`);
          errors.push(msg);
        }
      }
    }

    return [{
      items: allItems,
      source: 'bluesky',
      sourceDetail: 'Bluesky',
      duration: Date.now() - start,
      errors,
    }];
  }

  /**
   * Extract thumbnail URL from a Bluesky post embed.
   * Handles both direct image embeds and quote posts with media.
   */
  private extractThumbnail(embed: any): string | null {
    if (!embed) return null;

    // Direct image embed: app.bsky.embed.images#view
    if (embed.$type === 'app.bsky.embed.images#view') {
      return embed.images?.[0]?.thumb ?? null;
    }

    // Quote post with media: app.bsky.embed.recordWithMedia#view
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
      const media = embed.media;
      if (media?.$type === 'app.bsky.embed.images#view') {
        return media.images?.[0]?.thumb ?? null;
      }
    }

    return null;
  }
}
