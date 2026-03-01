# Phase 1: Foundation - Research

**Researched:** 2026-02-25
**Domain:** XSS sanitization, CORS proxy resilience, config extraction, source registry
**Confidence:** HIGH

## Summary

Phase 1 transforms the current BTS fan app from a working-but-fragile monolith into a secure, resilient, config-driven foundation. The codebase today has four intertwined concerns that this phase separates: (1) an XSS-vulnerable `stripHtml` function using `div.innerHTML` on untrusted RSS/HTML content, (2) a sequential CORS proxy chain that blocks on each failed proxy before trying the next, (3) hardcoded BTS-specific data scattered across 10+ files (subreddit names, channel IDs, member keywords, emoji maps, theme colors, social handles), and (4) five feed source fetchers tangled together in a single `feeds.ts` file with no shared interface or registration mechanism.

The solution is well-scoped: DOMPurify (v3.3.1) replaces `stripHtml` with safe HTML sanitization, `Promise.any()` replaces the sequential proxy loop to achieve parallel failover, a typed `GroupConfig` object under `src/config/groups/bts/` consolidates all group-specific data, and a source registry with per-source fetcher modules (`src/services/sources/*.ts`) provides the extensibility foundation for Phase 2's new content sources. No new dependencies beyond DOMPurify are needed.

**Primary recommendation:** Install DOMPurify as the sole new dependency, refactor CORS proxying to use `Promise.any()`, extract all BTS-specific data into `src/config/groups/bts/{members,sources,theme}.ts` composed at `src/config/index.ts`, and split `feeds.ts` into per-source fetcher files behind a registry that auto-discovers fetchers from config.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Sanitization policy**: Allow text, links, basic formatting (bold/italic), and images only -- strip all other HTML. Sanitize at fetch time (store clean data, not raw HTML). When content is stripped, show a "View original" link to the source so users can see full content if curious.
- **Proxy failure UX**: Skip silently when a source's CORS proxies all fail -- that source just doesn't appear in the feed, no error shown. Render feed progressively as each source resolves -- don't wait for all sources before showing results. Show skeleton cards as loading placeholders while content is being fetched. On total outage (all sources fail), auto-retry quietly in the background with a subtle loading indicator -- no error message unless it persists.
- **Config shape & granularity**: GroupConfig includes full visual theming (primary color, accent, logo URL, etc.) for true one-file swap for a new fandom. Member data includes full aliases: official name, stage name, nicknames, common misspellings for keyword matching. Config split into separate files: members.ts, sources.ts, theme.ts -- composed into GroupConfig at index. Files organized in group-specific directory: config/groups/bts/members.ts, sources.ts, theme.ts -- easy to copy whole folder for new fandom. Each source entry in config can specify per-source settings: fetch count, refresh interval, priority. BTS config is just the first config, no special template role -- TypeScript types serve as documentation. Config selection via code-level import swap in config/index.ts (not env variable).
- **Source registry design**: One fetcher file per source type: reddit.ts, youtube.ts, tumblr.ts, weverse.ts. Auto-discovery: write a fetcher file following the interface, add source to config -- registry discovers from config. Registry handles error handling/retries uniformly for all sources -- fetchers just fetch. All fetchers return a shared FeedItem type normalizing data across sources (title, content, author, date, source, url, etc.).

### Claude's Discretion
- **Config validation**: Pick appropriate level of validation (TypeScript types vs runtime checks)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | `stripHtml` replaced with DOMPurify sanitization for all RSS/HTML content | DOMPurify v3.3.1 with restrictive `ALLOWED_TAGS`/`ALLOWED_ATTR` config; sanitize at fetch time per user decision |
| SEC-02 | Tumblr HTML content sanitized with restrictive DOMPurify allowlist before rendering | Same DOMPurify config applies; Tumblr fetcher (stub for Phase 2) will use shared sanitization utility |
| INFRA-01 | CORS proxy attempts run in parallel (all proxies tried simultaneously, first success used) | `Promise.any()` replaces sequential `for` loop; supported by ES2022 target; provides first-success-wins semantics |
| INFRA-02 | Feed source fetchers split into per-source modules with a source registry mapping type to fetcher function | Registry pattern with `SourceFetcher` interface; per-source files under `src/services/sources/`; registry built from config's source entries |
| CONFIG-01 | All BTS-specific keywords, subreddit names, channel IDs, and member data extracted to a single typed GroupConfig object | GroupConfig type composed from MemberConfig, SourceConfig, ThemeConfig; files under `src/config/groups/bts/` |
| CONFIG-02 | App reads all group-specific data from config -- zero hardcoded BTS references in service/component code | Audit identified 100+ hardcoded BTS references across 10 files that must be replaced with config reads |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMPurify | 3.3.1 | XSS-safe HTML sanitization | Industry standard XSS sanitizer; DOM-only, 15KB minified, zero dependencies; used by Wikipedia, Mozilla, etc. Secure defaults with configurable allowlists |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All other work uses existing dependencies (React 19, TypeScript 5.9, Vite 7) and native APIs (`Promise.any()`, `AbortSignal.timeout()`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMPurify | sanitize-html | sanitize-html is heavier (depends on htmlparser2/parse5), runs server-side paradigm; DOMPurify uses native DOM parser which is faster and more robust in the browser |
| DOMPurify | Trusted Types API only | Trusted Types is only Chrome; DOMPurify wraps Trusted Types when available but works everywhere |
| Promise.any() | Promise.race() | `Promise.race()` rejects on first rejection; `Promise.any()` waits for first fulfillment which is exactly the failover semantic needed |

**Installation:**
```bash
npm install dompurify
```
No `@types/dompurify` needed -- DOMPurify v3.x ships its own TypeScript types.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── config/
│   ├── types.ts                    # GroupConfig, MemberConfig, SourceConfig, ThemeConfig
│   ├── index.ts                    # Composes and re-exports active group config
│   └── groups/
│       └── bts/
│           ├── index.ts            # Composes members + sources + theme into GroupConfig
│           ├── members.ts          # Member data with aliases/keywords
│           ├── sources.ts          # Source definitions (subreddits, channels, RSS feeds)
│           └── theme.ts            # Visual theming (colors, logo, group name, tagline)
├── services/
│   ├── sources/
│   │   ├── registry.ts            # Source registry: maps source type -> fetcher function
│   │   ├── reddit.ts              # Reddit fetcher
│   │   ├── youtube.ts             # YouTube fetcher
│   │   ├── rss.ts                 # Generic RSS fetcher (news sites)
│   │   └── twitter.ts             # Twitter/Nitter fetcher
│   └── feeds.ts                   # Orchestrator: uses registry to fetch all configured sources
├── utils/
│   ├── corsProxy.ts               # Parallel proxy with Promise.any()
│   ├── sanitize.ts                # DOMPurify wrapper with project-specific config
│   └── xmlParser.ts               # Existing XML parsing (unchanged)
└── types/
    └── feed.ts                    # FeedItem, FeedSource (extended from config)
```

### Pattern 1: Sanitization Utility with Shared Config
**What:** A thin wrapper around DOMPurify that encodes the project's sanitization policy as a reusable function.
**When to use:** Every time untrusted HTML/RSS content is processed before storage or rendering.
**Example:**
```typescript
// src/utils/sanitize.ts
import DOMPurify from "dompurify";

const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "img", "br", "p"],
  ALLOWED_ATTR: ["href", "src", "alt", "target", "rel"],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

/**
 * Sanitize untrusted HTML content. Returns safe HTML string.
 * Policy: text, links, basic formatting, and images only.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

/**
 * Strip all HTML, returning plain text only.
 * Replacement for the old unsafe stripHtml function.
 */
export function stripToText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
```
**Source:** [DOMPurify GitHub README](https://github.com/cure53/DOMPurify), [DOMPurify default allowlists](https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist)

### Pattern 2: Parallel CORS Proxy with Promise.any()
**What:** Fire all CORS proxy requests simultaneously. The first successful response wins; all others are aborted.
**When to use:** Replace the current sequential `for` loop in `corsProxy.ts`.
**Example:**
```typescript
// src/utils/corsProxy.ts
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export async function fetchWithProxy(url: string): Promise<string> {
  const controller = new AbortController();

  try {
    const text = await Promise.any(
      PROXIES.map(async (buildProxy) => {
        const proxyUrl = buildProxy(url);
        const res = await fetch(proxyUrl, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
    );
    controller.abort(); // Cancel remaining in-flight requests
    return text;
  } catch (err) {
    // AggregateError means all proxies failed
    if (err instanceof AggregateError) {
      throw new Error(`All proxies failed for ${url}`);
    }
    throw err;
  }
}
```
**Source:** [MDN Promise.any()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)

**Note on AbortController:** After `Promise.any()` resolves with the first success, calling `controller.abort()` cancels the remaining in-flight fetch requests. However, `abort()` will also signal to the already-resolved promise. Since we already have the text from the winning promise's `.text()` call, the abort on the winner is harmless -- it has already completed. The key benefit is cleaning up the losing requests' network connections.

### Pattern 3: Source Registry with Config-Driven Discovery
**What:** A map from source type to fetcher function, built dynamically from the active GroupConfig's source list.
**When to use:** When fetching feeds -- the orchestrator iterates config sources and looks up fetchers from the registry.
**Example:**
```typescript
// src/services/sources/registry.ts
import type { FeedItem } from "../../types/feed";
import type { SourceEntry } from "../../config/types";

export interface SourceFetcher {
  (source: SourceEntry): Promise<FeedItem[]>;
}

const fetchers = new Map<string, SourceFetcher>();

export function registerFetcher(type: string, fetcher: SourceFetcher): void {
  fetchers.set(type, fetcher);
}

export function getFetcher(type: string): SourceFetcher | undefined {
  return fetchers.get(type);
}

// Auto-register: each fetcher file calls registerFetcher() on import
// Registry file imports all fetcher modules to trigger registration
import "./reddit.ts";
import "./youtube.ts";
import "./rss.ts";
import "./twitter.ts";
```

### Pattern 4: GroupConfig Type Hierarchy
**What:** A composed type that represents all group-specific data.
**When to use:** Wherever the app needs group-specific information.
**Example:**
```typescript
// src/config/types.ts
export interface MemberConfig {
  id: string;
  stageName: string;
  realName: string;
  aliases: string[];        // All searchable names/nicknames/misspellings
  emoji: string;
  color: string;
  birthday: string;
  role: string;
  position: string;
  image: string;
  gallery?: string[];
  bio: string;
  funFacts: string[];
  soloProjects: string[];
  socialMedia: { platform: string; handle: string; url?: string }[];
}

export interface SourceEntry {
  type: string;             // "reddit" | "youtube" | "rss" | "twitter" etc.
  id: string;               // Unique identifier for this source instance
  label: string;            // Display name (e.g., "r/bangtan", "BANGTANTV")
  url: string;              // Base URL or identifier (subreddit name, channel ID, RSS URL)
  needsFilter: boolean;     // Whether to apply keyword filtering
  fetchCount?: number;      // Max items to fetch (default per source type)
  refreshInterval?: number; // Override default refresh interval (ms)
  priority?: number;        // Display priority (lower = higher priority)
}

export interface ThemeConfig {
  groupName: string;        // "BTS"
  groupNameNative: string;  // "방탄소년단"
  tagline: string;          // "Beyond The Scene · ARMY Forever"
  fandomName: string;       // "ARMY"
  primaryColor: string;     // "#562B8B"
  accentColor: string;      // "#7c4dbd"
  darkColor: string;        // "#3a1d5c"
  logoUrl: string;          // "/members/group.jpg"
  socialLinks: { platform: string; handle: string; url: string }[];
}

export interface GroupConfig {
  members: MemberConfig[];
  sources: SourceEntry[];
  theme: ThemeConfig;
  keywords: RegExp;         // Compiled from member aliases + group terms
}
```

### Anti-Patterns to Avoid
- **Importing group data files directly from components:** Always go through `src/config/index.ts`. Components should never import from `src/config/groups/bts/` directly -- that path is an implementation detail.
- **Putting sanitization in components:** Sanitize at fetch time in the fetcher modules. Components receive pre-sanitized data. This prevents any rendering path from accidentally displaying unsanitized content.
- **Building the keyword regex at runtime on every filter call:** Compile the regex once when the config is loaded and store it on the `GroupConfig` object.
- **Keeping `stripHtml` as a fallback:** Delete it entirely after replacing with DOMPurify. Leaving it creates ambiguity about which function to use.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex stripping or `div.innerHTML` text extraction | DOMPurify `sanitize()` with explicit `ALLOWED_TAGS` | XSS vectors are vast and evolving; DOMPurify is maintained by Cure53 security researchers and handles mutation XSS, SVG injection, protocol-based attacks, etc. |
| Parallel-first-success | Custom promise orchestration with manual state tracking | `Promise.any()` (native ES2021+) | Built-in language feature with correct semantics for "first success wins"; handles AggregateError on total failure |
| Request cancellation | Manual flag checking or ignored responses | `AbortController` with `fetch()` signal | Native API, correctly cancels network requests rather than just ignoring responses |

**Key insight:** The current `stripHtml` function (`div.innerHTML = html; return div.textContent`) actually executes scripts and loads images in the untrusted HTML before extracting text. This is an active XSS vulnerability, not just a theoretical concern. DOMPurify never triggers execution because it parses the DOM structure without inserting into the live document.

## Common Pitfalls

### Pitfall 1: AbortController Aborting the Winner
**What goes wrong:** Using a single `AbortController` for all proxy requests means that when you abort after `Promise.any()` resolves, you also abort the winning request. If the winning fetch's `.text()` call hasn't completed yet, this corrupts the result.
**Why it happens:** `Promise.any()` resolves when the first `fetch()` gets a successful response, but `.text()` (reading the body) is a separate async step.
**How to avoid:** Ensure the winning promise fully resolves (including `.text()`) before calling `abort()`. The pattern above handles this correctly because `await res.text()` completes before the value is returned, which is before `controller.abort()` is called.
**Warning signs:** Intermittent empty responses or AbortError exceptions from successful proxy calls.

### Pitfall 2: DOMPurify Config Too Permissive
**What goes wrong:** Using DOMPurify with default config (which allows most HTML tags) instead of a restrictive allowlist. Default DOMPurify still blocks `<script>` and event handlers, but allows `<iframe>`, `<form>`, `<input>`, `<style>`, etc.
**Why it happens:** Developers install DOMPurify and call `sanitize(dirty)` without specifying `ALLOWED_TAGS`, thinking defaults are restrictive enough.
**How to avoid:** Always pass explicit `ALLOWED_TAGS` and `ALLOWED_ATTR`. The user specified: text, links, basic formatting, images only. That means `['b', 'i', 'em', 'strong', 'a', 'img', 'br', 'p']` and `['href', 'src', 'alt', 'target', 'rel']`.
**Warning signs:** Feed cards rendering unexpected HTML elements like iframes or forms.

### Pitfall 3: Config Import Cycles
**What goes wrong:** Config types imported in services, services imported in config for fetcher references, creating circular dependencies.
**Why it happens:** The config defines source entries that reference fetcher types, and fetchers reference config types.
**How to avoid:** Types go in `src/config/types.ts` (no runtime imports). The registry imports fetcher modules. Fetcher modules import types only. Config data files import types only. The registry is the single join point.
**Warning signs:** Vite build warnings about circular dependencies; `undefined` values at module load time.

### Pitfall 4: Forgetting to Propagate Config to CSS
**What goes wrong:** GroupConfig has theme colors, but CSS uses hardcoded `--bts-purple` custom properties. Changing the config doesn't change the visual theme.
**Why it happens:** CSS custom properties must be set at runtime via JavaScript to be dynamic.
**How to avoid:** On app mount, apply theme config values to `:root` CSS custom properties using `document.documentElement.style.setProperty()`. Rename variables from `--bts-purple` to `--theme-primary` (generic names).
**Warning signs:** App loads BTS colors even after switching config to a different group.

### Pitfall 5: Regression in Feed Results
**What goes wrong:** After splitting fetchers into separate files and introducing the registry, the feed returns different results than before (items missing, duplicates, wrong order).
**Why it happens:** Subtle differences in how sources are orchestrated -- different timeout values, different error handling, different result merging order.
**How to avoid:** Before refactoring, capture a snapshot of fetch behavior (which sources, how many items each, filtering logic). After refactoring, verify identical behavior. The existing `fetchAllFeedsIncremental` pattern must be preserved in the new orchestrator.
**Warning signs:** Feed shows fewer items, different ordering, or missing sources compared to pre-refactor.

### Pitfall 6: Breaking Progressive Loading
**What goes wrong:** The current `fetchAllFeedsIncremental` renders items as each source resolves. The refactored version waits for all sources, breaking the progressive UX.
**Why it happens:** New orchestrator uses `Promise.allSettled()` without the incremental callback pattern.
**How to avoid:** The registry orchestrator must preserve the `onItems` callback pattern that delivers partial results as each source resolves.
**Warning signs:** Feed shows loading skeleton for 5+ seconds, then all items appear at once.

## Code Examples

### Example 1: Migrating stripHtml to DOMPurify
```typescript
// BEFORE (XSS vulnerable):
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;  // Executes scripts, loads images!
  return div.textContent || "";
}
// Used as: stripHtml(item.description).slice(0, 200)

// AFTER:
import { stripToText, sanitizeHtml } from "../utils/sanitize";
// For plain text preview: stripToText(item.description).slice(0, 200)
// For rich content display: sanitizeHtml(item.description)
```

### Example 2: Source Config Entry
```typescript
// src/config/groups/bts/sources.ts
import type { SourceEntry } from "../../types";

export const sources: SourceEntry[] = [
  // Reddit sources
  { type: "reddit", id: "reddit-bangtan", label: "r/bangtan", url: "bangtan", needsFilter: false, fetchCount: 15 },
  { type: "reddit", id: "reddit-kpop", label: "r/kpop", url: "kpop", needsFilter: true, fetchCount: 15 },
  { type: "reddit", id: "reddit-heungtan", label: "r/heungtan", url: "heungtan", needsFilter: false, fetchCount: 15 },
  { type: "reddit", id: "reddit-bts7", label: "r/bts7", url: "bts7", needsFilter: false, fetchCount: 15 },

  // YouTube channels
  { type: "youtube", id: "yt-bangtantv", label: "BANGTANTV", url: "UCLkAepWjdylmXSltofFvsYQ", needsFilter: false, fetchCount: 10 },
  { type: "youtube", id: "yt-hybe", label: "HYBE LABELS", url: "UCx2hOXK_cGnRolCRilNUfA", needsFilter: true, fetchCount: 10 },

  // RSS news sources
  { type: "rss", id: "rss-soompi", label: "Soompi", url: "https://www.soompi.com/feed", needsFilter: true, fetchCount: 10 },
  { type: "rss", id: "rss-allkpop", label: "AllKPop", url: "https://www.allkpop.com/feed", needsFilter: true, fetchCount: 10 },

  // Twitter/Nitter
  { type: "twitter", id: "twitter-search", label: "X/Twitter", url: "https://nitter.net/search?q=BTS&f=tweets", needsFilter: false, fetchCount: 10 },
];
```

### Example 3: Per-Source Fetcher Module
```typescript
// src/services/sources/reddit.ts
import type { FeedItem } from "../../types/feed";
import type { SourceEntry } from "../../config/types";
import { fetchWithProxy } from "../../utils/corsProxy";
import { stripToText } from "../../utils/sanitize";
import { getConfig } from "../../config";
import { registerFetcher } from "./registry";

async function fetchRedditSource(source: SourceEntry): Promise<FeedItem[]> {
  const config = getConfig();
  const limit = source.fetchCount ?? 15;
  const url = `https://www.reddit.com/r/${source.url}/hot.json?limit=${limit}`;
  const text = await fetchWithProxy(url);
  const data = JSON.parse(text);
  const posts = data?.data?.children ?? [];
  const items: FeedItem[] = [];

  for (const post of posts) {
    const d = post.data;
    if (d.stickied) continue;
    if (source.needsFilter && !config.keywords.test(d.title + " " + (d.selftext ?? ""))) continue;

    items.push({
      id: `reddit-${d.id}`,
      title: d.title,
      url: d.url.startsWith("/") ? `https://www.reddit.com${d.url}` : d.url,
      source: "reddit",
      sourceName: source.label,
      timestamp: d.created_utc * 1000,
      preview: d.selftext ? stripToText(d.selftext).slice(0, 200) : undefined,
      thumbnail: d.thumbnail?.startsWith("http") ? d.thumbnail : undefined,
      author: `u/${d.author}`,
    });
  }

  return items;
}

registerFetcher("reddit", fetchRedditSource);
```

### Example 4: Theme Application via CSS Custom Properties
```typescript
// src/config/applyTheme.ts
import type { ThemeConfig } from "./types";

export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement.style;
  root.setProperty("--theme-primary", theme.primaryColor);
  root.setProperty("--theme-accent", theme.accentColor);
  root.setProperty("--theme-dark", theme.darkColor);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `div.innerHTML` text extraction | DOMPurify sanitization | DOMPurify v1.0 (2015), industry standard by 2018 | Eliminates entire class of XSS vulnerabilities |
| Sequential proxy fallback (`for` loop) | `Promise.any()` parallel failover | `Promise.any()` shipped in ES2021 | Faster failover: N proxies tried in parallel instead of serial timeout chain |
| `@types/dompurify` separate package | DOMPurify ships own types since v3.x | DOMPurify 3.2.5 (2024) | One fewer dev dependency |

**Deprecated/outdated:**
- The `@types/dompurify` package is now a stub -- DOMPurify 3.x includes its own TypeScript declarations
- `Promise.race()` is wrong for failover because it rejects on first rejection rather than waiting for first success

## Codebase Audit: Hardcoded BTS References

This audit is critical for CONFIG-01 and CONFIG-02. All of these must be extracted to config:

### Service/Utility Layer (MUST extract for CONFIG-02)
| File | Line(s) | Hardcoded Value |
|------|---------|-----------------|
| `src/services/feeds.ts:5` | `BTS_KEYWORDS` regex | All member names and group terms |
| `src/services/feeds.ts:42-47` | Subreddit list | `bangtan`, `kpop`, `heungtan`, `bts7` |
| `src/services/feeds.ts:89-92` | YouTube channel list | `BANGTANTV` ID, `HYBE LABELS` ID |
| `src/services/feeds.ts:109` | Soompi RSS URL | `https://www.soompi.com/feed` |
| `src/services/feeds.ts:133` | AllKPop RSS URL | `https://www.allkpop.com/feed` |
| `src/services/feeds.ts:158` | Twitter search URL | `nitter.net/search?q=BTS` |
| `src/types/feed.ts:1` | `FeedSource` type | Hardcoded `"reddit" \| "youtube" \| "news" \| "twitter"` |
| `src/types/feed.ts:3` | `BiasId` type | Hardcoded member IDs |
| `src/types/feed.ts:17-25` | `MEMBER_KEYWORDS` | All member keyword arrays |
| `src/hooks/useFeed.ts:6` | Cache key | `"bts-feed-cache"` |
| `src/hooks/useBias.ts:4` | Storage key | `"bts-bias-selection"` |

### Component Layer (Extract for CONFIG-02)
| File | Line(s) | Hardcoded Value |
|------|---------|-----------------|
| `src/components/BiasFilter.tsx:3-11` | `memberChips` array | Member IDs, labels, emojis, colors |
| `src/components/FeedFilter.tsx:8-14` | `filters` array | Source filter tabs (Phase 4 scope -- CONFIG-03, but source list should come from config) |
| `src/components/FeedCard.tsx:4-8` | `sourceBadgeColors` | Source type to color mapping |
| `src/components/SwipeFeed.tsx:4-8` | `sourceBadgeColors` | Duplicated source-to-color map |
| `src/components/SwipeFeed.tsx:28-33` | `sourceEmojis` | Source type to emoji mapping |
| `src/pages/MemberDetail.tsx:6-14` | `memberEmojis` | Member ID to emoji mapping |

### Content/Theme Layer (Extract for CONFIG-01)
| File | Line(s) | Hardcoded Value |
|------|---------|-----------------|
| `src/pages/Home.tsx:8-14` | Hero section | "BTS", "방탄소년단", "Beyond The Scene", group photo path |
| `src/pages/Home.tsx:22` | Feed link description | "BTS content from the web" |
| `src/pages/News.tsx:28` | Page subtitle | "BTS content from across the web" |
| `src/pages/News.tsx:69-74` | Social follow bar | `@BTS_twt` link |
| `src/pages/Members.tsx:8` | Page subtitle | "The 7 members of BTS" |
| `src/pages/Tours.tsx:25` | Page title | "BTS WORLD TOUR 'ARIRANG'" |
| `src/App.css:1-5` | CSS custom properties | `--bts-purple`, `--bts-purple-light`, `--bts-purple-dark` |
| `src/data/members.ts` | Entire file | All 7 member data objects |
| `src/data/events.ts` | Entire file | All tour event data |
| `src/data/news.ts` | Entire file | Static news items |

### Classification for Phase 1 Scope
- **Service/utility layer**: All items MUST be extracted (CONFIG-01, CONFIG-02)
- **Component layer**: BiasFilter chips and badge colors should be derived from config. FeedFilter tabs are Phase 4 (CONFIG-03) but the source data they need should exist in config from Phase 1
- **Content/theme layer**: Theme config (colors, names, tagline, logo) must be extracted. Member data moves to config. Page text that references group name should read from config. Static data files (events.ts, news.ts) remain as group-specific data files within the config directory
- **CSS**: Rename `--bts-*` variables to `--theme-*` and apply from config at runtime

## Open Questions

1. **AbortController timing with Promise.any()**
   - What we know: After `Promise.any()` resolves with the winner's fully read text, calling `abort()` cancels remaining in-flight requests
   - What's unclear: Whether the `abort()` also attempts to abort the already-completed winning fetch, and whether that causes any issues in any browser
   - Recommendation: Test in Chrome/Firefox/Safari. The winning promise has already resolved by the time `abort()` fires, so it should be a no-op. If edge cases appear, use per-request AbortControllers instead of a shared one

2. **Config validation strategy (Claude's Discretion)**
   - What we know: TypeScript types enforce structure at compile time. Runtime validation catches data errors (missing required fields in a new config).
   - What's unclear: Whether runtime validation is worth the complexity for a config that changes at code level, not at runtime
   - Recommendation: Use TypeScript types only (compile-time). The config is imported statically -- if it doesn't match the type, the build fails. Runtime validation adds complexity with no benefit since config is never loaded from an external source. Add a brief `satisfies GroupConfig` assertion in the config index file for extra compile-time safety.

3. **Nitter availability**
   - What we know: The Twitter fetcher uses `nitter.net` which is a third-party service with unreliable availability
   - What's unclear: Whether Nitter will be available long-term
   - Recommendation: Out of scope for Phase 1. The fetcher moves to its own module as-is. If Nitter goes down, the source silently fails per the user's proxy failure UX decision.

## Sources

### Primary (HIGH confidence)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify) - API documentation, configuration options, version (v3.3.1)
- [DOMPurify Default Allowlists](https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist) - Default allowed/blocked tags and attributes
- [MDN Promise.any()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any) - API, semantics, AggregateError behavior
- [MDN Promise.race()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) - Comparison with Promise.any()
- Direct codebase audit (all .ts/.tsx files in `src/`) - Hardcoded reference inventory

### Secondary (MEDIUM confidence)
- [CORS Proxies Gist (2025)](https://gist.github.com/reynaldichernando/eab9c4e31e30677f176dc9eb732963ef) - Current proxy service availability and rate limits
- [DOMPurify npm](https://www.npmjs.com/package/dompurify) - Package info, version confirmation

### Tertiary (LOW confidence)
- None -- all claims verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - DOMPurify is universally recommended; Promise.any() is a native API with full browser support
- Architecture: HIGH - Registry pattern is straightforward; config structure follows user's locked decisions exactly
- Pitfalls: HIGH - Derived from direct codebase audit and verified API behavior
- Codebase audit: HIGH - Every file in `src/` was read and all hardcoded references were catalogued

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable domain -- DOMPurify and Promise.any() are mature/unchanging)
