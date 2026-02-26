import type { BiasId } from "../types/feed";
import { getConfig } from "../config";

interface Props {
  biases: BiasId[];
  onToggle: (id: BiasId) => void;
  onClear: () => void;
}

export default function BiasFilter({ biases, onToggle, onClear }: Props) {
  const config = getConfig();
  const memberChips = config.members.map((m) => ({
    id: m.id,
    label: m.stageName,
    emoji: m.emoji,
    color: m.color,
  }));

  return (
    <div className="bias-filter">
      <div className="bias-filter-label">{config.labels.memberFilterLabel}</div>
      <div className="bias-filter-chips">
        <button
          className={`bias-chip${biases.length === 0 ? " bias-chip-active" : ""}`}
          onClick={onClear}
        >
          All
        </button>
        {memberChips.map((m) => {
          const active = biases.includes(m.id);
          return (
            <button
              key={m.id}
              className={`bias-chip${active ? " bias-chip-active" : ""}`}
              style={active ? { background: m.color, borderColor: m.color } : undefined}
              onClick={() => onToggle(m.id)}
            >
              <span className="bias-chip-emoji">{m.emoji}</span>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
