import { getConfig } from "../config";

interface FeedFilterProps {
  active: string | "all";
  onChange: (source: string | "all") => void;
}

export default function FeedFilter({ active, onChange }: FeedFilterProps) {
  const config = getConfig();
  const sourceTypes: { type: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const source of config.sources) {
    if (source.enabled !== false && !seen.has(source.type)) {
      seen.add(source.type);
      sourceTypes.push({ type: source.type, label: config.labels.sourceLabels[source.type] });
    }
  }

  return (
    <div className="feed-filter">
      <button
        className={`feed-filter-tab${active === "all" ? " active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {sourceTypes.map((s) => (
        <button
          key={s.type}
          className={`feed-filter-tab${active === s.type ? " active" : ""}`}
          onClick={() => onChange(s.type)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
