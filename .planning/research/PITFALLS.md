# Domain Pitfalls

**Domain:** Enhancing existing snap feed with touch overlays, fixed header, media-centric cards, and shared bottom sheet extraction
**Researched:** 2026-03-04
**Confidence:** HIGH (based on codebase audit of existing v3.0 snap feed, W3C spec behavior for touch-action on iframes, iOS Safari iframe touch event documentation, and community post-mortems from video feed implementors)

---

## Critical Pitfalls

### Pitfall 1: Touch Overlay Over Iframe Steals ALL Touch Events Including Taps

**What goes wrong:**
The planned transparent touch overlay over video iframes is meant to intercept vertical swipe gestures (so `useVerticalPaging` can page up/down) while letting taps through to the iframe's play/pause controls. The naive implementation -- a `div` with `position: absolute; inset: 0` above the iframe -- blocks ALL touch interaction with the iframe, including taps on the YouTube player controls, the mute button, and the progress bar. The user cannot interact with the video at all.

Conversely, using `pointer-events: none` on the overlay lets everything through to the iframe, which means swipe gestures are consumed by the iframe's own touch handling and never reach the parent -- defeating the purpose entirely.

**Why it happens:**
Iframes are cross-origin browsing contexts. Touch events that start inside an iframe do NOT bubble to the parent document. This is a deliberate security boundary in the web platform (W3C Pointer Events spec). The parent page cannot listen for `touchmove` events that originate inside the iframe. When a user puts their finger on the YouTube player and swipes vertically, the iframe captures the entire gesture sequence (touchstart through touchend) and the parent page receives nothing.

The existing `SnapCardVideo` component already has this problem -- the `onClick={togglePlayPause}` handler on the wrapping `div` works because `click` events DO propagate through the iframe boundary in some cases, but swipe gestures (touchstart -> touchmove -> touchend sequences) do not.

**How to avoid:**
Use a state-machine approach for the touch overlay:

1. **Overlay starts with `pointer-events: auto`** (captures all touches).
2. On `touchstart`, record the start position and timestamp.
3. On `touchmove`, determine the gesture intent:
   - If vertical movement exceeds the dead zone (10px) with axis lock ratio > 1.5 (matching `PAGING_AXIS_LOCK_RATIO`), claim the gesture as vertical paging. Keep the overlay capturing events. Forward the gesture data to `useVerticalPaging`.
   - If horizontal movement dominates, claim as horizontal swipe. Forward to `useSwipeGesture`.
   - If movement stays within the dead zone for 200ms+ (a tap or long press), set `pointer-events: none` on the overlay and re-dispatch a synthetic `touchstart` event at the original coordinates. This lets the tap fall through to the iframe.
4. On `touchend` with minimal movement (within dead zone, under 200ms), treat as a tap: toggle play/pause via the existing `postMessage` API instead of trying to pass the tap through.

The critical insight: do NOT try to pass taps through to the iframe. Instead, handle taps entirely in the parent document using the existing `useSnapVideo.togglePlayPause()` which uses `postMessage`. The overlay should be a gesture disambiguator, not a passthrough layer.

**Warning signs:**
- Overlay div has `pointer-events: none` (defeats the purpose -- swipes go to iframe)
- Overlay div has `pointer-events: auto` with no gesture detection (blocks all iframe interaction)
- Trying to `preventDefault()` on the overlay's touchstart and then setting `pointer-events: none` mid-gesture (this does not re-route an in-progress touch sequence on iOS Safari)
- Testing only on desktop with mouse events (mouse click passes through overlays differently than touch)

**Phase to address:**
Phase addressing video gesture fix -- this is the single hardest technical problem in the milestone. Build and test this before any other card layout changes.

---

### Pitfall 2: iOS Safari Drops Touch Events on Dynamically-Changed pointer-events

**What goes wrong:**
A common "smart overlay" pattern toggles `pointer-events` during a touch sequence: start with `pointer-events: auto`, detect a tap, switch to `pointer-events: none` to let the tap fall through. On iOS Safari, this does NOT work. Once a touch sequence begins on an element, iOS Safari delivers ALL subsequent touch events in that sequence to the element where `touchstart` fired, regardless of `pointer-events` changes during the sequence. The tap never reaches the iframe.

This is the most common failure mode for touch overlay implementations. It works in Chrome DevTools mobile simulator, works on Chrome Android, and completely fails on physical iOS devices.

**Why it happens:**
iOS Safari uses a "touch target lock" model. When `touchstart` fires, Safari determines the target element and locks the entire touch sequence (all subsequent touchmove and touchend events) to that element. Changing CSS properties like `pointer-events` during the sequence has no effect on event routing. This behavior is documented in Apple's Safari Web Content Guide under "Handling Events."

Chrome/Android uses a more dynamic model where changing `pointer-events` mid-sequence CAN redirect events (though behavior is inconsistent).

**How to avoid:**
Never rely on changing `pointer-events` during an active touch sequence. Instead:

1. **Keep the overlay always capturing** (`pointer-events: auto` permanently).
2. **Handle ALL interactions in the overlay's event handlers.** Taps toggle play/pause via `postMessage`. Swipes invoke the paging system. Nothing ever needs to "fall through."
3. The overlay becomes a **unified gesture handler** that sits between the user and all card content (iframe or otherwise).
4. For the mute button and other controls that are currently positioned as siblings/children of the iframe: move them to be siblings of the overlay (at the same z-index level or above the overlay), so they receive touches directly without going through the overlay.

The existing `snap-card-video-mute-btn` is already positioned as a sibling to the iframe with `z-index` above the video overlay. It should also be above the new touch overlay. Same for the progress bar and any future controls.

**Warning signs:**
- Touch overlay works in Chrome DevTools responsive mode but fails on physical iPhone
- Tap detection works on Android but not iOS
- Dynamic `pointer-events` toggling in touchstart/touchmove handlers
- Testing only in desktop browsers with touch simulation

**Phase to address:**
Same phase as Pitfall 1. Must be tested on a physical iOS device. Chrome DevTools and xcode Simulator do NOT reproduce this behavior accurately.

---

### Pitfall 3: Fixed Header Changes Viewport Calculation for ALL Card Heights

**What goes wrong:**
The current snap feed uses `position: fixed; inset: 0` on `.snap-page`, making the feed fill the entire screen. The auto-hide `SnapControlBar` overlays the feed content (it does not take space in the layout flow). Replacing it with a fixed header that is always visible means the header occupies real vertical space. If the header is 48px tall, every card must be `calc(100svh - 48px)` instead of `100svh`. This change cascades through:

1. **`useVerticalPaging`**: Uses `container.clientHeight` for the paging distance. If the container height changes (because a header now takes space above it), the paging animation moves by the wrong amount. Cards over-scroll or under-scroll by 48px.
2. **`.snap-card` CSS**: Currently `height: 100%` of the parent. If the parent changes height, all card layouts shift.
3. **Video card aspect ratios**: `SnapCardVideo` fills its container. A 48px reduction changes the video aspect ratio slightly, which may cause letterboxing or cropping.
4. **`.snap-reveal-zone`**: The 44px-tall tap zone for showing the hidden control bar becomes unnecessary with a fixed header, but if not removed, it overlaps the new header's tap targets.

**Why it happens:**
The auto-hide bar was designed as an overlay (`position: absolute; top: 0; z-index: 10`) that floats above the feed content. It does not participate in the layout flow. A fixed header participates in layout flow (or if positioned absolutely, it visually overlaps content). Switching from overlay to layout-flow element changes the geometry for every component below it.

**How to avoid:**
Use a **layout-flow header**, not a floating overlay, and adjust the feed container accordingly:

```css
.snap-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.snap-header {
  flex: 0 0 auto;
  height: var(--header-height, 48px);
  /* NOT position: absolute/fixed -- let flexbox handle it */
}

.snap-feed {
  flex: 1;
  /* This automatically gets 100svh - header-height */
  overflow: hidden;
}
```

By using flexbox (`flex: 1` on the feed), the feed container automatically adjusts its height to fill the remaining space after the header. `useVerticalPaging` reads `containerRef.current.clientHeight` which will correctly reflect the reduced height. No `calc()` needed. No CSS custom properties for header height needed.

Critical: Update `useVerticalPaging` test points. The hook currently assumes the container fills the full viewport. With a header, `container.clientHeight` will be ~48px less. The paging distance (`height` in onTouchEnd) is already derived from `container.clientHeight`, so it will adjust automatically IF the container is correctly sized. But if the header is overlaid (position: absolute) instead of in layout flow, `clientHeight` will be wrong.

**Warning signs:**
- Header uses `position: absolute` or `position: fixed` with `top: 0` (it overlaps the feed instead of pushing it down)
- Card paging animation moves cards by full viewport height instead of viewport-minus-header height
- First card content hidden behind the header on initial load
- `useVerticalPaging` hard-codes `window.innerHeight` instead of using `container.clientHeight`
- Mute button or other controls at fixed pixel positions from bottom now appear too low

**Phase to address:**
Phase addressing fixed header -- do this BEFORE card layout changes so the card viewport dimensions are settled. Card layout work depends on knowing the available height.

---

### Pitfall 4: Removing Auto-Hide Logic Creates Zombie Event Handlers and Dead Code

**What goes wrong:**
The current system has interconnected auto-hide logic:
- `useControlBarVisibility` hook tracks `currentIndex` changes and hides the bar on scroll
- `SnapFeed` calls `onIndexChange` callback to report index changes to the parent
- `News.tsx` maintains `barVisible` state and renders a `.snap-reveal-zone` div for tap-to-show
- `SnapControlBar` accepts a `visible` prop and uses CSS transforms to hide/show

Replacing the auto-hide bar with a fixed header means all of this hide/show logic is dead code. If it is not fully removed, it causes bugs:
- The `snap-reveal-zone` div is an invisible 44px tap target at the top of the screen that intercepts clicks meant for the new header's buttons
- The `useControlBarVisibility` hook continues to set `visible: false` on index changes, which may affect the new header if it reuses the same prop/state
- CSS class `.snap-control-bar.hidden` with `pointer-events: none` could be applied to the new header by accident if class names are reused

**Why it happens:**
When replacing behavior (auto-hide with fixed), developers typically build the new component but forget to trace all the tendrils of the old behavior. The hide/show logic spans 4 files (`useControlBarVisibility.ts`, `News.tsx`, `SnapControlBar.tsx`, `App.css`) and is not contained in a single module.

**How to avoid:**
Before building the new header:
1. **Map all auto-hide touchpoints.** These are: `useControlBarVisibility.ts` (entire hook), `News.tsx` lines 64-65 (barVisible/showBar), lines 108-113 (snap-reveal-zone), `SnapControlBar.tsx` (visible prop), `App.css` (.snap-control-bar.hidden, .snap-reveal-zone).
2. **Remove the `snap-reveal-zone` div first.** It is the most dangerous leftover because it silently intercepts taps.
3. **Delete `useControlBarVisibility.ts`** entirely. The hook has no other consumers.
4. **Simplify the SnapControlBar** (or its replacement header) to remove the `visible` prop and all show/hide CSS transitions.
5. **Remove the `.snap-control-bar.hidden` and `.snap-control-bar-initial` CSS rules** and the `.snap-reveal-zone` rule.

Do this cleanup in the SAME commit as adding the fixed header. Do not leave "I'll clean this up later" TODOs.

**Warning signs:**
- `useControlBarVisibility` hook still imported in `News.tsx` after the header is changed
- `.snap-reveal-zone` div still rendered (invisible but intercepting taps)
- New header flickers on index change because old hide logic still fires
- CSS file still contains `.hidden` transform for the bar

**Phase to address:**
Same phase as the fixed header. This is a prerequisite cleanup, not a separate task.

---

### Pitfall 5: Touch Overlay Breaks Right-Swipe Gesture for Opening Source URLs

**What goes wrong:**
The existing right-swipe gesture (`useSwipeGesture`) lets users swipe right on any card to open the source URL. This works via `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers on the `.snap-card-layout` div. A touch overlay placed above the iframe in video cards creates a new element in the touch event path. If the overlay handles its own touch events for gesture disambiguation (Pitfall 1), it may claim the gesture before `useSwipeGesture` can evaluate it, or the two gesture systems may fight.

The current gesture arbitration uses `gestureClaimedRef` -- a shared ref between `useVerticalPaging` and `useSwipeGesture`. The touch overlay adds a THIRD participant to this arbitration, and the existing two-party protocol does not handle three-way arbitration.

**Why it happens:**
The gesture arbitration system was designed for exactly two participants:
- `useVerticalPaging` registers touch handlers on the container div
- `useSwipeGesture` registers touch handlers on each card's layout div
- They share `gestureClaimedRef` and check it before claiming a gesture

The touch overlay is a child of the card layout, so its events fire before the parent's. If the overlay handles `touchstart`, it may set the gestureClaimedRef before either paging or swipe can evaluate the gesture direction. Or, if the overlay does not participate in the arbitration protocol, it may independently try to handle a gesture that swipe already claimed.

**How to avoid:**
The touch overlay must participate in the existing `gestureClaimedRef` arbitration protocol:

1. **Pass `gestureClaimedRef` to the overlay component** (it is already passed from `SnapFeed` through `SnapCard`).
2. **The overlay should NOT independently handle touchstart.** Instead, it should observe the ref and only process gestures that have not been claimed.
3. **Architecture: The overlay should be the SOLE touch handler for video cards.** Instead of having overlay + swipe + paging all listening, the overlay handles gesture disambiguation and delegates:
   - Vertical gesture --> calls `useVerticalPaging` callbacks
   - Horizontal gesture --> calls `useSwipeGesture` callbacks
   - Tap --> calls `togglePlayPause`

This means for video cards, the touch overlay REPLACES the swipe gesture handler rather than layering on top of it. The overlay calls `openSourceUrl()` directly for right swipes, and `goNext()`/`goPrev()` for vertical swipes.

4. **For non-video cards** (image, text), there is no overlay. The existing `useSwipeGesture` + `useVerticalPaging` arbitration works unchanged.

**Warning signs:**
- Three different touch handlers competing on the same DOM subtree (overlay, swipe, paging)
- Right-swipe no longer works on video cards but works on image/text cards
- `gestureClaimedRef` checked by two handlers but not the third
- Vertical paging works on image cards but stutters or fails on video cards

**Phase to address:**
Same phase as Pitfall 1 (touch overlay). The overlay's event handling must be designed with swipe gesture compatibility from the start.

---

## Moderate Pitfalls

### Pitfall 6: Sort Bottom Sheet Extracted Without Shared Animation/Dismiss Behavior

**What goes wrong:**
The existing `FilterSheet` and `SeeMoreSheet` have duplicated bottom sheet mechanics: backdrop, portal rendering, drag-to-dismiss, body scroll lock. Extracting a shared `BottomSheet` component and building a `SortSheet` on top of it is the plan. The common mistake: extracting only the visual wrapper (backdrop + panel) but not the behavioral logic (drag threshold, spring animation timing, body scroll lock, backdrop click dismiss).

This results in the Sort sheet and Filter sheet having subtly different dismiss behaviors. The Sort sheet might require 100px of drag to dismiss while Filter requires 80px. Or the animation easing differs. Or one locks body scroll and the other does not. Users perceive these as inconsistent and broken.

**Why it happens:**
The current `FilterSheet` and `SeeMoreSheet` have their drag-to-dismiss logic inline (not extracted). Looking at the code:
- `FilterSheet` uses `currentTranslateY.current > 80` as the dismiss threshold, checks `scrollTopRef.current <= 0` before allowing drag
- `SeeMoreSheet` uses `currentTranslateY.current > 80` as the dismiss threshold, does NOT check scroll position (simpler content, always at top)
- Both use the same easing: `cubic-bezier(0.32, 0.72, 0, 1)` with 0.3s duration
- Both lock body scroll with `document.body.style.overflow = "hidden"`

The shared values are coincidentally identical today. Without extracting them into a shared component, a future change to one sheet's behavior will not propagate to the other.

**How to avoid:**
Extract a `BaseBottomSheet` component that encapsulates:
1. **Portal rendering** (`createPortal` to `document.body`)
2. **Backdrop** with open/close opacity animation and click-to-dismiss
3. **Drag-to-dismiss** with configurable threshold (default 80px), scroll-awareness (only drag when scrolled to top), spring animation (0.3s cubic-bezier)
4. **Body scroll lock** on open, restore on close
5. **Handle bar** visual element

The `BaseBottomSheet` accepts `children`, `isOpen`, `onClose`, and optionally `dismissThreshold`. `FilterSheet`, `SortSheet`, and `SeeMoreSheet` compose `BaseBottomSheet` with their specific content.

Critical: The `SeeMoreSheet` currently does NOT check scroll position before allowing drag (it has no scrollable content). The `FilterSheet` DOES check. The shared component should make scroll-awareness configurable, not always-on. If forced on, `SeeMoreSheet` behavior changes (drag starts being blocked even though there is nothing to scroll).

**Warning signs:**
- `BaseBottomSheet` extracted but each sheet still has its own `onTouchStart/Move/End` handlers
- Animation timing differs between Sort and Filter sheets
- Body scroll lock missing from one of the sheets
- Sheet dismiss threshold hard-coded differently in Sort vs Filter

**Phase to address:**
Phase addressing bottom sheet consistency. Extract shared component BEFORE building the Sort sheet, so the Sort sheet is built on the shared foundation.

---

### Pitfall 7: Media-Centric Card Layout Breaks Text-Only Posts

**What goes wrong:**
Rearranging card layout to "media ~60% viewport top, then title, metadata, snippet" works for image and video posts. For text-only posts (no thumbnail, no video), there is no media to fill 60% of the viewport. The layout either shows a blank 60% area above the text content (wasteful), or the text content stretches to fill the full card (inconsistent with image/text cards).

The current codebase has three card variants (`SnapCardVideo`, `SnapCardImage`, `SnapCardText`), and `SnapCardText` fills the entire card height with text content. Making it match the media-centric layout requires either inventing a visual placeholder for the media zone or accepting a different layout for text-only posts.

**Why it happens:**
The milestone spec says "media-centric card layout" but does not address text-only posts. Developers implement the spec for the happy path (image/video posts) and discover text-only posts look wrong only during testing.

**How to avoid:**
Design text-only cards separately. Two approaches:

1. **Gradient hero area**: Use a source-colored gradient or a patterned background in the "media" zone for text-only posts. This maintains the consistent 60/40 layout across all card types. The source badge color (`sourceBadgeColors` in `SnapCard.tsx`) already provides per-source colors.

2. **Full-text layout**: Accept that text-only cards have a different layout. Text cards center the title and snippet in the full card area. This is what the current `SnapCardText` does. Keep it as-is for text-only posts. Inconsistency is acceptable because TikTok/Instagram also use different layouts for text vs media posts.

Recommendation: Option 2 (keep `SnapCardText` layout as-is). The milestone says "consistent card layout even for video-only posts" referring to always showing title + metadata, but this does not mean text-only posts need a fake media area.

**Warning signs:**
- All three card variants forced into identical layout with 60% media area
- Text-only posts have a large empty zone at the top
- Text-only posts crash or error because `item.thumbnail` is null and layout expects a media element

**Phase to address:**
Phase addressing card layout changes. Explicitly design text-only card treatment before implementing.

---

### Pitfall 8: Video Iframe Height Changes When Moving from Full-Bleed to 60% Viewport

**What goes wrong:**
Currently, `SnapCardVideo` fills 100% of the card height. The iframe is `position: absolute; inset: 0; width: 100%; height: 100%`. Moving to a media-centric layout where media occupies ~60% of the viewport means the iframe container shrinks from ~100svh to ~60svh. This changes the aspect ratio significantly:

- On an iPhone 14 (390x844): current video area is 390x844 (0.46:1 aspect ratio). New video area would be 390x506 (0.77:1). YouTube Shorts are 9:16 (0.5625:1). The video would be cropped differently -- more of the sides visible, less vertical content.
- YouTube's embed player adds black letterbox bars when the container aspect ratio does not match the video. A 60svh container with a 9:16 video will show small letterbox bars on the sides.

This is not a bug -- it is a design decision. But if not anticipated, it looks wrong.

**Why it happens:**
The spec says "media ~60% viewport top" without specifying aspect ratio handling for 9:16 video content. 60% of a mobile viewport is roughly 16:19 in portrait, which is wider than 9:16 video content.

**How to avoid:**
Use `object-fit: cover` semantics for video containers:

1. **Container**: `height: 60svh; width: 100%; overflow: hidden; position: relative`
2. **Iframe wrapper**: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%;` with the iframe inside
3. This centers the video and lets the container crop overflow rather than letterboxing.

Alternatively, make the media height RESPONSIVE to content type:
- YouTube Shorts (9:16): Use `aspect-ratio: 9/16` on the container, capped at 70svh. On a phone, this will be approximately 70svh. On wider screens, it will be narrower.
- Regular YouTube (16:9): Use `aspect-ratio: 16/9`, which on a phone will be much shorter (~30svh).
- Images: Use `max-height: 60svh; object-fit: cover`.

The responsive approach is more complex but produces better results. The current `SnapCardImage` already uses `flex: 0 0 60%` for the hero area -- extend this pattern.

**Warning signs:**
- Video content has black letterbox bars inside the 60% area
- All videos forced to exactly 60% height regardless of their natural aspect ratio
- Video thumbnails stretched or squished compared to the iframe
- Testing only with YouTube Shorts (9:16) and not with regular YouTube videos (16:9)

**Phase to address:**
Same phase as card layout changes. Design the video container dimensions alongside the media-centric layout.

---

### Pitfall 9: Sort Bottom Sheet State Conflicts with Existing Sort Tabs in Control Bar

**What goes wrong:**
The current `SnapControlBar` renders sort tabs (Rec, New, Old, Pop, Disc) inline in the bar. The milestone adds a Sort bottom sheet. If both exist simultaneously, there are two places to change sort mode. If the Sort bottom sheet replaces the inline tabs, the control bar layout changes. If both coexist, sort state can be changed from two places and they must stay in sync.

The existing `SnapControlBar` receives `feedState` and `dispatch` directly. The Sort bottom sheet would also need these. If the header replaces the control bar, the dispatch mechanism must move to the new header.

**Why it happens:**
The milestone spec says "Sort bottom sheet matching Filter UI design language" -- this implies sort moves from inline tabs to a bottom sheet. But the transition is not atomic: during development, both may exist, and the developer may forget to remove the inline sort tabs when the bottom sheet is working.

**How to avoid:**
1. Plan the header UI explicitly: the fixed header has "Army Feed" branding (left) and Sort + Filter buttons (right). Sort and Filter both open bottom sheets. The inline sort tabs in `SnapControlBar` are REMOVED.
2. Implement the header first with Sort/Filter buttons that open their respective sheets. Remove the inline sort tabs in the same commit.
3. The Sort bottom sheet should use the same `dispatch({ type: "SET_SORT", sort })` action as the current inline tabs. The state management does not change -- only the UI trigger point changes.

**Warning signs:**
- Sort mode can be changed from both the header and an inline row
- Sort tabs still visible in the control bar after the bottom sheet is added
- Two different state update paths for sort mode (direct state set vs dispatch)
- Sort bottom sheet uses its own local state instead of `feedState.sort`

**Phase to address:**
Phase addressing fixed header and sort bottom sheet. These are coupled changes -- do them together.

---

### Pitfall 10: Auto-Snippet Truncation Creates Orphaned HTML Entities and Broken Words

**What goes wrong:**
The milestone adds "auto-snippet: first 100-150 characters of post description." Naive truncation (`text.slice(0, 150)`) can:
- Cut in the middle of a word ("BTS announces the..." becomes "BTS announces th")
- Cut inside an HTML entity ("&amp;" becomes "&am")
- Cut inside a multi-byte Unicode character (Korean text like hangul jamo)
- Leave trailing whitespace or punctuation ("BTS releases new ..." with trailing space + ellipsis)

The existing `preview` field on `FeedItem` comes from the server scraper and may already be pre-truncated. Double-truncating (server truncates at 500 chars, client truncates at 150) is safe but may produce odd results if the server truncation already ended mid-sentence.

**Why it happens:**
Character count does not equal visual width, especially with:
- Korean characters (BTS fan content has significant Korean text) which are wider than Latin characters
- Emoji (common in fan content) which can be 1-4 JavaScript characters but render as a single glyph
- HTML entities that the scraper may have left in the preview text

**How to avoid:**
1. **Truncate at word boundaries.** Find the last space before the 150-character limit and truncate there.
2. **Handle the `preview` field, not raw HTML.** The server already strips HTML and provides plain text in `preview`. If the field contains HTML entities, run it through `DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })` first to decode entities to text.
3. **Use CSS truncation as the primary mechanism** instead of JS string manipulation:
   ```css
   .snap-card-snippet {
     display: -webkit-box;
     -webkit-line-clamp: 3;
     -webkit-box-orient: vertical;
     overflow: hidden;
   }
   ```
   CSS line-clamp handles word boundaries, multi-byte characters, and mixed scripts correctly. It also adapts to different viewport widths (wider screens show more text per line).
4. **JS truncation only as a fallback** for the `(Show More)` link logic, which needs to know if text IS truncated. Use a ref measurement approach (already done in `SnapCardImage` and `SnapCardText` with `el.scrollHeight > el.clientHeight`).

**Warning signs:**
- `.slice(0, 150)` in JavaScript without word boundary logic
- Korean text truncated mid-character (produces replacement character)
- Ellipsis ("...") added after CSS-truncated text (double ellipsis)
- `line-clamp` and JS truncation both applied simultaneously (competing behaviors)

**Phase to address:**
Phase addressing card layout changes. The snippet is part of the card content area.

---

## Minor Pitfalls

### Pitfall 11: Fixed Header z-index Conflicts with Bottom Sheet Portals

**What goes wrong:**
The fixed header needs to be above the feed content but below bottom sheet backdrops. Bottom sheets render via `createPortal(... , document.body)` -- they are outside the `.snap-page` DOM tree entirely. If the header uses a z-index within `.snap-page`, it is in a different stacking context than the portal. The header may appear above the bottom sheet backdrop, or the bottom sheet may appear behind the header, depending on stacking context inheritance.

**Prevention:**
The header should be inside `.snap-page` (in the flexbox flow, see Pitfall 3). Bottom sheets portal to `document.body` and use `z-index: 1000` (current FilterSheet pattern). The header's z-index should be lower than 1000 (e.g., 10). Since the header is inside `.snap-page` which has `position: fixed`, and the bottom sheet portals are direct children of `body`, the portals will naturally stack above -- as long as the header's z-index does not exceed the portal's.

---

### Pitfall 12: "(Show More)" Link Opening External URL Loses User Position

**What goes wrong:**
The milestone changes "(Show More)" from opening the SeeMoreSheet to opening the original source URL in a new tab. If implemented as `window.open(item.url, '_blank')`, on iOS Safari this may trigger a full page navigation instead of a new tab (depending on the user's Safari settings for pop-ups). The user returns to the feed and may lose their position if the PWA reloads.

**Prevention:**
Use `<a href={item.url} target="_blank" rel="noopener noreferrer">` instead of `window.open()`. The `<a>` tag with `target="_blank"` is more reliably handled by mobile browsers for opening new tabs. Also verify that the PWA's service worker caches the feed state so returning to the app does not trigger a full re-fetch.

---

### Pitfall 13: Engagement Stats Layout Breaks with Variable Data Availability

**What goes wrong:**
Different sources provide different engagement data. Reddit has upvotes + comments. YouTube has views + likes. Tumblr has notes. Bluesky has likes + reposts. A fixed engagement stats layout (e.g., three columns: likes | comments | views) leaves empty columns for sources that do not provide all three metrics. The layout looks broken with a date, one stat, and two empty spots.

**Prevention:**
The existing `SnapStatsBar` already handles variable stats by only rendering available data. Keep this pattern. Use a flex-wrap layout that adjusts to the number of available stats. Do not create fixed-width columns.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Touch overlay for video cards | Overlay steals all events including taps (Pitfall 1) | Handle taps via postMessage, not passthrough. Test on physical iOS device |
| Touch overlay for video cards | iOS Safari ignores pointer-events changes mid-gesture (Pitfall 2) | Never change pointer-events during a touch sequence. Overlay always captures |
| Touch overlay for video cards | Breaks right-swipe gesture (Pitfall 5) | Overlay replaces swipe handler for video cards, not layers on top |
| Fixed header | Viewport height calculation changes for all cards (Pitfall 3) | Use flexbox layout flow, not absolute positioning. Let flex: 1 handle height |
| Fixed header | Dead auto-hide code creates ghost tap targets (Pitfall 4) | Remove snap-reveal-zone, useControlBarVisibility, and hidden CSS in same commit |
| Sort bottom sheet | Conflicts with inline sort tabs (Pitfall 9) | Remove inline tabs when adding bottom sheet. Same commit |
| Bottom sheet extraction | Inconsistent dismiss behavior (Pitfall 6) | Extract BaseBottomSheet BEFORE building SortSheet |
| Media-centric cards | Text-only posts have empty media area (Pitfall 7) | Design text cards separately. Keep SnapCardText layout |
| Media-centric cards | Video aspect ratio changes in 60% container (Pitfall 8) | Use responsive aspect-ratio, not fixed 60% for all content |
| Card snippets | Truncation breaks Korean text/entities (Pitfall 10) | Use CSS line-clamp as primary, JS measurement for overflow detection only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Touch overlay + useVerticalPaging | Two handlers both calling `touchstart` on the same DOM subtree, creating duplicate gesture processing | Overlay is the sole touch handler for video cards. It calls paging/swipe callbacks directly |
| Touch overlay + useSwipeGesture | gestureClaimedRef protocol designed for 2 participants, overlay adds a 3rd | Overlay replaces swipe gesture on video cards, uses gestureClaimedRef same as swipe did |
| Fixed header + useVerticalPaging | `container.clientHeight` returns wrong value because header overlaps feed | Use flexbox layout so container height automatically excludes header |
| Fixed header + SnapControlBar removal | `.snap-reveal-zone` div left in DOM, intercepts taps for header buttons | Delete reveal zone div and CSS when adding fixed header |
| SortSheet + FilterSheet | Two sheets sharing state dispatch but using different open/close state management | Shared `BaseBottomSheet` with consistent animation, each sheet tracks its own isOpen state in parent |
| Media-centric layout + existing SeeMoreSheet | SeeMoreSheet opens for text overflow, but "(Show More)" now opens external URL | Clarify: does SeeMoreSheet still exist? If "(Show More)" opens URL, remove SeeMoreSheet for that use case |
| Card snippet + existing preview truncation | Server returns pre-truncated `preview` (500 chars), client further truncates to 150, double-truncation produces awkward text | Use CSS line-clamp for visual truncation, keep full `preview` in DOM for SEO/accessibility |

## "Looks Done But Isn't" Checklist

- [ ] **Touch overlay swipe works on iOS Safari:** Put finger on YouTube video, swipe up -- next card appears. Test on PHYSICAL iPhone, not simulator
- [ ] **Touch overlay tap works:** Tap on YouTube video area -- video toggles play/pause. Tap on mute button -- mute toggles. Mute button is above overlay in z-order
- [ ] **Right swipe on video card:** Swipe right on a video card -- source URL opens in new tab. Same behavior as image/text cards
- [ ] **Fixed header always visible:** Scroll through 10 cards -- header remains visible at top throughout. No hide/show animation
- [ ] **Card height correct:** First card content is fully visible below the header. No content hidden behind header. Bottom of card does not extend below viewport
- [ ] **No ghost tap targets:** Tap on header Sort button -- sort sheet opens. No invisible `snap-reveal-zone` intercepting the tap
- [ ] **Sort bottom sheet dismisses consistently:** Drag Sort sheet down 80px+ -- it dismisses. Same behavior as Filter sheet
- [ ] **Sort and Filter sheets use same animation:** Open Sort, note animation. Open Filter, note animation. They should be visually identical (same easing, same duration, same backdrop opacity)
- [ ] **Text-only cards look intentional:** Scroll to a text-only post -- layout looks designed, not broken. No empty media area
- [ ] **Korean text truncation:** Find a card with Korean text -- snippet truncates at a character boundary, not mid-glyph
- [ ] **useControlBarVisibility removed:** Search codebase for "useControlBarVisibility" -- zero results

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Touch overlay steals all events (Pitfall 1) | MEDIUM | Redesign overlay as gesture disambiguator. Handle taps via postMessage, not passthrough. ~4 hours |
| iOS pointer-events mid-gesture (Pitfall 2) | HIGH | Requires architectural change from "passthrough" to "capture everything" model. If the overlay was built around pointer-events toggling, it must be rewritten |
| Fixed header viewport calculation (Pitfall 3) | LOW | CSS-only fix: change header from position:absolute to flexbox flow participant. ~30 minutes |
| Zombie auto-hide code (Pitfall 4) | LOW | Delete useControlBarVisibility.ts, remove snap-reveal-zone div and CSS. ~20 minutes |
| Overlay breaks right-swipe (Pitfall 5) | MEDIUM | Refactor overlay to delegate swipe gestures. ~2 hours if the overlay is already built with modular callbacks |
| Bottom sheet inconsistency (Pitfall 6) | MEDIUM | Extract shared component retroactively. ~3 hours including updating all three sheets |
| Text-only card layout (Pitfall 7) | LOW | Keep SnapCardText unchanged. ~15 minutes decision |
| Video aspect ratio in 60% container (Pitfall 8) | LOW | Adjust container CSS to use aspect-ratio instead of fixed height. ~1 hour |
| Dual sort controls (Pitfall 9) | LOW | Remove inline sort tabs. ~15 minutes |
| Snippet truncation (Pitfall 10) | LOW | Switch to CSS line-clamp. ~30 minutes |

## Sources

- [W3C Pointer Events: touch-action on iframe behavior (GitHub Issue #325)](https://github.com/w3c/pointerevents/issues/325) -- specification clarification on iframe touch-action
- [W3C Pointer Events: touch-action none inconsistency (GitHub Issue #387)](https://github.com/w3c/pointerevents/issues/387) -- Chrome vs Firefox behavior differences
- [Prevent iFrames from eating touch events in iOS (Steven Waller)](https://stevenwaller.io/articles/prevent-iframes-from-eating-touch-events-in-ios/) -- webkit-overflow-scrolling workaround
- [Safari Web Content Guide: Handling Events (Apple Developer)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html) -- iOS Safari touch target lock model
- [SitePoint: Site scrolls on mobile except over iframe](https://www.sitepoint.com/community/t/site-scrolls-on-mobile-except-when-you-touch-over-a-video-in-iframe/99023) -- community post-mortem on iframe scroll passthrough
- [GitHub Gist: iframe overlay for touch event forwarding](https://gist.github.com/datchley/6793842) -- overlay pattern for iOS iframe touch events
- [Slick Carousel: Swipe not working with iframe (Issue #1668)](https://github.com/kenwheeler/slick/issues/1668) -- iframe swipe gesture blocking in carousels
- [Slick Carousel: Swiping YouTube iframes (Issue #564)](https://github.com/kenwheeler/slick/issues/564) -- YouTube-specific swipe issues
- [New viewport units: svh, lvh, dvh (Ahmad Shadeed)](https://ishadeed.com/article/new-viewport-units/) -- viewport unit reference for fixed header calculations
- [The trick to viewport units on mobile (CSS-Tricks)](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/) -- mobile viewport height pitfalls
- [web.dev: Large, small, dynamic viewport units](https://web.dev/blog/viewport-units) -- official viewport unit documentation
- [MDN: touch-action CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) -- touch-action specification and behavior
- [MDN: Using Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events) -- touch event handling reference
- [react-modal-sheet (Temzasse)](https://github.com/Temzasse/react-modal-sheet) -- compound component pattern for bottom sheets
- Codebase audit: `useVerticalPaging.ts` (touch gesture handling with gestureClaimedRef), `useSwipeGesture.ts` (right-swipe with axis locking), `SnapCardVideo.tsx` (iframe embedding with z-index layering), `FilterSheet.tsx` (bottom sheet with drag-to-dismiss), `SeeMoreSheet.tsx` (second bottom sheet with similar but not identical logic), `SnapControlBar.tsx` (inline sort tabs + filter icon), `useControlBarVisibility.ts` (auto-hide logic), `News.tsx` (snap-page layout with reveal zone), `App.css` (snap-page fixed inset, control bar positioning, reveal zone sizing)

---
*Pitfalls research for: BTS Army Feed v4.0 -- Enhanced Feed UI*
*Researched: 2026-03-04*
