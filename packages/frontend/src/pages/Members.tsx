import { getConfig } from "../config";
import MemberCard from "../components/MemberCard";

export default function Members() {
  const config = getConfig();
  return (
    <div className="page">
      <h1 className="page-title">Members</h1>
      <p className="page-subtitle">The {config.members.length} members of {config.theme.groupName}</p>
      <div className="members-list">
        {config.members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
