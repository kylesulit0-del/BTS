import type { FeedItem as ApiFeedItem, FeedResponse } from '@bts/shared/types/feed.js';
import type { FeedItem } from '../types/feed';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** Returns true if VITE_API_URL is set to a non-empty string. */
export function isApiMode(): boolean {
  return typeof API_URL === 'string' && API_URL.length > 0;
}

/** Map a server FeedItem to the frontend FeedItem shape. */
export function mapApiFeedItem(item: ApiFeedItem): FeedItem {
  let stats: FeedItem['stats'] | undefined;
  if (item.engagementStats) {
    stats = {
      upvotes: item.engagementStats.upvotes,
      comments: item.engagementStats.comments,
      views: item.engagementStats.views,
      likes: item.engagementStats.likes,
      notes: item.engagementStats.notes,
    };
  }

  return {
    id: String(item.id),
    title: item.title,
    url: item.url,
    source: item.source,
    sourceName: item.sourceDetail,
    timestamp: new Date(item.publishedAt).getTime(),
    thumbnail: item.thumbnailUrl ?? undefined,
    stats,
    contentType: item.contentType ?? undefined,
    preview: undefined,
  };
}

/** Fetch pre-ranked feed items from the server API. */
export async function fetchApiFeed(params?: {
  page?: number;
  limit?: number;
  source?: string;
  contentType?: string;
}): Promise<{ items: FeedItem[]; hasMore: boolean; total: number }> {
  const url = new URL(`${API_URL}/api/feed`);
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params?.source) url.searchParams.set('source', params.source);
  if (params?.contentType) url.searchParams.set('contentType', params.contentType);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API feed request failed: ${res.status} ${res.statusText}`);
  }

  const data: FeedResponse = await res.json();
  return {
    items: data.items.map(mapApiFeedItem),
    hasMore: data.hasMore,
    total: data.total,
  };
}
