import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { stripToText } from "../../utils/sanitize";
import { fetchWithProxy } from "../../utils/corsProxy";
export async function fetchRedditSource(source: SourceEntry): Promise<FeedItem[]> {
  const limit = source.fetchCount ?? 15;
  const url = `https://www.reddit.com/r/${source.url}/hot.json?limit=${limit}`;
  const text = await fetchWithProxy(url);
  const data = JSON.parse(text);
  const posts = data?.data?.children || [];
  const items: FeedItem[] = [];

  const config = getConfig();

  for (const post of posts) {
    const d = post.data;
    if (d.stickied) continue;
    if (source.needsFilter && !config.keywords.test(d.title + " " + (d.selftext || ""))) continue;

    items.push({
      id: `reddit-${d.id}`,
      title: d.title,
      url: d.url.startsWith("/") ? `https://www.reddit.com${d.url}` : d.url,
      source: "reddit",
      sourceName: source.label,
      timestamp: d.created_utc * 1000,
      preview: d.selftext ? stripToText(d.selftext).slice(0, 200) : undefined,
      thumbnail: d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : undefined,
      author: `u/${d.author}`,
    });
  }

  return items;
}

