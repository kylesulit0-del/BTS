import { members } from "../data/members";
import MemberCard from "../components/MemberCard";

export default function Members() {
  return (
    <div className="page">
      <h1 className="page-title">Members</h1>
      <p className="page-subtitle">The 7 members of BTS</p>
      <div className="members-list">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
