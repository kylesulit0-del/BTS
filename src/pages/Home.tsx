import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page home-page">
      <div className="hero">
        <div className="hero-group-photo">
          <img src="/members/group.jpg" alt="BTS" className="hero-group-img" />
        </div>
        <div className="hero-logo">
          <span className="hero-logo-text">BTS</span>
          <span className="hero-subtitle">방탄소년단</span>
        </div>
        <p className="hero-tagline">Beyond The Scene · ARMY Forever</p>
      </div>

      <div className="nav-cards">
        <Link to="/news" className="nav-card">
          <span className="nav-card-emoji">📰</span>
          <div>
            <h3>ARMY Feed</h3>
            <p>BTS content from the web</p>
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
            <p>Meet all 7 members</p>
          </div>
        </Link>
      </div>

      <div className="home-stats">
        <div className="stat">
          <span className="stat-number">7</span>
          <span className="stat-label">Members</span>
        </div>
        <div className="stat">
          <span className="stat-number">10+</span>
          <span className="stat-label">Years</span>
        </div>
        <div className="stat">
          <span className="stat-number">∞</span>
          <span className="stat-label">ARMY</span>
        </div>
      </div>

      <div className="home-quote">
        <p>"Love yourself, speak yourself"</p>
      </div>
    </div>
  );
}
