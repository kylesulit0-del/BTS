import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { parseAtom } from "../../utils/xmlParser";
import { fetchWithProxy } from "../../utils/corsProxy";
export async function fetchYouTubeSource(source: SourceEntry): Promise<FeedItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}`;
  const xml = await fetchWithProxy(url);
  const entries = parseAtom(xml);

  const config = getConfig();
  const limit = source.fetchCount ?? 10;

  return entries
    .filter((entry) => !source.needsFilter || config.keywords.test(entry.title))
    .slice(0, limit)
    .map((entry, i) => {
      const videoId = entry.link.includes("watch?v=")
        ? entry.link.split("watch?v=")[1]?.split("&")[0]
        : entry.link.split("/").pop() || "";

      return {
        id: `youtube-${videoId || i}-${source.label}`,
        title: entry.title,
        url: entry.link,
        source: "youtube" as const,
        sourceName: source.label,
        timestamp: new Date(entry.published).getTime() || Date.now(),
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined,
      };
    });
}

