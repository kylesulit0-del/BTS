/**
 * Shared types for the BTS feed API contract between server and frontend.
 */

/** Sort modes supported by the /api/feed endpoint. */
export type SortMode = 'recommended' | 'newest' | 'oldest' | 'popular' | 'discussed';

/** Content classification type -- nullable, populated by Phase 7 LLM. */
export type ContentType =
  | 'news'
  | 'fan_art'
  | 'meme'
  | 'video'
  | 'discussion'
  | 'translation'
  | 'official'
  | null;

/** A single feed item as returned by the API. */
export interface FeedItem {
  id: number;
  title: string;
  url: string;
  source: string;           // e.g., 'reddit'
  sourceDetail: string;     // e.g., 'r/bangtan'
  score: number;
  commentCount: number;
  flair: string | null;
  contentType: ContentType;
  moderationStatus?: string;
  thumbnailUrl: string | null;
  engagementStats: Record<string, number> | null;
  publishedAt: string;      // ISO 8601
  scrapedAt: string;        // ISO 8601
}

/** Paginated feed response. */
export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

/** Feed query parameters. */
export interface FeedQuery {
  cursor?: string;
  limit?: number;
  source?: string;
  sort?: SortMode;
}
