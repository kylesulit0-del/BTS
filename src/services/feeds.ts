import type { FeedItem } from "../types/feed";
import { getConfig } from "../config";
import { getFetcher } from "./sources/registry";

export type FeedCallback = (items: FeedItem[]) => void;

export async function fetchAllFeedsIncremental(onItems: FeedCallback): Promise<FeedItem[]> {
  const config = getConfig();
  const allItems: FeedItem[] = [];

  const promises = config.sources.map((source) => {
    const fetcher = getFetcher(source.type);
    if (!fetcher) {
      console.warn(`No fetcher registered for source type: ${source.type}`);
      return Promise.resolve([] as FeedItem[]);
    }

    return fetcher(source)
      .then((items) => {
        allItems.push(...items);
        onItems([...allItems].sort((a, b) => b.timestamp - a.timestamp));
        return items;
      })
      .catch(() => [] as FeedItem[]);
  });

  await Promise.allSettled(promises);

  return allItems.sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const config = getConfig();

  const results = await Promise.allSettled(
    config.sources.map((source) => {
      const fetcher = getFetcher(source.type);
      if (!fetcher) {
        console.warn(`No fetcher registered for source type: ${source.type}`);
        return Promise.resolve([] as FeedItem[]);
      }
      return fetcher(source);
    })
  );

  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
