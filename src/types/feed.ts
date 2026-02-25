export type FeedSource = "reddit" | "youtube" | "news" | "rss" | "twitter";

// TODO: Move BiasId to config-derived type in Plan 04
export type BiasId = "rm" | "jin" | "suga" | "jhope" | "jimin" | "v" | "jungkook";

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
}
