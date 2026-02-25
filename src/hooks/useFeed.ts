import { useState, useEffect, useCallback } from "react";
import type { FeedItem, FeedSource, BiasId } from "../types/feed";
import { MEMBER_KEYWORDS } from "../types/feed";
import { fetchAllFeedsIncremental, fetchAllFeeds } from "../services/feeds";

const CACHE_KEY = "bts-feed-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  items: FeedItem[];
  timestamp: number;
}

function getCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(items: FeedItem[]) {
  try {
    const data: CacheData = { items, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function matchesBias(item: FeedItem, biases: BiasId[]): boolean {
  const text = `${item.title} ${item.preview || ""}`.toLowerCase();
  return biases.some((biasId) =>
    MEMBER_KEYWORDS[biasId].some((kw) => text.includes(kw.toLowerCase()))
  );
}

export function useFeed(filter: FeedSource | "all" = "all", biases: BiasId[] = []) {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = getCache();
      if (cached) {
        setAllItems(cached.items);
        setLoading(false);
        return;
      }
    }

    try {
      // Use incremental loading — items appear as each source resolves
      const finalItems = await fetchAllFeedsIncremental((items) => {
        setAllItems(items);
      });

      setCache(finalItems);

      if (finalItems.length === 0) {
        setError("No feed items found. Showing static news instead.");
      }
    } catch {
      setError("Failed to load feeds. Showing static news instead.");
      // Try to use stale cache
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const data: CacheData = JSON.parse(raw);
          setAllItems(data.items);
        }
      } catch {
        // Nothing to fall back on
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  let filtered = filter === "all"
    ? allItems
    : allItems.filter((item) => item.source === filter);

  if (biases.length > 0) {
    filtered = filtered.filter((item) => matchesBias(item, biases));
  }

  return {
    items: filtered,
    loading,
    error,
    refresh: () => load(true),
    hasItems: allItems.length > 0,
  };
}
