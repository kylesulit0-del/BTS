# Phase 3: Short-Form Video - Research

**Researched:** 2026-02-25
**Domain:** Video embed (YouTube Shorts, TikTok) with scroll-driven autoplay in React SPA
**Confidence:** HIGH

## Summary

Phase 3 embeds YouTube Shorts and TikTok videos directly in the feed with autoplay-on-scroll behavior. YouTube Shorts use the standard YouTube iframe embed with `aspect-ratio: 9/16` CSS and the YouTube IFrame Player API for programmatic play/pause via `postMessage`. TikTok uses a direct iframe player URL (`tiktok.com/player/v1/{id}`) with its own `postMessage` API for play/pause control. Both platforms support the same pattern: detect video URLs, extract IDs, render iframes with `IntersectionObserver`-driven autoplay.

The user wants sound on by default, but **all modern browsers block unmuted autoplay**. Chrome, Safari, and Firefox all require user interaction before unmuted playback. The implementation must start muted with autoplay, then unmute on first user tap. This is the only cross-browser viable approach -- attempting unmuted autoplay will silently fail or throw `NotAllowedError`.

**Primary recommendation:** Use native iframe embeds for both platforms (no third-party libraries). YouTube uses `youtube.com/embed/{id}` with `enablejsapi=1`. TikTok uses `tiktok.com/player/v1/{id}`. Both controlled via `postMessage`. A single `useVideoAutoplay` hook manages `IntersectionObserver` for scroll-based play/pause with one-video-at-a-time enforcement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Autoplay on scroll into view -- no click required to start
- Mini inline video scrubber for play/pause control
- Sound on by default
- Loop continuously when video ends
- Pause when scrolled off-screen, resume when scrolled back
- One video plays at a time -- starting a new video pauses any currently playing one
- Video stays within regular card container -- consistent with other feed cards
- Tall vertical card for 9:16 content -- full aspect ratio, no capping
- Full metadata displayed -- source badge, title, stats (overlaid or below video)
- Video type badge on cards -- "Shorts" or "TikTok" label (not a play icon overlay)
- Detect TikTok URLs in both Reddit link posts and post body/selftext
- Handle all TikTok URL formats: tiktok.com/@user/video/ID, vm.tiktok.com/abc, short-link redirects
- Also add YouTube channels that post BTS TikTok compilations as feed sources
- Fallback when TikTok embed fails: link card with TikTok thumbnail image + title + external link to open in TikTok
- Platform thumbnails from YouTube/TikTok APIs (not Reddit thumbnails)
- While iframe loads: keep showing thumbnail with a loading spinner overlay
- Autoplay only -- no manual play trigger needed

### Claude's Discretion
- Intersection Observer threshold for triggering autoplay
- Exact scrubber/controls styling
- TikTok thumbnail API approach (oEmbed, scraping, or proxy)
- YouTube Shorts detection regex for URL patterns
- Which BTS TikTok compilation YouTube channels to add

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EMBED-01 | YouTube Shorts detected and rendered in 9:16 vertical aspect ratio iframe | YouTube Shorts URL regex pattern, CSS `aspect-ratio: 9/16`, standard YouTube embed iframe with `enablejsapi=1` for programmatic control |
| EMBED-02 | TikTok URLs detected in Reddit posts and rendered as lazy-loaded embed players | TikTok URL regex for all formats, Reddit `url_overridden_by_dest` + `selftext` fields for detection, TikTok `player/v1/{id}` iframe, CORS proxy for oEmbed thumbnail fallback |
| EMBED-03 | Video embeds use click-to-load pattern (thumbnail + play overlay, load iframe on click) | **NOTE: User decisions override this requirement.** User explicitly chose autoplay-on-scroll, no click required. Implementation uses IntersectionObserver-driven autoplay instead of click-to-load. Thumbnail shown as loading placeholder while iframe loads, not as a click target. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| YouTube IFrame Player API | current | Programmatic play/pause/mute of YouTube embeds | Official Google API, loaded via `enablejsapi=1` param, postMessage-based control |
| TikTok Embed Player | current | Direct iframe video player for TikTok | Official TikTok player at `tiktok.com/player/v1/{id}`, postMessage API for play/pause/mute |
| IntersectionObserver | Web API | Detect when video cards enter/leave viewport | Built-in browser API, no library needed, already used in SwipeFeed component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No additional dependencies required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native iframe + postMessage | react-social-media-embed | Adds dependency, abstracts away control needed for autoplay management, React 19 compat unverified (flagged in STATE.md) |
| Native iframe + postMessage | lite-youtube / lite-tiktok web components | Designed for click-to-load pattern, conflicts with autoplay-on-scroll requirement |
| TikTok player/v1 iframe | TikTok blockquote + embed.js | embed.js has SPA re-initialization issues, no programmatic play/pause API, harder to control in React |

**Installation:**
```bash
# No new dependencies needed -- all native browser APIs and platform iframe embeds
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── FeedCard.tsx          # Modified: detect video items, render VideoEmbed
│   ├── VideoEmbed.tsx        # NEW: unified video embed component (YT Shorts + TikTok)
│   └── SwipeFeed.tsx         # Modified: integrate VideoEmbed for swipe view
├── hooks/
│   └── useVideoAutoplay.ts   # NEW: IntersectionObserver + one-at-a-time enforcement
├── services/
│   └── sources/
│       └── reddit.ts         # Modified: extract TikTok URLs from posts
├── utils/
│   └── videoDetect.ts        # NEW: URL detection, ID extraction, platform classification
├── types/
│   └── feed.ts               # Modified: add videoType, videoId fields to FeedItem
└── config/
    └── groups/bts/
        └── sources.ts        # Modified: add TikTok compilation YouTube channels
```

### Pattern 1: Video URL Detection & FeedItem Enrichment
**What:** During feed item creation (in reddit.ts fetcher), detect YouTube Shorts and TikTok URLs and enrich FeedItem with `videoType` and `videoId` fields.
**When to use:** Every Reddit post is checked for video URLs during fetch.
**Example:**
```typescript
// src/utils/videoDetect.ts

export type VideoType = 'youtube-short' | 'tiktok' | null;

interface VideoInfo {
  videoType: VideoType;
  videoId: string;
}

// YouTube Shorts: youtube.com/shorts/{11-char-id}
const YT_SHORTS_RE = /(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/i;

// TikTok full URL: tiktok.com/@user/video/{numeric-id}
const TIKTOK_FULL_RE = /tiktok\.com\/@[^/]+\/video\/(\d+)/i;

// TikTok short links: vm.tiktok.com/xxx or vt.tiktok.com/xxx
const TIKTOK_SHORT_RE = /(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/i;

export function detectVideo(url: string, selftext?: string): VideoInfo | null {
  const text = `${url} ${selftext || ''}`;

  // Check YouTube Shorts
  const ytMatch = text.match(YT_SHORTS_RE);
  if (ytMatch) return { videoType: 'youtube-short', videoId: ytMatch[1] };

  // Check TikTok full URL
  const ttFullMatch = text.match(TIKTOK_FULL_RE);
  if (ttFullMatch) return { videoType: 'tiktok', videoId: ttFullMatch[1] };

  // Check TikTok short URL -- can't resolve to video ID client-side
  // Store the short URL path as ID; resolve via oEmbed proxy at render time
  const ttShortMatch = text.match(TIKTOK_SHORT_RE);
  if (ttShortMatch) return { videoType: 'tiktok', videoId: ttShortMatch[0] };

  return null;
}
```

### Pattern 2: Unified VideoEmbed Component
**What:** A single React component that renders either YouTube Shorts or TikTok iframes based on `videoType`, with consistent loading state (thumbnail + spinner).
**When to use:** Rendered inside FeedCard when `item.videoType` is present.
**Example:**
```typescript
// src/components/VideoEmbed.tsx (simplified structure)

interface VideoEmbedProps {
  videoType: 'youtube-short' | 'tiktok';
  videoId: string;
  title: string;
  thumbnail?: string;
}

export default function VideoEmbed({ videoType, videoId, title, thumbnail }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  // useVideoAutoplay handles IntersectionObserver + play/pause
  useVideoAutoplay(containerRef, iframeRef, videoType);

  const src = videoType === 'youtube-short'
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&mute=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&controls=1`
    : `https://www.tiktok.com/player/v1/${videoId}?autoplay=0&loop=1&controls=1&music_info=0&description=0`;

  return (
    <div ref={containerRef} className="video-embed" style={{ aspectRatio: '9 / 16' }}>
      {!loaded && thumbnail && (
        <div className="video-embed-placeholder">
          <img src={thumbnail} alt="" />
          <div className="video-embed-spinner" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        allow="autoplay; encrypted-media"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
```

### Pattern 3: IntersectionObserver + One-at-a-Time Autoplay
**What:** A React hook that observes video containers, plays the most-visible one, pauses all others.
**When to use:** Every VideoEmbed instance registers with this hook.
**Example:**
```typescript
// src/hooks/useVideoAutoplay.ts (core logic)

// Module-level set tracks all active video iframes
const activeVideos = new Set<HTMLIFrameElement>();
let currentlyPlaying: HTMLIFrameElement | null = null;

function sendCommand(iframe: HTMLIFrameElement, type: 'youtube-short' | 'tiktok', command: string) {
  if (type === 'youtube-short') {
    // YouTube postMessage format
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command }),
      '*'
    );
  } else {
    // TikTok postMessage format
    iframe.contentWindow?.postMessage(
      { type: command, 'x-tiktok-player': true },
      '*'
    );
  }
}

export function useVideoAutoplay(
  containerRef: RefObject<HTMLDivElement>,
  iframeRef: RefObject<HTMLIFrameElement>,
  videoType: 'youtube-short' | 'tiktok'
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Pause currently playing video
          if (currentlyPlaying && currentlyPlaying !== iframe) {
            // Determine type of currently playing and pause it
            sendCommand(currentlyPlaying, /* stored type */, 'pauseVideo' /* or 'pause' */);
          }
          currentlyPlaying = iframe;
          sendCommand(iframe, videoType, videoType === 'youtube-short' ? 'playVideo' : 'play');
        } else if (currentlyPlaying === iframe) {
          sendCommand(iframe, videoType, videoType === 'youtube-short' ? 'pauseVideo' : 'pause');
          currentlyPlaying = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, iframeRef, videoType]);
}
```

### Pattern 4: TikTok Short URL Handling
**What:** TikTok short links (`vm.tiktok.com/xxx`, `vt.tiktok.com/xxx`) cannot be resolved to video IDs client-side (redirect requires server-side HTTP follow). Two approaches:
**Approach A (Recommended):** Use CORS proxy to fetch the redirect URL, extract video ID from the final URL.
**Approach B (Fallback):** Store the full short URL and render as a fallback link card (thumbnail + external link to TikTok).
**Example:**
```typescript
// Resolving short URL via CORS proxy
async function resolveTikTokShortUrl(shortUrl: string): Promise<string | null> {
  try {
    // CORS proxy follows redirects and returns final page
    const html = await fetchWithProxy(shortUrl);
    // Extract canonical URL or video ID from response
    const match = html.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null; // Fallback to link card
  }
}
```

### Anti-Patterns to Avoid
- **Loading TikTok embed.js in a React SPA:** The script initializes on load and has no public API for re-processing dynamically added DOM nodes. It also provides no postMessage control for play/pause. Use the `player/v1` iframe instead.
- **Attempting unmuted autoplay:** All browsers block this. Start muted, unmute on user interaction. Attempting `play()` with sound will throw `NotAllowedError`.
- **Creating one IntersectionObserver per video:** Creates N observers. Instead, use a single observer that tracks all video containers, or one per component with module-level coordination.
- **Using YouTube `autoplay=1` parameter:** This auto-plays on iframe load regardless of scroll position. Instead, use `autoplay=0` and trigger play via postMessage when IntersectionObserver fires.
- **Fetching TikTok oEmbed from client-side without CORS proxy:** The TikTok oEmbed endpoint (`tiktok.com/oembed`) does NOT return `Access-Control-Allow-Origin` headers. Verified by testing: no CORS header present. Must use CORS proxy for thumbnail/metadata fetching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube iframe control | Custom YouTube JS wrapper | `postMessage` with `enablejsapi=1` | Google's official iframe API protocol, well-documented |
| TikTok iframe control | Custom TikTok integration | `postMessage` with `x-tiktok-player` flag | TikTok's official embed player API, documented at developers.tiktok.com |
| Scroll detection | Custom scroll event listeners | `IntersectionObserver` | Built-in, performant, already used in project's SwipeFeed |
| URL pattern matching | Manual string parsing | Regex patterns (documented below) | URL formats are well-defined, regex is reliable |
| CORS proxy | Custom proxy server | Existing `fetchWithProxy` utility | Already in project, handles parallel proxy attempts |

**Key insight:** Both YouTube and TikTok provide official iframe + postMessage APIs. The only custom code needed is the glue: URL detection, IntersectionObserver coordination, and FeedItem type enrichment.

## Common Pitfalls

### Pitfall 1: Unmuted Autoplay Blocked by Browsers
**What goes wrong:** Videos appear to play but no sound, or `play()` promise rejects silently.
**Why it happens:** Chrome, Safari, and Firefox all block unmuted autoplay without prior user interaction. Chrome's Media Engagement Index (MEI) may allow it on frequently visited sites, but this can't be relied upon.
**How to avoid:** Always start with `mute=1` (YouTube) or `mute` command (TikTok). Show a visible "tap to unmute" indicator. On first user tap anywhere on the page, unmute all future videos. Store unmuted preference in state.
**Warning signs:** Video plays with no audio; `NotAllowedError` in console; `play()` promise rejection.

### Pitfall 2: YouTube Shorts Loop Requires `playlist` Parameter
**What goes wrong:** Setting `loop=1` on YouTube embed does nothing for single videos.
**Why it happens:** YouTube's loop parameter only works when `playlist` is also set to the same video ID for single-video embeds.
**How to avoid:** Always include `playlist={videoId}` alongside `loop=1` in the embed URL.
**Warning signs:** Video plays once and stops instead of looping.

### Pitfall 3: TikTok Short URLs Can't Be Resolved Client-Side
**What goes wrong:** `vm.tiktok.com` and `vt.tiktok.com` URLs redirect via HTTP 301/302, but `fetch()` can't follow cross-origin redirects to extract the final URL.
**Why it happens:** Browser same-origin policy prevents reading redirect responses from different origins. The redirect chain goes through TikTok's tracking servers.
**How to avoid:** Use CORS proxy to follow the redirect chain, or accept that short URLs render as fallback link cards rather than embedded players.
**Warning signs:** Blank embed, CORS error in console, iframe fails to load.

### Pitfall 4: Multiple iframes Competing for Resources
**What goes wrong:** Page becomes sluggish with many video embeds loaded simultaneously.
**Why it happens:** Each YouTube/TikTok iframe loads its own player JS, creates its own media context. 10+ iframes degrade mobile performance significantly.
**How to avoid:** Lazy-load iframes -- only create the `<iframe>` element when the card enters or nears the viewport. Show thumbnail placeholder until intersection threshold is met. Consider destroying iframes that scroll far off-screen.
**Warning signs:** High memory usage, janky scrolling, slow frame rates on mobile.

### Pitfall 5: iOS Safari `playsinline` Requirement
**What goes wrong:** Videos go fullscreen on iOS instead of playing inline in the card.
**Why it happens:** iOS Safari defaults to fullscreen video playback. The `playsinline` attribute must be explicitly set.
**How to avoid:** Add `playsinline=1` to YouTube embed URL parameters. For TikTok, the player/v1 iframe handles this internally.
**Warning signs:** Tapping a video takes over the full screen on iPhone.

### Pitfall 6: PostMessage Timing with Iframe Load
**What goes wrong:** `postMessage` commands sent before the iframe's player is ready are silently dropped.
**Why it happens:** The YouTube/TikTok player inside the iframe takes time to initialize. Commands sent during initialization are lost.
**How to avoid:** For YouTube, listen for `onReady` event via `postMessage` before sending commands. For TikTok, listen for `onPlayerReady` event. Queue commands until ready event fires.
**Warning signs:** First play command doesn't work; video starts on second scroll-in.

## Code Examples

### YouTube Shorts URL Detection
```typescript
// Matches: youtube.com/shorts/VIDEO_ID, m.youtube.com/shorts/VIDEO_ID
const YT_SHORTS_RE = /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i;

function isYouTubeShort(url: string): string | null {
  const match = url.match(YT_SHORTS_RE);
  return match ? match[1] : null;
}
// Source: regex101.com community patterns + YouTube URL spec (11-char video IDs)
```

### TikTok URL Detection (All Formats)
```typescript
// Full URL: tiktok.com/@user/video/1234567890123456789
const TIKTOK_FULL_RE = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i;

// Short URLs: vm.tiktok.com/xxx or vt.tiktok.com/xxx
const TIKTOK_SHORT_RE = /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)\/?/i;

function detectTikTokUrl(text: string): { videoId: string; isShortUrl: boolean } | null {
  const fullMatch = text.match(TIKTOK_FULL_RE);
  if (fullMatch) return { videoId: fullMatch[1], isShortUrl: false };

  const shortMatch = text.match(TIKTOK_SHORT_RE);
  if (shortMatch) return { videoId: shortMatch[0], isShortUrl: true };

  return null;
}
// Source: TikTok URL format documentation, community regex patterns
```

### YouTube Embed with Full Control Parameters
```typescript
// Source: developers.google.com/youtube/player_parameters
function buildYouTubeShortsUrl(videoId: string): string {
  const params = new URLSearchParams({
    enablejsapi: '1',    // Enable postMessage control
    autoplay: '0',       // We control play via postMessage
    mute: '1',           // Required for autoplay in all browsers
    loop: '1',           // Loop continuously
    playlist: videoId,   // Required for loop to work on single videos
    playsinline: '1',    // Inline on iOS (not fullscreen)
    rel: '0',            // Related videos from same channel only
    controls: '1',       // Show player controls (scrubber)
    modestbranding: '0', // Deprecated, no effect
  });
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}
```

### TikTok Embed Player URL
```typescript
// Source: developers.tiktok.com/doc/embed-player
function buildTikTokPlayerUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '0',            // We control play via postMessage
    loop: '1',                // Loop continuously
    controls: '1',            // Show controls
    progress_bar: '1',        // Show progress/scrubber bar
    play_button: '1',         // Show play button
    volume_control: '1',      // Show volume control
    music_info: '0',          // Hide music info (cleaner look)
    description: '0',         // Hide description overlay
    rel: '0',                 // Hide related videos
    native_context_menu: '1', // Keep native context menu
  });
  return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
}
```

### PostMessage Control for Both Platforms
```typescript
// Source: developers.google.com/youtube/iframe_api_reference
// Source: developers.tiktok.com/doc/embed-player
function playVideo(iframe: HTMLIFrameElement, type: 'youtube-short' | 'tiktok') {
  if (type === 'youtube-short') {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      'https://www.youtube.com'
    );
  } else {
    iframe.contentWindow?.postMessage(
      { type: 'play', 'x-tiktok-player': true },
      'https://www.tiktok.com'
    );
  }
}

function pauseVideo(iframe: HTMLIFrameElement, type: 'youtube-short' | 'tiktok') {
  if (type === 'youtube-short') {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
      'https://www.youtube.com'
    );
  } else {
    iframe.contentWindow?.postMessage(
      { type: 'pause', 'x-tiktok-player': true },
      'https://www.tiktok.com'
    );
  }
}

function muteVideo(iframe: HTMLIFrameElement, type: 'youtube-short' | 'tiktok') {
  if (type === 'youtube-short') {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'mute', args: [] }),
      'https://www.youtube.com'
    );
  } else {
    iframe.contentWindow?.postMessage(
      { type: 'mute', 'x-tiktok-player': true },
      'https://www.tiktok.com'
    );
  }
}
```

### TikTok Thumbnail via CORS Proxy
```typescript
// TikTok oEmbed does NOT have CORS headers (verified 2026-02-25)
// Must use existing fetchWithProxy to get thumbnail
async function getTikTokThumbnail(videoUrl: string): Promise<string | undefined> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const text = await fetchWithProxy(oembedUrl);
    const data = JSON.parse(text);
    return data.thumbnail_url; // 720x1280 image
  } catch {
    return undefined;
  }
}
```

### FeedItem Type Extension
```typescript
// Addition to src/types/feed.ts
export type VideoType = 'youtube-short' | 'tiktok';

export interface FeedItem {
  // ... existing fields
  videoType?: VideoType;
  videoId?: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TikTok blockquote + embed.js | TikTok `player/v1/{id}` direct iframe | 2024 | Full postMessage API, programmatic control, no SPA re-init issues |
| YouTube `modestbranding=1` | Deprecated, no effect | Aug 2023 | Remove from embed params, doesn't do anything |
| Click-to-load pattern | IntersectionObserver lazy-load + autoplay | 2023+ | Better UX for feed-style apps; click-to-load feels dated for social feeds |
| `react-social-media-embed` for TikTok | Native TikTok player/v1 iframe | 2024 | No dependency, full control, no React 19 compat concerns |

**Deprecated/outdated:**
- `modestbranding` YouTube parameter: Deprecated August 2023, has no effect
- TikTok blockquote + embed.js: Still works but `player/v1` is superior for SPAs (programmatic control, no DOM re-processing)
- `react-social-media-embed`: Unnecessary now that TikTok has official iframe player with postMessage API

## Design Recommendations (Claude's Discretion)

### Intersection Observer Threshold
**Recommendation:** `threshold: 0.5` (50% visibility).
**Rationale:** 0.3 is too aggressive (plays too early), 0.7 is too conservative (user scrolls past). 0.5 matches the "center of viewport" heuristic used by Instagram and TikTok native apps. The SwipeFeed component already uses 0.5 threshold successfully.

### TikTok Thumbnail Approach
**Recommendation:** Use oEmbed API via CORS proxy (`fetchWithProxy`).
**Rationale:** The oEmbed endpoint returns `thumbnail_url` (720x1280) which is perfect for 9:16 vertical display. The CORS proxy infrastructure already exists. No scraping needed. Fetch thumbnails during feed item creation in the Reddit fetcher.

### YouTube Shorts Detection Regex
**Recommendation:** `youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})`
**Rationale:** YouTube Shorts URLs always follow the pattern `youtube.com/shorts/{11-char-id}`. This is distinct from regular YouTube videos (`watch?v=` or `youtu.be/`). The existing YouTube fetcher already handles regular video URLs. The Atom feed from YouTube channels includes the video link as `youtube.com/watch?v=ID`, so Shorts detection applies only to URLs found in Reddit posts.

### Scrubber/Controls Styling
**Recommendation:** Let the native platform controls handle this. Both YouTube and TikTok iframe players have built-in controls (progress bar, play/pause). Use `controls=1` for both. This avoids building a custom scrubber overlay that would need to sync with two different player APIs.

### Sound-On Strategy
**Recommendation:** Start muted (browser requirement), show a small mute icon overlay on the video. On first user tap anywhere on the video card, unmute via postMessage and hide the icon. Store preference in component state (not localStorage -- sound preference resets per session for safety).

### BTS TikTok Compilation YouTube Channels
**Research finding:** This requires manual curation of active channels. Should be deferred to planning phase where specific channels can be identified and configured with `needsFilter` appropriately. The channel config follows the existing `sources.ts` pattern exactly.

## Open Questions

1. **TikTok short URL resolution reliability**
   - What we know: `vm.tiktok.com` and `vt.tiktok.com` URLs redirect via HTTP 301/302 to full URLs. CORS proxy can follow these redirects.
   - What's unclear: Whether CORS proxies (allorigins, codetabs, corsproxy.io) reliably follow TikTok's redirect chain. TikTok may rate-limit or block proxy IPs.
   - Recommendation: Implement short URL resolution via CORS proxy as primary path. Fall back to link card (external link to TikTok) if resolution fails. Test during implementation.

2. **TikTok embed player CORS/iframe restrictions**
   - What we know: The `tiktok.com/player/v1/{id}` iframe is designed for embedding and should work cross-origin.
   - What's unclear: Whether TikTok applies `X-Frame-Options` or CSP restrictions that might block embedding from localhost or Cloudflare tunnel domains.
   - Recommendation: Test early in implementation. If blocked, fall back to TikTok oEmbed blockquote approach or link card.

3. **YouTube postMessage `onReady` event format**
   - What we know: YouTube iframe API fires an `onReady` event via postMessage when the player is initialized.
   - What's unclear: The exact postMessage format for detecting readiness without loading the full YouTube IFrame API JS library (just using raw postMessage).
   - Recommendation: Send a `listening` postMessage first, then wait for state change events. If timing issues occur, add a small delay (500ms) before first play command as fallback.

## Sources

### Primary (HIGH confidence)
- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference) - postMessage control, player parameters
- [YouTube Player Parameters](https://developers.google.com/youtube/player_parameters) - embed URL parameters, autoplay, loop, playsinline
- [TikTok Embed Player Documentation](https://developers.tiktok.com/doc/embed-player) - player/v1 URL format, postMessage API, query parameters
- [TikTok oEmbed API Documentation](https://developers.tiktok.com/doc/embed-videos/) - oEmbed endpoint, response format, thumbnail URL
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) - autoplay restrictions, mute requirement, MEI

### Secondary (MEDIUM confidence)
- [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) - cross-browser autoplay policies
- [LogRocket: TikTok Autoplay React Hook](https://blog.logrocket.com/build-custom-tiktok-autoplay-react-hook-intersection-observer/) - IntersectionObserver pattern for video autoplay
- TikTok oEmbed CORS verification: Tested manually 2026-02-25, `curl -sI -H "Origin: https://example.com" https://www.tiktok.com/oembed?url=...` returns no `Access-Control-Allow-Origin` header

### Tertiary (LOW confidence)
- BTS TikTok compilation YouTube channels: Requires manual curation, no automated discovery method verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - YouTube and TikTok both have official, documented iframe embed APIs with postMessage control
- Architecture: HIGH - Pattern is straightforward: URL detection + iframe + IntersectionObserver. All pieces are well-understood and already partially exist in codebase (SwipeFeed has YouTube iframe, IntersectionObserver)
- Pitfalls: HIGH - Browser autoplay policies are extremely well-documented; TikTok CORS limitation verified manually
- TikTok short URL resolution: MEDIUM - Approach is sound but depends on CORS proxy behavior with TikTok redirects

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days -- stable APIs, unlikely to change)
