import { useEffect } from "react";
import type { FeedItem } from "../../types/feed";
import { useSnapFeed } from "../../hooks/useSnapFeed";
import { useVerticalPaging } from "../../hooks/useVerticalPaging";
import SnapCard from "./SnapCard";

interface SnapFeedProps {
  items: FeedItem[];
  onIndexChange?: (index: number) => void;
  pagingDisabled?: boolean;
}

export default function SnapFeed({ items, onIndexChange, pagingDisabled }: SnapFeedProps) {
  const { visibleItems, currentIndex, goNext, goPrev } = useSnapFeed(items);

  // Notify parent of index changes for control bar visibility
  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);
  const { trackRef, containerRef, gestureClaimedRef, onTransitionEnd } = useVerticalPaging({
    onCommitNext: goNext,
    onCommitPrev: goPrev,
    enabled: !pagingDisabled && items.length > 0,
    currentIndex,
  });

  if (items.length === 0) {
    return (
      <div className="snap-feed-empty">
        No items match your filters. Try adjusting your selections or tap Clear All.
      </div>
    );
  }

  return (
    <div className="snap-feed" ref={containerRef}>
      <div
        className="snap-paging-track"
        ref={trackRef}
        onTransitionEnd={(e) => {
          if (e.target === trackRef.current) onTransitionEnd();
        }}
      >
        {visibleItems.map((vi) => (
          <div
            className={`snap-card${vi.position === 0 ? ' snap-card-enter' : ''}`}
            key={`${vi.realIndex}-${vi.position}`}
            style={{ top: `${vi.position * 100}%` }}
          >
            <SnapCard
              item={vi.item}
              isActive={vi.position === 0}
              gestureClaimedRef={gestureClaimedRef}
            />
          </div>
        ))}
      </div>
      <div className="snap-counter">{currentIndex + 1} / {items.length}</div>
    </div>
  );
}
