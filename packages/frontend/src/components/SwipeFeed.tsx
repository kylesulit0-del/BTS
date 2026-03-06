import { useState, useRef, useEffect } from "react";
import type { FeedItem } from "../types/feed";
import VideoEmbed from "./VideoEmbed";

const sourceBadgeColors: Record<string, string> = {
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

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const sourceEmojis: Record<string, string> = {
  reddit: "💬",
  youtube: "🎬",
  news: "📰",
  rss: "📰",
  twitter: "🐦",
  tumblr: "📝",
  bluesky: "🦋",
  googlenews: "📰",
  ao3: "📖",
};

interface SwipeFeedProps {
  items: FeedItem[];
}

export default function SwipeFeed({ items }: SwipeFeedProps) {
  const [_currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index >= 0) setCurrentIndex(index);
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="swipe-feed-empty">
        <p>No items to display. Try a different filter.</p>
      </div>
    );
  }

  return (
    <div className="swipe-feed" ref={containerRef}>
      {items.map((item, i) => {
        const videoId = item.source === "youtube" ? getYouTubeId(item.url) : null;

        return (
          <div
            key={item.id}
            className="swipe-slide"
            ref={(el) => { slideRefs.current[i] = el; }}
          >
            <div className="swipe-slide-inner">
              <div className="swipe-meta">
                <span
                  className="feed-source-badge"
                  style={{ background: sourceBadgeColors[item.source] }}
                >
                  {item.sourceName}
                </span>
                <span className="swipe-time">{timeAgo(item.timestamp)}</span>
              </div>

              <div className="swipe-media">
                {item.videoType && item.videoId ? (
                  <VideoEmbed
                    videoType={item.videoType}
                    videoId={item.videoId}
                    title={item.title}
                    thumbnail={item.thumbnail}
                  />
                ) : videoId ? (
                  <iframe
                    className="swipe-video"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    title={item.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : item.thumbnail ? (
                  <img
                    className="swipe-thumbnail"
                    src={item.thumbnail}
                    alt={item.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="swipe-placeholder">
                    <span className="swipe-placeholder-emoji">
                      {sourceEmojis[item.source] || "📄"}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="swipe-title">{item.title}</h3>

              {item.preview && (
                <p className="swipe-preview">{item.preview}</p>
              )}

              <a
                href={item.url}
                className="swipe-read-more"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read More &rarr;
              </a>

              <div className="swipe-counter">
                {i + 1} of {items.length}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
