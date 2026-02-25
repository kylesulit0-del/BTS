import type { FeedSource } from "../types/feed";

interface FeedFilterProps {
  active: FeedSource | "all";
  onChange: (source: FeedSource | "all") => void;
}

const filters: { label: string; value: FeedSource | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Reddit", value: "reddit" },
  { label: "YouTube", value: "youtube" },
  { label: "News", value: "news" },
  { label: "Twitter", value: "twitter" },
];

export default function FeedFilter({ active, onChange }: FeedFilterProps) {
  return (
    <div className="feed-filter">
      {filters.map((f) => (
        <button
          key={f.value}
          className={`feed-filter-tab${active === f.value ? " active" : ""}`}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
