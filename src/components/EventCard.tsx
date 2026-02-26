import type { Event } from "../config/types";

const statusColors: Record<string, string> = {
  upcoming: "#7c3aed",
  "on-sale": "#059669",
  "sold-out": "#dc2626",
  album: "#d97706",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  "on-sale": "On Sale",
  "sold-out": "Sold Out",
  album: "Album",
};

export default function EventCard({ event }: { event: Event }) {
  const date = new Date(event.date + "T00:00:00");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();

  return (
    <div className={`event-card${event.status === "album" ? " event-card-album" : ""}`}>
      <div className={`event-date-badge${event.status === "album" ? " event-date-album" : ""}`}>
        <span className="event-month">{month}</span>
        <span className="event-day">{day}</span>
      </div>
      <div className="event-info">
        <h3>{event.title}</h3>
        <p className="event-venue">{event.city} — {event.venue}</p>
        <p className="event-description">{event.description}</p>
        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            className={`event-ticket-link${event.status === "sold-out" ? " event-ticket-resale" : ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {event.status === "sold-out" ? "Find Resale Tickets →" : "Get Tickets →"}
          </a>
        )}
      </div>
      <span className="event-status" style={{ background: statusColors[event.status] }}>
        {statusLabels[event.status]}
      </span>
    </div>
  );
}
