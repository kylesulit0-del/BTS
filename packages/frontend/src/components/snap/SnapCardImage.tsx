import { useState, useRef, useEffect } from "react";
import type { FeedItem } from "../../types/feed";
import { SnapCardMeta } from "./SnapCard";

interface SnapCardImageProps {
  item: FeedItem;
  onSeeMore: () => void;
}

export default function SnapCardImage({ item, onSeeMore }: SnapCardImageProps) {
  const [imageError, setImageError] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [item.preview]);

  if (imageError || !item.thumbnail) {
    // Fallback to a placeholder gradient
    return (
      <div className="snap-card-image">
        <div
          className="snap-card-image-hero"
          style={{
            background: "linear-gradient(135deg, var(--theme-dark), var(--bg-card))",
          }}
        />
        <div className="snap-card-image-panel">
          <SnapCardMeta item={item} />
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
      </div>
    );
  }

  return (
    <div className="snap-card-image">
      <div
        className="snap-card-image-hero"
        style={{ backgroundImage: `url(${item.thumbnail})` }}
      >
        {/* Hidden img to detect load errors */}
        <img
          src={item.thumbnail}
          alt=""
          style={{ display: "none" }}
          onError={() => setImageError(true)}
        />
      </div>
      <div className="snap-card-image-panel">
        <SnapCardMeta item={item} />
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
    </div>
  );
}
