import type { FeedItem } from "../../types/feed";
import { SnapCardMeta } from "./SnapCard";

interface SnapCardVideoProps {
  item: FeedItem;
  isActive: boolean;
}

export default function SnapCardVideo({ item, isActive: _isActive }: SnapCardVideoProps) {
  return (
    <div className="snap-card-video">
      {/* Thumbnail facade */}
      <div
        className="snap-card-video-facade"
        style={
          item.thumbnail
            ? { backgroundImage: `url(${item.thumbnail})` }
            : { background: "linear-gradient(135deg, #1a1a2e, #0d0d0d)" }
        }
      >
        {/* Play icon overlay - shown when not active (Plan 03 replaces with iframe) */}
        <div className="snap-card-video-play-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="rgba(0,0,0,0.5)" />
            <polygon points="26,20 26,44 46,32" fill="white" />
          </svg>
        </div>
      </div>

      {/* Metadata overlay at bottom */}
      <div className="snap-card-video-overlay">
        <SnapCardMeta item={item} />
      </div>
    </div>
  );
}
