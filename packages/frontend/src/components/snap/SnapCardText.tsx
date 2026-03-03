import { useRef, useState, useEffect } from "react";
import type { FeedItem } from "../../types/feed";
import { SnapCardMeta } from "./SnapCard";

interface SnapCardTextProps {
  item: FeedItem;
  onSeeMore: () => void;
}

export default function SnapCardText({ item, onSeeMore }: SnapCardTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [item.preview]);

  return (
    <div className="snap-card-text">
      <div className="snap-card-text-content">
        <h2 className="snap-card-text-title">{item.title}</h2>
        {item.preview && (
          <div className="snap-card-text-preview-wrap">
            <p ref={textRef} className="snap-card-text-body">
              {item.preview}
            </p>
            {isOverflowing && (
              <button className="snap-card-see-more" onClick={onSeeMore}>
                ...See More
              </button>
            )}
          </div>
        )}
      </div>
      <div className="snap-card-text-footer">
        <SnapCardMeta item={item} />
      </div>
    </div>
  );
}
