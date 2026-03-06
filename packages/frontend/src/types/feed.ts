export type FeedSource = string;

export type VideoType = "youtube-short" | "tiktok";

export type BiasId = string;

export type ContentType =
  | "news"
  | "fan_art"
  | "fan_fiction"
  | "music"
  | "discussion"
  | "social_posts"
  | "media"
  | "general"
  | null;

export interface FeedStats {
  upvotes?: number;
  comments?: number;
  views?: number;
  likes?: number;
  notes?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  source: FeedSource;
  sourceName: string;
  timestamp: number;
  preview?: string;
  thumbnail?: string;
  author?: string;
  stats?: FeedStats;
  videoType?: VideoType;
  videoId?: string;
  contentType?: ContentType;
}
