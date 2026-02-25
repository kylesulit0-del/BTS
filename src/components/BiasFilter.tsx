import type { BiasId } from "../types/feed";

const memberChips: { id: BiasId; label: string; emoji: string; color: string }[] = [
  { id: "rm", label: "RM", emoji: "🐨", color: "#1a1a2e" },
  { id: "jin", label: "Jin", emoji: "🐹", color: "#16213e" },
  { id: "suga", label: "SUGA", emoji: "🐱", color: "#0f3460" },
  { id: "jhope", label: "j-hope", emoji: "🐿️", color: "#533483" },
  { id: "jimin", label: "Jimin", emoji: "🐥", color: "#5b2c6f" },
  { id: "v", label: "V", emoji: "🐯", color: "#4a235a" },
  { id: "jungkook", label: "JK", emoji: "🐰", color: "#1b2631" },
];

interface Props {
  biases: BiasId[];
  onToggle: (id: BiasId) => void;
  onClear: () => void;
}

export default function BiasFilter({ biases, onToggle, onClear }: Props) {
  return (
    <div className="bias-filter">
      <div className="bias-filter-label">Select Your Bias</div>
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
