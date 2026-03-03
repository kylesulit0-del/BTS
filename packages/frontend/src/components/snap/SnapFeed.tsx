import type { FeedItem } from "../../types/feed";
import { useSnapFeed } from "../../hooks/useSnapFeed";

interface SnapFeedProps {
  items: FeedItem[];
}

const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
};

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
          <div className="snap-card-inner">
            <div className="snap-card-source">
              <span
                className="feed-source-badge"
                style={{ background: sourceBadgeColors[item.source] ?? "#555" }}
              >
                {item.sourceName}
              </span>
            </div>
            <h2 className="snap-card-title">{item.title}</h2>
            {item.preview && (
              <p className="snap-card-preview">{item.preview}</p>
            )}
            <div className="snap-card-meta">
              <span className="snap-card-index">
                {realIndex + 1} / {items.length}
              </span>
              {realIndex === currentIndex && (
                <span className="snap-card-active-dot" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
