import { useState, useMemo, useRef, useEffect } from "react";
import { useFeedState } from "../hooks/useFeedState";
import { useFeed } from "../hooks/useFeed";
import { useBias } from "../hooks/useBias";
import { useControlBarVisibility } from "../hooks/useControlBarVisibility";
import FeedCard from "../components/FeedCard";
import FeedFilter from "../components/FeedFilter";
import BiasFilter from "../components/BiasFilter";
import SwipeFeed from "../components/SwipeFeed";
import SnapFeed from "../components/snap/SnapFeed";
import SnapSkeleton from "../components/snap/SnapSkeleton";
import SnapControlBar from "../components/snap/SnapControlBar";
import FilterSheet from "../components/snap/FilterSheet";
import SkeletonCard from "../components/SkeletonCard";
import NewsCard from "../components/NewsCard";
import { getConfig } from "../config";
import { contentTypeKeys, contentTypeLabels, contentTypeBadgeColors } from "../utils/contentTypes";

// Category mapping for snap mode content type filtering
const CONTENT_TYPE_CATEGORIES: Record<string, string[]> = {
  video: ["video"],
  image: ["fan_art", "meme"],
  news: ["news", "official", "translation"],
  discussion: ["discussion"],
};

function matchesContentTypeFilter(itemContentType: string | null | undefined, selectedCategories: string[]): boolean {
  if (selectedCategories.length === 0) return true;
  if (!itemContentType) return false;
  return selectedCategories.some((category) => {
    const types = CONTENT_TYPE_CATEGORIES[category];
    return types ? types.includes(itemContentType) : itemContentType === category;
  });
}

export default function News() {
  const config = getConfig();
  const [feedState, dispatch] = useFeedState();
  const [viewMode, setViewMode] = useState<"list" | "swipe">("list");
  const { biases, toggleBias, clearBiases } = useBias();

  const feedMode = config.feedMode ?? "list";

  // In snap mode, use feedState.members for bias filtering
  const effectiveBiases = feedMode === "snap" ? feedState.members : biases;
  const { items: rawItems, isLoading, isRetrying, error, refresh, hasItems } = useFeed(feedState, effectiveBiases);

  // Client-side content type filtering for snap mode
  const items = useMemo(() => {
    if (feedMode === "snap") {
      if (feedState.contentTypes.length === 0) return rawItems;
      return rawItems.filter((item) => matchesContentTypeFilter(item.contentType, feedState.contentTypes));
    }
    // List mode: uses old single-string approach but feedState.contentTypes is now an array
    // Empty array = all, otherwise filter by first selected (backward compat)
    if (feedState.contentTypes.length === 0) return rawItems;
    return rawItems.filter((item) => feedState.contentTypes.includes(item.contentType ?? ""));
  }, [rawItems, feedState.contentTypes, feedMode]);

  // Filter sheet state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Snap mode index tracking for control bar visibility
  const [snapIndex, setSnapIndex] = useState(0);
  const { visible: barVisible, showBar } = useControlBarVisibility({ currentIndex: snapIndex });

  // Attempt to preserve current card position when sort/filter changes
  const prevItemsRef = useRef(items);
  const currentItemIdRef = useRef<string | null>(null);

  // Track current item ID based on snapIndex
  useEffect(() => {
    if (items.length > 0 && snapIndex < items.length) {
      currentItemIdRef.current = items[snapIndex].id;
    }
  }, [snapIndex, items]);

  // Calculate startIndex when items change to preserve current card
  const startIndex = useMemo(() => {
    if (prevItemsRef.current === items) return undefined;
    prevItemsRef.current = items;

    if (!currentItemIdRef.current) return 0;
    const idx = items.findIndex((item) => item.id === currentItemIdRef.current);
    return idx >= 0 ? idx : 0;
  }, [items]);

  // Reset snapIndex when startIndex changes
  useEffect(() => {
    if (startIndex !== undefined && startIndex !== snapIndex) {
      setSnapIndex(startIndex);
    }
  }, [startIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const biasNames = biases
    .map((id) => config.members.find((m) => m.id === id)?.stageName)
    .filter(Boolean);

  if (feedMode === "snap") {
    return (
      <div className="snap-page">
        <SnapControlBar
          feedState={feedState}
          dispatch={dispatch}
          visible={barVisible}
          onFilterIconClick={() => setIsFilterOpen(true)}
        />
        {!barVisible && (
          <div
            className="snap-reveal-zone"
            onClick={showBar}
          />
        )}
        {isLoading && !hasItems ? (
          <SnapSkeleton />
        ) : (
          <SnapFeed items={items} onIndexChange={setSnapIndex} pagingDisabled={isFilterOpen} />
        )}
        <FilterSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          feedState={feedState}
          dispatch={dispatch}
        />
      </div>
    );
  }

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

      <FeedFilter active={feedState.sources.length === 1 ? feedState.sources[0] : "all"} onChange={(source) => {
        // List mode backward compat: single-select behavior
        if (source === "all") {
          dispatch({ type: "CLEAR_ALL_FILTERS" });
        } else {
          // Clear sources then toggle the one we want
          dispatch({ type: "CLEAR_ALL_FILTERS" });
          dispatch({ type: "TOGGLE_SOURCE", source });
        }
      }} />

      <div className="content-type-filter">
        <button
          className={`content-type-pill${feedState.contentTypes.length === 0 ? " active" : ""}`}
          onClick={() => dispatch({ type: "CLEAR_ALL_FILTERS" })}
        >
          All Types
        </button>
        {contentTypeKeys.map((type) => type && (
          <button
            key={type}
            className={`content-type-pill${feedState.contentTypes.includes(type) ? " active" : ""}`}
            onClick={() => dispatch({ type: "TOGGLE_CONTENT_TYPE", contentType: type })}
            style={
              feedState.contentTypes.includes(type)
                ? { background: `${contentTypeBadgeColors[type]}33`, color: contentTypeBadgeColors[type], borderColor: contentTypeBadgeColors[type] }
                : undefined
            }
          >
            {contentTypeLabels[type]}
          </button>
        ))}
      </div>

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
            {config.news.map((item) => (
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
