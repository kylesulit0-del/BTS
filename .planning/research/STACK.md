# Stack Research

**Domain:** Immersive snap feed UX, scroll physics, global filter/sort state, virtualized rendering, config-driven theming
**Researched:** 2026-03-03
**Confidence:** HIGH (Motion, Zustand, CSS scroll-snap) / MEDIUM (virtualization strategy, theming tokens)

## Existing Stack (DO NOT CHANGE)

Already validated and deployed. Listed for reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.1 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |
| dompurify | ^3.3.1 | HTML sanitization |
| Fastify | ^5.7.4 | REST API server |
| SQLite + Drizzle | ^0.45.1 | Database + ORM |
| Vercel AI SDK | ^6.0.105 | LLM moderation |
| node-cron | ^4.2.1 | Scheduled scraping |

## Recommended Stack Additions

### Animation & Scroll Physics

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| motion | ^12.34.3 | Scroll-linked animations, gesture physics, exit transitions | The successor to framer-motion (same team, same API, new package name). 18M+ monthly npm downloads. Verified compatible with React 19.2 + Vite 7.3 as of January 2026. Provides `AnimatePresence` for mount/unmount transitions, `useScroll` for scroll-linked animations, `useInView` for viewport detection, and `motion.div` drag gestures with inertia physics. The snap feed needs: (1) smooth entry animations for cards scrolling into view, (2) exit animations when navigating away, (3) scroll progress tracking for the "X of N" indicator, (4) gesture-based drag-to-dismiss or drag-to-next. CSS scroll-snap handles the actual snapping; Motion handles the polish layer on top. |

**Import path:** `import { motion, AnimatePresence, useScroll, useInView } from 'motion/react'`

**Why `motion` not `framer-motion`:** The package was renamed. `framer-motion` still works but is the legacy import. New projects should use `motion` (same API, active development, ESM-native). The upgrade guide confirms it is a drop-in replacement.

**What Motion handles vs what CSS handles:**

| Concern | Solution | Why |
|---------|----------|-----|
| Snap to full-viewport positions | CSS `scroll-snap-type: y mandatory` | Native browser behavior, zero JS, 60fps guaranteed. Fighting this with JS is slower. |
| Card entry animations | Motion `whileInView` + `initial`/`animate` | Fade/slide cards as they snap into view. CSS can't do spring physics. |
| Exit transitions | Motion `AnimatePresence` + `exit` | Animate cards out when filters change or user navigates. CSS can't animate unmounting elements. |
| Scroll progress indicator | Motion `useScroll` | Track `scrollYProgress` to show position in feed. Leverages native ScrollTimeline API where supported for GPU-accelerated tracking. |
| Drag-to-advance gesture | Motion `drag="y"` + `dragConstraints` | Optional enhancement: drag a card up to advance to next. Provides inertia physics on release. |
| Video embed reveal | Motion `layoutId` + `AnimatePresence` | Smooth transition when expanding a video player from thumbnail. |

### Global State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| zustand | ^5.0.11 | Global filter/sort state persisting across scroll | 1.16KB gzipped. No providers, no context wrappers. Works via hooks: `useFeedStore((s) => s.sortMode)`. The current codebase manages filter state with `useState` in `News.tsx` -- this breaks when the snap feed needs to access sort/filter state from multiple components (the control bar, the feed container, individual cards, the URL state). Zustand solves this with a single store that any component can subscribe to, with selector-based subscriptions preventing unnecessary re-renders. |

**Why Zustand over alternatives:**

| Option | Why Not |
|--------|---------|
| React Context | The filter/sort state updates on every user interaction (changing sort mode, toggling filters). Context re-renders ALL consumers on any state change. With 3+ cards rendered and a control bar, this causes visible jank during filter changes. Zustand's selector-based subscriptions mean only the components that read the changed slice re-render. |
| Jotai | Atomic model is better for many independent state atoms. The feed state is a cohesive object (sortMode + sourceFilter + memberFilter + contentTypeFilter) -- a single store is cleaner than 4+ separate atoms that need coordination. |
| Redux Toolkit | 10x the bundle size, boilerplate (slices, reducers, dispatch), overkill for one store with 4 fields. |
| URL search params only | Sort/filter should persist in URL (for shareability), but URL is not the source of truth for React renders. Zustand store syncs to/from URL params. Reading `useSearchParams()` on every render is slower than a Zustand selector. |

**Store shape:**

```typescript
import { create } from 'zustand';

type SortMode = 'recommended' | 'newest' | 'oldest' | 'popular' | 'discussed';
type SourceFilter = string | 'all';
type ContentTypeFilter = ContentType | 'all';

interface FeedStore {
  sortMode: SortMode;
  sourceFilter: SourceFilter;
  memberFilters: string[];  // bias IDs
  contentTypeFilter: ContentTypeFilter;
  setSortMode: (mode: SortMode) => void;
  setSourceFilter: (source: SourceFilter) => void;
  toggleMemberFilter: (memberId: string) => void;
  setContentTypeFilter: (type: ContentTypeFilter) => void;
  clearFilters: () => void;
}

export const useFeedStore = create<FeedStore>()((set) => ({
  sortMode: 'recommended',
  sourceFilter: 'all',
  memberFilters: [],
  contentTypeFilter: 'all',
  setSortMode: (mode) => set({ sortMode: mode }),
  setSourceFilter: (source) => set({ sourceFilter: source }),
  toggleMemberFilter: (memberId) => set((s) => ({
    memberFilters: s.memberFilters.includes(memberId)
      ? s.memberFilters.filter((id) => id !== memberId)
      : [...s.memberFilters, memberId],
  })),
  setContentTypeFilter: (type) => set({ contentTypeFilter: type }),
  clearFilters: () => set({
    sortMode: 'recommended',
    sourceFilter: 'all',
    memberFilters: [],
    contentTypeFilter: 'all',
  }),
}));
```

### Virtualized Rendering

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **No library -- manual 3-slide window** | N/A | Render only current + prev + next slides | TanStack Virtual and react-window are designed for lists with hundreds or thousands of small items where the DOM node count is the bottleneck. The snap feed has full-viewport (100vh) slides -- even with 200 items, the performance problem is not DOM node count but **iframe/media loading**. Rendering 3 slides (the visible one + 1 buffer on each side) with `display: contents` or conditional rendering is trivial to implement manually and avoids fighting TanStack Virtual's scroll container assumptions vs CSS `scroll-snap-type`. |

**Why NOT TanStack Virtual:**

1. **Scroll-snap conflict.** TanStack Virtual manages a scroll container with `position: relative` and absolutely-positioned children. CSS `scroll-snap-type: y mandatory` requires children to be in normal document flow within the scroll container. These two models fight each other.
2. **Overkill for the item count.** The API serves paginated feeds (50 items default). Even 200 items at 100vh each = 200 DOM nodes. The browser handles 200 divs fine. The performance bottleneck is embedded iframes and images, not div count.
3. **3-slide window is simpler.** Rendering `items[currentIndex - 1]`, `items[currentIndex]`, `items[currentIndex + 1]` with `IntersectionObserver` to detect the current slide is ~30 lines of code. TanStack Virtual would add a dependency for the same result with more configuration.

**Implementation approach:**

```typescript
// Render ALL slides as scroll-snap containers (CSS handles positioning)
// But only MOUNT expensive content (iframes, images) for current +/- 1
function SnapFeed({ items }: { items: FeedItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver detects which slide is centered
  // Only slides within window of activeIndex get media content
  const shouldRenderMedia = (index: number) =>
    Math.abs(index - activeIndex) <= 1;

  return (
    <div className="snap-feed" ref={containerRef}>
      {items.map((item, i) => (
        <div key={item.id} className="snap-slide">
          {shouldRenderMedia(i) ? (
            <FullSlideContent item={item} />
          ) : (
            <SlideShell item={item} /> {/* Title + placeholder only */}
          )}
        </div>
      ))}
    </div>
  );
}
```

**CSS for snap behavior:**

```css
.snap-feed {
  height: 100vh;
  height: 100dvh; /* dynamic viewport height for mobile */
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
}

.snap-slide {
  height: 100vh;
  height: 100dvh;
  scroll-snap-align: start;
  scroll-snap-stop: always; /* prevent skipping slides on fast scroll */
}
```

**Why `100dvh` not `100vh`:** On mobile browsers, `100vh` includes the area behind the address bar. `100dvh` (dynamic viewport height) accounts for the browser chrome shrinking/expanding. Supported in all modern browsers since 2023.

### Config-Driven Theming

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **CSS custom properties (expanded)** | N/A | Design token system for white-label theming | The existing `applyTheme()` sets 3 CSS variables (`--theme-primary`, `--theme-accent`, `--theme-dark`). Expand this to a full token system covering typography, spacing, border radius, shadows, and component-specific tokens. No library needed -- CSS custom properties cascade, inherit, and can be scoped to components. The config-driven architecture already works (change config, change app). Extending `ThemeConfig` with more tokens follows the existing pattern. |

**Why NOT a theming library (styled-components, Stitches, vanilla-extract):**

1. **Already have CSS custom properties working.** `applyTheme()` in `config/applyTheme.ts` sets properties on `:root`. Extending this is 10 lines, not a migration.
2. **No CSS-in-JS overhead.** The app uses plain CSS (`.css` files). Adding styled-components means rewriting every component's styles. Not worth it for theming alone.
3. **CSS custom properties are the standard.** They cascade, they're inspectable in DevTools, they work in media queries, they animate with `@property`. No build step, no runtime.

**Expanded token schema:**

```typescript
// Extend existing ThemeConfig
interface ThemeConfig {
  // Existing (keep)
  groupName: string;
  groupNameNative: string;
  tagline: string;
  fandomName: string;
  primaryColor: string;
  accentColor: string;
  darkColor: string;
  logoUrl: string;
  socialLinks: { platform: string; handle: string; url: string }[];

  // NEW: Extended design tokens
  tokens?: {
    // Colors
    surfaceColor?: string;       // Card/overlay background
    surfaceDimColor?: string;    // Muted surface
    textColor?: string;          // Primary text
    textMutedColor?: string;     // Secondary text
    borderColor?: string;        // Dividers, card borders

    // Typography
    fontFamily?: string;         // Body font
    fontFamilyHeading?: string;  // Heading font (defaults to fontFamily)
    fontSizeBase?: string;       // Base font size (rem)

    // Spacing & Shape
    radiusSm?: string;           // Small border radius (pills, badges)
    radiusMd?: string;           // Medium radius (cards)
    radiusLg?: string;           // Large radius (modals)
    spacingUnit?: string;        // Base spacing unit (px or rem)

    // Feed-specific
    cardBackdropBlur?: string;   // Glassmorphism blur amount
    cardOverlayOpacity?: string; // Text overlay opacity on images
  };

  // NEW: Feature flags
  features?: {
    snapFeed?: boolean;          // true = snap feed, false = list view
    showEngagementStats?: boolean;
    showContentTypeBadges?: boolean;
    enableMemberFilter?: boolean;
    enableDarkMode?: boolean;
  };
}
```

**Updated applyTheme():**

```typescript
export function applyTheme(theme: ThemeConfig): void {
  const s = document.documentElement.style;
  // Existing
  s.setProperty('--theme-primary', theme.primaryColor);
  s.setProperty('--theme-accent', theme.accentColor);
  s.setProperty('--theme-dark', theme.darkColor);

  // Extended tokens (with defaults)
  const t = theme.tokens;
  if (t) {
    if (t.surfaceColor) s.setProperty('--surface', t.surfaceColor);
    if (t.textColor) s.setProperty('--text', t.textColor);
    if (t.textMutedColor) s.setProperty('--text-muted', t.textMutedColor);
    if (t.borderColor) s.setProperty('--border', t.borderColor);
    if (t.fontFamily) s.setProperty('--font-body', t.fontFamily);
    if (t.fontFamilyHeading) s.setProperty('--font-heading', t.fontFamilyHeading);
    if (t.radiusSm) s.setProperty('--radius-sm', t.radiusSm);
    if (t.radiusMd) s.setProperty('--radius-md', t.radiusMd);
    if (t.radiusLg) s.setProperty('--radius-lg', t.radiusLg);
  }
}
```

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | ^12.34.3 | Animation, gestures, scroll-linked effects | Every snap slide transition, filter change animation, card entry/exit |
| zustand | ^5.0.11 | Global sort/filter state | Shared state between ControlBar, SnapFeed, and URL sync |

**That's it.** Two new dependencies for v3.0. The rest (virtualization, theming) is built with existing browser APIs and the current CSS approach.

## Installation

```bash
# From packages/frontend/ (or from root with workspace flag)
npm install motion zustand --workspace=packages/frontend
```

No dev dependencies needed. Both packages include TypeScript types.

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| motion (formerly framer-motion) | react-spring | react-spring uses a different mental model (spring physics config objects). Motion's declarative props (`animate`, `exit`, `whileInView`) are more readable for a team of 1. Motion has 10x the community examples for scroll-snap + animation combos. |
| motion | GSAP (GreenSock) | GSAP is imperative (timeline-based). Requires refs and manual cleanup. Great for complex sequenced animations, overkill for "fade card in on scroll." GSAP's license also restricts use in some commercial contexts. |
| motion | CSS-only animations | CSS `@keyframes` + `animation` can't animate elements unmounting from the DOM (no exit animations). Can't track scroll progress as a JS value. Can't do spring physics. Motion adds what CSS can't. |
| motion | auto-animate | auto-animate is a lightweight alternative (1.5KB) but only handles enter/exit transitions. No scroll-linked animations, no drag gestures, no layout animations. Too limited for the snap feed. |
| zustand | Jotai | Jotai's atomic model is better for many independent state pieces. Feed filter state is a cohesive object (sort + source + member + contentType filters all belong together). A single Zustand store is cleaner than coordinating 4 atoms. |
| zustand | React Context | Context re-renders all consumers on any change. The snap feed renders 3+ cards plus a control bar -- context would cause all of them to re-render when sort mode changes, even if only the control bar reads sort mode. Zustand's selectors prevent this. |
| zustand | @tanstack/react-query | React Query is for server state (caching API responses). Sort/filter is client-only UI state. The existing `useFeed` hook already handles API fetching with caching. Zustand handles UI state that doesn't come from the server. |
| Manual 3-slide window | @tanstack/react-virtual | TanStack Virtual's scroll container management conflicts with CSS scroll-snap. The feed has ~50-200 items at 100vh each -- DOM count isn't the bottleneck. Media loading is. A manual window handles this with less complexity. |
| Manual 3-slide window | react-window | Same CSS scroll-snap conflict. react-window is also unmaintained (last publish 2021). |
| CSS custom properties | styled-components | The app uses plain CSS files. Migrating to CSS-in-JS to gain theming is backwards -- CSS custom properties already provide theming with zero runtime cost. |
| CSS custom properties | Tailwind CSS | Would require rewriting all existing styles. Tailwind's utility classes are great for new projects, but migrating an existing CSS codebase is high effort for low gain when the theming need is just "more CSS variables." |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @tanstack/react-virtual | Scroll-snap conflict, overkill for 50-200 full-viewport items | Manual 3-slide rendering window with IntersectionObserver |
| react-window | Unmaintained (last publish 2021), same scroll-snap conflict | Manual 3-slide rendering window |
| react-virtuoso | Another virtualization lib that fights scroll-snap | Manual approach |
| framer-motion | Legacy package name, still works but no new features | `motion` (the successor package) |
| styled-components / emotion | CSS-in-JS migration for theming alone is not worth it | CSS custom properties (already in use) |
| @tanstack/react-query | The API fetching layer (`useFeed` + `feedService`) works. Adding React Query for sort/filter would mean refactoring the data layer during a UI milestone. | Keep existing `useFeed`, add Zustand for UI state only |
| redux / @reduxjs/toolkit | 10x bundle size, boilerplate for one store with 4 fields | Zustand |
| react-snap-carousel | Horizontal carousel library, not vertical snap feed | CSS scroll-snap + Motion |
| swiper | Heavy (50KB+), designed for horizontal sliders. Vertical mode exists but scroll-snap conflict. | CSS scroll-snap + Motion |
| overlayscrollbars | Custom scrollbar library. Fighting native scroll-snap. | Native scrollbar (hide with CSS if needed) |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| motion@^12.34.3 | React >= 18, React 19.2 confirmed | Import from `motion/react`. Lazy loading available via `motion/react-m` + `LazyMotion`. |
| zustand@^5.0.11 | React >= 18, React 19 confirmed | Use `create<T>()()` double-parens syntax for TypeScript. No provider wrapper needed. |
| CSS scroll-snap | All modern browsers | `scroll-snap-type`, `scroll-snap-align`, `scroll-snap-stop` have universal support. `100dvh` supported since Chrome 108, Safari 15.4, Firefox 94. |

## Integration Points with Existing Code

### What changes in existing files

| File | Change | Why |
|------|--------|-----|
| `pages/News.tsx` | Replace `useState` filter/sort state with `useFeedStore` selectors | State moves from local to global so SnapFeed and ControlBar can share it |
| `components/SwipeFeed.tsx` | Replace entirely with new `SnapFeed.tsx` | Current swipe feed renders all items, no snap behavior, no Motion animations |
| `components/FeedFilter.tsx` | Refactor into `ControlBar.tsx` with sort + filters | Current filter is source-only tabs. New control bar adds sort modes, content type, member filters |
| `components/BiasFilter.tsx` | Merge into ControlBar | Currently a separate component; consolidate into unified control bar |
| `hooks/useFeed.ts` | Add sort parameter, integrate with Zustand store | Currently only filters by source and bias. Needs to pass `sortMode` to API |
| `hooks/useBias.ts` | Remove (replaced by Zustand store) | Bias/member filter state moves into `useFeedStore` |
| `config/types.ts` | Extend `ThemeConfig` with `tokens` and `features` | Add design tokens and feature flags |
| `config/applyTheme.ts` | Expand to set all new CSS custom properties | Currently sets 3 vars, needs to set 10+ |
| `services/api.ts` | Add `sort` query parameter to feed endpoint | Server needs to know sort mode for `popular` and `discussed` sort |

### What stays the same

| File | Why No Change |
|------|---------------|
| `components/FeedCard.tsx` | Cards render inside SnapFeed slides. Card component doesn't know about snap behavior. |
| `components/VideoEmbed.tsx` | Video embeds are unchanged. They render inside cards. |
| `services/feedService.ts` | Feed fetching logic stays. Zustand handles what to fetch, feedService handles how. |
| `config/groups/bts/*` | Config files get new optional fields (`tokens`, `features`). Existing fields unchanged. |
| All server-side code | This milestone is frontend-only. API may add a `sort` parameter but core server is unchanged. |

## Sources

- [Motion (framer-motion successor) npm](https://www.npmjs.com/package/motion) -- v12.34.3, 18M+ monthly downloads (HIGH confidence)
- [Motion React 19 compatibility](https://github.com/motiondivision/motion/issues/2668) -- v12.27.5+ confirmed with React 19.2.3 (HIGH confidence)
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) -- framer-motion to motion migration, import from `motion/react` (HIGH confidence)
- [Motion scroll animations](https://motion.dev/docs/react-scroll-animations) -- useScroll, whileInView, ScrollTimeline API support (HIGH confidence)
- [Motion gestures](https://motion.dev/docs/react-gestures) -- drag, press, hover gesture props (HIGH confidence)
- [Zustand npm](https://www.npmjs.com/package/zustand) -- v5.0.11, 1.16KB gzipped (HIGH confidence)
- [Zustand vs Jotai vs Context 2026](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html) -- Zustand for cohesive stores, Jotai for atomic state (MEDIUM confidence)
- [Zustand TypeScript guide](https://dev.to/avt/understanding-zustand-a-beginners-guide-with-typescript-4jjo) -- `create<T>()()` pattern for TS (MEDIUM confidence)
- [TanStack Virtual npm](https://www.npmjs.com/package/@tanstack/react-virtual) -- v3.13.19, headless virtualizer (HIGH confidence)
- [TanStack Virtual vs react-window](https://borstch.com/blog/development/comparing-tanstack-virtual-with-react-window-which-one-should-you-choose) -- TanStack for complex layouts, react-window for simple fixed-size (MEDIUM confidence)
- [CSS scroll-snap MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type) -- Universal browser support, mandatory vs proximity (HIGH confidence)
- [TikTok-style snap scroll in React](https://dev.to/biomathcode/create-tik-tokyoutube-shorts-like-snap-infinite-scroll-react-1mca) -- CSS scroll-snap + IntersectionObserver pattern (MEDIUM confidence)
- [CSS custom properties theming guide 2026](https://devtoolbox.dedyn.io/blog/css-custom-properties-complete-guide) -- Token naming conventions, cascade behavior (MEDIUM confidence)
- [Design tokens with CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/) -- Primitive/semantic/component token layers (MEDIUM confidence)
- [100dvh viewport units](https://web.dev/blog/viewport-units) -- Dynamic viewport units for mobile (HIGH confidence)

---
*Stack research for: BTS Army Feed v3.0 -- Immersive Feed Experience*
*Researched: 2026-03-03*
