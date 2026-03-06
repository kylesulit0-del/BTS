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
      // ── Reddit: BTS-dedicated subreddits (needsFilter: false) ────────
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

      // New BTS-related subreddits
      { id: 'reddit-btsarmy', type: 'reddit', label: 'r/BTSARMY', url: 'BTSARMY', needsFilter: false, fetchCount: 50, priority: 8, enabled: true },
      { id: 'reddit-korean-hiphop', type: 'reddit', label: 'r/Korean_Hip_Hop', url: 'Korean_Hip_Hop', needsFilter: true, fetchCount: 50, priority: 9, enabled: true },

      // Solo member subreddits
      { id: 'reddit-namjoon', type: 'reddit', label: 'r/Namjoon', url: 'Namjoon', needsFilter: false, fetchCount: 25, priority: 10, enabled: true },
      { id: 'reddit-jinbts', type: 'reddit', label: 'r/jinbts', url: 'jinbts', needsFilter: false, fetchCount: 25, priority: 11, enabled: true },
      { id: 'reddit-suga', type: 'reddit', label: 'r/Suga', url: 'Suga', needsFilter: false, fetchCount: 25, priority: 12, enabled: true },
      { id: 'reddit-jhope', type: 'reddit', label: 'r/jhope', url: 'jhope', needsFilter: false, fetchCount: 25, priority: 13, enabled: true },
      { id: 'reddit-jimin', type: 'reddit', label: 'r/jimin', url: 'jimin', needsFilter: false, fetchCount: 25, priority: 14, enabled: true },
      { id: 'reddit-taehyung', type: 'reddit', label: 'r/taehyung', url: 'taehyung', needsFilter: false, fetchCount: 25, priority: 15, enabled: true },
      { id: 'reddit-jungkook', type: 'reddit', label: 'r/jungkook', url: 'jungkook', needsFilter: false, fetchCount: 25, priority: 16, enabled: true },

      // ── YouTube sources ────────────────────────────────────────────────
      { id: 'yt-bangtantv', type: 'youtube', label: 'BANGTANTV', url: 'UCLkAepWjdylmXSltofFvsYQ', needsFilter: false, fetchCount: 15, priority: 18, enabled: true },
      { id: 'yt-hybe', type: 'youtube', label: 'HYBE LABELS', url: 'UC3IZKseVpdzPSBaWxBxundA', needsFilter: true, fetchCount: 15, priority: 19, enabled: true },

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
      // Billboard and Rolling Stone: general feeds, need keyword filtering for K-pop/BTS content
      { id: 'rss-billboard', type: 'rss', label: 'Billboard', url: 'https://www.billboard.com/feed/', needsFilter: true, fetchCount: 15, priority: 28, enabled: true },
      { id: 'rss-rollingstone', type: 'rss', label: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', needsFilter: true, fetchCount: 15, priority: 29, enabled: true },

      // ── Tumblr sources ─────────────────────────────────────────────────
      { id: 'tumblr-bts-trans', type: 'tumblr', label: 'bts-trans', url: 'https://bts-trans.tumblr.com/rss', needsFilter: false, fetchCount: 10, priority: 30, enabled: true, boost: 1.5 },
      { id: 'tumblr-kimtaegis', type: 'tumblr', label: 'kimtaegis', url: 'https://kimtaegis.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 31, enabled: true },
      { id: 'tumblr-userparkjimin', type: 'tumblr', label: 'userparkjimin', url: 'https://userparkjimin.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 32, enabled: true },
      { id: 'tumblr-namjin', type: 'tumblr', label: 'namjin', url: 'https://namjin.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 33, enabled: true },
      { id: 'tumblr-jikook', type: 'tumblr', label: 'jikook', url: 'https://jikook.tumblr.com/rss', needsFilter: true, fetchCount: 10, priority: 34, enabled: true },
      // Additional Tumblr candidates checked: bts-trans-v2 (404), bangtan-sonyeondan-fans (404),
      // btsdiary (404), bts-armys (last post 2020), dailybangtan (last post 2023). None active.

      // ── Bluesky source ─────────────────────────────────────────────────
      { id: 'bluesky-bts', type: 'bluesky', label: 'Bluesky BTS', url: 'BTS', needsFilter: false, fetchCount: 25, priority: 40, enabled: true },

      // ── Google News RSS feeds ──────────────────────────────────────────
      { id: 'gnews-bts', type: 'googlenews', label: 'Google News: BTS', url: 'https://news.google.com/rss/search?q=BTS+kpop&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 15, priority: 50, enabled: true },
      { id: 'gnews-namjoon', type: 'googlenews', label: 'Google News: Namjoon', url: 'https://news.google.com/rss/search?q=BTS+Namjoon&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 51, enabled: true },
      { id: 'gnews-jin', type: 'googlenews', label: 'Google News: Jin', url: 'https://news.google.com/rss/search?q=BTS+Jin&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 52, enabled: true },
      { id: 'gnews-suga', type: 'googlenews', label: 'Google News: Suga', url: 'https://news.google.com/rss/search?q=BTS+Suga&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 53, enabled: true },
      { id: 'gnews-jhope', type: 'googlenews', label: 'Google News: J-Hope', url: 'https://news.google.com/rss/search?q=BTS+Jhope&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 54, enabled: true },
      { id: 'gnews-jimin', type: 'googlenews', label: 'Google News: Jimin', url: 'https://news.google.com/rss/search?q=BTS+Jimin&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 55, enabled: true },
      { id: 'gnews-taehyung', type: 'googlenews', label: 'Google News: Taehyung', url: 'https://news.google.com/rss/search?q=BTS+Taehyung&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 56, enabled: true },
      { id: 'gnews-jungkook', type: 'googlenews', label: 'Google News: Jungkook', url: 'https://news.google.com/rss/search?q=BTS+Jungkook&hl=en-US&gl=US&ceid=US:en', needsFilter: false, fetchCount: 10, priority: 57, enabled: true },

      // ── AO3 Atom feeds ─────────────────────────────────────────────────
      // AO3 is strict about automated access; low fetchCount and scraper handles failures gracefully
      { id: 'ao3-bts', type: 'ao3', label: 'AO3: BTS', url: 'https://archiveofourown.org/tags/%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8%20%7C%20Bangtan%20Boys%20%7C%20BTS/feed.atom', needsFilter: false, fetchCount: 15, priority: 60, enabled: true },
      { id: 'ao3-namjin', type: 'ao3', label: 'AO3: Namjin', url: 'https://archiveofourown.org/tags/Kim%20Namjoon%20%7C%20RM*s*Kim%20Seokjin%20%7C%20Jin/feed.atom', needsFilter: false, fetchCount: 8, priority: 61, enabled: true },
      { id: 'ao3-yoonmin', type: 'ao3', label: 'AO3: Yoonmin', url: 'https://archiveofourown.org/tags/Min%20Yoongi%20%7C%20Suga*s*Park%20Jimin/feed.atom', needsFilter: false, fetchCount: 8, priority: 62, enabled: true },
      { id: 'ao3-taekook', type: 'ao3', label: 'AO3: Taekook', url: 'https://archiveofourown.org/tags/Kim%20Taehyung%20%7C%20V*s*Jeon%20Jungkook/feed.atom', needsFilter: false, fetchCount: 8, priority: 63, enabled: true },
      { id: 'ao3-jikook', type: 'ao3', label: 'AO3: Jikook', url: 'https://archiveofourown.org/tags/Jeon%20Jungkook*s*Park%20Jimin/feed.atom', needsFilter: false, fetchCount: 8, priority: 64, enabled: true },
    ],
  };
}
