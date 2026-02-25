import type { FeedItem, FeedSource } from "../types/feed";
import { getConfig } from "../config";
import { getFetcher } from "./sources/registry";

export type FeedCallback = (items: FeedItem[]) => void;

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PER_SOURCE_CAP = 30;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "ref"]) {
      u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function getEngagementValue(item: FeedItem): number {
  if (!item.stats) return 0;
  switch (item.source) {
    case "reddit":
      return (item.stats.upvotes ?? 0) + (item.stats.comments ?? 0) * 2;
    case "youtube":
      return (item.stats.views ?? 0) / 100 + (item.stats.likes ?? 0);
    case "tumblr":
      return item.stats.notes ?? 0;
    default:
      return 0;
  }
}

function computeFeedScore(item: FeedItem, now: number): number {
  const recencyScore = Math.max(0, 1 - (now - item.timestamp) / MAX_AGE_MS);
  const engagement = getEngagementValue(item);
  const engagementScore = engagement > 0 ? Math.log10(1 + engagement) / 6 : 0;
  return 0.5 * recencyScore + 0.5 * engagementScore;
}

function deduplicateByUrl(items: FeedItem[]): FeedItem[] {
  const map = new Map<string, FeedItem>();
  for (const item of items) {
    const key = normalizeUrl(item.url);
    const existing = map.get(key);
    if (!existing || getEngagementValue(item) > getEngagementValue(existing)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function capPerSource(items: FeedItem[]): FeedItem[] {
  const groups = new Map<FeedSource, FeedItem[]>();
  for (const item of items) {
    const group = groups.get(item.source) ?? [];
    group.push(item);
    groups.set(item.source, group);
  }
  const capped: FeedItem[] = [];
  for (const [, group] of groups) {
    group.sort((a, b) => getEngagementValue(b) - getEngagementValue(a));
    capped.push(...group.slice(0, PER_SOURCE_CAP));
  }
  return capped;
}

function applyFeedPipeline(items: FeedItem[]): FeedItem[] {
  const now = Date.now();
  const fresh = items.filter((item) => now - item.timestamp < MAX_AGE_MS);
  const deduped = deduplicateByUrl(fresh);
  const capped = capPerSource(deduped);
  return capped.sort((a, b) => computeFeedScore(b, now) - computeFeedScore(a, now));
}

export async function fetchAllFeedsIncremental(onItems: FeedCallback): Promise<FeedItem[]> {
  const config = getConfig();
  const enabledSources = config.sources.filter((s) => s.enabled !== false);
  const allItems: FeedItem[] = [];

  const promises = enabledSources.map((source) => {
    const fetcher = getFetcher(source.type);
    if (!fetcher) {
      console.warn(`No fetcher registered for source type: ${source.type}`);
      return Promise.resolve([] as FeedItem[]);
    }

    return fetcher(source)
      .then((items) => {
        allItems.push(...items);
        onItems(applyFeedPipeline([...allItems]));
        return items;
      })
      .catch(() => [] as FeedItem[]);
  });

  await Promise.allSettled(promises);

  return applyFeedPipeline(allItems);
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const config = getConfig();
  const enabledSources = config.sources.filter((s) => s.enabled !== false);

  const results = await Promise.allSettled(
    enabledSources.map((source) => {
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

  return applyFeedPipeline(items);
}
