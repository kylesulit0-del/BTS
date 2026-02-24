import { events } from "../data/events";
import EventCard from "../components/EventCard";

export default function Tours() {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page">
      <h1 className="page-title">Tours & Events</h1>
      <p className="page-subtitle">Upcoming concerts, tours & releases</p>
      <div className="events-list">
        {sorted.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
