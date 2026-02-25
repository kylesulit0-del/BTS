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

export function parseAtom(xml: string): { title: string; link: string; published: string; mediaUrl?: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const entries = doc.querySelectorAll("entry");
  const results: { title: string; link: string; published: string; mediaUrl?: string }[] = [];

  entries.forEach((entry) => {
    const linkEl = entry.querySelector("link[rel='alternate']") || entry.querySelector("link");
    const mediaGroup = entry.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail");
    const mediaThumbnail = mediaGroup.length > 0 ? mediaGroup[0].getAttribute("url") : undefined;

    results.push({
      title: entry.querySelector("title")?.textContent || "",
      link: linkEl?.getAttribute("href") || "",
      published: entry.querySelector("published")?.textContent || "",
      mediaUrl: mediaThumbnail || undefined,
    });
  });

  return results;
}
