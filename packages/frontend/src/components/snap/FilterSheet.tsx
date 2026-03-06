import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { FeedState, FeedAction } from "../../hooks/useFeedState";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { contentTypeLabels, contentTypeKeys } from "../../utils/contentTypes";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  feedState: FeedState;
  dispatch: React.Dispatch<FeedAction>;
  items: FeedItem[];
}

type TabId = "source" | "member" | "type";

export default function FilterSheet({ isOpen, onClose, feedState, dispatch, items }: FilterSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("source");
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const scrollTopRef = useRef(0);

  const config = getConfig();

  // Build grouped source data from config
  const sourceGroups = useMemo(() => {
    const groups: Record<string, { label: string; sources: { id: string; label: string }[] }> = {};
    for (const s of config.sources) {
      const type = s.type;
      if (!groups[type]) {
        groups[type] = {
          label: config.labels.sourceLabels[type] ?? type,
          sources: [],
        };
      }
      groups[type].sources.push({ id: s.id, label: s.label });
    }
    return groups;
  }, [config]);

  const sourceTypes = Object.keys(sourceGroups);

  // Dynamic content type chip ordering by volume (most common first)
  const sortedContentTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.contentType) {
        counts.set(item.contentType, (counts.get(item.contentType) ?? 0) + 1);
      }
    }
    return contentTypeKeys
      .filter((ct): ct is NonNullable<typeof ct> => ct !== null)
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  }, [items]);

  const hasActiveFilters =
    feedState.sources.length > 0 ||
    feedState.members.length > 0 ||
    feedState.contentTypes.length > 0;

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    // Track scroll position of sheet content to avoid interfering with scrollable content
    const sheet = sheetRef.current;
    if (sheet) {
      scrollTopRef.current = sheet.scrollTop;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // Only allow drag-down when sheet scroll is at top
    if (deltaY > 0 && scrollTopRef.current <= 0) {
      currentTranslateY.current = deltaY;
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.transform = `translateY(${deltaY}px)`;
        sheet.style.transition = "none";
      }
    }
  };

  const handleTouchEnd = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";

    if (currentTranslateY.current > 80) {
      onClose();
    } else {
      sheet.style.transform = "translateY(0)";
    }
    currentTranslateY.current = 0;
  };

  return createPortal(
    <div
      className={`filter-sheet-backdrop${isOpen ? " open" : ""}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="filter-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="filter-sheet-handle" />

        {/* Tabs */}
        <div className="filter-sheet-tabs">
          {(["source", "member", "type"] as TabId[]).map((tab) => (
            <button
              key={tab}
              className={`filter-sheet-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "source" ? "Source" : tab === "member" ? "Member" : "Type"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="filter-chip-grid">
          {activeTab === "source" &&
            sourceTypes.map((sourceType) => {
              const group = sourceGroups[sourceType];
              const isActive = feedState.sources.includes(sourceType);
              return (
                <div key={sourceType} className="filter-source-group">
                  <button
                    className={`filter-chip-toggle${isActive ? " active" : ""}`}
                    onClick={() => dispatch({ type: "TOGGLE_SOURCE", source: sourceType })}
                  >
                    {group.label}
                  </button>
                  {isActive && group.sources.length > 1 && (
                    <div className="filter-source-detail-row">
                      {group.sources.map((s) => (
                        <span key={s.id} className="filter-chip-detail">
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {activeTab === "member" &&
            config.members.map((member) => (
              <button
                key={member.id}
                className={`filter-chip-toggle${feedState.members.includes(member.id) ? " active" : ""}`}
                onClick={() => dispatch({ type: "TOGGLE_MEMBER", member: member.id })}
              >
                {member.emoji} {member.stageName}
              </button>
            ))}

          {activeTab === "type" &&
            sortedContentTypes.map((ct) => (
              <button
                key={ct}
                className={`filter-chip-toggle${feedState.contentTypes.includes(ct) ? " active" : ""}`}
                onClick={() => dispatch({ type: "TOGGLE_CONTENT_TYPE", contentType: ct })}
              >
                {contentTypeLabels[ct] ?? ct}
              </button>
            ))}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            className="filter-sheet-clear"
            onClick={() => dispatch({ type: "CLEAR_ALL_FILTERS" })}
          >
            Clear all
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
