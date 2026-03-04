import type { FeedState } from "../../hooks/useFeedState";

interface FixedHeaderProps {
  feedState: FeedState;
  onSortClick: () => void;
  onFilterClick: () => void;
}

export default function FixedHeader({ feedState, onSortClick, onFilterClick }: FixedHeaderProps) {
  const filterCount =
    feedState.sources.length +
    feedState.members.length +
    feedState.contentTypes.length;

  return (
    <header className="fixed-header">
      <span className="fixed-header-brand">Army Feed</span>
      <div className="fixed-header-actions">
        <button className="header-icon-btn" onClick={onSortClick} aria-label="Sort">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5h10" />
            <path d="M11 9h7" />
            <path d="M11 13h4" />
            <path d="M3 17l3 3 3-3" />
            <path d="M6 18V4" />
          </svg>
          {feedState.sort !== "recommended" && <span className="header-icon-dot" />}
        </button>
        <button className="header-icon-btn" onClick={onFilterClick} aria-label="Filter">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
          {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
        </button>
      </div>
    </header>
  );
}
