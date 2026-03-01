export function parseRSS(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = doc.querySelectorAll("item");
  const results: { title: string; link: string; description: string; pubDate: string }[] = [];

  items.forEach((item) => {
    results.push({
      title: item.querySelector("title")?.textContent || "",
      link: item.querySelector("link")?.textContent || "",
      description: item.querySelector("description")?.textContent || "",
      pubDate: item.querySelector("pubDate")?.textContent || "",
    });
  });

  return results;
}

export function parseAtom(xml: string): { title: string; link: string; published: string; mediaUrl?: string; views?: number; likes?: number }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const entries = doc.querySelectorAll("entry");
  const mediaNS = "http://search.yahoo.com/mrss/";
  const results: { title: string; link: string; published: string; mediaUrl?: string; views?: number; likes?: number }[] = [];

  entries.forEach((entry) => {
    const linkEl = entry.querySelector("link[rel='alternate']") || entry.querySelector("link");
    const mediaGroup = entry.getElementsByTagNameNS(mediaNS, "thumbnail");
    const mediaThumbnail = mediaGroup.length > 0 ? mediaGroup[0].getAttribute("url") : undefined;

    // Extract engagement stats from media:community
    let views: number | undefined;
    let likes: number | undefined;
    const community = entry.getElementsByTagNameNS(mediaNS, "community");
    if (community.length > 0) {
      const statistics = community[0].getElementsByTagNameNS(mediaNS, "statistics");
      const viewStr = statistics.length > 0 ? statistics[0].getAttribute("views") : null;
      views = viewStr ? parseInt(viewStr, 10) : undefined;
      const starRating = community[0].getElementsByTagNameNS(mediaNS, "starRating");
      const countStr = starRating.length > 0 ? starRating[0].getAttribute("count") : null;
      likes = countStr ? parseInt(countStr, 10) : undefined;
    }

    results.push({
      title: entry.querySelector("title")?.textContent || "",
      link: linkEl?.getAttribute("href") || "",
      published: entry.querySelector("published")?.textContent || "",
      mediaUrl: mediaThumbnail || undefined,
      views,
      likes,
    });
  });

  return results;
}
