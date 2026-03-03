# Phase 10: Snap Feed Core - Research

**Researched:** 2026-03-03
**Domain:** CSS scroll-snap vertical feed, DOM virtualization, video iframe management, bottom sheet overlays, touch gestures
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Card visual design:** Image posts: cropped hero image top ~60%, dark panel below with title and metadata. Title sits in dark panel (not overlaid on image). Text-heavy posts: left-aligned article style, title at top, body text below, comfortable line width.
- **Metadata shown:** Full details -- source icon, title, author/subreddit, relative timestamp, score/upvotes, comment count. Two rows at bottom: title on first row, author/score/time/comments on second row.
- **Source link icon:** Top-right corner, small, always visible. Tapping opens original in new tab.
- **Source distinction:** Colored source icon only (reddit orange, youtube red, etc), otherwise same card layout.
- **Title font size:** Medium/subtitle -- clear but not dominant.
- **Snap type:** Hard mandatory snap, always snaps to exactly one post. Each flick advances exactly one post regardless of velocity.
- **No position indicator, no pull-to-refresh, no haptic feedback.**
- **End of feed:** Seamless loop back to first post, no visual indication of wrapping, fixed order on loop.
- **Few posts edge case:** Show what's available even if fewer than DOM window size, loop still works.
- **Preload adjacent:** Always have next/prev content ready, no visible loading between snaps.
- **Horizontal swipe:** Right-swipe only to open source link in new tab. Left-swipe does nothing. Slide-out animation: card slides right with colored background, opens link when threshold hit (no URL preview during slide).
- **DOM virtualization:** Configurable constant, default to 5 items.
- **Video autoplay:** Sound on by default when snapped into view. Pause when scrolled away. At most one video iframe in DOM. Tap anywhere on video card to toggle play/pause. Mute/unmute icon in bottom-right corner. Thin progress bar at bottom of video card. Loading state: thumbnail background with spinner overlay.
- **See More overlay:** 5-line truncation. Inline text link "...See More" appended. Bottom sheet slides up from bottom, covers ~80% screen, swipe down to dismiss. Full text only in overlay.

### Claude's Discretion
- Feed ordering strategy (chronological vs interleaved by source)
- Exact animation easing curves and durations (matching TikTok feel)
- Loading skeleton design for initial feed load
- Error state handling
- Exact spacing, typography scale, and color values
- Slide-out animation threshold distance and background color

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SNAP-01 | Full-viewport vertical snap feed where each post fills the screen (100svh) | CSS scroll-snap-type: y mandatory + scroll-snap-align: start + scroll-snap-stop: always on items sized to 100svh. Use 100svh with 100vh fallback per STATE.md decision. |
| SNAP-02 | User can flick/scroll to snap to the next content piece | scroll-snap-stop: always ensures one-at-a-time advancement. Browser-native scroll physics handle deceleration/snap animation. |
| SNAP-03 | Adaptive card layouts -- video gets full-bleed player, image gets large background with overlay, text gets reading-focused layout | Card type discriminator based on FeedItem fields: videoType/videoId -> video card, thumbnail -> image card, else text card. Three CSS layout variants in single component. |
| SNAP-04 | Only N items rendered in DOM at any time (current/prev/next) for performance | Manual DOM window: maintain currentIndex, render items[i-2..i+2] (configurable window=5). Update window on snap detection via IntersectionObserver. |
| SNAP-05 | Long text collapsed with "See More" that opens modal/drawer overlay | CSS -webkit-line-clamp: 5 for truncation. Detect overflow via scrollHeight > clientHeight. Bottom sheet overlay (hand-rolled with CSS transforms, no library needed). |
| SNAP-06 | Tap source link icon to navigate to original content in new tab | Small icon button in top-right of each card. window.open(item.url, '_blank'). Also accessible via right-swipe gesture. |
| SNAP-07 | Videos autoplay when snapped into view and pause when scrolled away | Extend existing useVideoAutoplay hook. IntersectionObserver threshold 0.5 triggers play/pause via postMessage. Must autoplay muted first (browser policy), then unmute after user interaction. |
| PERF-01 | At most one video iframe exists in the DOM at any time | Only the currently-snapped video card renders an iframe. All other video cards show thumbnail facade. Module-level singleton tracking (already exists in useVideoAutoplay). |
</phase_requirements>

## Summary

This phase replaces the existing feed views (list + swipe) with a TikTok-style immersive vertical snap feed. The core technical challenge is building a full-viewport scroll-snap feed with DOM virtualization, adaptive card layouts, inline video playback, and gesture interactions -- all without adding external dependencies.

The implementation uses exclusively browser-native APIs: CSS `scroll-snap-type: y mandatory` for snap physics, `scroll-snap-stop: always` for one-at-a-time advancement, `IntersectionObserver` for snap detection and video autoplay, and native touch events for the horizontal swipe gesture. No animation libraries are needed for the core scroll behavior -- the browser's compositor thread handles it natively, which is both smoother and more performant than any JS-driven alternative.

The main complexity lies in the DOM virtualization layer. The project has already decided against TanStack Virtual (documented scroll-snap incompatibility) and against Framer Motion for scroll physics (cross-browser flickering). A manual "sliding window" approach renders only N items (configurable, default 5) around the current index, dynamically adding/removing DOM nodes as the user scrolls. This requires careful management of scroll position to avoid visual jumps when the DOM changes.

**Primary recommendation:** Build the snap feed container with pure CSS scroll-snap, a manual 5-item DOM window managed via IntersectionObserver-based index tracking, and three card layout variants (video/image/text) as a single SnapCard component with conditional rendering.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS scroll-snap | Native | Snap physics, mandatory snapping | Browser-native, compositor-thread, zero JS overhead. Already used in existing SwipeFeed. |
| IntersectionObserver | Native | Detect snapped item, trigger video autoplay | Universal browser support (97%+). Already used in SwipeFeed and useVideoAutoplay. |
| CSS -webkit-line-clamp | Native | Multi-line text truncation | Universal support. Already used in existing feed cards. |
| Touch Events API | Native | Horizontal swipe gesture detection | Universal on mobile. No library needed for single-axis swipe. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | -- | -- | This phase requires zero new dependencies. All functionality is achievable with browser-native APIs and React 19. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual DOM window | TanStack Virtual | TanStack Virtual has documented scroll-snap incompatibility (STATE.md decision). Manual approach is simpler for fixed-height items. |
| CSS scroll-snap | Framer Motion drag | Motion cannot control native scroll position; causes cross-browser flickering with scroll-snap (STATE.md decision). |
| Hand-rolled bottom sheet | vaul (npm) | vaul is 184KB, depends on Radix Dialog. Overkill for a single "See More" bottom sheet. CSS transforms + touch events sufficient. |
| IntersectionObserver | scrollsnapchange event | scrollsnapchange not supported in Safari or Firefox as of March 2026. IntersectionObserver is universal. |
| IntersectionObserver | scrollend event | scrollend supported in Safari 26.2+ (Dec 2025). Viable but IntersectionObserver is more battle-tested and already in codebase. Use scrollend as supplementary signal if needed. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── snap/                    # NEW: Snap feed components
│   │   ├── SnapFeed.tsx         # Container: scroll-snap, DOM window, index tracking
│   │   ├── SnapCard.tsx         # Card shell: 100svh, layout discriminator
│   │   ├── SnapCardImage.tsx    # Image layout: hero image + dark panel
│   │   ├── SnapCardVideo.tsx    # Video layout: full-bleed player + metadata
│   │   ├── SnapCardText.tsx     # Text layout: article-style reading
│   │   ├── SeeMoreSheet.tsx     # Bottom sheet overlay for full text
│   │   └── SwipeGesture.tsx     # Right-swipe gesture handler (HOC or wrapper)
│   ├── VideoEmbed.tsx           # EXISTING: reused for iframe rendering
│   └── ...
├── hooks/
│   ├── useSnapFeed.ts           # NEW: DOM window + index management
│   ├── useSwipeGesture.ts       # NEW: horizontal swipe detection
│   ├── useVideoAutoplay.ts      # EXISTING: extended for snap feed video control
│   └── ...
├── config/
│   └── snap.ts                  # NEW: configurable constants (DOM_WINDOW_SIZE, etc.)
└── ...
```

### Pattern 1: CSS Scroll-Snap Container
**What:** Full-viewport scroll-snap container with mandatory vertical snapping
**When to use:** The SnapFeed container component
**Example:**
```css
/* Source: MDN scroll-snap-type, verified via web search */
.snap-feed {
  height: 100svh; /* Small viewport height -- stable on mobile */
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain; /* Prevent scroll chaining to parent */
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

/* Fallback for browsers without svh support */
@supports not (height: 100svh) {
  .snap-feed {
    height: 100vh;
  }
}

.snap-card {
  height: 100svh;
  scroll-snap-align: start;
  scroll-snap-stop: always; /* One item at a time */
}

@supports not (height: 100svh) {
  .snap-card {
    height: 100vh;
  }
}
```

### Pattern 2: Manual DOM Window (Virtualization)
**What:** Render only N items around the current index, shifting the window as user scrolls
**When to use:** SnapFeed component to limit DOM nodes
**Example:**
```typescript
// Source: Project decision in STATE.md -- manual 3-item (expanded to 5) DOM window
const DOM_WINDOW_SIZE = 5; // Configurable

function getWindowedItems(items: FeedItem[], currentIndex: number): { item: FeedItem; realIndex: number }[] {
  const half = Math.floor(DOM_WINDOW_SIZE / 2);
  const result: { item: FeedItem; realIndex: number }[] = [];
  const len = items.length;

  for (let offset = -half; offset <= half; offset++) {
    // Wrap around for seamless looping
    const idx = ((currentIndex + offset) % len + len) % len;
    result.push({ item: items[idx], realIndex: idx });
  }
  return result;
}
```

### Pattern 3: IntersectionObserver for Snap Detection
**What:** Detect which card is currently snapped/visible to update currentIndex
**When to use:** Inside useSnapFeed hook
**Example:**
```typescript
// Source: Existing codebase pattern (SwipeFeed.tsx, useVideoAutoplay.ts)
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const el = entry.target as HTMLElement;
          const index = Number(el.dataset.index);
          if (!isNaN(index)) {
            setCurrentIndex(index);
          }
        }
      }
    },
    { root: container, threshold: 0.6 }
  );

  // Observe all rendered snap cards
  container.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}, [windowedItems]); // Re-observe when window shifts
```

### Pattern 4: Card Type Discriminator
**What:** Determine card layout from FeedItem data
**When to use:** SnapCard component
**Example:**
```typescript
type CardVariant = 'video' | 'image' | 'text';

function getCardVariant(item: FeedItem): CardVariant {
  // Video: has videoType + videoId, or is a YouTube URL
  if (item.videoType && item.videoId) return 'video';
  if (item.source === 'youtube') return 'video';

  // Image: has a thumbnail
  if (item.thumbnail) return 'image';

  // Text: everything else
  return 'text';
}
```

### Pattern 5: Horizontal Swipe Gesture
**What:** Detect right-swipe to open source link
**When to use:** Each snap card
**Example:**
```typescript
// Source: Native Touch Events API
function useSwipeGesture(onSwipeRight: () => void, threshold = 100) {
  const startX = useRef(0);
  const startY = useRef(0);
  const deltaX = useRef(0);

  const handlers = useMemo(() => ({
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      deltaX.current = 0;
    },
    onTouchMove: (e: React.TouchEvent) => {
      deltaX.current = e.touches[0].clientX - startX.current;
      const deltaY = Math.abs(e.touches[0].clientY - startY.current);
      // Only track horizontal movement if it dominates vertical
      if (Math.abs(deltaX.current) > deltaY * 1.5) {
        // Could apply visual transform here for slide-out preview
      }
    },
    onTouchEnd: () => {
      if (deltaX.current > threshold) {
        onSwipeRight();
      }
    },
  }), [onSwipeRight, threshold]);

  return handlers;
}
```

### Pattern 6: Bottom Sheet (See More Overlay)
**What:** CSS-driven bottom sheet that slides up, covers ~80% of screen, dismissible by swipe-down or tap-outside
**When to use:** SeeMoreSheet component
**Example:**
```css
.see-more-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.see-more-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  z-index: 201;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  overflow-y: auto;
  padding: 24px 16px;
}

.see-more-sheet.open {
  transform: translateY(0);
}

.see-more-sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 0 auto 16px;
}
```

### Anti-Patterns to Avoid
- **Rendering all items in DOM:** The existing SwipeFeed renders ALL items. With 100+ items at 100svh each, this destroys performance. Must virtualize.
- **Using scrollTo for window shifting:** When the DOM window shifts, using scrollTo causes visible jumps. Instead, adjust scroll position synchronously before React re-renders, or use a sentinel approach.
- **Mounting video iframes eagerly:** Each YouTube/TikTok iframe costs ~2-5MB memory and starts network requests. Only mount one iframe at a time -- all others show thumbnail facade.
- **Unmuted autoplay without user interaction:** Browser policy blocks unmuted autoplay. Must start muted, provide unmute control. The user decision says "sound on by default" but this is physically impossible without prior user interaction on the domain. Start muted, auto-unmute after first user tap on any video.
- **Using dvh for container height:** STATE.md explicitly forbids 100dvh (iOS Safari regression). Use 100svh with 100vh fallback.
- **Framer Motion for scroll physics:** Already decided against in STATE.md. Causes flickering with CSS scroll-snap.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll snap physics | Custom JS scroll animation | CSS `scroll-snap-type: y mandatory` | Browser compositor handles deceleration, overscroll, momentum. Any JS alternative will be janky on mobile. |
| One-at-a-time snap | JS velocity detection + scroll lock | CSS `scroll-snap-stop: always` | Native browser behavior. Supported since mid-2022 in all major browsers. |
| Video autoplay/pause | Custom scroll position calculations | IntersectionObserver (existing hook) | Already proven in codebase. Handles threshold, cleanup, edge cases. |
| Text truncation detection | Manual text measurement | CSS `-webkit-line-clamp` + `scrollHeight > clientHeight` check | Native CSS handles multi-line truncation; JS check detects overflow for "See More" visibility. |

**Key insight:** The browser's scroll-snap implementation is smoother than any JS-driven alternative because it runs on the compositor thread. The entire snap feed should be built on top of native CSS scroll-snap, with JS only handling state tracking and DOM virtualization.

## Common Pitfalls

### Pitfall 1: DOM Window Scroll Position Jumps
**What goes wrong:** When you add/remove DOM nodes at the edges of the virtualization window, the scroll position shifts and the user sees the feed jump.
**Why it happens:** Browser recalculates scroll offset when elements are added above the current scroll position.
**How to avoid:** Always maintain equal numbers of items above and below the current card (symmetric window). When shifting the window, adjust `scrollTop` by the exact height of the added/removed elements. Since all cards are 100svh (fixed height), the math is deterministic.
**Warning signs:** Visual "jump" or "flash" when scrolling quickly through the feed.

### Pitfall 2: Infinite Loop with Few Items
**What goes wrong:** With fewer items than the DOM window size (e.g., 3 items, window size 5), the modular arithmetic duplicates items in the DOM, causing duplicate keys and rendering bugs.
**Why it happens:** The wrapping logic `(currentIndex + offset) % len` repeats indices when `len < windowSize`.
**How to avoid:** When `items.length <= DOM_WINDOW_SIZE`, render all items without virtualization. Skip the windowing entirely -- just render the full list with looping handled by scroll position reset.
**Warning signs:** Duplicate React keys, items appearing twice in viewport.

### Pitfall 3: Browser Autoplay Policy vs "Sound On By Default"
**What goes wrong:** User decision says "sound on by default" but all modern browsers block unmuted autoplay without prior user interaction.
**Why it happens:** Chrome, Safari, and Firefox autoplay policies require either muted autoplay or prior user engagement (Media Engagement Index).
**How to avoid:** Start videos muted with autoplay. After the user's first interaction with any video (tap to toggle play/pause or tap unmute), set a session flag and auto-unmute subsequent videos. This matches TikTok's actual behavior -- first video is muted, subsequent ones respect the user's last mute state.
**Warning signs:** Videos start but produce no audio; console warnings about autoplay policy.

### Pitfall 4: Scroll-Snap + Touch Events Conflict
**What goes wrong:** Horizontal swipe gesture detection interferes with vertical scroll-snap, or vice versa.
**Why it happens:** Touch events don't have built-in axis locking. If horizontal swipe handler calls `preventDefault()` on vertical scroll, snap breaks.
**How to avoid:** In the touchmove handler, determine the dominant axis early (compare deltaX vs deltaY). Only claim the gesture as horizontal if `|deltaX| > |deltaY| * 1.5`. Never call `preventDefault()` on vertical-dominant touches. Apply a "dead zone" of ~10px before activating either axis.
**Warning signs:** Feed won't scroll vertically when touching a swipe-enabled area; or swipe gesture never triggers because vertical scroll captures first.

### Pitfall 5: IntersectionObserver + Virtualization Timing
**What goes wrong:** IntersectionObserver fires with stale entries after the DOM window shifts, causing the index to oscillate between old and new values.
**Why it happens:** Observer callbacks are asynchronous. When you shift the DOM window (add/remove items), the observer fires exit/enter events for the old items before the new items settle.
**How to avoid:** Use `data-index` attributes with the real item index (not the DOM position). Guard index updates: only accept an index if the observed element still exists in the current render. Consider debouncing index updates by 50-100ms.
**Warning signs:** Feed "bounces" between two positions; currentIndex flickers.

### Pitfall 6: Video Iframe Accumulation
**What goes wrong:** Multiple video iframes persist in the DOM as user scrolls through video-heavy feeds, consuming memory and bandwidth.
**Why it happens:** The existing VideoEmbed component keeps iframes mounted when `inView` was true. In a virtualized feed, old video cards may leave the window but the iframe lingers.
**How to avoid:** Only render the iframe for the card at `currentIndex` AND only if that card is a video card. All other video cards render as thumbnail facades. This is a stricter version of the existing `useVideoAutoplay` pattern.
**Warning signs:** Memory usage grows linearly as user scrolls; multiple video audio tracks play simultaneously.

## Code Examples

### Seamless Looping via Scroll Position Reset
```typescript
// When user reaches the end and scrolls past, reset to beginning
// This creates the illusion of infinite content
function handleScrollEnd(container: HTMLElement, totalItems: number, currentIndex: number) {
  // With DOM windowing + modular index, looping is implicit
  // The getWindowedItems function already wraps via modular arithmetic
  // No explicit scroll reset needed -- the window just shifts
}
```

### Detecting Text Overflow for "See More"
```typescript
// Source: MDN scrollHeight, existing codebase pattern
function useTextOverflow(ref: React.RefObject<HTMLElement | null>) {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check after render when line-clamp has been applied
    const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight);
    check();

    // Re-check on resize (font size changes, orientation change)
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return isOverflowing;
}
```

### Video Facade Pattern (PERF-01)
```typescript
// Only the currently-active video gets a real iframe
// All others show a clickable thumbnail
function SnapCardVideo({ item, isActive }: { item: FeedItem; isActive: boolean }) {
  if (isActive) {
    return <VideoEmbed videoType={item.videoType!} videoId={item.videoId!} title={item.title} thumbnail={item.thumbnail} />;
  }

  // Facade: thumbnail + play icon overlay
  return (
    <div className="snap-video-facade">
      {item.thumbnail && <img src={item.thumbnail} alt="" />}
      <div className="snap-video-play-icon">
        <PlayIcon />
      </div>
    </div>
  );
}
```

### Mute State Persistence Across Videos
```typescript
// Session-level mute state: starts muted (browser policy), user can unmute
// Once unmuted, all subsequent videos auto-unmute
let sessionMuteState: boolean = true; // Start muted per browser policy

export function getSessionMuteState(): boolean {
  return sessionMuteState;
}

export function setSessionMuteState(muted: boolean): void {
  sessionMuteState = muted;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-based scroll snap (Hammer.js, Swiper) | CSS scroll-snap-type: y mandatory | 2020+ (full browser support) | Smoother, zero JS, compositor-thread |
| 100vh on mobile | 100svh with 100vh fallback | 2022 (Safari 15.4, Chrome 108) | Stable viewport height, no toolbar jump |
| scrollend polyfill | Native scrollend event | Safari 26.2 (Dec 2025) | No polyfill needed for modern Safari |
| All-items-in-DOM + visibility:hidden | Manual DOM windowing | Always for large lists | Drastically reduces memory, paint cost |
| YouTube autoplay unmuted | Muted autoplay + user-initiated unmute | 2018+ (Chrome autoplay policy) | Must start muted, unmute after interaction |

**Deprecated/outdated:**
- `scroll-snap-coordinate` / `scroll-snap-destination`: Old spec, replaced by `scroll-snap-align`. Do not use.
- `scrollsnapchange` event: Not yet usable -- no Safari or Firefox support as of March 2026. Use IntersectionObserver instead.
- `-webkit-overflow-scrolling: touch`: No longer needed on modern iOS Safari. The existing codebase uses it in `.swipe-feed` -- can be dropped.

## Design Recommendations (Claude's Discretion Areas)

### Feed Ordering Strategy
**Recommendation:** Use the server's ranked order (recommended sort). The API already applies the multi-signal blend algorithm (recency + engagement + diversity + variety). No client-side reordering needed. This is the simplest approach and respects the ranking work done in Phase 5-8.

### Animation Easing
**Recommendation:** The browser's native scroll-snap animation already feels close to TikTok. To get even closer:
- `scroll-behavior: smooth` is NOT needed -- the snap itself provides the animation
- The native deceleration curve on iOS is already momentum-based
- For the slide-out swipe gesture, use `cubic-bezier(0.32, 0.72, 0, 1)` -- this is the same easing curve used by iOS system animations and matches TikTok's feel

### Loading Skeleton
**Recommendation:** Full-viewport skeleton card matching the image card layout: a gradient shimmer for the hero image area (~60% height), and two skeleton bars in the dark panel area. Reuse the existing `skeleton-pulse` animation keyframe from App.css.

### Error State
**Recommendation:** If feed fetch fails, show a centered retry button on the snap-feed-sized viewport. If feed is empty, show the static news fallback (existing pattern in News.tsx). Don't show error toasts -- the full-screen format makes inline error states natural.

### Slide-Out Animation
**Recommendation:** Threshold of 120px (about 30% of screen width on a 400px phone). Background color: the source's brand color (reddit orange, youtube red, etc.) or fallback to `--theme-primary`. Spring-like return animation when cancelled: `transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)`.

## Open Questions

1. **Scroll position management during DOM window shifts**
   - What we know: Fixed-height items (100svh) make the math deterministic. Adjust scrollTop by `windowShift * cardHeight`.
   - What's unclear: Whether React's batched state updates cause a flash between the scrollTop adjustment and DOM update.
   - Recommendation: Test during implementation. If flash occurs, use `useLayoutEffect` or `flushSync` to synchronize. Alternatively, keep a larger window (5-7) to avoid frequent shifts.

2. **YouTube progress bar within iframe**
   - What we know: The user wants a "thin progress bar at bottom of video card." YouTube's iframe has its own controls including a progress bar.
   - What's unclear: Whether we can read playback progress from the YouTube iframe API via postMessage to render a custom progress bar outside the iframe.
   - Recommendation: For YouTube videos, rely on the iframe's built-in progress bar (visible when `controls=1`). For a custom thin bar, we'd need the YouTube IFrame API's `getCurrentTime()`/`getDuration()` which requires loading the full YT API script. Defer custom progress bar if the native one is sufficient.

3. **Swipe gesture vs browser back/forward navigation**
   - What we know: REQUIREMENTS.md lists "Horizontal swipe actions" as out of scope due to "Conflicts with browser back/forward gestures." But CONTEXT.md from /gsd:discuss-phase includes right-swipe as a locked decision.
   - What's unclear: Whether the right-swipe gesture will conflict with browser back gesture on iOS Safari (which uses swipe-right for back navigation).
   - Recommendation: Implement with a deliberate threshold (120px) and dead zone. If testing reveals conflicts with Safari's back gesture, the source link is still accessible via the top-right icon (SNAP-06). The swipe gesture is additive, not the sole access path.

## Sources

### Primary (HIGH confidence)
- [MDN: scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) -- mandatory snap behavior
- [MDN: scroll-snap-stop](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-stop) -- always vs normal
- [MDN: -webkit-line-clamp](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) -- text truncation
- [web.dev: viewport units](https://web.dev/blog/viewport-units) -- svh/dvh/lvh explanation
- [Chrome Developers: Scroll Snap Events](https://developer.chrome.com/blog/scroll-snap-events) -- scrollsnapchange (Chrome 129+, NO Safari/Firefox)
- [CanIUse: scrollsnapchange](https://caniuse.com/mdn-api_element_scrollsnapchange_event) -- 70% support, no Safari/Firefox
- [CanIUse: scrollend](https://caniuse.com/mdn-api_element_scrollend_event) -- Safari 26.2+, Chrome 114+, Firefox 109+
- [Google: YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) -- postMessage, enablejsapi
- [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) -- browser autoplay policies
- Existing codebase: `SwipeFeed.tsx`, `useVideoAutoplay.ts`, `VideoEmbed.tsx` -- proven patterns for scroll-snap and video

### Secondary (MEDIUM confidence)
- [CSS-Tricks: Practical CSS Scroll Snapping](https://css-tricks.com/practical-css-scroll-snapping/) -- scroll-snap patterns and gotchas
- [ishadeed.com: CSS Scroll Snap](https://ishadeed.com/article/css-scroll-snap/) -- comprehensive visual guide
- [web.dev: CSS Scroll Snap](https://web.dev/css-scroll-snap/) -- well-controlled scrolling
- [DEV Community: TikTok-like snap scroll in React](https://dev.to/biomathcode/create-tik-tokyoutube-shorts-like-snap-infinite-scroll-react-1mca) -- React-specific implementation
- [Chrome: Autoplay policy](https://developer.chrome.com/blog/autoplay) -- muted autoplay requirements

### Tertiary (LOW confidence)
- [Vaul drawer library](https://github.com/emilkowalski/vaul) -- considered and rejected for bottom sheet (too heavy, adds Radix dependency)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All browser-native APIs with universal support. Zero new dependencies.
- Architecture: HIGH -- Patterns verified against existing codebase (SwipeFeed, useVideoAutoplay). DOM windowing is the only novel pattern, well-understood in principle.
- Pitfalls: HIGH -- Autoplay policies and scroll-snap behavior well-documented by MDN and browser vendors. DOM window scroll jumps are the main risk.

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days -- stable browser APIs, no fast-moving dependencies)
