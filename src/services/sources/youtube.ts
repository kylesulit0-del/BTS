import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import type { VideoType } from "../../types/feed";
import { getConfig } from "../../config";
import { parseAtom } from "../../utils/xmlParser";
import { fetchWithProxy } from "../../utils/corsProxy";

/**
 * Check if a YouTube video is a Short using oEmbed dimensions.
 * When requesting oEmbed with a /shorts/ URL, YouTube returns portrait
 * dimensions (height > width) for actual Shorts, landscape for regular videos.
 */
async function checkYouTubeShort(videoId: string): Promise<boolean> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/shorts/${videoId}`)}&format=json`;
    const text = await fetchWithProxy(oembedUrl);
    const data = JSON.parse(text);
    return data.height > data.width;
  } catch {
    return false;
  }
}

export async function fetchYouTubeSource(source: SourceEntry): Promise<FeedItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.url}`;
  const xml = await fetchWithProxy(url);
  const entries = parseAtom(xml);

  const config = getConfig();
  const limit = source.fetchCount ?? 10;

  const filtered = entries
    .filter((entry) => !source.needsFilter || config.keywords.test(entry.title))
    .slice(0, limit);

  // Check all videos for Shorts in parallel
  const videoIds = filtered.map((entry) =>
    entry.link.includes("watch?v=")
      ? entry.link.split("watch?v=")[1]?.split("&")[0] || ""
      : entry.link.split("/").pop() || ""
  );
  const shortsResults = await Promise.all(videoIds.map(checkYouTubeShort));

  return filtered.map((entry, i) => {
    const videoId = videoIds[i];
    const isShort = shortsResults[i];
    const hasStats = (entry.views && entry.views > 0) || (entry.likes && entry.likes > 0);

    return {
      id: `youtube-${videoId || i}-${source.label}`,
      title: entry.title,
      url: entry.link,
      source: "youtube" as const,
      sourceName: source.label,
      timestamp: new Date(entry.published).getTime() || Date.now(),
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined,
      stats: hasStats
        ? {
            views: entry.views && entry.views > 0 ? entry.views : undefined,
            likes: entry.likes && entry.likes > 0 ? entry.likes : undefined,
          }
        : undefined,
      ...(isShort && videoId ? { videoType: "youtube-short" as VideoType, videoId } : {}),
    };
  });
}

