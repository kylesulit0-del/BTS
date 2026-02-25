import { useState } from "react";
import { Link } from "react-router-dom";
import type { MemberConfig } from "../config/types";

export default function MemberCard({ member }: { member: MemberConfig }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link to={`/members/${member.id}`} className="member-card" style={{ background: member.color }}>
      <div className="member-card-avatar">
        {!imgError && member.image ? (
          <img
            src={member.image}
            alt={member.stageName}
            className="member-avatar-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="member-emoji">{member.emoji}</span>
        )}
      </div>
      <div className="member-card-info">
        <h3>{member.stageName}</h3>
        <p className="member-real-name">{member.realName}</p>
        <p className="member-role">{member.role}</p>
      </div>
      <div className="member-card-arrow">&rsaquo;</div>
    </Link>
  );
}
