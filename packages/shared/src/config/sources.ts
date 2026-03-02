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
  boost?: number;           // Ranking boost multiplier (default 1.0). Fan translation accounts: 1.5-2.0
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

      // ── YouTube sources ────────────────────────────────────────────────
      { id: 'yt-bangtantv', type: 'youtube', label: 'BANGTANTV', url: 'UCLkAepWjdylmXSltofFvsYQ', needsFilter: false, fetchCount: 15, priority: 10, enabled: true },
      { id: 'yt-hybe', type: 'youtube', label: 'HYBE LABELS', url: 'UC3IZKseVpdzPSBaWxBxundA', needsFilter: true, fetchCount: 15, priority: 11, enabled: true },

      // ── RSS/news sources ───────────────────────────────────────────────
      { id: 'rss-soompi', type: 'rss', label: 'Soompi', url: 'https://www.soompi.com/feed', needsFilter: true, fetchCount: 20, priority: 20, enabled: true },
      { id: 'rss-allkpop', type: 'rss', label: 'AllKPop', url: 'https://www.allkpop.com/feed', needsFilter: true, fetchCount: 20, priority: 21, enabled: true },
      { id: 'rss-koreaboo', type: 'rss', label: 'Koreaboo', url: 'https://www.koreaboo.com/feed/', needsFilter: true, fetchCount: 20, priority: 22, enabled: true },
      { id: 'rss-hellokpop', type: 'rss', label: 'HELLOKPOP', url: 'https://www.hellokpop.com/feed/', needsFilter: true, fetchCount: 20, priority: 23, enabled: true },
      { id: 'rss-kpopstarz', type: 'rss', label: 'KpopStarz', url: 'https://www.kpopstarz.com/rss', needsFilter: true, fetchCount: 20, priority: 24, enabled: true },
      { id: 'rss-seoulbeats', type: 'rss', label: 'Seoulbeats', url: 'https://seoulbeats.com/feed/', needsFilter: true, fetchCount: 20, priority: 25, enabled: true },
      { id: 'rss-asianjunkie', type: 'rss', label: 'Asian Junkie', url: 'https://www.asianjunkie.com/feed/', needsFilter: true, fetchCount: 20, priority: 26, enabled: true },
      // Seoul Space: pending URL verification, disabled until confirmed
      { id: 'rss-seoulspace', type: 'rss', label: 'Seoul Space', url: 'PENDING_URL', needsFilter: true, fetchCount: 20, priority: 27, enabled: false },

      // ── Tumblr sources (for plan 03) ───────────────────────────────────
      { id: 'tumblr-bts-trans', type: 'tumblr', label: 'bts-trans', url: 'https://bts-trans.tumblr.com/rss', needsFilter: false, fetchCount: 10, priority: 30, enabled: true, boost: 1.5 },
      { id: 'tumblr-kimtaegis', type: 'tumblr', label: 'kimtaegis', url: 'https://kimtaegis.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 31, enabled: true },
      { id: 'tumblr-userparkjimin', type: 'tumblr', label: 'userparkjimin', url: 'https://userparkjimin.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 32, enabled: true },
      { id: 'tumblr-namjin', type: 'tumblr', label: 'namjin', url: 'https://namjin.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 33, enabled: true },
      { id: 'tumblr-jikook', type: 'tumblr', label: 'jikook', url: 'https://jikook.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 34, enabled: true },

      // ── Bluesky source (for plan 03) ───────────────────────────────────
      { id: 'bluesky-bts', type: 'bluesky', label: 'Bluesky BTS', url: 'BTS', needsFilter: false, fetchCount: 25, priority: 40, enabled: true },
    ],
  };
}
