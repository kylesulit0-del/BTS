# Phase 14: Video Touch Overlay - Research

**Researched:** 2026-03-04
**Domain:** Mobile touch gesture handling over cross-origin iframes
**Confidence:** HIGH

## Summary

The core technical challenge of Phase 14 is that cross-origin iframes (YouTube, TikTok embeds) swallow all touch events, preventing the parent page's swipe gesture handlers from detecting vertical or horizontal swipes. The standard solution -- used universally across carousel/slider libraries and TikTok-style feeds -- is a transparent overlay `div` positioned above the iframe via z-index that intercepts all touch events, then uses the YouTube/TikTok postMessage API to relay play/pause commands.

The existing codebase already has all the building blocks: `useVerticalPaging` handles vertical swipe with axis-locking, `useSwipeGesture` handles horizontal right-swipe, `useSnapVideo` controls play/pause/mute via postMessage, and `SnapCardVideo` renders the iframe. The current `onClick={togglePlayPause}` on the `.snap-card-video` container div cannot fire because the iframe (z-index: 1) sits on top and consumes all pointer/touch events. The fix is to add a transparent overlay div above the iframe that captures all touches, delegates swipe gestures to the existing handlers, and converts taps into play/pause commands via the existing `togglePlayPause` function.

**Primary recommendation:** Add a transparent touch-intercepting overlay div inside `SnapCardVideo` positioned above the iframe (z-index > 1), handle all gestures on the overlay, and relay tap actions to `togglePlayPause` via the existing postMessage-based video control hooks. No new libraries needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Gesture thresholds:** TikTok-like sensitivity for swipe detection -- match TikTok's feel for dead zones and trigger distances
- **Card follows finger** during swipe with snap-back animation if swipe doesn't cross threshold
- **Always one card per swipe** -- no velocity-based multi-card scrolling regardless of flick force
- **Autoplay muted** when video card comes into view
- **Tap toggles play/pause** (not unmute) -- volume is a separate concern
- **Brief overlay icon** (play/pause) fades in and out on tap -- like YouTube/TikTok
- **Mute toggle icon** visible on video cards for audio control
- **Diagonal swipes are ignored** -- only clearly vertical or horizontal swipes are recognized
- **Lock to first recognized direction** once gesture starts -- axis locked until touch ends
- **Horizontal swipe threshold** same as non-video cards -- consistency across all card types
- **Overlay covers entire video area** -- YouTube's built-in controls are hidden, all interaction goes through our gesture handler
- **Swipe LEFT opens source URL** (not right) -- applies to all card types
- **Pause video automatically** when swiped away from
- **Resume from previous position** when swiped back to a video card
- **Only one video plays at a time** -- navigating to a new video card pauses any previously playing video
- **Loop video** when it reaches the end -- TikTok-style continuous playback

### Claude's Discretion
- Overlay icon animation timing and style
- Mute toggle icon placement and design
- Exact dead zone pixel threshold (should match TikTok feel)
- Technical approach to intercepting touches over iframes

### Deferred Ideas (OUT OF SCOPE)
- Swipe left opens source URL correction noted -- if this differs from current behavior on non-video cards, the change should apply globally (may affect other phases)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEST-01 | Transparent touch overlay on video iframes intercepts vertical swipes for feed navigation | Overlay div technique (z-index above iframe) is the industry standard for this exact problem. The existing `useVerticalPaging` hook already handles vertical swipe with axis-locking on the parent container. The overlay just needs to not block event propagation to the container. |
| GEST-02 | Taps on video overlay pass through to video player (play/pause) | Tap detection on the overlay div (touchstart/touchend with minimal movement and short duration), then call existing `togglePlayPause()` which uses postMessage to control the iframe player. No need to pass pointer events to iframe. |
| GEST-03 | Horizontal swipe gesture continues to work over video cards (open source link) | The existing `useSwipeGesture` hook already handles horizontal swipe. The overlay approach allows these events to propagate normally since touch handlers are attached to the parent `.snap-card-layout` and `.snap-feed` containers. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in project |
| YouTube IFrame postMessage API | N/A | Play/pause/mute control | Already implemented in `useVideoAutoplay.ts` and `useSnapVideo.ts` |
| CSS `pointer-events` | N/A | Control touch passthrough | Native CSS, no library needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependencies | N/A | N/A | All required functionality exists in the codebase already |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom touch overlay | `@use-gesture/react` or `hammer.js` | Adds dependency; the existing custom hooks (`useVerticalPaging`, `useSwipeGesture`) already handle axis-locking and thresholds perfectly |
| postMessage play/pause | `react-youtube` wrapper | Adds dependency; existing `sendCommand()` via postMessage already works |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/snap/
│   └── SnapCardVideo.tsx       # Add overlay div, play/pause icon animation
├── hooks/
│   └── useSnapVideo.ts         # Add tap detection logic, isPlaying state for icon
├── config/
│   └── snap.ts                 # Add gesture threshold constants if needed
└── App.css                     # Overlay styles, play/pause icon animation keyframes
```

### Pattern 1: Transparent Touch Overlay Over Iframe
**What:** A `div` with `position: absolute; inset: 0; z-index` higher than the iframe, with `background: transparent`. This div receives all touch/pointer events instead of the iframe.
**When to use:** Any time you need to intercept gestures on cross-origin iframes.
**Example:**
```tsx
// Inside SnapCardVideo, after the <iframe> element:
<div
  className="snap-video-touch-overlay"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  // Do NOT set onClick -- use touch events for tap detection
/>
```
```css
.snap-video-touch-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;   /* iframe is z-index: 1 */
  background: transparent;
  /* Do NOT set pointer-events: none -- we WANT to capture events */
}
```

### Pattern 2: Tap Detection via Touch Events (Not Click)
**What:** Distinguish taps from swipes by measuring movement distance and duration between `touchstart` and `touchend`. If finger moved < dead zone AND duration < ~300ms, it's a tap.
**When to use:** When an overlay needs to differentiate taps from swipe gestures.
**Example:**
```tsx
const TAP_MAX_DISTANCE = 10; // px
const TAP_MAX_DURATION = 300; // ms

const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  if (touch) {
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const start = touchStartRef.current;
  if (!start) return;
  const touch = e.changedTouches[0];
  if (!touch) return;

  const dx = Math.abs(touch.clientX - start.x);
  const dy = Math.abs(touch.clientY - start.y);
  const dt = Date.now() - start.t;

  if (dx < TAP_MAX_DISTANCE && dy < TAP_MAX_DISTANCE && dt < TAP_MAX_DURATION) {
    // This is a tap -- toggle play/pause
    togglePlayPause();
  }
  touchStartRef.current = null;
};
```

### Pattern 3: Play/Pause Feedback Icon with CSS Animation
**What:** Brief icon overlay that appears on tap and fades out, like YouTube/TikTok.
**When to use:** Visual feedback for play/pause taps.
**Example:**
```tsx
const [showIcon, setShowIcon] = useState<'play' | 'pause' | null>(null);

const handleTap = () => {
  togglePlayPause();
  setShowIcon(isPlaying ? 'pause' : 'play');
  setTimeout(() => setShowIcon(null), 800);
};
```
```css
.snap-video-tap-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
  pointer-events: none;
  animation: tapIconFade 0.8s ease-out forwards;
}

@keyframes tapIconFade {
  0% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
}
```

### Anti-Patterns to Avoid
- **Setting `pointer-events: none` on the overlay:** This defeats the purpose -- the whole point is that the overlay captures events so the iframe doesn't swallow them. The overlay must have `pointer-events: auto` (default).
- **Using `onClick` for tap detection on video cards:** On mobile, `onClick` fires with a ~300ms delay and doesn't distinguish taps from swipes. Use `touchstart`/`touchend` for responsive tap detection.
- **Toggling `pointer-events` dynamically:** Some solutions toggle `pointer-events: none` on the overlay to let taps reach the iframe. This is fragile -- the iframe's built-in controls would fight with our gesture system. Instead, keep the overlay always capturing and relay commands via postMessage.
- **Using `preventDefault()` on touch events in the overlay:** This could break the vertical paging system. The overlay's touch events should propagate normally to the parent container where `useVerticalPaging` listens.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical swipe detection | New vertical gesture hook | Existing `useVerticalPaging` | Already has axis-locking, velocity detection, spring animation |
| Horizontal swipe detection | New horizontal gesture hook | Existing `useSwipeGesture` | Already has right-swipe detection with axis-locking |
| Video play/pause/mute commands | Direct iframe manipulation | Existing `sendCommand()` / `sendMuteCommand()` | Already handles YouTube and TikTok postMessage protocols |
| One-video-at-a-time enforcement | Custom tracking | Existing `currentlyPlaying` module-level tracker in `useSnapVideo` | Already pauses previous video on navigation |
| Autoplay on card entry | Custom observer | Existing `isActive` prop flow in `useSnapVideo` | Already auto-plays on active, pauses on inactive |

**Key insight:** This phase is primarily a CSS/DOM layering fix plus tap detection. The gesture handling, video control, and navigation infrastructure already exist and work well. The only missing piece is the transparent overlay that prevents the iframe from swallowing touch events.

## Common Pitfalls

### Pitfall 1: Touch Events Not Propagating to Parent Containers
**What goes wrong:** The overlay div captures touch events for tap detection, but `useVerticalPaging` (which listens on the `.snap-feed` container via `addEventListener`) never receives the events, breaking vertical swipe.
**Why it happens:** If the overlay handler calls `e.stopPropagation()` or `e.preventDefault()`, events don't bubble up.
**How to avoid:** The overlay's touch handlers must NOT call `stopPropagation()` or `preventDefault()`. Let events bubble naturally. Only use the events to detect taps locally; swipe detection happens at the container level via the existing hooks.
**Warning signs:** Swipe works on image/text cards but not video cards.

### Pitfall 2: iOS Safari Edge-Swipe Conflicts
**What goes wrong:** On iOS Safari (including PWA), system back/forward swipe gestures from screen edges conflict with the app's horizontal swipe gesture.
**Why it happens:** iOS reserves the left/right screen edges for navigation gestures.
**How to avoid:** This is a known limitation. The existing `useSwipeGesture` requires moving past a 120px threshold, which is well beyond the iOS edge gesture zone (~20px from edge). The CONTEXT.md notes swipe LEFT opens source URL, but the current code does right-swipe. This discrepancy is deferred.
**Warning signs:** Horizontal swipe occasionally triggers back navigation in Safari.

### Pitfall 3: Iframe Z-Index vs Overlay Z-Index Race
**What goes wrong:** The iframe's z-index is set inline as `zIndex: 1` in `SnapCardVideo.tsx`. If the overlay's z-index is not higher, the iframe still captures events.
**Why it happens:** Z-index only works within the same stacking context. Both elements are inside `.snap-card-video` which has `position: relative`, creating a stacking context.
**How to avoid:** Set the overlay to `z-index: 2` or higher. The mute button is already at `z-index: 10`, progress bar at `z-index: 10`, and metadata overlay at `z-index: 5`. The touch overlay should be at `z-index: 3` (below mute button and progress, above iframe).
**Warning signs:** Taps work on some parts of the card but not others.

### Pitfall 4: Mute Button Clicks Getting Intercepted by Overlay
**What goes wrong:** The transparent overlay sits between the user and the mute button, intercepting clicks meant for the mute toggle.
**Why it happens:** The overlay covers the entire video area including where the mute button is rendered.
**How to avoid:** The mute button has `z-index: 10` which is above the overlay. But the overlay must be positioned BELOW the mute button in z-index stacking. The mute button already uses `e.stopPropagation()`. Ensure the overlay z-index (e.g., 3) is below the mute button z-index (10).
**Warning signs:** Mute button doesn't respond to taps.

### Pitfall 5: Tap Registering as Swipe (or Vice Versa)
**What goes wrong:** Quick flick gestures register as taps and toggle play/pause, or slow taps register as swipe attempts.
**Why it happens:** The tap detection threshold is too generous or too strict.
**How to avoid:** Use conservative tap thresholds: max 10px movement AND max 300ms duration. This matches common mobile UX patterns. The TikTok reference point confirms: taps should be short and stationary.
**Warning signs:** Play/pause toggles unexpectedly during swipes, or taps don't register.

### Pitfall 6: YouTube Controls Visible Under Overlay
**What goes wrong:** YouTube's built-in player controls (play button, progress bar, etc.) show through the overlay but can't be tapped.
**Why it happens:** The iframe renders YouTube's native UI, but the overlay blocks all interaction with it.
**How to avoid:** This is by design per CONTEXT.md: "YouTube's built-in controls are hidden, all interaction goes through our gesture handler." The iframe URL already includes `controls=1`, but since the overlay blocks interaction, consider changing to `controls=0` to remove visual confusion. However, YouTube may still show minimal UI. The custom progress bar, play/pause icon, and mute button replace YouTube's native controls.
**Warning signs:** Users try to tap YouTube's progress bar or play button and nothing happens.

## Code Examples

Verified patterns from official sources and the existing codebase:

### YouTube postMessage Play/Pause (already in codebase)
```typescript
// Source: packages/frontend/src/hooks/useVideoAutoplay.ts
export function sendCommand(
  iframe: HTMLIFrameElement,
  videoType: VideoType,
  action: "play" | "pause",
) {
  if (videoType === "youtube-short") {
    const func = action === "play" ? "playVideo" : "pauseVideo";
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "https://www.youtube.com",
    );
  } else {
    iframe.contentWindow?.postMessage(
      { type: action, "x-tiktok-player": true },
      "https://www.tiktok.com",
    );
  }
}
```

### Existing Axis-Lock Gesture System (already in codebase)
```typescript
// Source: packages/frontend/src/hooks/useVerticalPaging.ts lines 64-79
// This already handles the "lock to first recognized direction" requirement
if (!axisLocked.current) {
  if (Math.abs(dy) < PAGING_DEAD_ZONE && Math.abs(dx) < PAGING_DEAD_ZONE) return;
  if (Math.abs(dy) > Math.abs(dx) * PAGING_AXIS_LOCK_RATIO) {
    // Vertical wins
    if (gestureClaimedRef.current === "horizontal") return;
    axisLocked.current = true;
    isDraggingRef.current = true;
    gestureClaimedRef.current = "vertical";
  } else {
    // Horizontal wins or ambiguous — bail
    axisLocked.current = true;
    isDraggingRef.current = false;
    return;
  }
}
```

### Current Iframe Rendering (will need overlay added)
```tsx
// Source: packages/frontend/src/components/snap/SnapCardVideo.tsx lines 113-129
<iframe
  ref={iframeRef}
  src={src}
  title={item.title}
  allow="autoplay; encrypted-media"
  allowFullScreen
  onLoad={handleIframeLoad}
  style={{
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: "none",
    opacity: iframeLoaded ? 1 : 0,
    zIndex: 1,
  }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pointer-events: none` toggle on overlay | Permanent overlay with tap detection via touchstart/touchend | Standard since ~2020 | More reliable, no timing bugs |
| YouTube JS API (script injection) | YouTube postMessage API (`enablejsapi=1`) | Preferred since YouTube IFrame API v3 | No script loading, works cross-origin |
| CSS `touch-action: none` for gesture control | `touch-action: none` on container + event propagation | Still current | iOS Safari has limited `touch-action` support, but the project already uses this on `.snap-feed` |

**Deprecated/outdated:**
- `hammer.js`: Last major release 2016, unmaintained. Custom touch handling or `@use-gesture/react` preferred for new projects. Not needed here since custom hooks exist.
- YouTube embedded player `controls=0` alone: Doesn't prevent user interaction if no overlay is present.

## Open Questions

1. **Swipe direction discrepancy**
   - What we know: CONTEXT.md says "Swipe LEFT opens source URL." Current `useSwipeGesture` only tracks right-swipe (`Math.max(0, dx)` clamps to right direction only).
   - What's unclear: Whether the user wants to change swipe direction from right to left across all cards, or if this is specific to video.
   - Recommendation: CONTEXT.md defers this ("if this differs from current behavior on non-video cards, the change should apply globally"). Implement video overlay to work with the existing right-swipe behavior. The direction change is out of scope for this phase.

2. **YouTube `controls=0` parameter**
   - What we know: The iframe URL currently has `controls=1`, and the overlay blocks interaction with YouTube's native controls.
   - What's unclear: Whether removing YouTube's visible controls (`controls=0`) would improve the UX or confuse users who see no controls at all.
   - Recommendation: Change to `controls=0` since our overlay, custom progress bar, mute button, and play/pause icon replace all native controls. Users cannot interact with YouTube's controls anyway.

3. **Exact TikTok-like dead zone threshold**
   - What we know: Current `PAGING_DEAD_ZONE` is 10px, `SWIPE_THRESHOLD` is 120px. TikTok's exact values are proprietary.
   - What's unclear: Whether the current 10px dead zone matches TikTok's feel closely enough.
   - Recommendation: Start with existing values (10px dead zone, 120px swipe threshold, 0.25 distance ratio). These are reasonable for a TikTok-like feel. Fine-tune during physical device testing per STATE.md blocker note.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `useVerticalPaging.ts`, `useSwipeGesture.ts`, `useSnapVideo.ts`, `useVideoAutoplay.ts`, `SnapCardVideo.tsx`, `SnapCard.tsx`, `SnapFeed.tsx`, `snap.ts`, `App.css` -- direct source code inspection
- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference) -- postMessage API for play/pause/mute
- [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) -- CSS touch-action behavior

### Secondary (MEDIUM confidence)
- [react-slick iframe swipe issue #1819](https://github.com/akiran/react-slick/issues/1819) -- confirms transparent overlay is the standard solution for iframe touch interception
- [CSS-Tricks pointer-events](https://css-tricks.com/almanac/properties/p/pointer-events/) -- pointer-events CSS property behavior
- [iframe-video-overlay library](https://github.com/dmitriyakkerman/iframe-video-overlay) -- confirms overlay pattern for YouTube/Vimeo embeds
- [Gist: iframe overlay for mobile scrolling](https://gist.github.com/datchley/6793842) -- transparent overlay technique over iframes
- [Apple HIG: Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures/) -- iOS gesture design guidelines

### Tertiary (LOW confidence)
- TikTok dead zone / sensitivity exact pixel values -- proprietary, not publicly documented. Current codebase values (10px dead zone) are reasonable approximations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all building blocks exist in codebase
- Architecture: HIGH - Transparent overlay pattern is universally documented and verified across multiple sources
- Pitfalls: HIGH - Each pitfall identified from direct codebase analysis (z-index values, event propagation flow, iOS Safari behavior)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain, no fast-moving dependencies)
