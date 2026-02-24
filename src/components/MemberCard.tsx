import { Link } from "react-router-dom";
import type { Member } from "../data/members";

const memberColors: Record<string, string> = {
  rm: "#1a1a2e",
  jin: "#16213e",
  suga: "#0f3460",
  jhope: "#533483",
  jimin: "#5b2c6f",
  v: "#4a235a",
  jungkook: "#1b2631",
};

const memberEmojis: Record<string, string> = {
  rm: "🐨",
  jin: "🐹",
  suga: "🐱",
  jhope: "🐿️",
  jimin: "🐥",
  v: "🐯",
  jungkook: "🐰",
};

export default function MemberCard({ member }: { member: Member }) {
  return (
    <Link to={`/members/${member.id}`} className="member-card" style={{ background: memberColors[member.id] || "#1a1a2e" }}>
      <div className="member-card-avatar">
        <span className="member-emoji">{memberEmojis[member.id]}</span>
      </div>
      <div className="member-card-info">
        <h3>{member.stageName}</h3>
        <p className="member-real-name">{member.realName}</p>
        <p className="member-role">{member.role}</p>
      </div>
      <div className="member-card-arrow">›</div>
    </Link>
  );
}
