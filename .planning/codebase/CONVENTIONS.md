# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `BiasFilter.tsx`, `FeedCard.tsx`, `MemberCard.tsx`)
- Pages: PascalCase (e.g., `Home.tsx`, `Members.tsx`, `News.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useBias.ts`, `useFeed.ts`)
- Services: camelCase (e.g., `feeds.ts`)
- Types: lowercase (e.g., `feed.ts`)
- Utilities: camelCase (e.g., `corsProxy.ts`, `xmlParser.ts`)
- Data files: lowercase (e.g., `members.ts`, `news.ts`, `events.ts`)

**Functions:**
- camelCase throughout (e.g., `loadBiases()`, `saveBiases()`, `fetchReddit()`, `stripHtml()`)
- Helper functions in modules are lowercase (e.g., `getCache()`, `setCache()`, `matchesBias()`)
- Event handlers use on + camelCase (e.g., `onToggle`, `onClear`, `onClick`, `onError`)

**Variables:**
- camelCase (e.g., `biases`, `allItems`, `filter`, `loading`, `error`)
- Constants (module-level): SCREAMING_SNAKE_CASE (e.g., `STORAGE_KEY`, `CACHE_KEY`, `CACHE_TTL`, `BTS_KEYWORDS`)
- Boolean variables should start with `is`, `has`, or similar descriptive prefix (e.g., `hasItems`, `imgError` for state)

**Types:**
- PascalCase for interfaces and types (e.g., `FeedItem`, `BiasId`, `Member`, `Event`, `FeedSource`)
- Type unions are descriptive (e.g., `type BiasId = "rm" | "jin" | "suga"...`)
- Record types use descriptive naming (e.g., `Record<string, string>`, `Record<BiasId, string[]>`)

## Code Style

**Formatting:**
- ESLint flat config (`eslint.config.js`)
- Built-in JavaScript and TypeScript recommended rules
- React Hooks plugin enabled
- React Refresh plugin for hot module replacement
- Target ECMAScript 2020+ (ecmaVersion: 2020)
- Tab width/indentation not explicitly set (uses ESLint defaults)

**Linting:**
- Framework: ESLint 9.39.1 with @eslint/js and typescript-eslint
- Strict TypeScript checking enabled
- React Hooks rules enforced (`eslint-plugin-react-hooks`)
- React Refresh rules enforced for HMR
- No unused locals or parameters allowed
- Case fallthrough in switch statements prevented

**Key TypeScript Settings:**
- Target: ES2022
- Module: ESNext
- JSX: react-jsx (automatic runtime)
- Strict mode enabled
- `noUnusedLocals: true` and `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `skipLibCheck: true`

## Import Organization

**Order:**
1. React imports (`import { ... } from "react"`)
2. React Router imports (`import { ... } from "react-router-dom"`)
3. Custom type imports (`import type { ... } from "...")
4. Custom function/component imports (`import ... from "..."`)
5. Styles (CSS imports last)

**Examples from codebase:**
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import "./App.css";

// News.tsx
import { useState } from "react";
import type { FeedSource } from "../types/feed";
import { useFeed } from "../hooks/useFeed";
import { useBias } from "../hooks/useBias";
import FeedCard from "../components/FeedCard";
```

**Path Aliases:**
- No aliases detected; relative paths are used throughout (`"../types/feed"`, `"../hooks/useBias"`)

## Error Handling

**Patterns:**
- Try-catch blocks used for localStorage access (silent failures accepted):
  ```typescript
  function loadBiases(): BiasId[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as BiasId[];
    } catch {
      return [];
    }
  }
  ```
- Promise.allSettled used for concurrent operations to handle partial failures (`feeds.ts`)
- Explicit error state tracking in hooks (e.g., `const [error, setError] = useState<string | null>(null)`)
- Graceful fallback to cached data when fetch fails
- Empty returns on catch blocks signal "nothing to show" rather than throwing

**Fetch Error Handling:**
```typescript
const results = await Promise.allSettled([
  fetchReddit(),
  fetchYouTube(),
  fetchNews(),
]);

const items: FeedItem[] = [];
for (const result of results) {
  if (result.status === "fulfilled") {
    items.push(...result.value);
  }
}
```

## Logging

**Framework:** `console` (no specialized logging framework)

**Patterns:**
- Error states managed via React state rather than logging
- No explicit logging statements observed in source code
- Errors surfaced to UI via error state (e.g., "Failed to load feeds. Showing static news instead.")

## Comments

**When to Comment:**
- Minimal comments observed; code is largely self-documenting
- Comments used only for non-obvious logic

**Examples:**
```typescript
// Check cache first (unless forced refresh)
if (!force) {
  const cached = getCache();
  ...
}

// Use incremental loading — items appear as each source resolves
const finalItems = await fetchAllFeedsIncremental((items) => {
  setAllItems(items);
});

// Fire all sources and deliver results as each resolves
const promises = sources.map((promise) => ...);
```

**No JSDoc/TSDoc observed** - function intentions are clear from signatures and usage

## Function Design

**Size:** Functions generally 10-40 lines; larger functions like `fetchSubreddit()` handle complex parsing

**Parameters:**
- React components use destructured props (e.g., `{ event }: { event: Event }`)
- Hooks receive parameters directly (e.g., `useFeed(filter: FeedSource | "all" = "all", biases: BiasId[] = [])`)
- Callback functions typed explicitly (e.g., `FeedCallback = (items: FeedItem[]) => void`)

**Return Values:**
- React components return JSX
- Hooks return objects with state and functions (e.g., `{ biases, toggleBias, clearBiases }`)
- Services return promises of typed data (e.g., `Promise<FeedItem[]>`)
- Helper utilities return filtered/transformed data

**Example Hook Pattern:**
```typescript
export function useFeed(filter: FeedSource | "all" = "all", biases: BiasId[] = []) {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => { ... }, []);
  useEffect(() => { load(); }, [load]);

  let filtered = filter === "all" ? allItems : allItems.filter(...);
  if (biases.length > 0) { filtered = filtered.filter(...); }

  return { items: filtered, loading, error, refresh: () => load(true), hasItems: allItems.length > 0 };
}
```

## Module Design

**Exports:**
- Named exports for functions and types
- Default exports for React components (see `BiasFilter.tsx`, `EventCard.tsx`, `MemberCard.tsx`)
- Hooks exported as named exports (`export function useBias()`)

**Example:**
```typescript
// Default export (components)
export default function BiasFilter({ biases, onToggle, onClear }: Props) { ... }

// Named export (hooks)
export function useBias() { ... }
export function useFeed(filter, biases) { ... }

// Type and constant exports
export type FeedSource = "reddit" | "youtube" | "news" | "twitter";
export type BiasId = "rm" | "jin" | "suga" | ...;
export const MEMBER_KEYWORDS: Record<BiasId, string[]> = { ... };
```

**Barrel Files:** Not detected; files import directly from their modules

## Specific Patterns Observed

**Data Structures:**
- Config objects at module top for lookup tables (e.g., `memberChips` in `BiasFilter.tsx`, `statusColors` in `EventCard.tsx`)
- String literal enums for configuration (e.g., `type BiasId = "rm" | "jin"...`, `type FeedSource = "reddit" | "youtube"...`)

**React Component Pattern:**
```typescript
export default function ComponentName({ prop1, prop2 }: { prop1: Type; prop2: Type }) {
  return <div>...</div>;
}
```

**Inline Conditional Rendering:**
- Ternary operators for two branches
- Logical AND (`&&`) for conditional rendering
- Example: `{item.thumbnail && <div>...</div>}`

**Array Transformations:**
- `.filter()`, `.map()`, `.slice()` commonly chained
- `.sort()` used with numeric comparisons (e.g., `(a, b) => b.timestamp - a.timestamp`)

---

*Convention analysis: 2026-02-25*
