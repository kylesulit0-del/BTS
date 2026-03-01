/**
 * Shared utilities for all scrapers: URL normalization, retry logic, delays.
 */

/** Tracking parameters to strip during URL normalization. */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'ref', 'fbclid', 'gclid', 'feature',
]);

/**
 * Normalize a URL for deduplication (INFRA-05).
 *
 * 1. Parse with URL constructor
 * 2. Remove tracking parameters
 * 3. Remove trailing slashes
 * 4. Lowercase hostname
 * 5. Remove www. prefix
 * 6. Sort remaining query params alphabetically
 * 7. Return normalized string
 * 8. On parse error, return original URL unchanged
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove www. prefix
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining query params alphabetically
    parsed.searchParams.sort();

    // Build normalized URL and remove trailing slash (but keep root /)
    let normalized = parsed.toString();
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    // On parse error, return original URL unchanged
    return url;
  }
}

const USER_AGENT = 'bts-army-feed/2.0 (content aggregator)';
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];

/**
 * Fetch with retry logic for scraper HTTP requests.
 *
 * - Retries on: network errors, HTTP 429, HTTP 5xx
 * - Does NOT retry on: HTTP 4xx (except 429), successful responses
 * - Always sets custom User-Agent header
 * - Throws after all retries exhausted
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', USER_AGENT);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });

      // Success -- return immediately
      if (response.ok) {
        return response;
      }

      // Retry on 429 (rate limited) or 5xx (server error)
      if (response.status === 429 || response.status >= 500) {
        const delayMs = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[fetchWithRetry] ${response.status} for ${url}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
        continue;
      }

      // 4xx (not 429) -- do NOT retry, throw immediately
      throw new Error(`HTTP ${response.status} for ${url}: ${response.statusText}`);
    } catch (error) {
      // If it's our own thrown error (4xx), re-throw
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        throw error;
      }

      // Network error -- retry
      const delayMs = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[fetchWithRetry] Network error for ${url}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}): ${error}`);

      if (attempt < maxRetries - 1) {
        await delay(delayMs);
        continue;
      }

      throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${error}`);
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

/** Simple timer utility for inter-request delays. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
