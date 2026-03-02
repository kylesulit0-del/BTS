import type { FeedItem } from '../types/feed';
import { isApiMode, fetchApiFeed } from './api';
import { fetchAllFeedsIncremental } from './feeds';

export { isApiMode } from './api';

export interface FetchFeedOptions {
  force?: boolean;
  onItems?: (items: FeedItem[]) => void;
  source?: string;
  contentType?: string;
}

/**
 * Dual-mode feed fetcher.
 *
 * - API mode (VITE_API_URL set): fetches pre-ranked items from server.
 *   Falls back to client-side if the API is unreachable.
 * - Client-side mode: uses local source fetchers with incremental loading.
 */
export async function fetchFeed(options?: FetchFeedOptions): Promise<FeedItem[]> {
  const { onItems, source, contentType } = options ?? {};

  if (isApiMode()) {
    try {
      const result = await fetchApiFeed({
        source: source && source !== 'all' ? source : undefined,
        contentType: contentType ?? undefined,
      });
      // API mode: deliver all items at once (no incremental loading)
      if (onItems) {
        onItems(result.items);
      }
      return result.items;
    } catch (err) {
      console.warn('[feedService] API fetch failed, falling back to client-side:', err);
      // Fall through to client-side fetching
    }
  }

  // Client-side mode (or API fallback)
  return fetchAllFeedsIncremental(onItems ?? (() => {}));
}
