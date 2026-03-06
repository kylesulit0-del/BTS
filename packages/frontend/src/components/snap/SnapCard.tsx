import { useCallback, type MutableRefObject, type ReactNode } from "react";
import type { FeedItem, FeedStats } from "../../types/feed";
import { useSwipeGesture } from "../../hooks/useSwipeGesture";
import { abbreviateNumber } from "../../utils/formatNumber";
import SnapCardImage from "./SnapCardImage";
import SnapCardVideo from "./SnapCardVideo";
import SnapCardText from "./SnapCardText";

export const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  rss: "#4CAF50",
  twitter: "#1DA1F2",
  tumblr: "#001935",
  bluesky: "#0085FF",
  googlenews: "#4285F4",
  ao3: "#990000",
};

export function timeAgo(timestamp: number): string {
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

export type CardVariant = "video" | "image" | "text";

export function getCardVariant(item: FeedItem): CardVariant {
  if (item.videoType && item.videoId) return "video";
  if (item.source === "youtube") return "video";
  if (item.thumbnail) return "image";
  return "text";
}

const MIN_STAT_THRESHOLD = 2;

interface StatEntry {
  key: string;
  value: number;
  icon: ReactNode;
}

function renderStats(stats?: FeedStats): ReactNode[] | null {
  if (!stats) return null;

  const entries: StatEntry[] = [];

  if (stats.upvotes != null && stats.upvotes >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "upvotes",
      value: stats.upvotes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 2L2 8h3v4h4V8h3z" />
        </svg>
      ),
    });
  }

  if (stats.comments != null && stats.comments >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "comments",
      value: stats.comments,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M2 2h10v7H5l-3 3V2z" />
        </svg>
      ),
    });
  }

  if (stats.views != null && stats.views >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "views",
      value: stats.views,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 4C4 4 1.5 7 1.5 7s2.5 3 5.5 3 5.5-3 5.5-3S10 4 7 4zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
      ),
    });
  }

  if (stats.likes != null && stats.likes >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "likes",
      value: stats.likes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 12S1.5 8.5 1.5 5.5C1.5 3.5 3 2 4.5 2c1 0 2 .5 2.5 1.5C7.5 2.5 8.5 2 9.5 2c1.5 0 3 1.5 3 3.5C12.5 8.5 7 12 7 12z" />
        </svg>
      ),
    });
  }

  if (stats.notes != null && stats.notes >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "notes",
      value: stats.notes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 12S1.5 8.5 1.5 5.5C1.5 3.5 3 2 4.5 2c1 0 2 .5 2.5 1.5C7.5 2.5 8.5 2 9.5 2c1.5 0 3 1.5 3 3.5C12.5 8.5 7 12 7 12z" />
        </svg>
      ),
    });
  }

  if (entries.length === 0) return null;

  return entries.map((entry) => (
    <span key={entry.key} className="snap-card-info-stat">
      {entry.icon}
      {abbreviateNumber(entry.value)}
    </span>
  ));
}

export function InfoPanel({ item }: { item: FeedItem }) {
  const snippetContent = (() => {
    if (item.preview && item.preview.length > 150) {
      return (
        <>
          {item.preview.slice(0, 150)}...{" "}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-card-show-more"
          >
            (Show More)
          </a>
        </>
      );
    }
    if (item.preview && item.preview.length > 0) {
      return <>{item.preview}</>;
    }
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="snap-card-show-more"
      >
        View on {item.sourceName || item.source}
      </a>
    );
  })();

  return (
    <div className="snap-card-info-panel">
      <h3 className="snap-card-info-title">{item.title}</h3>
      <div className="snap-card-info-meta">
        <span
          className="snap-card-source-dot"
          style={{ background: sourceBadgeColors[item.source] ?? "#555" }}
        />
        <span className="snap-card-info-date">{timeAgo(item.timestamp)}</span>
        {renderStats(item.stats)}
      </div>
      <div className="snap-card-info-snippet">
        {snippetContent}
      </div>
    </div>
  );
}

interface SnapCardProps {
  item: FeedItem;
  isActive: boolean;
  gestureClaimedRef?: MutableRefObject<"vertical" | "horizontal" | null>;
}

export default function SnapCard({ item, isActive, gestureClaimedRef }: SnapCardProps) {
  const variant = getCardVariant(item);

  const openSourceUrl = useCallback(() => {
    window.open(item.url, "_blank", "noopener");
  }, [item.url]);

  const sourceColor = sourceBadgeColors[item.source] ?? "var(--theme-primary)";
  const { handlers, style, swiping } = useSwipeGesture(openSourceUrl, sourceColor, gestureClaimedRef);

  return (
    <div
      className="snap-card-layout"
      {...handlers}
      style={{ background: swiping ? sourceColor : undefined }}
    >
      <div className="snap-card-content" style={style}>
        {/* Source link icon - top right of every card */}
        <button
          className="snap-card-source-link"
          aria-label="Open original"
          onClick={(e) => {
            e.stopPropagation();
            openSourceUrl();
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

        {variant === "video" && (
          <SnapCardVideo item={item} isActive={isActive} />
        )}
        {variant === "image" && (
          <SnapCardImage item={item} />
        )}
        {variant === "text" && (
          <SnapCardText item={item} />
        )}
      </div>
    </div>
  );
}
