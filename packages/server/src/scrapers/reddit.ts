/**
 * Reddit scraper implementation using Reddit's public JSON API.
 *
 * Fetches hot posts from all configured BTS subreddits, respecting rate limits
 * (2-second delay between subreddits), filtering NSFW content, and applying
 * keyword filtering for broader K-pop subreddits.
 */

import type { Scraper, ScrapedItem, ScraperResult } from './base.js';
import type { GroupScrapingConfig } from '@bts/shared/config/sources.js';
import { fetchWithRetry, delay } from './utils.js';

// ── Reddit API response types ──────────────────────────────────────────

interface RedditListing {
  data: {
    children: Array<{ data: RedditPost }>;
    after: string | null;
  };
}

interface RedditPost {
  name: string;                    // "t3_abc123"
  title: string;
  url: string;
  url_overridden_by_dest?: string; // For link posts, the actual destination URL
  permalink: string;               // "/r/bangtan/comments/abc123/title/"
  subreddit_name_prefixed: string; // "r/bangtan"
  score: number;
  ups: number;                     // Fuzzed -- use score instead
  num_comments: number;
  link_flair_text: string | null;
  over_18: boolean;
  created_utc: number;
}

// ── Reddit Scraper ─────────────────────────────────────────────────────

const INTER_SUBREDDIT_DELAY_MS = 2000; // 2 seconds between subreddits (Reddit rate limit: ~10 QPM)

export class RedditScraper implements Scraper {
  name = 'reddit';
  private config: GroupScrapingConfig;

  constructor(config: GroupScrapingConfig) {
    this.config = config;
  }

  async scrape(): Promise<ScraperResult[]> {
    // Filter to enabled Reddit sources, sorted by priority
    const redditSources = this.config.sources
      .filter((s) => s.type === 'reddit' && s.enabled !== false)
      .sort((a, b) => a.priority - b.priority);

    const results: ScraperResult[] = [];

    for (let i = 0; i < redditSources.length; i++) {
      const source = redditSources[i];
      const start = Date.now();
      const errors: string[] = [];

      // Add delay between subreddits (skip before first)
      if (i > 0) {
        await delay(INTER_SUBREDDIT_DELAY_MS);
      }

      try {
        const url = `https://www.reddit.com/r/${source.url}/hot.json?limit=${source.fetchCount}`;
        console.log(`[reddit] Fetching ${source.label}...`);

        const response = await fetchWithRetry(url);
        const listing: RedditListing = await response.json();

        const posts = listing.data.children.map((child) => child.data);

        // Filter out NSFW posts
        const safePosts = posts.filter((post) => !post.over_18);

        // Apply keyword filtering if this source requires it
        let filteredPosts = safePosts;
        if (source.needsFilter) {
          const keywords = this.config.keywords;
          filteredPosts = safePosts.filter((post) =>
            keywords.some((keyword) =>
              post.title.toLowerCase().includes(keyword.toLowerCase()),
            ),
          );
        }

        const items: ScrapedItem[] = filteredPosts.map((post) => ({
          externalId: post.name,
          url: post.url_overridden_by_dest || `https://www.reddit.com${post.permalink}`,
          title: post.title,
          description: null,
          source: 'reddit',
          sourceDetail: post.subreddit_name_prefixed,
          score: post.score,
          commentCount: post.num_comments,
          flair: post.link_flair_text,
          contentType: null,
          thumbnailUrl: null,
          engagementStats: { upvotes: post.score, comments: post.num_comments },
          publishedAt: new Date(post.created_utc * 1000),
          scrapedAt: new Date(),
        }));

        results.push({
          items,
          source: 'reddit',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      } catch (error) {
        const msg = `Failed to scrape ${source.label}: ${error}`;
        console.error(`[reddit] ${msg}`);
        errors.push(msg);

        // Push empty result with error so scrape_runs still tracks it
        results.push({
          items: [],
          source: 'reddit',
          sourceDetail: source.label,
          duration: Date.now() - start,
          errors,
        });
      }
    }

    return results;
  }
}
