import type { NewsItem } from "../data/news";

export default function NewsCard({ item }: { item: NewsItem }) {
  const date = new Date(item.date + "T00:00:00");
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="news-card">
      <div className="news-card-header">
        <span className="news-source">{item.source}</span>
        <span className="news-date">{formatted}</span>
      </div>
      <h3>{item.headline}</h3>
      <p>{item.summary}</p>
      <a href={item.sourceUrl} className="news-link" target="_blank" rel="noopener noreferrer">
        Read more →
      </a>
    </div>
  );
}
