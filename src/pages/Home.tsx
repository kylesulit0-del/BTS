import { Link } from "react-router-dom";
import { getConfig } from "../config";

export default function Home() {
  const config = getConfig();
  return (
    <div className="page home-page">
      <div className="hero">
        <div className="hero-group-photo">
          <img src={config.theme.logoUrl} alt={config.theme.groupName} className="hero-group-img" />
        </div>
        <div className="hero-logo">
          <span className="hero-logo-text">{config.theme.groupName}</span>
          <span className="hero-subtitle">{config.theme.groupNameNative}</span>
        </div>
        <p className="hero-tagline">{config.theme.tagline}</p>
      </div>

      <div className="nav-cards">
        <Link to="/news" className="nav-card">
          <span className="nav-card-emoji">📰</span>
          <div>
            <h3>{config.theme.fandomName} Feed</h3>
            <p>{config.theme.groupName} content from the web</p>
          </div>
        </Link>

        <Link to="/tours" className="nav-card">
          <span className="nav-card-emoji">🎤</span>
          <div>
            <h3>Tours & Events</h3>
            <p>Upcoming concerts & releases</p>
          </div>
        </Link>

        <Link to="/members" className="nav-card">
          <span className="nav-card-emoji">👥</span>
          <div>
            <h3>Members</h3>
            <p>Meet all {config.members.length} members</p>
          </div>
        </Link>
      </div>

      <div className="home-stats">
        <div className="stat">
          <span className="stat-number">{config.members.length}</span>
          <span className="stat-label">Members</span>
        </div>
        <div className="stat">
          <span className="stat-number">10+</span>
          <span className="stat-label">Years</span>
        </div>
        <div className="stat">
          <span className="stat-number">&infin;</span>
          <span className="stat-label">{config.theme.fandomName}</span>
        </div>
      </div>

      <div className="home-quote">
        <p>"Love yourself, speak yourself"</p>
      </div>
    </div>
  );
}
