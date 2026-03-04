import type { FeedItem } from "../../types/feed";
import { InfoPanel } from "./SnapCard";

export default function SnapCardText({ item }: { item: FeedItem }) {
  return (
    <div className="snap-card-text">
      <div className="snap-card-media-zone">
        <div className="snap-card-gradient-placeholder" />
      </div>
      <InfoPanel item={item} />
    </div>
  );
}
