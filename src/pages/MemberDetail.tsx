import { useParams, Link } from "react-router-dom";
import { members } from "../data/members";

const memberEmojis: Record<string, string> = {
  rm: "🐨",
  jin: "🐹",
  suga: "🐱",
  jhope: "🐿️",
  jimin: "🐥",
  v: "🐯",
  jungkook: "🐰",
};

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const member = members.find((m) => m.id === id);

  if (!member) {
    return (
      <div className="page">
        <h1 className="page-title">Member not found</h1>
        <Link to="/members" className="back-link">← Back to Members</Link>
      </div>
    );
  }

  return (
    <div className="page member-detail-page">
      <Link to="/members" className="back-link">← Back to Members</Link>

      <div className="member-detail-header">
        <div className="member-detail-avatar">
          <span className="member-detail-emoji">{memberEmojis[member.id]}</span>
        </div>
        <h1>{member.stageName}</h1>
        <p className="member-detail-realname">{member.realName}</p>
        <span className="member-detail-role">{member.role}</span>
      </div>

      <div className="member-detail-section">
        <h2>About</h2>
        <p>{member.bio}</p>
      </div>

      <div className="member-detail-section">
        <h2>Details</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Birthday</span>
            <span className="detail-value">{member.birthday}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Position</span>
            <span className="detail-value">{member.position}</span>
          </div>
        </div>
      </div>

      <div className="member-detail-section">
        <h2>Fun Facts</h2>
        <ul className="fun-facts-list">
          {member.funFacts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </div>

      <div className="member-detail-section">
        <h2>Solo Projects</h2>
        <div className="solo-projects">
          {member.soloProjects.map((project, i) => (
            <span key={i} className="solo-project-tag">{project}</span>
          ))}
        </div>
      </div>

      <div className="member-detail-section">
        <h2>Social Media</h2>
        <div className="social-links">
          {member.socialMedia.map((sm, i) => (
            <span key={i} className="social-link">
              {sm.platform}: {sm.handle}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
