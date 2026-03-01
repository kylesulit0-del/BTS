import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import type { VideoType } from "../../types/feed";
import { getConfig } from "../../config";
import { parseAtom } from "../../utils/xmlParser";
import { fetchWithProxy } from "../../utils/corsProxy";

/**
 * Check if a YouTube video is a Short using redirect behavior.
 * /shorts/VIDEO_ID returns 200 for actual Shorts, 303 redirect for regular videos.
 * Using redirect:'error' + mode:'no-cors': Shorts resolve, regular videos reject.
 */
async function checkYouTubeShort(videoId: string): Promise<boolean> {
  try {
    await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      mode: "no-cors",
      redirect: "error",
    });
    return true; // 200 = it's a Short
  } catch {
    return false; // redirect (303) or network error = not a Short
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

