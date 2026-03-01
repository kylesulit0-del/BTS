import { getConfig } from "../config";
import EventCard from "../components/EventCard";

const regionLabels: Record<string, string> = {
  worldwide: "Releases",
  asia: "Asia",
  "north-america": "North America",
  europe: "Europe",
};

const regionOrder = ["worldwide", "asia", "north-america", "europe"];

export default function Tours() {
  const config = getConfig();
  const sorted = [...config.events].sort((a, b) => a.date.localeCompare(b.date));
  const grouped = regionOrder
    .map((region) => ({
      region,
      label: regionLabels[region],
      events: sorted.filter((e) => e.region === region),
    }))
    .filter((g) => g.events.length > 0);

  return (
    <div className="page">
      <h1 className="page-title">{config.labels.tourTitle}</h1>
      <p className="page-subtitle">{config.labels.tourSubtitle}</p>

      {grouped.map((group) => (
        <div key={group.region} className="tour-region">
          <h2 className="tour-region-header">{group.label}</h2>
          <div className="events-list">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
