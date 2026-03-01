/**
 * Server-side scraping source configuration.
 *
 * This is SEPARATE from the frontend's src/config/groups/bts/sources.ts.
 * The frontend continues using its own SourceEntry type for client-side fetchers.
 * This config is optimized for server-side scraping with keywords and priority.
 */

/** A single source to scrape. */
export interface ScrapingSource {
  id: string;
  type: string;             // 'reddit', 'youtube', 'rss', 'tumblr', etc.
  label: string;            // Human-readable name
  url: string;              // Subreddit name for reddit, feed URL for others
  needsFilter: boolean;     // Whether content needs keyword filtering
  fetchCount: number;       // Max items to fetch per scrape
  priority: number;         // Scrape order priority (lower = first)
  enabled: boolean;
}

/** Group-level scraping configuration. */
export interface GroupScrapingConfig {
  name: string;
  keywords: string[];
  sources: ScrapingSource[];
}

/**
 * Returns the BTS scraping configuration with all Reddit sources
 * from v1.0 plus broader K-pop subreddits.
 */
export function getBtsScrapingConfig(): GroupScrapingConfig {
  return {
    name: 'bts',
    keywords: [
      // Group names
      'BTS', 'Bangtan', 'Bangtan Sonyeondan', 'ARMY',
      // Stage names
      'RM', 'Jin', 'Suga', 'J-Hope', 'Jimin', 'V', 'Jungkook',
      // Real names
      'Namjoon', 'Kim Namjoon',
      'Seokjin', 'Kim Seokjin',
      'Yoongi', 'Min Yoongi',
      'Hoseok', 'Jung Hoseok',
      'Park Jimin',
      'Taehyung', 'Kim Taehyung',
      'Jeon Jungkook',
      // Solo / alter-ego names
      'Agust D', 'j-hope',
    ],
    sources: [
      // BTS-dedicated subreddits (needsFilter: false)
      {
        id: 'reddit-bangtan',
        type: 'reddit',
        label: 'r/bangtan',
        url: 'bangtan',
        needsFilter: false,
        fetchCount: 50,
        priority: 1,
        enabled: true,
      },
      {
        id: 'reddit-heungtan',
        type: 'reddit',
        label: 'r/heungtan',
        url: 'heungtan',
        needsFilter: false,
        fetchCount: 50,
        priority: 2,
        enabled: true,
      },
      {
        id: 'reddit-bts7',
        type: 'reddit',
        label: 'r/bts7',
        url: 'bts7',
        needsFilter: false,
        fetchCount: 50,
        priority: 3,
        enabled: true,
      },
      {
        id: 'reddit-btsworld',
        type: 'reddit',
        label: 'r/BTSWorld',
        url: 'BTSWorld',
        needsFilter: false,
        fetchCount: 50,
        priority: 4,
        enabled: true,
      },

      // Broader K-pop subreddits (needsFilter: true -- keyword filtering required)
      {
        id: 'reddit-kpop',
        type: 'reddit',
        label: 'r/kpop',
        url: 'kpop',
        needsFilter: true,
        fetchCount: 50,
        priority: 5,
        enabled: true,
      },
      {
        id: 'reddit-kpopthoughts',
        type: 'reddit',
        label: 'r/kpopthoughts',
        url: 'kpopthoughts',
        needsFilter: true,
        fetchCount: 50,
        priority: 6,
        enabled: true,
      },
      {
        id: 'reddit-kpoopheads',
        type: 'reddit',
        label: 'r/kpoopheads',
        url: 'kpoopheads',
        needsFilter: true,
        fetchCount: 50,
        priority: 7,
        enabled: true,
      },
    ],
  };
}
