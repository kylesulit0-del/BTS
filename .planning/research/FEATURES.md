# Feature Research

**Domain:** Immersive vertical snap feed, sort/filter controls, content virtualization, and config-driven theming for fan content aggregation PWA
**Researched:** 2026-03-03
**Confidence:** HIGH (CSS scroll-snap and Intersection Observer are mature web standards; sort/filter UX patterns well-established; virtualization libraries actively maintained)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users of a TikTok/Shorts-style feed expect. Missing any of these breaks the immersive experience.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Full-viewport vertical snap scrolling** | Core TikTok/Shorts/Reels pattern -- one post fills the screen, swipe to advance. Users exposed to this in every short-form app since 2020. Without snap, the feed feels like a basic list. | MEDIUM | CSS `scroll-snap-type: y mandatory` on container with `height: 100dvh` children. Use `dvh` (dynamic viewport height) not `vh` to handle mobile address bar. `scroll-snap-align: start` on each item. Pure CSS handles the physics -- no JS animation library needed for the snap itself. **Existing `SwipeFeed.tsx` already uses IntersectionObserver for index tracking** -- same pattern applies, just with full-viewport items. |
| **Current item detection** | Need to know which item is "active" for video autoplay/pause, analytics, and UI state (progress indicator). | LOW | IntersectionObserver with `threshold: 0.5` -- exactly what `SwipeFeed.tsx` already does. The existing pattern works. For browsers supporting it, `scrollsnapchange` event (Chrome 129+, Edge 129+) provides native snap target detection, but **not cross-browser** (no Firefox/Safari). Use IntersectionObserver as primary, snap events as progressive enhancement. |
| **Video autoplay on visible, pause on scroll away** | Every short-form feed autoplays video when snapped into view and pauses when scrolled past. Users would be confused by a static video thumbnail in a snap feed. | LOW | **Already implemented** in `VideoEmbed.tsx` + `useVideoAutoplay.ts` hook. Uses IntersectionObserver to mount/unmount iframe when in/out of viewport. The existing system handles YouTube Shorts and TikTok iframes with mute-by-default and unmute button. No changes needed to the autoplay mechanism itself -- just ensure the snap feed container is the IntersectionObserver root. |
| **Sort controls** | Users need to change feed ordering. "Recommended" (default blend algorithm) is good for discovery, but sometimes you want newest content, or the most popular. Without sort, users feel trapped in an opaque algorithm. | LOW | Dropdown or segmented control with options: Recommended (default, blend score), Newest (publishedAt DESC), Most Popular (engagement score DESC), Most Discussed (comment count DESC). API already supports `page` and `limit` params. Add `sort` query param to API (`GET /api/feed?sort=newest`). Client-side: single state variable, re-fetch on change. |
| **Filter by source** | "Show me only Reddit" or "Show me only YouTube." Users already have this via `FeedFilter.tsx` source tabs. Must carry forward into snap feed. | LOW | **Already implemented** in `FeedFilter.tsx`. Maps config sources to filter tabs. Current implementation passes `filter` state to `useFeed` hook which filters client-side or via API `source` param. Just needs visual redesign to fit the snap feed control bar. |
| **Filter by member** | "Show me only Jimin content." Users already have this via `BiasFilter.tsx` member chips. Must carry forward. | LOW | **Already implemented** in `BiasFilter.tsx` + `useBias.ts`. Keyword-based matching against member aliases. Same hook, new visual treatment in the control bar. |
| **Filter by content type** | "Show me only fan art" or "Show me only videos." Users already have content type pills in `News.tsx`. | LOW | **Already implemented** as content type pills in `News.tsx`. LLM-classified `contentType` field on each item. Same filtering logic, integrated into unified control bar. |
| **Collapsed long text with "See More"** | Full-viewport cards have limited space. Long Reddit post titles, news article descriptions, Tumblr text posts can overflow. Need truncation with expansion capability. | LOW | CSS `display: -webkit-line-clamp` for multi-line truncation (3-4 lines max). Gradient fade overlay at bottom of text area. "See More" button expands text within the card without navigating away. When expanded, card scrolls internally (but snap still works on the parent container). Standard pattern in every social feed app. |
| **Source link to original content** | Users need to reach the original Reddit post, YouTube video page, news article. The feed is a discovery surface, not a replacement for the source. | LOW | **Already exists** as "View original" link in `FeedCard.tsx` and "Read More" in `SwipeFeed.tsx`. In snap feed, use a small icon button (external link icon) positioned consistently -- bottom-right corner or in the action bar area. Opens in new tab. |
| **Loading states and skeleton screens** | First load, filter changes, and sort changes need visual feedback. Empty screen while loading breaks trust. | LOW | **Already implemented** in `SkeletonCard.tsx`. Adapt to full-viewport snap card skeleton. Single skeleton card filling the viewport with shimmer animation. |
| **Empty state for no results** | When filters produce zero results, users need clear feedback and a path to recovery ("Try removing filters"). | LOW | **Already implemented** in `News.tsx` empty state. Same pattern, adapted for snap feed viewport. |

### Differentiators (Competitive Advantage)

Features that make this feed feel premium compared to "just scrolling Reddit" or a basic RSS reader.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Virtualized rendering (3-item window)** | Only mount current + previous + next items in the DOM. A feed with 100+ items, each potentially containing an iframe video embed, would destroy performance without virtualization. This is what makes the snap feed usable on mobile over 5G. | MEDIUM | Two approaches: (1) **CSS scroll-snap + manual mount/unmount** -- keep the scroll container with all placeholders but only render content for items within a 3-item window around the current index. Simpler, works with native CSS snap. (2) **TanStack Virtual** -- headless virtualization that only renders visible items. More robust for large lists but requires careful integration with scroll-snap. **Recommend approach 1** because TanStack Virtual's dynamic sizing and scroll-snap interaction is underexplored territory. Manual 3-item windowing with IntersectionObserver is proven in the existing codebase and gives full control. Mount empty `div` placeholders with correct height (`100dvh`) for all items, render actual content only for `[current-1, current, current+1]`. |
| **Unified sort/filter control bar** | Single compact bar replacing the current 3-row filter layout (source tabs + content type pills + bias filter). Consolidates all controls into a slim, persistent overlay that doesn't waste viewport space. | MEDIUM | Horizontally scrollable pill/chip bar anchored to top of viewport (below status bar on mobile). Sections: Sort dropdown (leftmost), Source pills, Content Type pills, Member chips. Active filters highlighted. Filter count badge when filters are applied but collapsed. The bar should auto-hide on scroll-down and reappear on scroll-up (or tap top of screen) to maximize immersive space. |
| **Framer Motion entrance/exit animations** | Cards animate in with subtle slide-up and fade. When filter changes, outgoing cards exit smoothly. Creates a polished, app-like feel that basic CSS snap alone cannot achieve. | MEDIUM | `AnimatePresence` wrapper around the feed. `motion.div` cards with `initial`, `animate`, `exit` props. Entrance: `y: 50, opacity: 0` -> `y: 0, opacity: 1`. Exit: `opacity: 0, scale: 0.95`. Spring physics for natural deceleration. **Framer Motion (now just "Motion") is a new dependency** -- currently not in `package.json`. ~30KB gzipped. Worth it for the polish. Use `layoutId` for smooth card transitions when filters change. |
| **Adaptive card layouts per content type** | Video content gets a full-bleed player. Image posts (fan art, memes) get a large image with text overlay at bottom. Text posts (discussions, news) get a reading-focused layout with larger typography. Not all content deserves the same card. | MEDIUM | 3 layout variants driven by `contentType` + `videoType` fields: (1) **Video layout**: full-viewport embedded player (YouTube Shorts/TikTok iframe) with title/meta overlay at bottom, semi-transparent gradient. (2) **Image layout**: large background image with title/meta overlaid at bottom, gradient fade. (3) **Text layout**: centered title, preview text, source branding, engagement stats. All layouts share the same outer container (100dvh snap child) but differ internally. |
| **Global filter/sort state persistence** | When you scroll to item 47, apply a "YouTube only" filter, the feed re-renders with only YouTube items and you start from the top of the filtered list. When you remove the filter, you return to the full feed. Filters and sort persist across the session and survive page refreshes. | LOW | Store filter/sort state in `localStorage` (same pattern as existing bias storage in `useBias.ts`). On filter change: re-fetch or re-filter the local cache, reset scroll position to top. Key UX decision: **do not try to maintain scroll position across filter changes** -- it creates jarring jumps. Always reset to item 0 when filters change. |
| **Engagement stats overlay** | Upvotes, comments, views displayed as a compact vertical action bar (like TikTok's right-side column). Tap-friendly icons with abbreviated numbers. Feels native to the immersive format. | LOW | Vertical stack of icon+count positioned at bottom-right of each card. Reuse existing `abbreviateNumber()` utility from `formatNumber.ts`. SVG icons already exist in `FeedCard.tsx`. Just re-layout for vertical orientation. Add share button (Web Share API with clipboard fallback) for social spreading. |
| **Config feature flag: snap vs list mode** | Not all fandoms want the snap feed. Some prefer a traditional scrolling list. Config `features.feedMode: 'snap' | 'list'` controls which view renders. Supports the clone-and-swap white-label model. | LOW | Add `features` object to `GroupConfig` type in `config/types.ts`. `features.feedMode` defaults to `'snap'`. `News.tsx` conditionally renders `SnapFeed` or `FeedList` based on config. The existing `viewMode` toggle in `News.tsx` can become an override when config allows both. |
| **Styling tokens in config for white-label theming** | Current `ThemeConfig` has 3 colors (`primaryColor`, `accentColor`, `darkColor`). Not enough for full white-label theming. Need spacing, border radius, font family, gradient definitions to truly differentiate clones. | MEDIUM | Extend `ThemeConfig` with a `tokens` object containing CSS custom property overrides. Apply via `applyTheme.ts` which already sets CSS variables. Layers: (1) **Global primitives** -- `--color-purple-600: #562B8B` (2) **Semantic tokens** -- `--color-primary: var(--color-purple-600)`, `--surface-bg: #0a0a0a` (3) **Component tokens** -- `--card-bg: var(--surface-bg)`, `--filter-pill-bg: rgba(255,255,255,0.1)`. Config only needs to override semantic layer. Component layer derives automatically. |
| **Haptic feedback on snap** | Subtle vibration on each snap for supported devices. Reinforces the physical feel of "clicking into place." | LOW | `navigator.vibrate(10)` on snap detection (IntersectionObserver callback). Gated behind `navigator.vibrate` feature detection. iOS Safari does not support Vibration API, so this is Android-only enhancement. Negligible code, noticeable polish. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Framer Motion drag-based navigation** | "Use drag gestures instead of scroll for swipe-to-advance, like a real app" | Conflicts with native scroll. Framer Motion's `drag="y"` hijacks touch events, breaking native scroll momentum, rubber-band overscroll, and scroll-snap physics. GitHub issue #185 on Motion repo documents scroll/drag conflict. Creates an uncanny valley where the feed scrolls worse than native. | Use native CSS scroll-snap for navigation. Use Framer Motion only for entrance/exit animations and micro-interactions (card reveal, filter transitions). Let the browser handle scroll physics -- it does it better than any JS library. |
| **Infinite scroll with auto-fetch** | "Load more items automatically as I scroll near the bottom" | In a snap feed where each item is 100dvh, the user snaps one item at a time. Traditional infinite scroll (fetch when near bottom) fires too late -- user is already at the last item. Also, the current API returns the full ranked feed in one response (no cursor-based pagination for incremental loading). Infinite scroll also prevents users from reaching the footer/nav. | **Prefetch strategy**: fetch all items upfront (current behavior), render them in the virtualized window. If the feed grows beyond 200+ items, implement explicit "Load more" at the end of the feed. The API already supports `page` param for this. But with 30-day content windowing and LLM filtering, total item counts should stay manageable (<300 items). |
| **Pull-to-refresh** | "Pull down to refresh like a native app" | Conflicts with scroll-snap behavior. When the user is at item 0 and pulls down, the browser wants to do overscroll/bounce, not trigger a custom refresh. Implementing pull-to-refresh with scroll-snap requires intercepting touch events, fighting the browser, and creating inconsistent behavior. | Refresh button in the control bar. Alternatively, auto-refresh when the user returns to the feed tab after 5+ minutes (background timer + visibility API). The existing `useFeed.refresh()` function handles cache invalidation. |
| **Horizontal swipe for actions** | "Swipe left to dismiss, swipe right to save" | Adds horizontal gesture handling that conflicts with the browser's back/forward swipe gestures (iOS Safari, Android Chrome). Creates confusion: did I mean to go back a page or dismiss a card? | Use explicit tap targets for actions. "View original" button, share button, member chip tap. Vertical snap for navigation, taps for actions. Clear gesture vocabulary. |
| **Complex animation sequences per card** | "Each card should have a unique entry animation based on content type" | Performance death on mid-range phones. Multiple simultaneous Framer Motion animations while scrolling causes jank. GPU memory pressure from composited layers. Battery drain from constant animation. | One simple, consistent entrance animation for all cards (fade + slide-up). Let the content itself be the visual variety (video vs image vs text layouts). Subtlety over spectacle. |
| **Full-screen video player mode** | "Tap video to go full-screen with controls" | iframe-embedded YouTube/TikTok players already have their own fullscreen buttons. Building a custom fullscreen player layer on top of third-party iframes creates double-controls confusion and iframe sandboxing issues. | Let the embedded player's native fullscreen button handle this. YouTube iframe API supports fullscreen. TikTok player has its own controls. The snap feed IS the full-screen experience for non-video content. |
| **Offline feed caching (Service Worker)** | "Let me browse the feed without internet" | The feed content is third-party URLs, thumbnails from CDNs, and iframe video embeds. Caching the feed JSON is trivial, but the content itself (images, videos) cannot be meaningfully cached offline. Users would see cards with broken images and non-playing videos. | Cache the feed JSON in localStorage (already done, 5-min TTL in `useFeed.ts`). Show cached items when offline with a "You're offline -- content may be stale" banner. Do not try to cache media assets. |
| **Dark/light mode toggle** | "Let me switch between dark and light themes" | The app is designed dark-first (matching TikTok/Shorts aesthetic). Adding a light mode doubles the CSS surface area and requires testing every component in both modes. Fan apps in this space are universally dark. | Ship dark mode only. The `ThemeConfig` token system supports a future light mode if demand materializes, but do not build it now. |

## Feature Dependencies

```
[CSS Scroll-Snap Feed Container]
    +---required-by---> [Current Item Detection (IntersectionObserver)]
    +---required-by---> [Virtualized 3-Item Window]
    +---required-by---> [Haptic Feedback on Snap]

[Current Item Detection]
    +---required-by---> [Video Autoplay/Pause] (already implemented, needs integration)
    +---required-by---> [Engagement Stats Overlay] (knows which card is active)

[Adaptive Card Layouts]
    +---required-by---> [Collapsed Text with "See More"]
    +---required-by---> [Video Layout] (full-bleed player)
    +---required-by---> [Image Layout] (background image + text overlay)
    +---required-by---> [Text Layout] (reading-focused)

[Sort/Filter Control Bar]
    +---requires-------> [Sort API param] (backend change: add sort to GET /api/feed)
    +---requires-------> [Filter state management] (existing useFeed + useBias hooks)
    +---required-by---> [Global Filter/Sort State Persistence]
    +---required-by---> [Auto-hide on scroll / show on scroll-up]

[Framer Motion (new dependency)]
    +---required-by---> [Card Entrance/Exit Animations]
    +---required-by---> [Filter Transition Animations]

[Config Feature Flags]
    +---requires-------> [GroupConfig type extension]
    +---required-by---> [Snap vs List Mode Toggle]
    +---required-by---> [Styling Tokens / White-label Theming]

[ThemeConfig Token Extension]
    +---requires-------> [applyTheme.ts refactor] (apply semantic + component tokens as CSS vars)
    +---required-by---> [White-label Theming]

[Sort API Param] --conflicts-- [Client-side sorting fallback]
    (When API unavailable, client-side must sort locally with same logic)
```

### Dependency Notes

- **Scroll-snap container is the foundation.** Everything else (virtualization, item detection, video autoplay) depends on the snap feed container existing with correct CSS. Build this first.
- **Current item detection reuses existing pattern.** The IntersectionObserver logic in `SwipeFeed.tsx` is directly transferable. Not a new capability, just a re-integration.
- **Sort API param is a backend change.** The existing `GET /api/feed` endpoint supports `page`, `limit`, `source`, `contentType` params. Adding `sort` is a simple query modification to the Drizzle ORM query in the server. Client-side fallback needs matching sort logic.
- **Framer Motion is the only new dependency.** Everything else (scroll-snap, IntersectionObserver, CSS custom properties) is native web platform. Motion adds entrance/exit polish but the feed works without it.
- **Config extensions are additive.** New `features` and extended `tokens` on `ThemeConfig` are backward-compatible additions to `GroupConfig`. Existing configs continue to work with defaults.
- **Virtualization depends on item detection.** The 3-item window needs to know the current index to calculate which items to render. Item detection must work before virtualization can activate.

## MVP Definition

### Launch With (v3.0 Core)

The minimum to deliver a working immersive snap feed that replaces the existing list/swipe views.

- [ ] **Snap feed container** -- `scroll-snap-type: y mandatory`, 100dvh children, replaces SwipeFeed + list view in News.tsx
- [ ] **Current item detection** -- IntersectionObserver tracking active index, video autoplay/pause integration
- [ ] **Adaptive card layouts** -- video, image, and text variants based on content type
- [ ] **Collapsed text with "See More"** -- line-clamp truncation with expand toggle
- [ ] **Unified sort/filter control bar** -- consolidates source tabs, content type pills, member chips into single bar
- [ ] **Sort options** -- Recommended, Newest, Most Popular, Most Discussed (API sort param + client fallback)
- [ ] **3-item virtualized window** -- mount content for [current-1, current, current+1] only, placeholders for rest
- [ ] **Engagement stats overlay** -- vertical action bar with icons and abbreviated counts
- [ ] **Loading and empty states** -- full-viewport skeleton, filtered-empty feedback

### Add After Core Works (v3.x)

Features to add once the snap feed is stable and usable.

- [ ] **Framer Motion animations** -- card entrance/exit, filter transitions, layout animations
- [ ] **Auto-hide control bar** -- hide on scroll-down, show on scroll-up or tap
- [ ] **Config feature flag** -- `features.feedMode: 'snap' | 'list'` in GroupConfig
- [ ] **Haptic feedback** -- vibrate on snap for Android devices
- [ ] **Global state persistence** -- save sort/filter prefs to localStorage
- [ ] **Web Share API** -- share button on each card with clipboard fallback
- [ ] **Auto-refresh on return** -- refresh feed when tab becomes visible after 5+ minutes

### Future Consideration (v4+)

- [ ] **Extended theming tokens** -- full semantic + component token system in config
- [ ] **Gesture-based quick filters** -- long-press card to filter by that source/member
- [ ] **Content preview expansion** -- tap card to expand into detail view with full text + comments count
- [ ] **Preload optimization** -- preload thumbnail images for next 3 items, preconnect to video embed domains

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Snap feed container (CSS scroll-snap) | HIGH | MEDIUM | P1 |
| Current item detection | HIGH | LOW | P1 |
| Adaptive card layouts (3 variants) | HIGH | MEDIUM | P1 |
| Unified sort/filter control bar | HIGH | MEDIUM | P1 |
| Sort options (4 modes) | MEDIUM | LOW | P1 |
| 3-item virtualized window | HIGH | MEDIUM | P1 |
| Collapsed text with "See More" | MEDIUM | LOW | P1 |
| Engagement stats overlay | MEDIUM | LOW | P1 |
| Loading/empty states | MEDIUM | LOW | P1 |
| Source link button | MEDIUM | LOW | P1 |
| Framer Motion entrance/exit | MEDIUM | MEDIUM | P2 |
| Auto-hide control bar | LOW | MEDIUM | P2 |
| Config feature flag (snap/list) | MEDIUM | LOW | P2 |
| Haptic feedback on snap | LOW | LOW | P2 |
| Global state persistence | MEDIUM | LOW | P2 |
| Web Share API integration | LOW | LOW | P2 |
| Auto-refresh on visibility | LOW | LOW | P2 |
| Extended theming tokens | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v3.0 launch -- defines the immersive experience
- P2: Should have, adds polish and config flexibility after core works
- P3: Nice to have, enables advanced white-label use cases

## Competitor UX Analysis

| UX Pattern | TikTok | YouTube Shorts | Instagram Reels | BTS Army Feed v3.0 |
|------------|--------|----------------|-----------------|---------------------|
| Navigation | Vertical snap scroll | Vertical snap scroll | Vertical snap scroll | Vertical snap scroll |
| Item height | 100vh, video-only | 100vh, video-only | 100vh, video-only | 100dvh, mixed content (video + image + text) |
| Sort controls | None (algorithm-only) | None (algorithm-only) | None (algorithm-only) | Explicit sort + filter controls (our differentiator) |
| Filter controls | None | None (separate tabs) | None | Source, member, content type filters |
| Virtualization | Aggressive (3-item) | Aggressive (3-item) | Aggressive (3-item) | 3-item window matching platform apps |
| Video behavior | Autoplay, mute-default | Autoplay, mute-default | Autoplay, mute-default | Autoplay, mute-default (already built) |
| Text content | Short caption overlay | Title + description overlay | Short caption overlay | Adaptive: full text layout for articles/discussions |
| Content types | Video only | Video only | Video/image carousel | Video, image, text, news, discussion, fan art |
| Engagement display | Right-side vertical bar | Right-side vertical bar | Right-side vertical bar | Right-side vertical bar (matching convention) |
| Source attribution | Creator profile | Creator channel | Creator profile | Source badge (Reddit, YouTube, etc.) + author |
| Cross-platform content | No | No | No | Yes -- core differentiator |
| User control over feed | None (black box) | None (black box) | None (black box) | Full sort/filter transparency |

**Key insight:** TikTok/Shorts/Reels are video-only snap feeds with zero user control over the algorithm. The BTS Army Feed differentiates by applying the same immersive snap UX to mixed content types AND giving users explicit sort/filter controls. The combination of immersive format + user agency over content is uncommon.

## Sources

### CSS Scroll Snap
- [MDN: CSS Scroll Snap Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap)
- [MDN: scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type)
- [web.dev: Well-controlled scrolling with CSS Scroll Snap](https://web.dev/css-scroll-snap/)
- [CSS-Tricks: Practical CSS Scroll Snapping](https://css-tricks.com/practical-css-scroll-snapping/)
- [Ahmad Shadeed: CSS Scroll Snap](https://ishadeed.com/article/css-scroll-snap/)
- [CodePen: CSS Scroll Snap TikTok Example](https://codepen.io/ellie_html/pen/dyYjZyB)

### Scroll Snap Events (Limited Browser Support)
- [Chrome Developers: Scroll Snap Events](https://developer.chrome.com/blog/scroll-snap-events) -- Chrome 129+ / Edge 129+ only, no Firefox/Safari
- [MDN: scrollsnapchange event](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollsnapchange_event)
- [MDN: scrollsnapchanging event](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollsnapchanging_event)

### React Snap Feed Implementation
- [DEV: Create TikTok/YouTube Shorts-like Snap Infinite Scroll in React](https://dev.to/biomathcode/create-tik-tokyoutube-shorts-like-snap-infinite-scroll-react-1mca)
- [CoderPad: Implement Infinite Scroll in React (TikTok Clone)](https://coderpad.io/blog/development/how-to-implement-infinite-scroll-in-react-js/)
- [DEV: IntersectionObserver, Scroll Snap and React](https://dev.to/ruben_suet/my-experience-with-intersectionobserver-scroll-snap-and-react-252a)

### Framer Motion / Motion
- [Motion: React Scroll Animations](https://www.framer.com/motion/scroll-animations/)
- [Motion: Gesture Animations](https://www.framer.com/motion/gestures/)
- [Motion: useScroll hook](https://www.framer.com/motion/use-scroll/)
- [LogRocket: React Scroll Animations with Framer Motion](https://blog.logrocket.com/react-scroll-animations-framer-motion/)

### Virtualization
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
- [LogRocket: Speed Up Long Lists with TanStack Virtual](https://blog.logrocket.com/speed-up-long-lists-tanstack-virtual/)
- [Medium: Anatomy of a Vertical Videos Module](https://medium.com/@aa.castro.medina/anatomy-of-a-component-the-vertical-videos-module-2ac1999277f2)

### Sort/Filter UX Patterns
- [Pencil & Paper: Mobile Filter UX Design Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-mobile-filters)
- [Smashing Magazine: UI Patterns for Mobile Search, Sort, and Filter](https://www.smashingmagazine.com/2012/04/ui-patterns-for-mobile-apps-search-sort-filter/)
- [Medium: Designing Filter & Sort for Better UX](https://medium.com/design-bootcamp/designing-filter-sort-for-better-ux-9b88f40081db)
- [Medium: Filtering and Sorting Best Practices on Mobile](https://thierrymeier.medium.com/filtering-and-sorting-best-practices-on-mobile-61626449cec)
- [UXPin: Filter UI and UX 101](https://www.uxpin.com/studio/blog/filter-ui-and-ux/)

### Text Truncation / "See More" Pattern
- [Carbon Design System: Overflow Content](https://carbondesignsystem.com/patterns/overflow-content/)
- [justmarkup: Truncating and Revealing Text](https://justmarkup.com/articles/2017-01-12-truncating-and-revealing-text-the-show-more-and-read-more-patterns/)
- [Medium: Design for Truncation](https://medium.com/design-bootcamp/design-for-truncation-946951d5b6b8)

### Content Loading Patterns
- [NN/g: Infinite Scrolling Tips](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [UX Collective: Pagination, Infinite Scroll, and Load More](https://uxdesign.cc/ui-cheat-sheet-pagination-infinite-scroll-and-the-load-more-button-e5c452e279a8)
- [ResultFirst: Pagination vs Infinite Scroll vs Load More](https://www.resultfirst.com/blog/ai-seo/pagination-vs-infinite-scroll-vs-load-more/)

### Config-Driven Theming / Design Tokens
- [Penpot: Developer's Guide to Design Tokens and CSS Variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [UXPin: Managing Global Styles in React with Design Tokens](https://www.uxpin.com/studio/blog/managing-global-styles-in-react-with-design-tokens/)
- [Medium: Advanced Theming Techniques with Design Tokens](https://david-supik.medium.com/advanced-theming-techniques-with-design-tokens-bd147fe7236e)
- [Whoisryosuke: Theming in Modern Design Systems](https://whoisryosuke.com/blog/2020/theming-in-modern-design-systems)

---
*Feature research for: BTS Army Feed v3.0 Immersive Feed Experience*
*Researched: 2026-03-03*
