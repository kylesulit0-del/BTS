/**
 * Thumbnail extraction utilities shared by RSS/news and Tumblr scrapers.
 *
 * Provides og:image extraction from article HTML, logo detection to filter
 * generic site branding images, HEAD validation for thumbnail URLs, and
 * RSS feed item image extraction.
 */

import { fetchWithRetry } from './utils.js';

// ── Known logo URL patterns ──────────────────────────────────────────────

const LOGO_PATTERNS = [
  /\/logo/i,
  /\/brand/i,
  /\/default-og/i,
  /\/favicon/i,
  /\/icon/i,
  /site-logo/i,
  /default-image/i,
  /og-default/i,
];

/**
 * Check if a URL matches known site logo/branding patterns.
 * Returns true if the URL likely points to a generic logo rather than article content.
 */
export function isKnownLogo(url: string): boolean {
  return LOGO_PATTERNS.some((pattern) => pattern.test(url));
}

// ── CDN patterns that skip HEAD validation ───────────────────────────────

const TRUSTED_CDN_PATTERNS = [
  /youtube\.com\/vi\//,
  /ytimg\.com\//,
  /tumblr\.com/,
  /bsky\.app/,
];

// ── og:image extraction ──────────────────────────────────────────────────

/**
 * Fetch article HTML and extract the og:image meta tag from the <head> section.
 *
 * Handles both attribute orders:
 *   <meta property="og:image" content="URL">
 *   <meta content="URL" property="og:image">
 *
 * If the og:image is a known logo, falls back to extractFirstArticleImage().
 * Returns the image URL or null.
 */
export async function extractOgImage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(articleUrl, {
      headers: { 'Accept': 'text/html' },
    }, 2); // Only 2 retries for thumbnail extraction

    const html = await response.text();

    // Only scan <head> to avoid parsing full document
    const headEnd = html.indexOf('</head>');
    const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 5000);

    // Match og:image in either attribute order
    const match =
      head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (match?.[1]) {
      if (isKnownLogo(match[1])) {
        // Fall back to first in-article image
        return extractFirstArticleImage(html);
      }
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ── First article image extraction ───────────────────────────────────────

/**
 * Extract the first <img> tag's src from HTML body content.
 * Skips images with explicit width/height attributes smaller than 100px.
 */
export function extractFirstArticleImage(html: string): string | null {
  // Try to only look at body content
  const bodyStart = html.indexOf('<body');
  const body = bodyStart > 0 ? html.slice(bodyStart) : html;

  // Match img tags with src attribute
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(body)) !== null) {
    const imgTag = match[0];
    const src = match[1];

    // Skip data URIs and tiny tracking pixels
    if (src.startsWith('data:')) continue;

    // Check for explicit small dimensions
    const widthMatch = imgTag.match(/width=["']?(\d+)/i);
    const heightMatch = imgTag.match(/height=["']?(\d+)/i);

    if (widthMatch && parseInt(widthMatch[1], 10) < 100) continue;
    if (heightMatch && parseInt(heightMatch[1], 10) < 100) continue;

    return src;
  }

  return null;
}

// ── Thumbnail URL validation ─────────────────────────────────────────────

/**
 * Validate a thumbnail URL by sending a HEAD request with a 3-second timeout.
 * Returns true if the response is OK and content-type starts with image/.
 * Skips validation for known CDN patterns (YouTube, Tumblr, Bluesky).
 */
export async function validateThumbnail(url: string): Promise<boolean> {
  // Skip validation for trusted CDNs
  if (TRUSTED_CDN_PATTERNS.some((pattern) => pattern.test(url))) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'bts-army-feed/2.0 (thumbnail validator)' },
    });

    return response.ok && (response.headers.get('content-type')?.startsWith('image/') ?? false);
  } catch {
    return false;
  }
}

// ── RSS feed item thumbnail extraction ───────────────────────────────────

/**
 * Extract image URL from an RSS feed item's media elements.
 *
 * Checks in order:
 * 1. item.enclosure.url (if type starts with image/)
 * 2. item['media:content'].$.url
 * 3. item['media:thumbnail'].$.url
 *
 * Returns the first match or null.
 */
export function extractRssThumbnail(item: any): string | null {
  // Check enclosure (standard RSS 2.0 media)
  if (item.enclosure?.url) {
    const type = item.enclosure.type || '';
    if (type.startsWith('image/') || !type) {
      return item.enclosure.url;
    }
  }

  // Check media:content
  const mediaContent = item['media:content'];
  if (mediaContent) {
    const url = mediaContent.$?.url || mediaContent?.url;
    if (url) return url;
  }

  // Check media:thumbnail
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const url = mediaThumbnail.$?.url || mediaThumbnail?.url;
    if (url) return url;
  }

  return null;
}
