import type { FeedItem } from "../types/feed";

const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="feed-card">
      {item.thumbnail && (
        <div className="feed-card-thumbnail">
          <img src={item.thumbnail} alt="" loading="lazy" />
        </div>
      )}
      <div className="feed-card-content">
        <div className="feed-card-meta">
          <span
            className="feed-source-badge"
            style={{ background: sourceBadgeColors[item.source] }}
          >
            {item.sourceName}
          </span>
          <span className="feed-card-time">{timeAgo(item.timestamp)}</span>
        </div>
        <h3 className="feed-card-title">{item.title}</h3>
        {item.preview && (
          <p className="feed-card-preview">{item.preview}</p>
        )}
        {item.author && (
          <span className="feed-card-author">{item.author}</span>
        )}
        <a
          href={item.url}
          className="feed-card-original-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          View original
        </a>
      </div>
    </div>
  );
}
