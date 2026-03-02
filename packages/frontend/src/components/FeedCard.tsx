import { useState } from "react";
import type { FeedItem } from "../types/feed";
import { abbreviateNumber } from "../utils/formatNumber";
import { contentTypeBadgeColors, contentTypeLabels } from "../utils/contentTypes";
import VideoEmbed from "./VideoEmbed";

const sourceBadgeColors: Record<string, string> = {
  reddit: "#FF4500",
  youtube: "#FF0000",
  news: "#7c4dbd",
  twitter: "#1DA1F2",
  tumblr: "#001935",
  bluesky: "#0085FF",
};

const MIN_STAT_THRESHOLD = 2;

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
  const [imageError, setImageError] = useState(false);
  const showThumbnail = item.thumbnail && !imageError;

  return (
    <div className="feed-card">
      {item.videoType && item.videoId ? (
        <VideoEmbed
          videoType={item.videoType}
          videoId={item.videoId}
          title={item.title}
          thumbnail={item.thumbnail}
        />
      ) : showThumbnail ? (
        <div className="feed-card-thumbnail">
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            onError={() => setImageError(true)}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
          />
        </div>
      ) : null}
      <div className="feed-card-content">
        <div className="feed-card-meta">
          <span
            className="feed-source-badge"
            style={{ background: sourceBadgeColors[item.source] }}
          >
            {item.sourceName}
          </span>
          {item.videoType && (
            <span className="feed-card-video-badge">
              {item.videoType === "youtube-short" ? "Shorts" : "TikTok"}
            </span>
          )}
          {item.contentType && (
            <span
              className="feed-card-content-type-badge"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: `${contentTypeBadgeColors[item.contentType] ?? "#6b7280"}33`,
                color: contentTypeBadgeColors[item.contentType] ?? "#6b7280",
                fontWeight: 500,
              }}
            >
              {contentTypeLabels[item.contentType] ?? item.contentType}
            </span>
          )}
          <span className="feed-card-time">{timeAgo(item.timestamp)}</span>
          {item.stats && (
            <span className="feed-card-stats">
              {item.stats.upvotes != null && item.stats.upvotes >= MIN_STAT_THRESHOLD && (
                <span className="feed-card-stat" title="Upvotes">
                  <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 2L2 8h3v4h4V8h3z"/></svg>
                  {abbreviateNumber(item.stats.upvotes)}
                </span>
              )}
              {item.stats.comments != null && item.stats.comments >= MIN_STAT_THRESHOLD && (
                <span className="feed-card-stat" title="Comments">
                  <svg viewBox="0 0 14 14" fill="currentColor"><path d="M2 2h10v7H5l-3 3V2z"/></svg>
                  {abbreviateNumber(item.stats.comments)}
                </span>
              )}
              {item.stats.views != null && item.stats.views >= MIN_STAT_THRESHOLD && (
                <span className="feed-card-stat" title="Views">
                  <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 4C4 4 1.5 7 1.5 7s2.5 3 5.5 3 5.5-3 5.5-3S10 4 7 4zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
                  {abbreviateNumber(item.stats.views)}
                </span>
              )}
              {item.stats.likes != null && item.stats.likes >= MIN_STAT_THRESHOLD && (
                <span className="feed-card-stat" title="Likes">
                  <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 12S1.5 8.5 1.5 5.5C1.5 3.5 3 2 4.5 2c1 0 2 .5 2.5 1.5C7.5 2.5 8.5 2 9.5 2c1.5 0 3 1.5 3 3.5C12.5 8.5 7 12 7 12z"/></svg>
                  {abbreviateNumber(item.stats.likes)}
                </span>
              )}
            </span>
          )}
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
