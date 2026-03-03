import type { FeedState, FeedAction, SortMode } from "../../hooks/useFeedState";
import { getConfig } from "../../config";

interface SnapControlBarProps {
  feedState: FeedState;
  dispatch: React.Dispatch<FeedAction>;
  visible: boolean;
  onFilterIconClick: () => void;
}

const SORT_TABS: { mode: SortMode; label: string }[] = [
  { mode: "recommended", label: "Rec" },
  { mode: "newest", label: "New" },
  { mode: "oldest", label: "Old" },
  { mode: "popular", label: "Pop" },
  { mode: "discussed", label: "Disc" },
];

export default function SnapControlBar({ feedState, dispatch, visible, onFilterIconClick }: SnapControlBarProps) {
  const config = getConfig();
  const filterCount = feedState.sources.length + feedState.members.length + feedState.contentTypes.length;

  // Build display labels for active filters
  const sourceLabels = feedState.sources.map(
    (s) => config.labels.sourceLabels[s] ?? s
  );
  const memberLabels = feedState.members.map(
    (id) => config.members.find((m) => m.id === id)?.stageName ?? id
  );
  const contentTypeLabels: Record<string, string> = {
    video: "Video",
    fan_art: "Fan Art",
    meme: "Meme",
    news: "News",
    discussion: "Discussion",
    translation: "Translation",
    official: "Official",
  };
  const ctLabels = feedState.contentTypes.map(
    (ct) => contentTypeLabels[ct] ?? ct
  );

  return (
    <div className={`snap-control-bar${visible ? "" : " hidden"}`}>
      <div className="snap-control-bar-row">
        <div className="sort-tabs">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.mode}
              className={`sort-tab${feedState.sort === tab.mode ? " active" : ""}`}
              onClick={() => dispatch({ type: "SET_SORT", sort: tab.mode })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="filter-icon-btn" onClick={onFilterIconClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
          {filterCount > 0 && (
            <span className="filter-badge">{filterCount}</span>
          )}
        </button>
      </div>

      {filterCount > 0 && (
        <div className="active-filter-chips">
          {sourceLabels.map((label) => (
            <span key={`src-${label}`} className="filter-chip">{label}</span>
          ))}
          {memberLabels.map((label) => (
            <span key={`mem-${label}`} className="filter-chip">{label}</span>
          ))}
          {ctLabels.map((label) => (
            <span key={`ct-${label}`} className="filter-chip">{label}</span>
          ))}
          <button
            className="filter-clear-all"
            onClick={() => dispatch({ type: "CLEAR_ALL_FILTERS" })}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
