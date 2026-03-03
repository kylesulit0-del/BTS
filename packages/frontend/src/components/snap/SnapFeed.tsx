import type { FeedItem } from "../../types/feed";
import { useSnapFeed } from "../../hooks/useSnapFeed";
import SnapCard from "./SnapCard";

interface SnapFeedProps {
  items: FeedItem[];
}

export default function SnapFeed({ items }: SnapFeedProps) {
  const { windowedItems, currentIndex, containerRef } = useSnapFeed(items);

  if (items.length === 0) {
    return (
      <div className="snap-feed-empty">
        No items to display. Try a different filter.
      </div>
    );
  }

  return (
    <div className="snap-feed" ref={containerRef}>
      {windowedItems.map(({ item, realIndex }) => (
        <div
          key={realIndex}
          className="snap-card"
          data-realindex={realIndex}
        >
          <SnapCard item={item} isActive={realIndex === currentIndex} />
        </div>
      ))}
    </div>
  );
}
