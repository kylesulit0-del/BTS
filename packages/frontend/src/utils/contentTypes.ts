import type { ContentType } from "../types/feed";

export const contentTypeBadgeColors: Record<string, string> = {
  news: "#3b82f6",
  fan_art: "#ec4899",
  meme: "#eab308",
  video: "#ef4444",
  discussion: "#22c55e",
  translation: "#a855f7",
  official: "#f59e0b",
};

export const contentTypeLabels: Record<string, string> = {
  news: "News",
  fan_art: "Fan Art",
  meme: "Meme",
  video: "Video",
  discussion: "Discussion",
  translation: "Translation",
  official: "Official",
};

/** All content type keys in display order. */
export const contentTypeKeys: ContentType[] = [
  "news",
  "fan_art",
  "meme",
  "video",
  "discussion",
  "translation",
  "official",
];
