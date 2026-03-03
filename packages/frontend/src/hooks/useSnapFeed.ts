import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import type { FeedItem } from "../types/feed";
import { DOM_WINDOW_SIZE } from "../config/snap";

export interface WindowedItem {
  item: FeedItem;
  realIndex: number;
}

/**
 * Compute the windowed slice of items centered around currentIndex.
 * Uses modular arithmetic for seamless wrapping (infinite loop).
 */
function getWindowedItems(items: FeedItem[], currentIndex: number): WindowedItem[] {
  const len = items.length;
  if (len === 0) return [];

  // When fewer items than window size, return all without wrapping to avoid duplicate keys
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
 *
 * Returns:
 * - windowedItems: array of { item, realIndex } to render (max DOM_WINDOW_SIZE)
 * - currentIndex: the real index of the currently-snapped item
 * - containerRef: ref to attach to the scroll container
 */
export function useSnapFeed(items: FeedItem[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCenterRef = useRef<number | null>(null);

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

  // Compute the position of the center item within the windowed array
  const centerPositionInWindow = useMemo(() => {
    if (items.length === 0) return 0;
    if (items.length <= DOM_WINDOW_SIZE) return currentIndex;
    return Math.floor(DOM_WINDOW_SIZE / 2);
  }, [items.length, currentIndex]);

  // Scroll position management: when window shifts, adjust scrollTop to prevent jumps
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const prevCenter = prevCenterRef.current;
    if (prevCenter === null) {
      // Initial render: scroll to the center item
      container.scrollTop = centerPositionInWindow * container.clientHeight;
      prevCenterRef.current = centerPositionInWindow;
      return;
    }

    // Only adjust if the center position in the window changed
    if (prevCenter !== centerPositionInWindow) {
      container.scrollTop = centerPositionInWindow * container.clientHeight;
      prevCenterRef.current = centerPositionInWindow;
    }
  }, [windowedItems, centerPositionInWindow, items.length]);

  // IntersectionObserver for snap detection
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const el = entry.target as HTMLElement;
          const realIndex = Number(el.dataset.realindex);
          if (!isNaN(realIndex) && realIndex >= 0 && realIndex < items.length) {
            setCurrentIndex(realIndex);
          }
        }
      }
    },
    [items.length]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: container,
      threshold: 0.6,
    });

    const cards = container.querySelectorAll<HTMLElement>("[data-realindex]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [windowedItems, handleIntersection, items.length]);

  return { windowedItems, currentIndex, containerRef };
}
