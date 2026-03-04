import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { FeedState, FeedAction, SortMode } from "../../hooks/useFeedState";

interface SortSheetProps {
  isOpen: boolean;
  onClose: () => void;
  feedState: FeedState;
  dispatch: React.Dispatch<FeedAction>;
}

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "recommended", label: "Recommended" },
  { mode: "newest", label: "Newest First" },
  { mode: "oldest", label: "Oldest First" },
  { mode: "popular", label: "Most Popular" },
  { mode: "discussed", label: "Most Discussed" },
];

export default function SortSheet({ isOpen, onClose, feedState, dispatch }: SortSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const scrollTopRef = useRef(0);

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
    const sheet = sheetRef.current;
    if (sheet) {
      scrollTopRef.current = sheet.scrollTop;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
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
      className={`sort-sheet-backdrop${isOpen ? " open" : ""}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="sort-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sort-sheet-handle" />
        <h3 className="sort-sheet-title">Sort By</h3>
        {SORT_OPTIONS.map((opt) => {
          const active = feedState.sort === opt.mode;
          return (
            <button
              key={opt.mode}
              className={`sort-sheet-option${active ? " active" : ""}`}
              onClick={() => dispatch({ type: "SET_SORT", sort: opt.mode })}
            >
              <span>{opt.label}</span>
              {active && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
