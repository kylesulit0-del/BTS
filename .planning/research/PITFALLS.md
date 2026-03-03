# Pitfalls Research

**Domain:** Adding TikTok-style snap feed, global sort/filter state, and virtualized rendering to existing React content aggregation app
**Researched:** 2026-03-03
**Confidence:** HIGH (based on codebase audit, documented Framer Motion bugs, CSS spec behavior, iframe embed performance measurements, and community post-mortems)

## Critical Pitfalls

### Pitfall 1: Framer Motion + CSS Scroll Snap = Cross-Browser Flickering

**What goes wrong:**
Combining Framer Motion animations with CSS `scroll-snap-type` produces flickering and glitching on Chrome/Arc browsers, and separately on iOS Safari when any animated property triggers a repaint (opacity, transform) near a snap point. This is not a Framer Motion bug -- it is a WebKit/Blink rendering conflict where the browser's snap point recalculation fights with JavaScript-driven animation repaints. The Framer Motion maintainers closed the iOS issue as "wontfix" since it is a WebKit bug (issue #342), and the Chrome issue (issue #2315) was closed for insufficient reproduction.

The existing SwipeFeed component uses IntersectionObserver with CSS scroll-snap and no Framer Motion, so it works. Adding Framer Motion animations (entry/exit, spring physics, gesture handling) on top of CSS scroll snap will trigger these bugs.

**Why it happens:**
CSS scroll snap and JavaScript animation libraries both want to control scroll position. When Framer Motion animates a property that triggers layout/paint (opacity, transform, height), the browser simultaneously tries to snap the scroll container to the nearest snap point. The two systems fight, producing visual glitches. On iOS specifically, Safari's URL bar collapse/expand animation at the "UI snap point" compounds the issue.

**How to avoid:**
Choose ONE scroll control mechanism, not both:
- **Option A (recommended): CSS scroll snap only, Framer Motion for non-scroll animations.** Use native `scroll-snap-type: y mandatory` for the snapping behavior. Use Framer Motion only for content within each card (entry animations, gesture interactions on individual elements) -- never for the scroll container itself. Avoid animating opacity on elements inside the snap container on iOS.
- **Option B: Framer Motion scroll only, no CSS scroll snap.** Use `motion.div` with drag constraints and snap-to-index logic entirely in JS. More control but more code, and you lose the browser's native momentum scrolling.

Do NOT use both. The PROJECT.md says "Framer Motion physics" -- clarify early that this means Framer Motion for card content animations, not for the scroll snap itself.

**Warning signs:**
- Scroll container has both `scroll-snap-type` CSS and Framer Motion `drag` or `animate` props
- Flickering on Chrome that does not reproduce on Safari (or vice versa)
- Cards "jump" or "vibrate" when settling into snap position
- iOS users report the feed "bouncing" when the address bar collapses

**Phase to address:**
Phase 1 (Snap Feed Foundation) -- decide the scroll control mechanism before writing any snap feed code. Test on Chrome AND Safari AND iOS Safari before committing to an approach.

---

### Pitfall 2: 100vh on Mobile Does Not Mean "Full Screen"

**What goes wrong:**
The snap feed requires each card to fill the screen height. Using `height: 100vh` fails on mobile browsers because `100vh` includes the space behind the browser's address bar and navigation bar. On iOS Safari, the first card appears to have ~70px of content hidden behind the URL bar. When the user scrolls and the bar collapses, the viewport height changes, causing layout recalculation and visual "jumps" as all cards resize simultaneously. With `scroll-snap-type: y mandatory`, this resize can cause the browser to snap to a different card than expected.

The existing app does not use full-viewport sections, so this has never been a problem. Moving to 100vh snap cards will surface it immediately on mobile.

**Why it happens:**
The `vh` unit was defined before mobile browsers had collapsible address bars. `100vh` maps to the "largest possible viewport" (URL bar hidden), not the "current visible viewport." The newer `dvh` (dynamic viewport height) unit tracks the actual visible height but causes constant layout recalculation as the address bar animates, which is janky on older iPhones. Even `dvh` has recent iOS bugs (2025) where it no longer covers the full screen after certain iOS updates.

**How to avoid:**
Use `height: 100svh` (small viewport height) as the primary unit. `svh` maps to the smallest possible viewport (URL bar fully visible), so content never hides behind browser chrome. It does not resize when the bar collapses, eliminating layout jumps. Fallback chain:
```css
.snap-card {
  height: 100vh; /* fallback for old browsers */
  height: 100svh; /* stable, no resize jank */
}
```
Do NOT use `100dvh` for snap cards -- the constant resizing during address bar animation will fight with scroll snap and produce jitter. `svh` leaves a small gap when the bar is hidden, which is acceptable. The gap at the bottom is far less noticeable than layout jumps.

**Warning signs:**
- Content cut off at the bottom on mobile first load
- Cards visibly resize when scrolling starts (address bar collapsing)
- Snap position "jumps" after the first scroll on iOS
- Testing only on desktop where `100vh` works correctly

**Phase to address:**
Phase 1 (Snap Feed Foundation) -- the viewport height unit is foundational CSS. Get it wrong and every card layout is affected. Test on physical iOS and Android devices, not just browser DevTools responsive mode (which does not simulate address bar behavior).

---

### Pitfall 3: Iframe Embeds Destroyed and Recreated on Virtualization

**What goes wrong:**
Virtualized rendering means only the current card, previous card, and next card are in the DOM. When the user scrolls past a YouTube or TikTok embed, the iframe is unmounted. When they scroll back, it is remounted -- which means the iframe reloads from scratch. YouTube iframes take 500-700KB of JavaScript to initialize. TikTok iframes load ~500KB of JS plus up to 4MB of thumbnail images and can auto-download the entire video (~10MB). Each remount costs the user this bandwidth again and produces a visible loading spinner where they previously saw a playing video.

The current codebase already has lazy-loading via `useVideoAutoplay` (only mounts iframe when IntersectionObserver reports 50% visibility). But the current SwipeFeed renders ALL items in the DOM simultaneously -- there is no virtualization, so iframes are never unmounted once loaded. Adding virtualization breaks this assumption.

**Why it happens:**
Virtualization libraries (react-window, react-virtuoso, or manual implementations) remove DOM nodes that are off-screen to reduce memory usage. This is the correct behavior for text/image content. But iframes are stateful -- they have their own document, loaded scripts, and playback state. Unmounting an iframe destroys all of this. There is no way to "pause" an iframe's existence; it is either in the DOM or it is not.

**How to avoid:**
Do NOT use a general-purpose virtualization library. Instead, implement a **three-slot approach** manually:
1. Keep exactly 3 cards in the DOM: `current - 1`, `current`, `current + 1`.
2. When the user scrolls to a new card, shift the window: unmount the card that is now 2 positions away, mount the new adjacent card.
3. For iframe cards specifically, replace the iframe with a **static thumbnail + play button** when the card leaves the active slot. This is visually identical to the pre-load state and costs nothing to remount.
4. Only mount the actual iframe for the currently visible card. Adjacent cards show thumbnails only.

This means at most ONE iframe exists in the DOM at any time, eliminating the bandwidth and memory cost of iframe remounting. The existing `useVideoAutoplay` hook already handles play/pause -- extend it to handle mount/unmount of the iframe element itself.

**Warning signs:**
- Multiple YouTube/TikTok iframes exist simultaneously in the DOM (check DevTools Elements panel)
- Network tab shows repeated 500KB+ transfers when scrolling back and forth
- Visible loading spinners when returning to a previously-viewed video card
- Memory usage climbs as the user scrolls through more video content

**Phase to address:**
Phase 2 (Virtualization) -- this is the core technical challenge of the milestone. Design the three-slot system with iframe lifecycle management before implementing. The existing `VideoEmbed` component needs modification to accept a "thumbnail-only" mode.

---

### Pitfall 4: Scroll Position Lost When Filters Change

**What goes wrong:**
User is viewing card #15, opens the filter bar, selects "YouTube only." The filtered feed has different items. The feed jumps to card #1 (or worse, to an invalid position if the previous index exceeds the new array length). When they clear the filter, the feed jumps to card #1 again instead of returning to card #15. The user loses their place every time they interact with filters.

The current app handles this poorly too -- `News.tsx` uses local `useState` for filters and the feed simply re-renders with the filtered array. In list mode, the browser's natural scroll position partially preserves context. In snap mode, losing position is a complete UX failure because the user sees a totally different full-screen card.

**Why it happens:**
Filtering changes the items array, which changes the snap feed's children. React re-renders the feed, and the scroll container resets to position 0 (the default behavior when children change). Developers test with small datasets where being sent back to card #1 is barely noticeable. With 100+ items, it is infuriating.

**How to avoid:**
Implement a **position restoration strategy**:
1. Before applying a filter, save the current item's ID (not index).
2. After filtering, find the saved item in the new array. If it exists, scroll to that item's new index. If it does not exist (the current item was filtered out), scroll to the closest item by timestamp.
3. When clearing filters, restore to the saved item by ID.
4. Store position as item ID in the global sort/filter state, not as a scroll offset or array index.

Additionally, apply filters to the dataset without unmounting the snap feed component. Pass the filtered array as a prop update, not by conditionally rendering a new component. React's reconciliation will handle adding/removing cards if item keys are stable.

**Warning signs:**
- Feed always jumps to position 0 when any filter changes
- Filter state stored as array indices instead of item IDs
- Snap feed component unmounts and remounts when filters change (visible in React DevTools)
- No scroll-to-item logic in the snap feed component

**Phase to address:**
Phase 1 (Snap Feed Foundation) -- position restoration must be designed into the snap feed from the start. Retrofitting it requires reworking the scroll container's event handling.

---

### Pitfall 5: Global State Introduced via Context Causes Full-Feed Re-renders

**What goes wrong:**
The milestone requires global sort/filter state (persisting across scroll). The natural React approach is Context: create a `FeedFilterContext`, wrap the app, consume it in the filter bar and the feed. The problem: every Context value change re-renders ALL consumers. When the user toggles a filter, the entire feed re-renders -- every card, every iframe, every image. With 100+ cards in a non-virtualized feed, this is a visible freeze. Even with virtualization (3 cards), the re-render cascades through the snap feed container, potentially triggering a scroll position reset.

The current app uses local state in `News.tsx` (`useState` for filter, contentTypeFilter, viewMode). This works because the state and the consumer are in the same component. Moving to global state introduces the re-render propagation problem.

**Why it happens:**
React Context re-renders every component that calls `useContext(FeedFilterContext)` when ANY part of the context value changes. If your context stores `{ sort, sourceFilter, memberFilter, contentTypeFilter }` in one object, changing `sort` re-renders every component that reads `sourceFilter`, even though `sourceFilter` did not change. Developers discover this only when the feed has enough items to make the re-render visible.

**How to avoid:**
Use **Zustand** instead of Context for global filter/sort state. Zustand uses strict-equality selectors by default, so `useStore(state => state.sort)` only re-renders when `sort` actually changes. No Provider wrapper needed. The store is a module-level singleton.

```typescript
// feedStore.ts
import { create } from 'zustand';

interface FeedStore {
  sort: SortMode;
  sourceFilter: string | 'all';
  memberFilter: string[];
  contentTypeFilter: ContentType | 'all';
  setSort: (sort: SortMode) => void;
  setSourceFilter: (source: string | 'all') => void;
  // ...
}

export const useFeedStore = create<FeedStore>((set) => ({
  sort: 'recommended',
  sourceFilter: 'all',
  memberFilter: [],
  contentTypeFilter: 'all',
  setSort: (sort) => set({ sort }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  // ...
}));
```

Each component subscribes to only the slice it needs. The sort control reads `sort`. The source filter reads `sourceFilter`. The feed reads the filtered/sorted items via a derived selector. No unnecessary re-renders.

Zustand adds ~1KB gzipped to the bundle. It has zero dependencies. It is the standard recommendation for this exact problem in the React ecosystem as of 2025-2026.

**Warning signs:**
- `FeedFilterContext` provider wrapping the entire app
- Single context object with multiple filter fields
- Visible lag when toggling a filter on a large feed
- React DevTools Profiler showing 50+ components re-rendering on a single filter change

**Phase to address:**
Phase 1 (Sort/Filter State) -- the state management pattern must be decided before building the filter UI or the snap feed. Zustand is the recommendation. If staying dependency-free is a hard constraint, split Context into multiple atomic contexts (one per filter dimension) to minimize re-render scope, but this is more code for worse ergonomics.

---

### Pitfall 6: Mixed Content Heights Break Scroll Snap Mandatory

**What goes wrong:**
`scroll-snap-type: y mandatory` requires the browser to always land on a snap point. If a card's content exceeds the viewport height (a long text post, a tall image, or a text post with expanded "See More" content), the user cannot scroll within that card to read the overflow content. Every scroll gesture snaps to the next card, making the bottom of the current card unreachable.

The feed has mixed content: YouTube Shorts (9:16 video, fits naturally), TikTok embeds (9:16 video), Reddit image posts (variable aspect ratio), Reddit text posts (variable length), and news articles (title + preview text). A long Reddit discussion post with 500+ characters of preview text will overflow 100svh on a phone screen.

**Why it happens:**
CSS scroll snap mandatory mode does not care about content height. It only cares about snap points. If a child is taller than the scroll container, the browser cannot satisfy both "show the bottom of this child" and "always land on a snap point." The browser chooses snap, and the user loses access to overflow content.

**How to avoid:**
Enforce a hard maximum content height per card, with overflow handled by the "See More" pattern already planned in the milestone:
1. Card layout: fixed-height container (`100svh`), internal scroll disabled.
2. Video content: always fits (9:16 in a 9:16 viewport).
3. Image content: `object-fit: cover` with `max-height: 60svh`, allowing space for metadata.
4. Text content: CSS `line-clamp` or JS-measured truncation at a height that fits within the card. Overlay a "See More" gradient at the cutoff point.
5. "See More" opens a **modal/drawer overlay**, not an in-card expansion. Expanding content within the card would change the card height, breaking snap.

Do NOT use `scroll-snap-type: y proximity` as a workaround. Proximity mode lets the user stop between cards, which destroys the TikTok-style fullscreen experience. Mandatory is correct -- the content must fit within the card.

**Warning signs:**
- Text posts have no height cap and push content below the fold
- "See More" expands content in-place, changing card height
- `scroll-snap-type: proximity` used as a band-aid for overflow issues
- Cards have `overflow-y: auto` (internal scrolling) which conflicts with the outer snap scroll

**Phase to address:**
Phase 1 (Snap Feed Foundation) -- card layout constraints (max heights per content type, truncation rules, "See More" behavior) must be defined as part of the card component, not bolted on later. This directly depends on the card design system.

---

### Pitfall 7: Removing Existing Views Without a Rollback Path

**What goes wrong:**
The milestone replaces two existing view modes (swipe + list) with one new snap feed. If the snap feed implementation has issues on certain devices or browsers, there is no fallback. The swipe view code (`SwipeFeed.tsx`) and list rendering in `News.tsx` are deleted. Users on problematic devices see a broken experience with no alternative.

The PROJECT.md already specifies "Config feature flag for snap vs list view mode" as a requirement, but the temptation during development is to delete the old code early and build exclusively on the new architecture.

**Why it happens:**
Developers want a clean codebase without dead code paths. Maintaining two rendering modes during development feels like unnecessary overhead. The old SwipeFeed is architecturally different from the new snap feed, so "keeping it around" means maintaining two complete feed implementations. The natural instinct is to replace, not to coexist.

**How to avoid:**
1. **Keep `SwipeFeed.tsx` and list mode intact** until the snap feed is verified on all target devices (iOS Safari, Chrome Android, Chrome desktop, Safari desktop).
2. **Implement the feature flag first**, before building the snap feed. The flag should be in the group config:
   ```typescript
   features: {
     feedMode: 'snap' | 'list' | 'swipe', // default: 'snap'
   }
   ```
3. **Build the snap feed as a NEW component** (`SnapFeed.tsx`), not by modifying `SwipeFeed.tsx`. The snap feed has fundamentally different architecture (virtualization, position tracking, global state integration). Trying to evolve the swipe feed into a snap feed will create a hybrid that does neither well.
4. **Delete old view mode code only after** the snap feed has been tested on real devices and the feature flag has been in production for at least one deployment cycle.

**Warning signs:**
- `SwipeFeed.tsx` deleted in the same commit that adds `SnapFeed.tsx`
- No feature flag for view mode selection
- Snap feed bugs discovered on iOS after the old views are gone
- "Quick fix" of reverting to old code is impossible because it was deleted

**Phase to address:**
Phase 1 (Foundation) -- implement the feature flag and routing between view modes as the first task. This is cheap insurance against snap feed issues discovered in later phases.

---

### Pitfall 8: TikTok Embeds Are a Performance Catastrophe at Scale

**What goes wrong:**
Each TikTok iframe embed loads ~500KB of JavaScript, then fetches ~4MB of thumbnail images for "related" content, then auto-downloads the full video (~5-10MB). A single TikTok embed costs ~15MB of bandwidth before the user interacts. In a feed with 10 TikTok posts, the naive approach would load 150MB. Even with virtualization (1 iframe at a time), each time the user scrolls to a TikTok card, they wait for ~500KB of JS to parse and execute before seeing anything.

Unlike YouTube, TikTok provides no API to control the embedded player. There is no `postMessage` for play/pause/mute that works reliably. The current codebase's `useVideoAutoplay` hook sends TikTok `postMessage` commands, but these are undocumented and may stop working at any time.

**Why it happens:**
TikTok's embed script is designed for individual blog posts where one embed is the feature content. It is not designed for feeds with dozens of TikTok embeds. TikTok has no "lite embed" option (unlike YouTube's `youtube-nocookie.com` or lite-youtube-embed). The embed loads the full TikTok web player infrastructure regardless of whether the user intends to watch.

**How to avoid:**
1. **Never auto-mount TikTok iframes.** Show a static thumbnail (from oEmbed, already fetched server-side) with a play button overlay. Only mount the iframe when the user explicitly taps the play button.
2. **When the user scrolls away, unmount the iframe immediately.** Do not keep TikTok iframes alive in adjacent slots. Only YouTube gets the "keep in adjacent slot" treatment because its load cost is lower.
3. **Consider a "View on TikTok" link instead of embedding** for the initial release. The existing codebase already has a fallback pattern for this (`video-embed-fallback` in `VideoEmbed.tsx`). This eliminates the performance problem entirely at the cost of opening TikTok's app/site.
4. **If embedding, use a custom facade.** Render a `<div>` styled to look like a TikTok player (thumbnail, play button, author overlay) and only replace it with the real iframe on tap. This is the "lite embed" pattern that YouTube's community has adopted.

**Warning signs:**
- Network tab showing 10+ MB transfers on a single page load
- Visible jank (dropped frames) when scrolling to TikTok cards
- TikTok iframes auto-playing audio in adjacent (non-visible) cards
- Memory usage exceeding 500MB on mobile after scrolling through several TikTok embeds

**Phase to address:**
Phase 2 (Virtualization) -- TikTok embed strategy must be explicit in the virtualization design. The three-slot system for YouTube (thumbnail in adjacent, iframe in active) needs a stricter two-slot system for TikTok (thumbnail always, iframe only on tap in active slot).

---

### Pitfall 9: Sort Mode Changes Require Re-fetching from API but Code Assumes Client-Side Sort

**What goes wrong:**
The current API (`/api/feed`) returns pre-ranked items using the server's blend algorithm (recency + engagement + diversity). The milestone adds sort modes: Recommended, Newest, Oldest, Most Popular, Most Discussed. The developer assumes they can sort the already-fetched items client-side. But the API returns paginated results (default 20 items). Sorting 20 items client-side produces a misleading result -- the "Most Popular" item in the first 20 recommended results is not the globally most popular item. The user sees a subset sorted differently, not a truly different ordering.

**Why it happens:**
The `useFeed` hook currently fetches items and caches them in localStorage. Filtering (source, member, content type) is done client-side on the cached array, which works because filtering is a subset operation. Sorting is NOT a subset operation -- it requires the full dataset (or at least a server-side re-query with different ORDER BY). Developers treat sort like filter because both are "controls that change what you see."

**How to avoid:**
1. **Sort modes must hit the API.** Add a `sort` query parameter to `/api/feed`: `?sort=newest`, `?sort=popular`, `?sort=discussed`. The server applies the sort before pagination.
2. **Only "Recommended" uses the cached result.** Other sort modes fetch fresh data from the API with the sort parameter.
3. **Show a loading state during sort changes.** Unlike filter changes (which are instant, client-side), sort changes require a network round-trip. Display a brief skeleton or spinner on the current card while the new sort loads.
4. **Cache per sort mode.** The localStorage cache key should include the sort mode: `bts-feed-cache-recommended`, `bts-feed-cache-newest`, etc. This avoids re-fetching when switching back to a previously-used sort mode within the cache TTL.
5. **If the server API does not support sort parameters yet**, build the API endpoint first, before building the sort UI. Do not ship a client-side sort as a placeholder -- it teaches users to expect wrong results.

**Warning signs:**
- Sort options rearrange the same 20 items without fetching new data
- "Most Popular" shows items that are clearly not the most popular (they were just popular among the first page of recommended results)
- No loading state when switching sort modes
- Client-side `items.sort()` in the feed hook

**Phase to address:**
Phase 1 (Sort/Filter Controls) -- the API contract for sort parameters must be defined before building the sort UI. This requires a server-side change (new query parameter on `/api/feed`) that should be completed before or alongside the frontend sort controls.

---

### Pitfall 10: Accessibility Catastrophe -- Keyboard and Screen Reader Users Locked Out

**What goes wrong:**
A CSS scroll-snap fullscreen feed with custom gesture handling is inherently hostile to keyboard navigation and screen readers. Tab key does not naturally move between snap sections. Arrow keys may or may not trigger snap (depends on browser). Screen readers announce nothing useful about "card 5 of 150" because there are no ARIA landmarks. Focus gets trapped inside a card with no way to advance to the next card via keyboard. The mute/unmute and "See More" buttons are inside a full-screen container that a keyboard user cannot navigate to without scrolling, which they cannot do without a mouse/touch gesture.

**Why it happens:**
TikTok-style feeds are designed for touch-first, swipe-based interaction. Developers implement the touch/scroll experience and never test with a keyboard or screen reader. Accessibility is not just a "nice to have" -- the app is a PWA that may be used on desktop, and web accessibility is a legal requirement in many jurisdictions.

**How to avoid:**
1. **Add keyboard navigation.** Arrow Up/Down should scroll to previous/next card. Implement this with a `keydown` event listener on the snap container that calls `scrollTo()` with the target card's offset.
2. **Add ARIA attributes.** The snap container should have `role="feed"` and `aria-label="Content feed"`. Each card should have `role="article"`, `aria-posinset={index + 1}`, and `aria-setsize={total}`.
3. **Manage focus.** When a new card becomes active (via scroll or keyboard), move focus to that card's first interactive element. Use `tabindex="-1"` on card containers for programmatic focus.
4. **Announce sort/filter changes.** Use an `aria-live="polite"` region to announce "Showing 42 YouTube items" or "Sorted by Most Popular" when controls change.
5. **Test with VoiceOver (iOS/Mac) and screen reader keyboard navigation** before shipping.

**Warning signs:**
- Cannot navigate the feed using only a keyboard
- Screen reader announces nothing when scrolling between cards
- Tab key moves focus outside the feed entirely (to the navigation bar)
- No ARIA roles on the feed container or individual cards

**Phase to address:**
Phase 3 (Polish) -- accessibility can be layered onto a working feed, but the foundational ARIA structure (`role="feed"`, keyboard event listener) should be stubbed in Phase 1 and completed in the polish phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using CSS scroll-snap with no JS position tracking | Works immediately, zero JS | Cannot restore position on filter change, cannot programmatically scroll to an item, cannot report "item 5 of 150" | Never -- position tracking is required for this milestone's features |
| Rendering all items in DOM without virtualization | Simpler code, no mount/unmount lifecycle to manage | Memory grows linearly with feed size. 100 items = 100 DOM nodes = 100 images loaded = mobile browser crash | Only acceptable for feeds with <20 items. Must virtualize for production feed sizes |
| Using React Context for global filter state | Zero new dependencies, built into React | Re-renders every consumer on any state change. Performance degrades with feed size | Only if the app has <5 components consuming the context AND the feed is virtualized (so re-renders affect only 3 cards) |
| Client-side sort on paginated data | No API changes needed, works immediately | Produces incorrect results (sorting a subset instead of the full dataset). Users notice wrong rankings | Only as a temporary stub during development with a visible "Beta" label. Must be replaced with server-side sort before launch |
| Keeping iframe mounted in non-visible cards | No reload delay when scrolling back | Memory leak (each iframe is a full browser context). 5 YouTube iframes = ~3.5GB of JS heap on mobile | Never for TikTok embeds. Acceptable for max 1 YouTube iframe in an adjacent slot |
| Inline styles for snap card dimensions | Fast to prototype | Cannot respond to viewport changes, media queries do not apply, no design token integration | Only in Phase 1 prototyping. Move to CSS custom properties before Phase 2 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| YouTube iframe + scroll snap | Mounting iframe triggers scroll position change because iframe loading changes element height | Set explicit `height` and `width` on iframe container BEFORE iframe mounts. Use `aspect-ratio: 9/16` on the wrapper, not on the iframe itself |
| TikTok player postMessage API | Assuming `postMessage` commands are reliable for play/pause/mute | TikTok's player postMessage is undocumented and breaks without warning. Treat TikTok embeds as uncontrollable. Use tap-to-load facade instead of autoplay |
| Framer Motion `AnimatePresence` + virtualized list | Wrapping virtualized items in `AnimatePresence` for exit animations delays unmount, keeping extra items in DOM | Skip exit animations for cards leaving the three-slot window. Only use `AnimatePresence` for overlay elements (modals, "See More" drawer) that need graceful exit |
| IntersectionObserver + CSS scroll snap | Observer fires multiple times during snap animation (element enters, exits, re-enters as snap settles) | Debounce the observer callback by 100ms, or use `threshold: [0.5]` and only act on `isIntersecting: true` with `intersectionRatio > 0.5`. The current `useVideoAutoplay` hook does this correctly -- reuse its pattern |
| Zustand store + React 19 concurrent features | Reading from external store during concurrent render can cause tearing (different components see different state versions) | Use `useSyncExternalStore` under the hood (Zustand v4+ does this automatically). Verify you are on Zustand v4.4+ which has React 19 compatibility |
| Server API sort parameter + localStorage cache | Caching sorted results under a single key means switching sort modes returns stale data from the wrong sort | Use sort-specific cache keys: `bts-feed-recommended`, `bts-feed-newest`, etc. Invalidate all caches on force refresh |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all feed images eagerly | Initial page load transfers 5-20MB of images. LCP over 5 seconds | Use `loading="lazy"` on all images except the first visible card. The current `FeedCard` already uses `loading="lazy"` -- keep this pattern | With more than 5 image-heavy cards in the initial DOM |
| Multiple video iframes simultaneously | Memory usage exceeds 1GB on mobile. Browser throttles background tabs. Fan noise on laptop | Maximum ONE active iframe. Adjacent slots show thumbnails only. Unmount iframe when card is 2+ positions away | With more than 2 iframe embeds visible/mounted simultaneously |
| Re-rendering entire feed on scroll | Scroll handler updates state on every pixel, triggering React re-render 60x/second | Use refs for scroll position tracking, not state. Only update state (current card index) on snap settle. Use `requestAnimationFrame` for any scroll-linked visual updates | Immediately if scroll position is stored in React state |
| Filtering 500+ items client-side on every keystroke | Visible freeze when typing in a search/filter field | Debounce filter application by 200ms. Alternatively, compute filtered array in `useMemo` with proper dependency array | With feeds over 100 items on low-end mobile devices |
| Fetching next page of results inside scroll handler | Rapid scrolling triggers dozens of API calls as the user blows through items | Implement a fetch gate: only fetch next page when the user is within 3 items of the end AND no fetch is in progress AND previous fetch returned `hasMore: true` | With any feed that has more than one page of results |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Embedding user-controlled URLs in iframes without validation | Malicious content could be injected if a scraped URL is replaced with a phishing site or XSS payload | Validate iframe `src` against a whitelist of domains: `youtube.com`, `tiktok.com`. The current `VideoEmbed` constructs URLs from `videoId` -- keep this pattern, never pass raw URLs to iframe src |
| Storing filter/sort state in URL query parameters without sanitization | XSS via crafted URL: `?filter=<script>alert(1)</script>` | Validate URL parameters against known enum values before using them. Never render URL parameters directly into the DOM |
| Trusting `postMessage` from embedded iframes | A compromised or malicious iframe could send fake postMessage events to manipulate app state | Always check `event.origin` in message event handlers. The current `useVideoAutoplay` correctly targets specific origins -- maintain this pattern |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator in snap feed | User does not know how far through the feed they are, or how many items remain. Feed feels infinite and aimless | Show a subtle progress bar (thin line at top or dots on the side) indicating position. Or show "5 of 42" text, similar to the current SwipeFeed counter |
| Filter bar overlaps first card | Full-screen card + fixed filter bar = content hidden behind the bar. User sees a cropped image/video | Inset the first card's content by the filter bar height. Or make the filter bar transparent/overlay with the card's content area aware of the inset |
| Filters change the feed with no animation or transition | User applies filter, feed abruptly shows different content. Feels jarring and disorienting | Brief crossfade (200ms opacity transition) when the feed content changes. Or slide the filter bar in/out to signal the state change |
| Videos auto-play with sound | User opens the app in a quiet environment, video blasts audio. Embarrassing and hostile | Always start muted (current behavior is correct). Keep the mute toggle visible. Remember user's mute preference across sessions (localStorage) |
| "See More" opens a new page/route | User taps "See More" on a long text post, navigates to a new page. When they press back, they lose their position in the feed | "See More" should be a modal/drawer overlay that appears on top of the current card. Dismiss returns to the exact same card. No route change |
| No way to share a specific card | User wants to share a great post they found. The app URL always points to the feed, not a specific item | Add deep linking: `#item-{id}` in the URL when a card becomes active. Opening a shared link scrolls to that item |

## "Looks Done But Isn't" Checklist

- [ ] **Snap feed scrolls:** Scrolls and snaps -- verify it works on iOS Safari with address bar collapsing, Chrome Android with pull-to-refresh, and landscape orientation
- [ ] **Virtualization works:** Only 3 cards in DOM -- verify by scrolling to card 50 and checking DOM node count in DevTools. Should be 3 card nodes, not 50
- [ ] **Video plays:** YouTube embed plays in active card -- verify that scrolling away pauses it AND that scrolling back does not reload the iframe (shows thumbnail, not spinner)
- [ ] **Filters work:** Source filter applied -- verify scroll position is preserved (or smartly restored), not reset to card 1
- [ ] **Sort works:** Switch to "Most Popular" -- verify results are actually the most popular from the FULL dataset (check the API response), not just the most popular from the first page of recommended
- [ ] **Feature flag works:** Set `feedMode: 'list'` in config -- verify the old list view renders correctly with all filter/sort controls still working
- [ ] **Memory stable:** Scroll through 50+ items -- verify memory usage in DevTools does not grow unboundedly. Should plateau after the initial 3-card window is established
- [ ] **Keyboard navigation:** Unplug mouse, use only keyboard -- verify you can navigate between cards (arrow keys), activate "See More" (Enter), and operate filter controls (Tab + Enter)
- [ ] **Deep link works:** Copy the URL while viewing card 15 -- verify opening that URL in a new tab scrolls to card 15 (or the closest available item)
- [ ] **TikTok embed does not auto-load:** Scroll to a TikTok card -- verify the iframe does NOT mount until user taps play. Thumbnail + play button should be the default state

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Framer Motion + CSS snap flickering (Pitfall 1) | MEDIUM | Remove Framer Motion from the scroll container. Keep it only for card content animations. This is a code change, not an architecture change |
| 100vh mobile viewport issues (Pitfall 2) | LOW | CSS-only fix: replace `100vh` with `100svh` with fallback. No JS changes needed |
| Iframe remount on virtualization (Pitfall 3) | HIGH | Requires redesigning the virtualization strategy to use thumbnail facades. Affects VideoEmbed component, snap feed container, and the autoplay hook |
| Scroll position lost on filter (Pitfall 4) | MEDIUM | Add position tracking to the Zustand store and scroll-to-item logic. Requires modifying the snap feed and the filter state management |
| Context re-render performance (Pitfall 5) | MEDIUM | Replace Context with Zustand. ~2 hours of refactoring if the state shape is clean. Harder if Context was deeply integrated |
| Mixed heights break snap (Pitfall 6) | LOW | Add `line-clamp` and max-height to card content. CSS-only fix for text. May need to redesign "See More" from in-card expansion to modal |
| No rollback to old views (Pitfall 7) | HIGH | If old view code was deleted, must be recovered from git history and re-integrated. Feature flag plumbing must be added retroactively |
| TikTok embed performance (Pitfall 8) | LOW | Switch to tap-to-load facade. The existing fallback pattern in VideoEmbed.tsx is 80% of the solution |
| Client-side sort on paginated data (Pitfall 9) | MEDIUM | Requires API endpoint change (add sort parameter) and cache key restructuring. ~1 day of work |
| Accessibility missing (Pitfall 10) | MEDIUM | ARIA attributes and keyboard handlers can be added incrementally. Each card type needs testing individually |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Framer Motion + scroll snap conflict | Phase 1: Snap Feed Foundation | Scroll container uses ONLY CSS scroll-snap. Framer Motion not imported in the snap container component |
| 100vh mobile viewport | Phase 1: Snap Feed Foundation | Cards use `100svh` with `100vh` fallback. Tested on physical iPhone with address bar visible |
| Iframe destroy/recreate | Phase 2: Virtualization | DOM inspector shows max 1 iframe at any time. Scrolling back shows thumbnail, not loading spinner |
| Scroll position on filter change | Phase 1: Snap Feed + Sort/Filter | Apply filter, verify feed does not jump to card 1. Current item ID preserved in state |
| Context re-render cascade | Phase 1: Sort/Filter State | Zustand store created. React DevTools Profiler shows only affected components re-render on filter change |
| Mixed content height overflow | Phase 1: Card Layout | Long text post truncated with "See More" overlay. No card exceeds 100svh. "See More" opens modal, not in-card expansion |
| No rollback path | Phase 1: Feature Flag | `feedMode` config flag routes to old list view or new snap feed. Both render correctly |
| TikTok embed weight | Phase 2: Virtualization | TikTok cards show thumbnail + play button by default. iframe mounts only on tap. Network tab shows no TikTok JS until user taps |
| Client-side sort mistake | Phase 1: API Contract | API endpoint accepts `?sort=` parameter. Sort UI triggers API fetch, not client-side re-sort |
| Accessibility gaps | Phase 3: Polish | Keyboard-only navigation works (arrow keys between cards). Screen reader announces card position. ARIA roles present |

## Sources

- [Framer Motion + CSS scroll-snap flickering on Chrome (GitHub Issue #2315)](https://github.com/framer/motion/issues/2315) -- confirmed cross-browser rendering conflict
- [Framer Motion + CSS scroll-snap flickering on iOS (GitHub Issue #342)](https://github.com/framer/motion/issues/342) -- closed as WebKit bug, opacity animation workaround
- [CSS scroll-snap mandatory vs proximity with variable heights (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap/Basic_concepts) -- specification behavior
- [Why Not to Use CSS Scroll Snap (Alvaro Trigo)](https://alvarotrigo.com/blog/why-not-to-use-css-scroll-snap/) -- limitations with variable heights, mouse interaction, feature gaps
- [iOS Safari 100vh address bar problem and dvh/svh units (Medium)](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a) -- viewport unit comparison
- [New iOS Safari dvh bugs (Apple Developer Forums)](https://developer.apple.com/forums/thread/803987) -- 2025 regression with dvh
- [Handling iOS Safari toolbar for full-height content (sabhya.dev)](https://www.sabhya.dev/handling-ios-safari-toolbar-for-full-height-web-content) -- practical solutions
- [TikTok embed performance: 500KB JS + 4MB thumbnails + 10MB video per embed (Justin Ribeiro)](https://justinribeiro.com/chronicle/2022/07/15/terrible-tiktok-embed-web-performance-and-my-imperfect-web-component-solution/) -- measured performance data
- [Building TikTok-style video feed: virtualization, preloading, playback management (Mux)](https://www.mux.com/blog/slop-social) -- three-system architecture for video feeds
- [Lite YouTube Embed: 224x faster than standard iframe (npm)](https://www.npmjs.com/package/react-lite-youtube-embed) -- facade pattern for YouTube
- [React iframes back-navigation bug and state loss (Aleksandr Hovhannisyan)](https://www.aleksandrhovhannisyan.com/blog/react-iframes-back-navigation-bug/) -- iframe unmount/remount lifecycle
- [React State Management in 2025: Zustand recommendation for filter state (DeveloperWay)](https://www.developerway.com/posts/react-state-management-2025) -- Context vs Zustand performance
- [Create TikTok/YouTube Shorts snap scroll in React (DEV Community)](https://dev.to/biomathcode/create-tik-tokyoutube-shorts-like-snap-infinite-scroll-react-1mca) -- implementation pattern
- [Scroll position restoration strategies in React (GitHub Gist)](https://gist.github.com/jeffijoe/510f6823ef809e3711ed307823b48c0a) -- save/restore patterns
- [CSS Scroll Snapping case study (Smashing Magazine)](https://www.smashingmagazine.com/2023/12/css-scroll-snapping-aligned-global-page-layout-case-study/) -- real-world scroll snap implementation
- [Motion for React: hybrid engine with Web Animations API (motion.dev)](https://motion.dev/docs/react-motion-component) -- current Framer Motion architecture
- Codebase audit: `SwipeFeed.tsx` (IntersectionObserver + scroll-snap), `VideoEmbed.tsx` (iframe lazy loading + TikTok/YouTube postMessage), `useVideoAutoplay.ts` (one-at-a-time enforcement), `useFeed.ts` (localStorage caching + client-side filtering), `News.tsx` (local state for filters), `FeedFilter.tsx` (source filter tabs), `api.ts` (paginated API with source/contentType params, no sort param)

---
*Pitfalls research for: BTS Army Feed v3.0 -- Immersive Feed Experience*
*Researched: 2026-03-03*
