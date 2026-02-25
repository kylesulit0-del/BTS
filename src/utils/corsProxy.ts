const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export async function fetchWithProxy(url: string): Promise<string> {
  const controller = new AbortController();

  try {
    const text = await Promise.any(
      PROXIES.map(async (buildProxy) => {
        const proxyUrl = buildProxy(url);
        const res = await fetch(proxyUrl, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(7000)]),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Fully read the body before returning so abort() doesn't corrupt it
        return await res.text();
      })
    );
    // Cancel remaining in-flight requests after first success resolves
    controller.abort();
    return text;
  } catch (err) {
    controller.abort();
    if (err instanceof AggregateError) {
      throw new Error(`All proxies failed for ${url}`);
    }
    throw err;
  }
}
