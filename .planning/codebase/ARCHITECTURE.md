# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Client-side React SPA (Single Page Application) with component-based UI architecture and hook-based state management.

**Key Characteristics:**
- React 19 with TypeScript for type safety
- Client-side routing via React Router v7
- Local storage for client-side state persistence (user bias preferences, feed cache)
- External data integration via CORS proxies to fetch multi-source feeds
- Progressive Web App (PWA) support via Vite PWA plugin
- No backend server—all data fetching occurs client-side with cross-origin proxy fallbacks

## Layers

**Presentation Layer (Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/components/`
- Contains: React components (.tsx files) for card displays, filters, navigation
- Depends on: Hooks for state, types for data contracts, utilities for rendering logic
- Used by: Pages that compose components into views

**Pages Layer:**
- Purpose: Route-specific page layouts that orchestrate components for a specific view
- Location: `src/pages/`
- Contains: Home.tsx, Members.tsx, MemberDetail.tsx, Tours.tsx, News.tsx
- Depends on: Components, hooks (useFeed, useBias), data layer (members, news)
- Used by: React Router for rendering on specific routes

**Hook Layer (State Management):**
- Purpose: Encapsulate stateful logic and data fetching
- Location: `src/hooks/`
- Contains: useBias.ts (member preference persistence), useFeed.ts (feed aggregation and filtering)
- Depends on: Services (feeds.ts), types, localStorage API
- Used by: Pages and components that need shared state

**Service Layer (Data Fetching):**
- Purpose: Fetch and parse external feed sources, abstract cross-origin complications
- Location: `src/services/feeds.ts`
- Contains: Functions to fetch from Reddit, YouTube, news sites (Soompi, AllKPop), Twitter/X
- Depends on: Utilities (corsProxy, xmlParser), types (FeedItem)
- Used by: useFeed hook for aggregating content

**Utility Layer:**
- Purpose: Reusable cross-cutting helpers
- Location: `src/utils/`
- Contains: corsProxy.ts (CORS proxy fallback chain), xmlParser.ts (RSS/Atom feed parsing)
- Depends on: Browser APIs (DOMParser, fetch)
- Used by: Service layer for external API access

**Data/Types Layer:**
- Purpose: Static data and type definitions
- Location: `src/data/` and `src/types/`
- Contains: members.ts (member profiles), news.ts (fallback news), events.ts (tour info), feed.ts (type definitions and constants)
- Depends on: None
- Used by: All layers for data contracts and static content

**Routing & Entry Point:**
- Purpose: Setup React Router and mount application
- Location: `src/main.tsx` (entry), `src/App.tsx` (root router)
- Contains: BrowserRouter setup, route definitions
- Depends on: Pages, components, styling
- Used by: index.html as the JavaScript entry point

## Data Flow

**Feed Loading Flow (News Page):**

1. User navigates to `/news`
2. News.tsx page mounts, calls useFeed(filter, biases)
3. useFeed hook checks localStorage for cached feed (5-minute TTL)
4. If no cache, calls fetchAllFeedsIncremental() from services/feeds.ts
5. fetchAllFeedsIncremental fires 5 parallel fetch functions:
   - fetchReddit() — fetches hot posts from 4 subreddits, filters by BTS keywords
   - fetchYouTube() — parses Atom XML from 2 official channels, filters as needed
   - fetchNews() — fetches RSS from Soompi and AllKPop, filters by keywords
   - fetchTwitter() — scrapes Nitter (Twitter mirror), parses timeline HTML
6. Each fetch uses fetchWithProxy() utility with 3 CORS proxy fallbacks to handle cross-origin restrictions
7. Results streamed incrementally: onItems callback fires as each source resolves
8. Parsed items sorted by timestamp, cached in localStorage
9. Items filtered by user's selected filter (reddit/youtube/news/twitter/all) and bias (member keywords)
10. Filtered results rendered as list or swipe-view cards
11. Fallback: If all fetches fail, render static news from src/data/news.ts

**Member Selection Flow:**

1. User clicks member chip in BiasFilter component on News page
2. Toggles membership in biases array via useBias.toggleBias()
3. useBias updates state and persists to localStorage under "bts-bias-selection"
4. useFeed hook receives updated biases, re-filters items by member keywords
5. Filtered feed re-renders with only posts mentioning that member

**State Management:**

- **Feed Cache:** Stored in localStorage as "bts-feed-cache" with 5-minute expiration
- **User Biases:** Stored in localStorage as "bts-bias-selection" as JSON array of BiasId values
- **Component State:** Managed via React useState for:
  - Current feed filter (reddit/youtube/news/twitter/all)
  - View mode toggle (list vs. swipe)
  - Image loading errors (member cards fallback to emoji)
  - Loading/error states in useFeed hook

## Key Abstractions

**FeedItem:**
- Purpose: Unified data model for content from multiple sources
- Examples: `src/types/feed.ts` (type definition)
- Pattern: TypeScript interface with optional fields for source-specific data (thumbnail, author, preview)

**Hook-Based State Management:**
- Purpose: Isolate data fetching and state logic from UI components
- Examples: `src/hooks/useBias.ts`, `src/hooks/useFeed.ts`
- Pattern: Custom hooks return object with state and callbacks; localStorage integration for persistence

**CORS Proxy Fallback Chain:**
- Purpose: Work around browser CORS restrictions when fetching external feeds
- Examples: `src/utils/corsProxy.ts`
- Pattern: Array of proxy URL builders, tries each in sequence until one succeeds; AbortSignal timeout (7s) per attempt

**Feed Parsing Abstraction:**
- Purpose: Handle multiple feed formats (RSS, Atom, JSON, HTML scraping)
- Examples: `src/utils/xmlParser.ts`, inline parsing in feeds.ts for Reddit JSON and Twitter HTML
- Pattern: Format-specific parse functions return normalized objects; HTML entity stripping for clean text

**Member Keywords Mapping:**
- Purpose: Link member bias selections to searchable keywords for content filtering
- Examples: `src/types/feed.ts` MEMBER_KEYWORDS constant
- Pattern: Record<BiasId, string[]> mapping each member to their stage name, real name, and solo project titles

**Error Handling:**

**Strategy:** Graceful degradation with fallbacks

**Patterns:**
- Feed fetch failures: Show error message, fall back to static news from `src/data/news.ts`
- Image load errors: Replace with emoji placeholder (defined in MemberCard, MemberDetail, PhotoGallery)
- Proxy failures: Try next proxy in fallback chain; if all fail, throw error caught by useFeed
- localStorage unavailable: Catch silent errors when reading/writing biases or cache
- Malformed XML/JSON: Wrap parsing in try-catch, skip malformed items

## Cross-Cutting Concerns

**Logging:** No logging framework—browser console available for debugging. Consider adding error tracking for production.

**Validation:**
- TypeScript provides compile-time type checking
- Runtime validation for API responses via optional chaining and type guards (e.g., `data?.data?.children`)
- BTS keyword regex (BTS_KEYWORDS) used to filter noise from generic sources

**Authentication:** Not applicable—all data is public, no user accounts or API keys required for external feeds.

**Cache Invalidation:** 5-minute TTL in useFeed hook; manual refresh button triggers force reload bypassing cache.

**Performance Optimization:**
- Incremental feed loading: Items appear as each source resolves (not waterfall waiting)
- Promise.allSettled() prevents one slow/failing source from blocking others
- Image lazy loading on feed cards and gallery
- localStorage caching reduces network calls on repeat visits
- Vite code splitting and tree-shaking for bundle optimization

---

*Architecture analysis: 2026-02-25*
