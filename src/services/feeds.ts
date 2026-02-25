import type { FeedItem } from "../types/feed";
import { fetchWithProxy } from "../utils/corsProxy";
import { parseRSS, parseAtom } from "../utils/xmlParser";

const BTS_KEYWORDS = /\bbts\b|bangtan|방탄|jimin|jungkook|taehyung|namjoon|yoongi|hoseok|seokjin|agust\s*d|j-hope|suga\b/i;

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

async function fetchSubreddit(sub: string, needsFilter: boolean): Promise<FeedItem[]> {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=15`;
  const text = await fetchWithProxy(url);
  const data = JSON.parse(text);
  const posts = data?.data?.children || [];
  const items: FeedItem[] = [];

  for (const post of posts) {
    const d = post.data;
    if (d.stickied) continue;
    if (needsFilter && !BTS_KEYWORDS.test(d.title + " " + (d.selftext || ""))) continue;

    items.push({
      id: `reddit-${d.id}`,
      title: d.title,
      url: d.url.startsWith("/") ? `https://www.reddit.com${d.url}` : d.url,
      source: "reddit",
      sourceName: `r/${sub}`,
      timestamp: d.created_utc * 1000,
      preview: d.selftext ? stripHtml(d.selftext).slice(0, 200) : undefined,
      thumbnail: d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : undefined,
      author: `u/${d.author}`,
    });
  }

  return items;
}

export async function fetchReddit(): Promise<FeedItem[]> {
  const subreddits: { name: string; filter: boolean }[] = [
    { name: "bangtan", filter: false },
    { name: "kpop", filter: true },
    { name: "heungtan", filter: false },
    { name: "bts7", filter: false },
  ];

  const results = await Promise.allSettled(
    subreddits.map((sub) => fetchSubreddit(sub.name, sub.filter))
  );

  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  return items.slice(0, 20);
}

async function fetchYouTubeChannel(channelId: string, channelName: string, needsFilter: boolean): Promise<FeedItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const xml = await fetchWithProxy(url);
  const entries = parseAtom(xml);

  return entries
    .filter((entry) => !needsFilter || BTS_KEYWORDS.test(entry.title))
    .slice(0, 10)
    .map((entry, i) => {
      const videoId = entry.link.includes("watch?v=")
        ? entry.link.split("watch?v=")[1]?.split("&")[0]
        : entry.link.split("/").pop() || "";

      return {
        id: `youtube-${videoId || i}-${channelName}`,
        title: entry.title,
        url: entry.link,
        source: "youtube" as const,
        sourceName: channelName,
        timestamp: new Date(entry.published).getTime() || Date.now(),
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined,
      };
    });
}

export async function fetchYouTube(): Promise<FeedItem[]> {
  const channels = [
    { id: "UCLkAepWjdylmXSltofFvsYQ", name: "BANGTANTV", filter: false },
    { id: "UCx2hOXK_cGnRolCRilNUfA", name: "HYBE LABELS", filter: true },
  ];

  const results = await Promise.allSettled(
    channels.map((ch) => fetchYouTubeChannel(ch.id, ch.name, ch.filter))
  );

  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  return items.slice(0, 15);
}

export async function fetchNews(): Promise<FeedItem[]> {
  const url = "https://www.soompi.com/feed";

  try {
    const xml = await fetchWithProxy(url);
    const rssItems = parseRSS(xml);

    return rssItems
      .filter((item) => BTS_KEYWORDS.test(item.title + " " + item.description))
      .slice(0, 10)
      .map((item, i) => ({
        id: `news-soompi-${i}-${Date.now()}`,
        title: item.title,
        url: item.link,
        source: "news" as const,
        sourceName: "Soompi",
        timestamp: new Date(item.pubDate).getTime() || Date.now(),
        preview: stripHtml(item.description).slice(0, 200),
      }));
  } catch {
    return [];
  }
}

export async function fetchAllKPop(): Promise<FeedItem[]> {
  const url = "https://www.allkpop.com/feed";

  try {
    const xml = await fetchWithProxy(url);
    const rssItems = parseRSS(xml);

    return rssItems
      .filter((item) => BTS_KEYWORDS.test(item.title + " " + item.description))
      .slice(0, 10)
      .map((item, i) => ({
        id: `news-allkpop-${i}-${Date.now()}`,
        title: item.title,
        url: item.link,
        source: "news" as const,
        sourceName: "AllKPop",
        timestamp: new Date(item.pubDate).getTime() || Date.now(),
        preview: stripHtml(item.description).slice(0, 200),
      }));
  } catch {
    return [];
  }
}

export async function fetchTwitter(): Promise<FeedItem[]> {
  try {
    const url = "https://nitter.net/search?q=BTS&f=tweets";
    const html = await fetchWithProxy(url);

    const items: FeedItem[] = [];
    const tweetRegex = /<div class="timeline-item[^"]*"[\s\S]*?<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const linkRegex = /href="\/([^"]+)\/status\/(\d+)"/;
    const usernameRegex = /<a class="username"[^>]*>@([^<]+)<\/a>/;

    let match;
    let count = 0;
    while ((match = tweetRegex.exec(html)) !== null && count < 10) {
      const block = match[0];
      const content = stripHtml(match[1]).trim();
      const linkMatch = block.match(linkRegex);
      const userMatch = block.match(usernameRegex);

      if (content && linkMatch) {
        items.push({
          id: `twitter-${linkMatch[2]}`,
          title: content.slice(0, 140) + (content.length > 140 ? "..." : ""),
          url: `https://x.com/${linkMatch[1]}/status/${linkMatch[2]}`,
          source: "twitter",
          sourceName: "X/Twitter",
          timestamp: Date.now() - count * 60000, // approximate ordering
          preview: content.slice(0, 200),
          author: userMatch ? `@${userMatch[1]}` : undefined,
        });
        count++;
      }
    }

    return items;
  } catch {
    return [];
  }
}

export type FeedCallback = (items: FeedItem[]) => void;

export async function fetchAllFeedsIncremental(onItems: FeedCallback): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];

  const sources = [
    fetchReddit(),
    fetchYouTube(),
    fetchNews(),
    fetchAllKPop(),
    fetchTwitter(),
  ];

  // Fire all sources and deliver results as each resolves
  const promises = sources.map((promise) =>
    promise.then((items) => {
      allItems.push(...items);
      onItems([...allItems].sort((a, b) => b.timestamp - a.timestamp));
      return items;
    }).catch(() => [] as FeedItem[])
  );

  await Promise.allSettled(promises);

  return allItems.sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    fetchReddit(),
    fetchYouTube(),
    fetchNews(),
    fetchAllKPop(),
    fetchTwitter(),
  ]);

  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
