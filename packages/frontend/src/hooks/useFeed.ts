import { useState, useEffect, useCallback, useRef } from "react";
import type { FeedItem, BiasId } from "../types/feed";
import { getConfig } from "../config";
import { fetchFeed } from "../services/feedService";
import { isApiMode } from "../services/api";

function getCacheKey() {
  return `${getConfig().theme.groupName.toLowerCase()}-feed-cache`;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAYS = [5000, 10000]; // 5s, then 10s
const MAX_RETRIES = 2;

interface CacheData {
  items: FeedItem[];
  timestamp: number;
}

function getCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(getCacheKey());
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
    localStorage.setItem(getCacheKey(), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function matchesBias(item: FeedItem, biases: BiasId[]): boolean {
  const text = `${item.title} ${item.preview || ""}`.toLowerCase();
  const cfg = getConfig();
  return biases.some((biasId) => {
    const member = cfg.members.find((m) => m.id === biasId);
    if (!member) return false;
    return member.aliases.some((alias) => text.includes(alias.toLowerCase()));
  });
}

export function useFeed(feedState: { sort: string; source: string; contentType: string }, biases: BiasId[] = []) {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const silentRetry = useCallback(async (attempt: number) => {
    if (attempt >= MAX_RETRIES) {
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);

    retryTimerRef.current = setTimeout(async () => {
      try {
        const retryItems = await fetchFeed({
          onItems: (items) => {
            if (items.length > 0) {
              setAllItems(items);
            }
          },
        });

        if (retryItems.length > 0) {
          setAllItems(retryItems);
          setCache(retryItems);
          setIsRetrying(false);
          setError(null);
        } else {
          // Retry again with next delay
          silentRetry(attempt + 1);
        }
      } catch {
        silentRetry(attempt + 1);
      }
    }, RETRY_DELAYS[attempt]);
  }, []);

  const load = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    setIsRetrying(false);

    // Clear any pending retry timers
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = getCache();
      if (cached) {
        setAllItems(cached.items);
        setIsLoading(false);
        return;
      }
    }

    try {
      // In API mode, pass source for server-side filtering.
      // In client-side mode, source filtering happens locally after fetch.
      // Content type and bias filtering always happen locally (post-hook in News.tsx).
      const apiMode = isApiMode();
      const finalItems = await fetchFeed({
        force,
        onItems: (items) => {
          setAllItems(items);
        },
        source: apiMode && feedState.source !== "all" ? feedState.source : undefined,
        sort: feedState.sort,
      });

      setCache(finalItems);

      if (finalItems.length === 0) {
        // Total outage: auto-retry silently in background (no error message)
        silentRetry(0);
      }
    } catch {
      // Try to use stale cache
      try {
        const raw = localStorage.getItem(getCacheKey());
        if (raw) {
          const data: CacheData = JSON.parse(raw);
          setAllItems(data.items);
        } else {
          // No cache available, start silent retry
          silentRetry(0);
        }
      } catch {
        // Nothing to fall back on, start silent retry
        silentRetry(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [silentRetry, feedState.sort, feedState.source]);

  useEffect(() => {
    load();
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [load]);

  let filtered = feedState.source === "all"
    ? allItems
    : allItems.filter((item) => item.source === feedState.source);

  if (biases.length > 0) {
    filtered = filtered.filter((item) => matchesBias(item, biases));
  }

  return {
    items: filtered,
    loading: isLoading,
    isLoading,
    isRetrying,
    error,
    refresh: () => load(true),
    hasItems: allItems.length > 0,
  };
}
