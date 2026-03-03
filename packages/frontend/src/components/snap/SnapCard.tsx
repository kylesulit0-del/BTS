import { useState, useCallback, type MutableRefObject } from "react";
import type { FeedItem } from "../../types/feed";
import { useSwipeGesture } from "../../hooks/useSwipeGesture";
import SnapCardImage from "./SnapCardImage";
import SnapCardVideo from "./SnapCardVideo";
import SnapCardText from "./SnapCardText";
import SnapStatsBar from "./SnapStatsBar";
import SeeMoreSheet from "./SeeMoreSheet";

const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
  tumblr: "#001935",
  bluesky: "#0085FF",
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

interface SnapCardMetaProps {
  item: FeedItem;
}

export function SnapCardMeta({ item }: SnapCardMetaProps) {
  return (
    <div className="snap-card-meta-block">
      <h3 className="snap-card-meta-title">{item.title}</h3>
      <div className="snap-card-meta-row">
        <span
          className="snap-card-source-dot"
          style={{ background: sourceBadgeColors[item.source] ?? "#555" }}
        />
        {item.author && (
          <span className="snap-card-meta-author">{item.author}</span>
        )}
        <span className="snap-card-meta-time">{timeAgo(item.timestamp)}</span>
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
  const [seeMoreOpen, setSeeMoreOpen] = useState(false);
  const variant = getCardVariant(item);

  const openSourceUrl = useCallback(() => {
    window.open(item.url, "_blank", "noopener");
  }, [item.url]);

  const sourceColor = sourceBadgeColors[item.source] ?? "var(--theme-primary)";
  const { handlers, style, swiping } = useSwipeGesture(openSourceUrl, sourceColor, gestureClaimedRef);

  return (
    <>
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
            <SnapCardImage
              item={item}
              onSeeMore={() => setSeeMoreOpen(true)}
            />
          )}
          {variant === "text" && (
            <SnapCardText
              item={item}
              onSeeMore={() => setSeeMoreOpen(true)}
            />
          )}

          <SnapStatsBar stats={item.stats} />
        </div>
      </div>

      {seeMoreOpen && item.preview && (
        <SeeMoreSheet
          text={item.preview}
          isOpen={seeMoreOpen}
          onClose={() => setSeeMoreOpen(false)}
        />
      )}
    </>
  );
}
