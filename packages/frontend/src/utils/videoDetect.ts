export type VideoType = "youtube-short" | "tiktok";

export interface VideoInfo {
  videoType: VideoType;
  videoId: string;
  isShortUrl?: boolean;
}

const YT_SHORTS_RE =
  /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;

const TIKTOK_FULL_RE =
  /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/;

const TIKTOK_SHORT_RE =
  /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)\/?/;

/**
 * Detect YouTube Shorts or TikTok URLs in a post URL and/or selftext.
 * Returns video metadata if found, null otherwise.
 */
export function detectVideo(
  url: string,
  selftext?: string,
): VideoInfo | null {
  const haystack = selftext ? `${url} ${selftext}` : url;

  // YouTube Shorts (check first — more common in Reddit posts)
  const ytMatch = haystack.match(YT_SHORTS_RE);
  if (ytMatch) {
    return { videoType: "youtube-short", videoId: ytMatch[1] };
  }

  // TikTok full URL (with video ID)
  const ttFullMatch = haystack.match(TIKTOK_FULL_RE);
  if (ttFullMatch) {
    return { videoType: "tiktok", videoId: ttFullMatch[1], isShortUrl: false };
  }

  // TikTok short URL (vm.tiktok.com / vt.tiktok.com)
  const ttShortMatch = haystack.match(TIKTOK_SHORT_RE);
  if (ttShortMatch) {
    return { videoType: "tiktok", videoId: ttShortMatch[1], isShortUrl: true };
  }

  return null;
}
