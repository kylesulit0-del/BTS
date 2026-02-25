const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export async function fetchWithProxy(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const buildProxy of PROXIES) {
    try {
      const proxyUrl = buildProxy(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("All proxies failed");
}
