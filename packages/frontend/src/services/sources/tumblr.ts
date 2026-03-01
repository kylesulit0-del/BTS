import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { parseRSS } from "../../utils/xmlParser";
import { stripToText } from "../../utils/sanitize";
import { fetchWithProxy } from "../../utils/corsProxy";

/**
 * Extract the first image src from an HTML string.
 * Uses DOMParser to safely parse HTML and find the first <img>.
 */
function extractThumbnail(html: string): string | undefined {
  if (!html) return undefined;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelector("img")?.getAttribute("src") || undefined;
}

export async function fetchTumblrSource(source: SourceEntry): Promise<FeedItem[]> {
  const xml = await fetchWithProxy(source.url);
  const rssItems = parseRSS(xml);

  const config = getConfig();
  const limit = source.fetchCount ?? 10;

  return rssItems
    .filter((item) => !source.needsFilter || config.keywords.test(item.title + " " + item.description))
    .slice(0, limit)
    .map((item, i) => ({
      id: `tumblr-${source.id}-${i}-${Date.now()}`,
      title: item.title,
      url: item.link,
      source: "tumblr" as const,
      sourceName: "Tumblr",
      timestamp: new Date(item.pubDate).getTime() || Date.now(),
      preview: stripToText(item.description).slice(0, 200),
      thumbnail: extractThumbnail(item.description),
    }));
}
