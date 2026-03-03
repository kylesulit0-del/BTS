# Phase 9: API Contract and State Foundation - Research

**Researched:** 2026-03-03
**Domain:** Server-side sort API, URL-synced feed state management, config feature flags, CSS custom property theming tokens
**Confidence:** HIGH

## Summary

Phase 9 establishes the foundational plumbing that all subsequent v3.0 phases depend on: a server-side sort parameter on the `/feed` API, a client-side state management hook that syncs filter/sort selections to URL search params, a config-driven feature flag for routing between the existing list/swipe feed and the upcoming snap feed, and an extended theme token system applied as CSS custom properties.

The codebase is well-positioned for these changes. The server `/feed` route (`packages/server/src/routes/feed.ts`) already supports `page`, `limit`, `source`, and `contentType` query params with Drizzle ORM queries against SQLite. Adding a `sort` param requires switching between the existing `rankFeed()` pipeline (for "recommended") and direct SQL `ORDER BY` clauses for the other four modes. The frontend uses react-router-dom v7.13.1 which exports `useSearchParams`, and React 19.2 provides `useReducer` -- combining these in a custom `useFeedState` hook satisfies the URL-sync requirement with zero new dependencies. The config system (`packages/frontend/src/config/types.ts`) uses TypeScript interfaces with a clear extension pattern, and `applyTheme.ts` already sets CSS custom properties on `:root`.

**Primary recommendation:** Implement in this order: (1) shared types for `SortMode`, (2) server sort endpoint, (3) `useFeedState` hook with URL sync, (4) config types extension with `feedMode` flag and theme tokens, (5) conditional feed rendering and `applyTheme` expansion.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-02 | Sort is computed server-side via API `sort` query parameter | Server feed route already has query param parsing; add `sort` param that selects between `rankFeed()` (recommended), `ORDER BY publishedAt` (newest/oldest), aggregate engagement score (popular), and `ORDER BY commentCount` (discussed). See "Server-Side Sort Implementation" pattern below. |
| PERF-03 | Filter/sort state persists in URL params and survives page refresh | `useReducer` + `useSearchParams` from react-router-dom v7.13.1. Initialize reducer state from URL params on mount, sync state changes back to URL via `setSearchParams()`. See "URL-Synced State Hook" pattern below. |
| CONF-01 | Config feature flag `feedMode: 'snap' \| 'list'` toggles between snap feed and traditional list | Add `feedMode` to `GroupConfig` (or a `features` sub-object). In the feed page component, read `config.feedMode` and conditionally render `<SnapFeedContainer />` (placeholder for Phase 10) vs existing `<SwipeFeed />` + `<FeedCard />` list. |
| CONF-02 | Extended ThemeConfig with semantic styling tokens applied as CSS custom properties | Add optional `tokens` object to `ThemeConfig` interface with semantic color, typography, spacing, and feed-specific values. Extend `applyTheme()` to set these as CSS custom properties. Verify in browser dev tools via `document.documentElement.style`. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | ^7.13.1 | `useSearchParams` for URL state sync | Already installed. v7 exports `useSearchParams()` which returns `[URLSearchParams, SetURLSearchParams]`. |
| React | ^19.2.0 | `useReducer` for feed state management | Already installed. Project decision: useReducer over Zustand for page-local state. |
| Fastify | ^5.7.4 | Server framework, query string parsing | Already installed. Fastify auto-parses query strings from the URL. |
| Drizzle ORM | ^0.45.1 | SQL query building with `asc()`, `desc()` | Already installed. Provides `asc()` and `desc()` ordering functions. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @bts/shared | workspace | Shared types between server and frontend | Add `SortMode` type and update `FeedQuery` interface |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useReducer + useSearchParams | Zustand | Zustand provides selector-based subscriptions (less re-rendering), but adds a dependency for page-local state. Project decision explicitly chose useReducer. |
| useReducer + useSearchParams | nuqs (type-safe URL state) | nuqs provides typed URL search params with validation. Adds a dependency. useSearchParams is sufficient for 4 string params. |
| Manual CSS custom properties | vanilla-extract / Stitches | Would require CSS-in-JS migration. Existing pattern uses plain CSS files + `document.documentElement.style`. Extension is trivial. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

Changes are scoped to these files:

```
packages/shared/src/types/
  feed.ts                    # ADD: SortMode type, update FeedQuery

packages/server/src/routes/
  feed.ts                    # MODIFY: Add sort query param handling

packages/frontend/src/
  hooks/
    useFeedState.ts          # NEW: useReducer + useSearchParams hook
  config/
    types.ts                 # MODIFY: Add feedMode, tokens to ThemeConfig/GroupConfig
    applyTheme.ts            # MODIFY: Set extended CSS custom properties
    groups/bts/
      index.ts               # MODIFY: Add feedMode and token values
      theme.ts               # MODIFY: Add tokens object
  pages/
    News.tsx                 # MODIFY: Conditional rendering based on feedMode
  services/
    api.ts                   # MODIFY: Add sort param to fetchApiFeed
```

### Pattern 1: Server-Side Sort Implementation

**What:** Add a `sort` query parameter to the `/feed` GET endpoint that selects the ordering strategy before pagination.
**When to use:** When the client requests a specific sort mode instead of the default "recommended" ranking.

The current feed route has two code paths: cursor-based (backward compat) and page-based ranked (default). The sort parameter applies only to the page-based path.

```typescript
// In packages/server/src/routes/feed.ts
// Current Querystring type:
// { cursor?: string; limit?: string; page?: string; source?: string; contentType?: string }
// ADD: sort?: string

// Sort modes and their SQL implementations:
// 'recommended' (default) -> existing rankFeed() pipeline (no change)
// 'newest'    -> ORDER BY publishedAt DESC
// 'oldest'    -> ORDER BY publishedAt ASC
// 'popular'   -> ORDER BY computed engagement score DESC
// 'discussed' -> ORDER BY commentCount DESC

// For 'popular', the engagement score needs computation.
// The DB stores engagementStats as JSON text. Options:
//   A) Fetch candidates, parse JSON in JS, sort in memory (like rankFeed does)
//   B) Use SQLite json_extract() in the ORDER BY clause
// Option A is simpler and consistent with existing code. The candidate set
// is already limited to 500 items, so in-memory sort is fast.
```

**Example implementation:**
```typescript
// Inside the page-based ranked feed section of registerFeedRoutes:
const sort = (request.query.sort as string) || 'recommended';

// Validate sort param
const validSorts = ['recommended', 'newest', 'oldest', 'popular', 'discussed'];
const sortMode = validSorts.includes(sort) ? sort : 'recommended';

if (sortMode === 'recommended') {
  // Existing rankFeed() pipeline -- no change
  const ranked = rankFeed(rankableItems, boostMap);
  // ... paginate as before
} else {
  // Direct sort without blend scoring
  let sorted: typeof candidateRows;
  switch (sortMode) {
    case 'newest':
      sorted = [...candidateRows].sort((a, b) => {
        const aTime = a.publishedAt instanceof Date ? a.publishedAt.getTime() : (a.publishedAt as number) * 1000;
        const bTime = b.publishedAt instanceof Date ? b.publishedAt.getTime() : (b.publishedAt as number) * 1000;
        return bTime - aTime;
      });
      break;
    case 'oldest':
      sorted = [...candidateRows].sort((a, b) => {
        const aTime = a.publishedAt instanceof Date ? a.publishedAt.getTime() : (a.publishedAt as number) * 1000;
        const bTime = b.publishedAt instanceof Date ? b.publishedAt.getTime() : (b.publishedAt as number) * 1000;
        return aTime - bTime;
      });
      break;
    case 'popular':
      sorted = [...candidateRows].sort((a, b) => {
        const aStats = a.engagementStats ? JSON.parse(a.engagementStats) : {};
        const bStats = b.engagementStats ? JSON.parse(b.engagementStats) : {};
        const aScore = (aStats.upvotes || 0) + (aStats.views || 0) + (aStats.likes || 0) + (aStats.notes || 0);
        const bScore = (bStats.upvotes || 0) + (bStats.views || 0) + (bStats.likes || 0) + (bStats.notes || 0);
        return bScore - aScore;
      });
      break;
    case 'discussed':
      sorted = [...candidateRows].sort((a, b) => b.commentCount - a.commentCount);
      break;
    default:
      sorted = candidateRows;
  }
  // ... paginate sorted results
}
```

**Key consideration for "popular" sort:** Raw engagement numbers are not comparable across sources (a Reddit post with 500 upvotes is more popular than a Tumblr post with 500 notes, but less popular than a YouTube video with 500 views). Two options:

1. **Simple sum** (recommended for Phase 9): Sum all numeric engagement metrics. This gives a rough popularity signal. Cross-source comparison is imperfect but functional.
2. **Percentile-based** (future enhancement): Use the existing `normalizeEngagement()` function to convert to percentiles first, then sort by percentile. More accurate but adds complexity. Can be done in a later phase.

### Pattern 2: URL-Synced State Hook (useFeedState)

**What:** A custom hook combining `useReducer` for state management with `useSearchParams` for URL persistence.
**When to use:** On the feed page to manage sort/filter state that survives page refresh.

```typescript
// hooks/useFeedState.ts
import { useReducer, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type SortMode = 'recommended' | 'newest' | 'oldest' | 'popular' | 'discussed';

export interface FeedState {
  sort: SortMode;
  source: string;        // source filter, 'all' = no filter
  contentType: string;   // content type filter, 'all' = no filter
  members: string[];     // bias/member IDs (persisted in localStorage)
}

type FeedAction =
  | { type: 'SET_SORT'; sort: SortMode }
  | { type: 'SET_SOURCE'; source: string }
  | { type: 'SET_CONTENT_TYPE'; contentType: string }
  | { type: 'TOGGLE_MEMBER'; id: string }
  | { type: 'CLEAR_MEMBERS' }
  | { type: 'RESET' };

const VALID_SORTS: SortMode[] = ['recommended', 'newest', 'oldest', 'popular', 'discussed'];

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'SET_SORT':
      return { ...state, sort: action.sort };
    case 'SET_SOURCE':
      return { ...state, source: action.source };
    case 'SET_CONTENT_TYPE':
      return { ...state, contentType: action.contentType };
    case 'TOGGLE_MEMBER': {
      const members = state.members.includes(action.id)
        ? state.members.filter(m => m !== action.id)
        : [...state.members, action.id];
      return { ...state, members };
    }
    case 'CLEAR_MEMBERS':
      return { ...state, members: [] };
    case 'RESET':
      return { sort: 'recommended', source: 'all', contentType: 'all', members: [] };
    default:
      return state;
  }
}

export function useFeedState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL params
  const initialSort = searchParams.get('sort') as SortMode;
  const initialState: FeedState = {
    sort: VALID_SORTS.includes(initialSort) ? initialSort : 'recommended',
    source: searchParams.get('source') || 'all',
    contentType: searchParams.get('type') || 'all',
    members: loadMembersFromLocalStorage(),
  };

  const [state, dispatch] = useReducer(feedReducer, initialState);

  // Sync state -> URL params (only non-default values)
  useEffect(() => {
    const params = new URLSearchParams();
    if (state.sort !== 'recommended') params.set('sort', state.sort);
    if (state.source !== 'all') params.set('source', state.source);
    if (state.contentType !== 'all') params.set('type', state.contentType);
    setSearchParams(params, { replace: true });
  }, [state.sort, state.source, state.contentType, setSearchParams]);

  // Persist member selection to localStorage (existing pattern from useBias)
  useEffect(() => {
    saveMembersToLocalStorage(state.members);
  }, [state.members]);

  return [state, dispatch] as const;
}
```

**Critical detail:** `setSearchParams(params, { replace: true })` uses `replace` to avoid polluting browser history with every filter change. Users can still use back/forward for navigation but won't have to click "back" 15 times after toggling filters.

### Pattern 3: Config Feature Flag for Feed Mode

**What:** A `feedMode` property on the config that determines which feed component renders.
**When to use:** To toggle between the new snap feed (Phase 10) and the existing list/swipe feed.

```typescript
// In config/types.ts, extend GroupConfig:
export interface GroupConfig {
  // ... existing fields
  feedMode?: 'snap' | 'list';  // Default: 'list' (backward compatible)
}

// In News.tsx (or FeedPage.tsx):
const config = getConfig();
const feedMode = config.feedMode ?? 'list';

// Render:
{feedMode === 'snap' ? (
  <SnapFeedContainer items={items} /> // Placeholder until Phase 10
) : (
  // Existing list/swipe rendering
  viewMode === 'swipe' ? <SwipeFeed items={items} /> : <FeedList items={items} />
)}
```

The `feedMode` flag defaults to `'list'` so the existing feed continues working without config changes. Setting `feedMode: 'snap'` in the BTS config activates the new view. During Phase 9, the snap container will be a minimal placeholder that Phase 10 replaces with the full implementation.

### Pattern 4: Extended Theme Tokens

**What:** Additional CSS custom properties derived from config, applied at startup.
**When to use:** To provide semantic styling tokens that later phases (10-12) consume for card layouts, overlays, and control bar styling.

```typescript
// In config/types.ts, extend ThemeConfig:
export interface ThemeConfig {
  // ... existing fields (all stay)

  tokens?: {
    // Surface colors
    surfaceColor?: string;         // Card background
    surfaceElevatedColor?: string; // Elevated card / modal
    overlayColor?: string;         // Card text overlay gradient base

    // Text colors
    textPrimaryColor?: string;     // Main text
    textSecondaryColor?: string;   // Muted text
    textOnPrimaryColor?: string;   // Text on primary-colored surfaces

    // Spacing & shape
    radiusSm?: string;             // 4px - pills, badges
    radiusMd?: string;             // 8px - cards
    radiusLg?: string;             // 16px - modals, sheets

    // Feed-specific
    cardOverlayGradient?: string;  // CSS gradient for card text overlay
    controlBarBg?: string;         // Control bar background
  };
}
```

**Updated applyTheme.ts:**
```typescript
export function applyTheme(theme: ThemeConfig): void {
  const s = document.documentElement.style;

  // Existing (unchanged)
  s.setProperty('--theme-primary', theme.primaryColor);
  s.setProperty('--theme-accent', theme.accentColor);
  s.setProperty('--theme-dark', theme.darkColor);

  // Extended tokens (with sensible defaults)
  const t = theme.tokens;
  if (t) {
    if (t.surfaceColor) s.setProperty('--surface', t.surfaceColor);
    if (t.surfaceElevatedColor) s.setProperty('--surface-elevated', t.surfaceElevatedColor);
    if (t.overlayColor) s.setProperty('--overlay', t.overlayColor);
    if (t.textPrimaryColor) s.setProperty('--text-primary', t.textPrimaryColor);
    if (t.textSecondaryColor) s.setProperty('--text-secondary', t.textSecondaryColor);
    if (t.textOnPrimaryColor) s.setProperty('--text-on-primary', t.textOnPrimaryColor);
    if (t.radiusSm) s.setProperty('--radius-sm', t.radiusSm);
    if (t.radiusMd) s.setProperty('--radius-md', t.radiusMd);
    if (t.radiusLg) s.setProperty('--radius-lg', t.radiusLg);
    if (t.cardOverlayGradient) s.setProperty('--card-overlay-gradient', t.cardOverlayGradient);
    if (t.controlBarBg) s.setProperty('--control-bar-bg', t.controlBarBg);
  }
}
```

**Important:** The existing App.css already defines `--bg-card`, `--text-primary`, `--text-secondary`, etc. in `:root`. The new tokens should either:
- (A) Use different names (e.g., `--surface` instead of `--bg-card`) to avoid collision, OR
- (B) Override the existing names when tokens are provided.

Recommendation: Use option (B) -- override existing names. This means the tokens from config take precedence over CSS defaults, and existing CSS rules that reference `--bg-card` or `--text-primary` automatically pick up the config values. The `applyTheme` function sets properties on `document.documentElement.style` which has the highest specificity for custom properties.

**For the BTS config, set initial token values:**
```typescript
// In config/groups/bts/theme.ts
export const theme: ThemeConfig = {
  // ... existing fields
  tokens: {
    surfaceColor: '#1a1a2e',
    surfaceElevatedColor: '#222244',
    overlayColor: 'rgba(13, 13, 13, 0.85)',
    textPrimaryColor: '#ffffff',
    textSecondaryColor: '#b0b0c0',
    textOnPrimaryColor: '#ffffff',
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '16px',
    cardOverlayGradient: 'linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.6) 50%, transparent 100%)',
    controlBarBg: 'rgba(26, 26, 46, 0.95)',
  },
};
```

### Anti-Patterns to Avoid

- **Client-side sorting:** The server has the full candidate set (500 items) and the ranking pipeline. Client-side sort on a paginated subset gives inconsistent results, especially for "most popular" which needs cross-source normalization. Always sort server-side.
- **Zustand for feed state:** Project decision explicitly chose useReducer + useSearchParams. Zustand was considered and rejected because the state is page-local, not cross-route.
- **Storing member filter in URL:** Member/bias selections are personal preferences, not shareable state. Keep them in localStorage (existing useBias pattern), not URL params. URL params are for sort, source, and contentType.
- **Modifying cursor-based path:** The cursor-based pagination path in feed.ts is backward-compatible fallback. The sort param should only apply to the page-based path. Do not touch the cursor path.
- **Overwriting CSS defaults destructively:** The `applyTheme` function should set properties only when token values are provided. Don't clear existing CSS `:root` defaults. This ensures the app works without tokens.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state sync | Custom window.location parsing + pushState | react-router-dom `useSearchParams` | Handles encoding, back/forward, and integrates with React lifecycle. Already installed. |
| Query string parsing on server | Manual string splitting | Fastify built-in query parsing | Fastify auto-parses `?key=value` into `request.query`. Already works for existing params. |
| SQL ordering | Raw SQL strings | Drizzle `asc()` and `desc()` functions | Type-safe, prevents SQL injection. Already used in the codebase (`desc(contentItems.scrapedAt)`). |
| CSS variable application | Manual DOM manipulation per element | `document.documentElement.style.setProperty` | Sets on `:root`, cascades to all elements. Already proven in `applyTheme.ts`. |

**Key insight:** Phase 9 introduces no new dependencies. Every tool needed is already installed and proven in the codebase. The work is extending existing patterns, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: useSearchParams Infinite Re-render Loop

**What goes wrong:** Setting search params inside a `useEffect` that depends on `searchParams` causes an infinite loop because `setSearchParams` creates a new `searchParams` reference.
**Why it happens:** `useSearchParams` returns a new `URLSearchParams` object on every render. If the effect dependency includes `searchParams`, every call to `setSearchParams` triggers the effect again.
**How to avoid:** Depend on the individual state values (sort, source, contentType), NOT on `searchParams`. Only read `searchParams` during initialization (outside the effect or in a ref).
**Warning signs:** Browser hanging or console showing rapid-fire state updates after any filter change.

### Pitfall 2: Replace vs Push in setSearchParams

**What goes wrong:** Using `setSearchParams(params)` without `{ replace: true }` pushes a new history entry for every filter change. User clicks "back" expecting to leave the page but instead just undoes the last filter toggle.
**Why it happens:** Default behavior of `setSearchParams` is to push to history, same as `navigate()`.
**How to avoid:** Always use `setSearchParams(params, { replace: true })` for filter/sort state changes. These are refinements, not navigations.
**Warning signs:** Browser history growing rapidly; back button feels "stuck" on the feed page.

### Pitfall 3: Drizzle Timestamp Format (Epoch Seconds vs Milliseconds)

**What goes wrong:** Sorting by `publishedAt` in JavaScript produces wrong order because Drizzle returns epoch seconds (not milliseconds) for SQLite `INTEGER` timestamp columns.
**Why it happens:** The schema defines `publishedAt: integer('published_at', { mode: 'timestamp' })`. Drizzle's `timestamp` mode for SQLite stores as Unix epoch seconds. JavaScript `Date.getTime()` and `Date.now()` use milliseconds. Direct comparison of seconds vs milliseconds produces incorrect ordering.
**How to avoid:** When sorting in JS, always normalize to the same unit. The existing code already handles this: `new Date(row.publishedAt as unknown as number * 1000)`. For server-side SQL ordering, this is not an issue because SQLite compares the raw integers which are all in the same unit.
**Warning signs:** "Newest" sort showing items in wrong order; very old items appearing first.

### Pitfall 4: CSS Custom Property Name Collision

**What goes wrong:** New token names like `--text-primary` collide with existing `:root` defaults in App.css, causing unexpected value changes when tokens are undefined.
**Why it happens:** `applyTheme()` runs at startup. If a token is `undefined`, the property is not set, so the CSS `:root` default takes effect. But if a token IS set, it overrides the CSS default (inline style > :root). This asymmetry can cause confusion.
**How to avoid:** Document clearly which existing CSS variable names the tokens map to. If `tokens.textPrimaryColor` maps to `--text-primary`, make this mapping explicit. Consider using new names (e.g., `--token-text-primary`) if a clean separation is needed.
**Warning signs:** Theme colors changing unexpectedly when a config value is added or removed.

### Pitfall 5: "Popular" Sort Comparing Apples to Oranges

**What goes wrong:** A YouTube video with 10,000 views appears less "popular" than a Reddit post with 15,000 upvotes, even though relative to their platforms the YouTube video is more notable.
**Why it happens:** Raw engagement numbers are not comparable across sources. Reddit upvotes, YouTube views, and Tumblr notes have completely different scales.
**How to avoid:** For Phase 9, accept this limitation -- document it and use a simple sum. The existing `normalizeEngagement()` function in the ranking module already solves this with percentile normalization. In a future enhancement, the "popular" sort can use percentile-based ordering. For now, the naive sum is functional and the success criteria only require that `?sort=popular` returns correctly sorted results (i.e., results sorted by engagement, even if cross-source comparison is imperfect).
**Warning signs:** Users complaining that "popular" sort is dominated by one source type.

## Code Examples

### Example 1: Shared SortMode Type

```typescript
// packages/shared/src/types/feed.ts -- ADD

/** Valid sort modes for the feed API. */
export type SortMode = 'recommended' | 'newest' | 'oldest' | 'popular' | 'discussed';

/** Feed query parameters (updated). */
export interface FeedQuery {
  cursor?: string;
  limit?: number;
  page?: number;
  source?: string;
  contentType?: string;
  sort?: SortMode;   // NEW
}
```

### Example 2: Server Sort Handler (Simplified)

```typescript
// packages/server/src/routes/feed.ts -- inside page-based section
// After fetching candidateRows and before pagination:

const validSorts = ['recommended', 'newest', 'oldest', 'popular', 'discussed'] as const;
const sortMode = validSorts.includes(request.query.sort as any)
  ? (request.query.sort as typeof validSorts[number])
  : 'recommended';

let orderedItems: typeof candidateRows;

if (sortMode === 'recommended') {
  // Existing rankFeed pipeline
  const rankableItems = candidateRows.map(row => ({
    ...row,
    engagementStats: row.engagementStats ? JSON.parse(row.engagementStats) : null,
  }));
  orderedItems = rankFeed(rankableItems, boostMap);
} else {
  orderedItems = sortCandidates(candidateRows, sortMode);
}

// Then paginate orderedItems as before...
```

### Example 3: fetchApiFeed with Sort Param

```typescript
// packages/frontend/src/services/api.ts -- MODIFY fetchApiFeed

export async function fetchApiFeed(params?: {
  page?: number;
  limit?: number;
  source?: string;
  contentType?: string;
  sort?: string;           // NEW
}): Promise<{ items: FeedItem[]; hasMore: boolean; total: number }> {
  const url = new URL(`${API_URL}/api/feed`);
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params?.source) url.searchParams.set('source', params.source);
  if (params?.contentType) url.searchParams.set('contentType', params.contentType);
  if (params?.sort && params.sort !== 'recommended') url.searchParams.set('sort', params.sort);  // NEW

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API feed request failed: ${res.status}`);
  const data: FeedResponse = await res.json();
  return {
    items: data.items.map(mapApiFeedItem),
    hasMore: data.hasMore,
    total: data.total,
  };
}
```

### Example 4: Conditional Feed Rendering

```typescript
// In News.tsx (modified):
import { getConfig } from '../config';

const config = getConfig();
const feedMode = config.feedMode ?? 'list';

// In JSX:
{feedMode === 'snap' ? (
  <div className="snap-feed-placeholder" style={{
    height: 'calc(100svh - var(--nav-height))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
  }}>
    Snap feed coming in Phase 10
  </div>
) : (
  // Existing list/swipe rendering...
  viewMode === 'swipe' ? <SwipeFeed items={items} /> : (
    <div className="feed-list">
      {items.map(item => <FeedCard key={item.id} item={item} />)}
    </div>
  )
)}
```

### Example 5: Theme Token Application Verification

To verify CSS custom properties are applied (Success Criteria 4):

```javascript
// In browser DevTools console:
getComputedStyle(document.documentElement).getPropertyValue('--surface');
// Should return: '#1a1a2e' (or whatever the config specifies)

getComputedStyle(document.documentElement).getPropertyValue('--card-overlay-gradient');
// Should return: 'linear-gradient(to top, rgba(13,13,13,0.95) 0%, ...)'
```

Or inspect the `<html>` element in DevTools > Elements > Computed > filter for `--`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState` for each filter | `useReducer` with action types | React 16.8+ (hooks) | Single state object, predictable updates, testable reducer |
| localStorage for filter state | URL search params for shareable state | react-router v6+ | Shareable URLs, browser back/forward support |
| Client-side sort (Array.sort) | Server-side sort via API param | Standard practice | Consistent ordering across paginated results |
| Hardcoded CSS values | CSS custom properties from config | CSS Variables (2017+) | Config-driven theming, runtime switchable |

**Deprecated/outdated:**
- `framer-motion` package: Renamed to `motion`. Not relevant to Phase 9 (no animations in this phase).
- `100dvh` viewport unit: Supported since Chrome 108, Safari 15.4, Firefox 94. The project decision notes `100svh` with `100vh` fallback, NOT `100dvh` (iOS Safari regression). This applies to Phase 10, not Phase 9.

## Open Questions

1. **"Popular" sort cross-source fairness**
   - What we know: Raw engagement numbers (upvotes, views, notes) are not comparable across sources. The existing `normalizeEngagement()` function handles this with percentile ranking.
   - What's unclear: Should Phase 9's "popular" sort use raw sums or percentile normalization?
   - Recommendation: Use raw sum for simplicity. The success criteria only require correct server-side sorting, not perfect cross-source fairness. Percentile-based popular sort can be added as an enhancement later.

2. **Token naming convention**
   - What we know: Existing App.css uses names like `--bg-card`, `--text-primary`, `--text-secondary`. New tokens could use the same names or new ones.
   - What's unclear: Whether overriding existing CSS variable names via `applyTheme()` could cause regressions in existing components that rely on the CSS `:root` defaults.
   - Recommendation: Map tokens to existing variable names where they match (e.g., `tokens.surfaceColor` -> `--bg-card`). This ensures existing CSS rules benefit from config-driven values. Add new names only for truly new tokens (e.g., `--card-overlay-gradient`).

3. **useFeedState integration with existing useFeed**
   - What we know: The existing `useFeed(filter, biases)` hook accepts separate filter and biases params. The new `useFeedState` manages a unified `FeedState` object.
   - What's unclear: Whether to modify the existing `useFeed` signature to accept `FeedState`, or create a new hook that wraps `useFeed`.
   - Recommendation: Modify the existing `useFeed` to accept the full `FeedState` object. This is a breaking change to the hook's API but simpler than maintaining two hooks. The only consumer is `News.tsx`.

## Sources

### Primary (HIGH confidence)
- Codebase audit: `packages/server/src/routes/feed.ts` -- existing query param handling, page-based ranked feed, `rankFeed()` integration
- Codebase audit: `packages/frontend/src/hooks/useFeed.ts` -- current feed state management, source/bias filtering
- Codebase audit: `packages/frontend/src/services/api.ts` -- `fetchApiFeed()` with existing param support
- Codebase audit: `packages/frontend/src/config/types.ts` -- `GroupConfig`, `ThemeConfig` interfaces
- Codebase audit: `packages/frontend/src/config/applyTheme.ts` -- CSS custom property application pattern
- Codebase audit: `packages/shared/src/types/feed.ts` -- `FeedItem`, `FeedResponse`, `FeedQuery` shared types
- Codebase audit: `packages/server/src/ranking/` -- `rankFeed()`, `normalizeEngagement()`, `computeBlendScore()`, `interleaveBySource()`
- Codebase audit: `packages/frontend/src/pages/News.tsx` -- feed page with filter/sort state, view mode toggle
- Codebase audit: `packages/frontend/src/App.css` -- existing CSS custom properties in `:root`
- Project decisions: `.planning/STATE.md` -- "useReducer + useSearchParams over Zustand for feed state"
- v3.0 architecture research: `.planning/research/ARCHITECTURE.md` -- component architecture, data flow, anti-patterns

### Secondary (MEDIUM confidence)
- v3.0 stack research: `.planning/research/STACK.md` -- technology evaluation, Zustand/Motion recommendations (some superseded by project decisions)
- react-router-dom v7 `useSearchParams` -- standard React Router API, verified by presence in `package.json` (`"react-router-dom": "^7.13.1"`)
- Drizzle ORM `asc()`/`desc()` functions -- standard Drizzle API, `desc()` already used in feed.ts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in codebase
- Architecture: HIGH -- extending existing patterns (query params, CSS custom properties, config types), not introducing new paradigms
- Pitfalls: HIGH -- identified from codebase-specific patterns (Drizzle timestamps, existing CSS variable names, useSearchParams behavior)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- no fast-moving dependencies; all libraries already locked in package.json)
