import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { fetchRedditSource } from "./reddit";
import { fetchYouTubeSource } from "./youtube";
import { fetchRssSource } from "./rss";
import { fetchTwitterSource } from "./twitter";
import { fetchTumblrSource } from "./tumblr";

export type SourceFetcher = (source: SourceEntry) => Promise<FeedItem[]>;

const fetchers: Record<string, SourceFetcher> = {
  reddit: fetchRedditSource,
  youtube: fetchYouTubeSource,
  rss: fetchRssSource,
  twitter: fetchTwitterSource,
  tumblr: fetchTumblrSource,
};

export function getFetcher(type: string): SourceFetcher | undefined {
  return fetchers[type];
}
