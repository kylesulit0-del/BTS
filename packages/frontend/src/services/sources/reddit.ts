import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { getConfig } from "../../config";
import { stripToText } from "../../utils/sanitize";
import { fetchWithProxy } from "../../utils/corsProxy";
import { detectVideo } from "../../utils/videoDetect";
const IMG_EXT = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
const IMG_HOSTS = ["i.redd.it", "i.imgur.com", "pbs.twimg.com"];

function getRedditImage(d: Record<string, unknown>): string | undefined {
  // 1. Direct image URL (most reliable — no auth tokens, no CORS issues)
  const postUrl = (d.url_overridden_by_dest || d.url) as string | undefined;
  if (postUrl) {
    try {
      const host = new URL(postUrl).hostname;
      if (IMG_HOSTS.some((h) => host.endsWith(h)) || IMG_EXT.test(postUrl)) {
        return postUrl;
      }
    } catch { /* invalid URL, skip */ }
  }

  // 2. Gallery posts — first image from media_metadata
  if (d.is_gallery && d.media_metadata) {
    const meta = d.media_metadata as Record<string, { s?: { u?: string } }>;
    for (const key of Object.keys(meta)) {
      const url = meta[key]?.s?.u;
      if (url) return url.replace(/&amp;/g, "&");
    }
  }

  // 3. Preview image (preview.redd.it — has auth tokens that can expire)
  const preview = d.preview as { images?: { source?: { url?: string }; resolutions?: { url?: string; width?: number }[] }[] } | undefined;
  const previewUrl = preview?.images?.[0]?.source?.url;
  if (previewUrl) return previewUrl.replace(/&amp;/g, "&");

  // 4. Small thumbnail as last resort
  const thumb = d.thumbnail as string | undefined;
  if (thumb && thumb.startsWith("http")) return thumb;

  return undefined;
}

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

    const video = detectVideo(
      (d.url_overridden_by_dest || d.url) as string,
      d.selftext as string | undefined,
    );

    items.push({
      id: `reddit-${d.id}`,
      title: d.title,
      url: d.url.startsWith("/") ? `https://www.reddit.com${d.url}` : d.url,
      source: "reddit",
      sourceName: source.label,
      timestamp: d.created_utc * 1000,
      preview: d.selftext ? stripToText(d.selftext).slice(0, 200) : undefined,
      thumbnail: getRedditImage(d),
      author: `u/${d.author}`,
      stats: {
        upvotes: d.score > 0 ? d.score : undefined,
        comments: d.num_comments > 0 ? d.num_comments : undefined,
      },
      ...(video && { videoType: video.videoType, videoId: video.videoId }),
    });
  }

  return items;
}

