import { useState, useCallback, useMemo, useEffect } from "react";
import type { FeedItem } from "../types/feed";
import { DOM_WINDOW_SIZE } from "../config/snap";

export interface WindowedItem {
  item: FeedItem;
  realIndex: number;
}

export interface VisibleItem {
  item: FeedItem;
  realIndex: number;
  position: -1 | 0 | 1;
}

/**
 * Compute the windowed slice of items centered around currentIndex.
 * Uses modular arithmetic for seamless wrapping (infinite loop).
 */
function getWindowedItems(items: FeedItem[], currentIndex: number): WindowedItem[] {
  const len = items.length;
  if (len === 0) return [];

  if (len <= DOM_WINDOW_SIZE) {
    return items.map((item, i) => ({ item, realIndex: i }));
  }

  const half = Math.floor(DOM_WINDOW_SIZE / 2);
  const result: WindowedItem[] = [];

  for (let offset = -half; offset <= half; offset++) {
    const idx = ((currentIndex + offset) % len + len) % len;
    result.push({ item: items[idx], realIndex: idx });
  }

  return result;
}

/**
 * Core snap feed hook providing DOM virtualization, index tracking, and seamless looping.
 */
export function useSnapFeed(items: FeedItem[]) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index if items change drastically
  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  const windowedItems = useMemo(
    () => getWindowedItems(items, currentIndex),
    [items, currentIndex]
  );

  // 3-item visible slice: prev, current, next
  const visibleItems = useMemo<VisibleItem[]>(() => {
    const len = items.length;
    if (len === 0) return [];
    if (len === 1) {
      return [{ item: items[0], realIndex: 0, position: 0 }];
    }

    const prevIdx = ((currentIndex - 1) % len + len) % len;
    const nextIdx = (currentIndex + 1) % len;

    return [
      { item: items[prevIdx], realIndex: prevIdx, position: -1 },
      { item: items[currentIndex], realIndex: currentIndex, position: 0 },
      { item: items[nextIdx], realIndex: nextIdx, position: 1 },
    ];
  }, [items, currentIndex]);

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  return { windowedItems, visibleItems, currentIndex, goNext, goPrev };
}
