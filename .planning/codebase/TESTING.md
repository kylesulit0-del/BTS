# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Status:** No testing framework detected

**Runner:**
- Not configured
- No test files in `/d/BTS/src` directory
- No jest.config.js, vitest.config.js, or test runner configuration detected

**Assertion Library:**
- Not applicable - no tests present

**Run Commands:**
- Not defined
- Current package.json contains only: `dev`, `build`, `lint`, `preview` scripts
- No test script present

## Test File Organization

**Location:**
- No test files detected in source (`/d/BTS/src/`)
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files found in project source

**Naming Convention:**
- Not established (no test files to analyze)

## Manual Testing Observations

**What IS Being Tested (Manual):**

Based on code structure, these areas show testability but lack formal test coverage:

1. **Hook Logic (`useBias.ts`, `useFeed.ts`)**
   - localStorage persistence patterns established
   - State management with useCallback
   - Graceful error handling for cache misses

2. **Data Transformation (`feeds.ts`)**
   - Multiple feed source integrations (Reddit, YouTube, News, Twitter)
   - XML/RSS parsing with error handling
   - Keyword filtering for BTS content
   - Promise.allSettled for resilience

3. **Utility Functions (`corsProxy.ts`, `xmlParser.ts`)**
   - Proxy fallback logic (3 CORS proxies)
   - DOM parsing for RSS/Atom feeds
   - HTML stripping

## Recommended Testing Structure

**If tests were to be added**, the suggested organization would be:

```
src/
├── __tests__/
│   ├── hooks/
│   │   ├── useBias.test.ts
│   │   └── useFeed.test.ts
│   ├── services/
│   │   └── feeds.test.ts
│   └── utils/
│       ├── corsProxy.test.ts
│       └── xmlParser.test.ts
├── components/
├── hooks/
├── services/
└── utils/
```

Or co-located pattern:
```
src/
├── hooks/
│   ├── useBias.ts
│   ├── useBias.test.ts
│   ├── useFeed.ts
│   └── useFeed.test.ts
```

## Testable Patterns in Current Code

### Hook Pattern (Testable)

**`useBias.ts` - State Management Pattern:**
```typescript
export function useBias() {
  const [biases, setBiases] = useState<BiasId[]>(loadBiases);

  const toggleBias = useCallback((id: BiasId) => {
    setBiases((prev) => {
      const next = prev.includes(id)
        ? prev.filter((b) => b !== id)
        : [...prev, id];
      saveBiases(next);
      return next;
    });
  }, []);

  const clearBiases = useCallback(() => {
    setBiases([]);
    saveBiases([]);
  }, []);

  return { biases, toggleBias, clearBiases };
}
```

**What should be tested:**
- Toggle adds/removes items from biases array
- Clear empties the array
- localStorage is called on toggle/clear
- loadBiases recovers persisted data on mount

**`useFeed.ts` - Async Loading Pattern:**
```typescript
const load = useCallback(async (force = false) => {
  setLoading(true);
  setError(null);

  if (!force) {
    const cached = getCache();
    if (cached) {
      setAllItems(cached.items);
      setLoading(false);
      return;
    }
  }

  try {
    const finalItems = await fetchAllFeedsIncremental((items) => {
      setAllItems(items);
    });
    setCache(finalItems);
    if (finalItems.length === 0) {
      setError("No feed items found...");
    }
  } catch {
    setError("Failed to load feeds...");
    // Fallback logic
  } finally {
    setLoading(false);
  }
}, []);
```

**What should be tested:**
- Cache hit returns items without fetching
- Force=true bypasses cache
- Error state set on fetch failure
- Fallback to stale cache on error
- Filter logic correctly filters by source and biases

### Service Functions (Testable)

**`feeds.ts` - Feed Fetching Pattern:**
```typescript
export async function fetchAllFeedsIncremental(onItems: FeedCallback): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];
  const sources = [
    fetchReddit(),
    fetchYouTube(),
    fetchNews(),
    fetchAllKPop(),
    fetchTwitter(),
  ];

  const promises = sources.map((promise) =>
    promise.then((items) => {
      allItems.push(...items);
      onItems([...allItems].sort((a, b) => b.timestamp - a.timestamp));
      return items;
    }).catch(() => [] as FeedItem[])
  );

  await Promise.allSettled(promises);
  return allItems.sort((a, b) => b.timestamp - a.timestamp);
}
```

**What should be tested:**
- Each source fetches independently
- Partial failures don't block other sources
- Items sorted by timestamp
- Callback fired after each source resolves
- Empty array returned on source failure

**Individual Source Pattern:**
```typescript
async function fetchSubreddit(sub: string, needsFilter: boolean): Promise<FeedItem[]> {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=15`;
  const text = await fetchWithProxy(url);
  const data = JSON.parse(text);
  const posts = data?.data?.children || [];
  const items: FeedItem[] = [];

  for (const post of posts) {
    const d = post.data;
    if (d.stickied) continue;
    if (needsFilter && !BTS_KEYWORDS.test(d.title + " " + (d.selftext || ""))) continue;
    items.push({ id: `reddit-${d.id}`, ... });
  }
  return items;
}
```

**What should be tested:**
- Filters stickied posts
- Applies keyword filter when needsFilter=true
- Handles missing data gracefully
- Returns properly formatted FeedItem array

### Utility Functions (Testable)

**`corsProxy.ts` - Resilience Pattern:**
```typescript
export async function fetchWithProxy(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const buildProxy of PROXIES) {
    try {
      const proxyUrl = buildProxy(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("All proxies failed");
}
```

**What should be tested:**
- Tries each proxy in sequence
- Returns on first successful response
- Falls through to next proxy on failure
- Throws after all proxies exhausted
- Timeout handling

**`xmlParser.ts` - Parsing Pattern:**
```typescript
export function parseRSS(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = doc.querySelectorAll("item");
  const results = [];

  items.forEach((item) => {
    results.push({
      title: item.querySelector("title")?.textContent || "",
      link: item.querySelector("link")?.textContent || "",
      description: item.querySelector("description")?.textContent || "",
      pubDate: item.querySelector("pubDate")?.textContent || "",
    });
  });

  return results;
}
```

**What should be tested:**
- Parses valid RSS XML correctly
- Handles missing fields (returns empty string)
- Handles malformed XML gracefully
- Returns array of items with correct structure

## Proposed Test Framework Setup

**Recommended framework:** Vitest (fast, Vite-native)

**Setup would include:**
1. Install: `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`
2. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./src/__tests__/setup.ts'],
     },
   });
   ```
3. Add test script to `package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

## Coverage Gaps

**Currently Untested:**
- All React components (no component tests detected)
- All hooks (useBias, useFeed)
- All services (feeds.ts)
- All utilities (corsProxy, xmlParser)
- Error scenarios
- Edge cases in parsing/filtering
- Integration between hooks and components

**Risk Areas:**
- Feed fetching failures (graceful fallback not tested)
- Cache expiration logic
- CORS proxy failover
- XML parsing of edge cases
- localStorage unavailability

## Mock & Fixture Patterns (If Tests Existed)

**localStorage Mocking (needed for hooks):**
```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

**Fetch Mocking (needed for services):**
```typescript
global.fetch = vi.fn();

// Test case:
vi.mocked(fetch).mockResolvedValueOnce(
  new Response(mockRedditJSON, { status: 200 })
);
```

**DOMParser Mocking (needed for xmlParser):**
```typescript
const mockXML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>BTS News</title>
      <link>https://example.com</link>
    </item>
  </channel>
</rss>`;
```

---

*Testing analysis: 2026-02-25*

**SUMMARY:** This is a frontend React app with no formal testing framework configured. All logic is testable (hooks, services, utilities) but lacks test coverage. High-risk areas include feed fetching resilience, cache logic, and CORS proxy fallback. Recommend adding Vitest + React Testing Library to catch regressions in feed loading and bias filtering.
