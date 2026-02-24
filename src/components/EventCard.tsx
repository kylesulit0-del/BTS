import type { Event } from "../data/events";

const statusColors: Record<string, string> = {
  upcoming: "#7c3aed",
  "on-sale": "#059669",
  "sold-out": "#dc2626",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  "on-sale": "On Sale",
  "sold-out": "Sold Out",
};

export default function EventCard({ event }: { event: Event }) {
  const date = new Date(event.date + "T00:00:00");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();

  return (
    <div className="event-card">
      <div className="event-date-badge">
        <span className="event-month">{month}</span>
        <span className="event-day">{day}</span>
      </div>
      <div className="event-info">
        <h3>{event.title}</h3>
        <p className="event-venue">{event.venue}</p>
        <p className="event-description">{event.description}</p>
      </div>
      <span className="event-status" style={{ background: statusColors[event.status] }}>
        {statusLabels[event.status]}
      </span>
    </div>
  );
}
