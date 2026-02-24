import { news } from "../data/news";
import NewsCard from "../components/NewsCard";

export default function News() {
  return (
    <div className="page">
      <h1 className="page-title">Latest News</h1>
      <p className="page-subtitle">Stay updated with BTS & ARMY</p>
      <div className="news-list">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
