export type FeedSource = "reddit" | "youtube" | "news" | "twitter";

export type BiasId = "rm" | "jin" | "suga" | "jhope" | "jimin" | "v" | "jungkook";

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  source: FeedSource;
  sourceName: string;
  timestamp: number;
  preview?: string;
  thumbnail?: string;
  author?: string;
}

export const MEMBER_KEYWORDS: Record<BiasId, string[]> = {
  rm: ["rm", "namjoon", "kim namjoon", "mono", "indigo"],
  jin: ["jin", "seokjin", "kim seokjin", "worldwide handsome", "astronaut"],
  suga: ["suga", "yoongi", "min yoongi", "agust d", "d-day", "d-2"],
  jhope: ["j-hope", "jhope", "hoseok", "jung hoseok", "hope world", "jack in the box"],
  jimin: ["jimin", "park jimin", "face album", "muse album"],
  v: ["taehyung", "kim taehyung", "layover", "winter ahead"],
  jungkook: ["jungkook", "jeon jungkook", "golden", "standing next to you"],
};
