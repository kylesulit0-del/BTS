import type { SourceEntry } from "../../config/types";
import type { FeedItem } from "../../types/feed";
import { stripToText } from "../../utils/sanitize";
import { fetchWithProxy } from "../../utils/corsProxy";
import { registerFetcher } from "./registry";

async function fetchTwitterSource(source: SourceEntry): Promise<FeedItem[]> {
  const html = await fetchWithProxy(source.url);
  const limit = source.fetchCount ?? 10;

  const items: FeedItem[] = [];
  const tweetRegex = /<div class="timeline-item[^"]*"[\s\S]*?<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const linkRegex = /href="\/([^"]+)\/status\/(\d+)"/;
  const usernameRegex = /<a class="username"[^>]*>@([^<]+)<\/a>/;

  let match;
  let count = 0;
  while ((match = tweetRegex.exec(html)) !== null && count < limit) {
    const block = match[0];
    const content = stripToText(match[1]).trim();
    const linkMatch = block.match(linkRegex);
    const userMatch = block.match(usernameRegex);

    if (content && linkMatch) {
      items.push({
        id: `twitter-${linkMatch[2]}`,
        title: content.slice(0, 140) + (content.length > 140 ? "..." : ""),
        url: `https://x.com/${linkMatch[1]}/status/${linkMatch[2]}`,
        source: "twitter",
        sourceName: source.label,
        timestamp: Date.now() - count * 60000, // approximate ordering
        preview: content.slice(0, 200),
        author: userMatch ? `@${userMatch[1]}` : undefined,
      });
      count++;
    }
  }

  return items;
}

registerFetcher("twitter", fetchTwitterSource);
