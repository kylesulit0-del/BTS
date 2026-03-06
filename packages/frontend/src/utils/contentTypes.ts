import type { ContentType } from "../types/feed";

/** Badge colors grouped by vibe: warm for creative, cool for informational, neutral for social. */
export const contentTypeBadgeColors: Record<string, string> = {
  // Informational (cool tones)
  news: "#3b82f6",           // blue
  discussion: "#06b6d4",     // cyan
  // Creative (warm tones)
  fan_art: "#ec4899",        // pink
  fan_fiction: "#f97316",    // orange
  music: "#ef4444",          // red
  // Neutral
  social_posts: "#8b5cf6",   // violet
  media: "#6366f1",          // indigo
  general: "#6b7280",        // gray
};

export const contentTypeLabels: Record<string, string> = {
  news: "News",
  discussion: "Discussion",
  fan_art: "Fan Art",
  fan_fiction: "Fan Fiction",
  music: "Music",
  social_posts: "Social Posts",
  media: "Media",
  general: "General",
};

/** All content type keys -- used as the complete set for dynamic sorting. */
export const contentTypeKeys: ContentType[] = [
  "news",
  "discussion",
  "fan_art",
  "fan_fiction",
  "music",
  "social_posts",
  "media",
  "general",
];
