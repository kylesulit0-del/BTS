import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";

export type SourceFetcher = (source: SourceEntry) => Promise<FeedItem[]>;

const fetchers = new Map<string, SourceFetcher>();

export function registerFetcher(type: string, fetcher: SourceFetcher): void {
  fetchers.set(type, fetcher);
}

export function getFetcher(type: string): SourceFetcher | undefined {
  return fetchers.get(type);
}

// Import all fetcher modules to trigger self-registration
import "./reddit";
import "./youtube";
import "./rss";
import "./twitter";
