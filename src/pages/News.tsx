import { useState } from "react";
import type { FeedSource } from "../types/feed";
import { useFeed } from "../hooks/useFeed";
import { useBias } from "../hooks/useBias";
import FeedCard from "../components/FeedCard";
import FeedFilter from "../components/FeedFilter";
import BiasFilter from "../components/BiasFilter";
import SwipeFeed from "../components/SwipeFeed";
import SkeletonCard from "../components/SkeletonCard";
import { news } from "../data/news";
import NewsCard from "../components/NewsCard";
import { getConfig } from "../config";

export default function News() {
  const config = getConfig();
  const [filter, setFilter] = useState<FeedSource | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "swipe">("list");
  const { biases, toggleBias, clearBiases } = useBias();
  const { items, isLoading, isRetrying, error, refresh, hasItems } = useFeed(filter, biases);

  const biasNames = biases
    .map((id) => config.members.find((m) => m.id === id)?.stageName)
    .filter(Boolean);

  return (
    <div className={`page${viewMode === "swipe" ? " swipe-mode" : ""}`}>
      <div className="feed-header">
        <div>
          <h1 className="page-title">{config.theme.fandomName} Feed</h1>
          <p className="page-subtitle">{config.theme.groupName} content from across the web</p>
        </div>
        <div className="feed-header-actions">
          <button
            className={`view-toggle-btn${viewMode === "swipe" ? " active" : ""}`}
            onClick={() => setViewMode(viewMode === "list" ? "swipe" : "list")}
            aria-label={viewMode === "list" ? "Switch to swipe view" : "Switch to list view"}
            title={viewMode === "list" ? "Swipe view" : "List view"}
          >
            {viewMode === "list" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <path d="M12 8v8" />
                <path d="M9 11l3-3 3 3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
          <button className="feed-refresh-btn" onClick={refresh} disabled={isLoading}>
            {isLoading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      <FeedFilter active={filter} onChange={setFilter} />

      <BiasFilter biases={biases} onToggle={toggleBias} onClear={clearBiases} />

      {biases.length > 0 && (
        <div className="bias-indicator">
          Filtering for: {biasNames.join(", ")}
        </div>
      )}

      {config.theme.socialLinks.length > 0 && (
        <div className="feed-follow-bar">
          {config.theme.socialLinks.map((link) => (
            <a
              key={link.handle}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="feed-follow-link"
            >
              Follow {link.handle} on {link.platform} &rarr;
            </a>
          ))}
        </div>
      )}

      {isLoading && !hasItems && (
        <div className="feed-skeletons">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && isRetrying && !hasItems && (
        <div className="feed-skeletons">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
          <div className="feed-retry-indicator">
            <span className="feed-retry-dot" />
          </div>
        </div>
      )}

      {!isLoading && !isRetrying && error && !hasItems && (
        <div className="feed-fallback">
          <p className="feed-error-msg">{error}</p>
          <h2 className="feed-fallback-title">Latest News</h2>
          <div className="news-list">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {hasItems && (
        <>
          {error && <p className="feed-error-msg">{error}</p>}
          {viewMode === "swipe" ? (
            <SwipeFeed items={items} />
          ) : (
            <div className="feed-list">
              {items.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {items.length === 0 && (
            <div className="feed-empty">
              <p>
                {biases.length > 0
                  ? `No items found for ${biasNames.join(", ")}. Try selecting different members or "All".`
                  : 'No items for this filter. Try "All" to see everything.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
