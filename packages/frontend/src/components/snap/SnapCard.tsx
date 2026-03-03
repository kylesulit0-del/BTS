import { useState } from "react";
import type { FeedItem } from "../../types/feed";
import { abbreviateNumber } from "../../utils/formatNumber";
import SnapCardImage from "./SnapCardImage";
import SnapCardVideo from "./SnapCardVideo";
import SnapCardText from "./SnapCardText";
import SeeMoreSheet from "./SeeMoreSheet";

const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
  tumblr: "#001935",
  bluesky: "#0085FF",
};

const MIN_STAT_THRESHOLD = 2;

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
        {item.stats && (
          <>
            {item.stats.upvotes != null && item.stats.upvotes >= MIN_STAT_THRESHOLD && (
              <span className="snap-card-meta-stat" title="Upvotes">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M7 2L2 8h3v4h4V8h3z"/></svg>
                {abbreviateNumber(item.stats.upvotes)}
              </span>
            )}
            {item.stats.comments != null && item.stats.comments >= MIN_STAT_THRESHOLD && (
              <span className="snap-card-meta-stat" title="Comments">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M2 2h10v7H5l-3 3V2z"/></svg>
                {abbreviateNumber(item.stats.comments)}
              </span>
            )}
            {item.stats.views != null && item.stats.views >= MIN_STAT_THRESHOLD && (
              <span className="snap-card-meta-stat" title="Views">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M7 4C4 4 1.5 7 1.5 7s2.5 3 5.5 3 5.5-3 5.5-3S10 4 7 4zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
                {abbreviateNumber(item.stats.views)}
              </span>
            )}
            {item.stats.likes != null && item.stats.likes >= MIN_STAT_THRESHOLD && (
              <span className="snap-card-meta-stat" title="Likes">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M7 12S1.5 8.5 1.5 5.5C1.5 3.5 3 2 4.5 2c1 0 2 .5 2.5 1.5C7.5 2.5 8.5 2 9.5 2c1.5 0 3 1.5 3 3.5C12.5 8.5 7 12 7 12z"/></svg>
                {abbreviateNumber(item.stats.likes)}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SnapCardProps {
  item: FeedItem;
  isActive: boolean;
}

export default function SnapCard({ item, isActive }: SnapCardProps) {
  const [seeMoreOpen, setSeeMoreOpen] = useState(false);
  const variant = getCardVariant(item);

  return (
    <>
      <div className="snap-card-layout">
        {/* Source link icon - top right of every card */}
        <button
          className="snap-card-source-link"
          aria-label="Open original"
          onClick={() => window.open(item.url, "_blank", "noopener")}
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
