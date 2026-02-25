import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { parseRSS } from "../../utils/xmlParser";
import { stripToText } from "../../utils/sanitize";
import { fetchWithProxy } from "../../utils/corsProxy";
export async function fetchRssSource(source: SourceEntry): Promise<FeedItem[]> {
  const xml = await fetchWithProxy(source.url);
  const rssItems = parseRSS(xml);

  const config = getConfig();
  const limit = source.fetchCount ?? 10;

  return rssItems
    .filter((item) => !source.needsFilter || config.keywords.test(item.title + " " + item.description))
    .slice(0, limit)
    .map((item, i) => ({
      id: `${source.id}-${i}-${Date.now()}`,
      title: item.title,
      url: item.link,
      source: "rss" as const,
      sourceName: source.label,
      timestamp: new Date(item.pubDate).getTime() || Date.now(),
      preview: stripToText(item.description).slice(0, 200),
    }));
}

