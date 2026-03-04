import { useState } from "react";
import type { FeedItem } from "../../types/feed";
import { InfoPanel } from "./SnapCard";

export default function SnapCardImage({ item }: { item: FeedItem }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const showGradient = error || !item.thumbnail;

  return (
    <div className="snap-card-image">
      <div className="snap-card-media-zone">
        {showGradient ? (
          <div className="snap-card-gradient-placeholder" />
        ) : (
          <>
            {!loaded && <div className="snap-card-image-shimmer" />}
            <img
              src={item.thumbnail}
              alt=""
              className="snap-card-media-img"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              style={{ opacity: loaded ? 1 : 0 }}
            />
          </>
        )}
      </div>
      <InfoPanel item={item} />
    </div>
  );
}
