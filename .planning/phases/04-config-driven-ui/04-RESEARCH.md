# Phase 4: Config-Driven UI - Research

**Researched:** 2026-02-26
**Domain:** TypeScript config-driven component generation, PWA manifest generation, codebase audit for hardcoded references
**Confidence:** HIGH

## Summary

Phase 4 completes the clone-and-swap architecture by making every UI element derive from `GroupConfig`. The codebase is already ~70% config-driven from Phase 1 work -- Home, Members, MemberDetail, News header/subtitle, BiasFilter member chips, feed caching keys, and theme colors all read from config. The remaining work centers on three areas: (1) making FeedFilter tabs generate dynamically from configured sources instead of a hardcoded array, (2) extracting all remaining BTS-specific hardcoded strings (index.html title/meta, PWA manifest, Home page quote, BiasFilter label, Tours page title/subtitle), and (3) adding a strings/labels section to GroupConfig so every user-facing text reference is swappable.

The FeedSource union type in `src/types/feed.ts` is also hardcoded (`"reddit" | "youtube" | "news" | "rss" | "twitter" | "tumblr"`) -- this needs to become config-derived. The BiasId type has a TODO comment already marking it for Phase 4. The `src/data/` directory contains `news.ts`, `events.ts`, and a legacy `members.ts` with BTS-specific content that's directly imported by pages.

**Primary recommendation:** Extend `GroupConfig` with a `labels` section for all user-facing strings, derive FeedFilter tabs from `config.sources` unique types, make FeedSource/BiasId config-derived types, generate PWA manifest from config at build time via vite-plugin-pwa's `manifest` option, and create a dummy group config as both validation and template.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Filter Tab Generation:**
- Tabs auto-generated from config -- every source type with at least one feed configured gets a tab automatically
- "All" tab is always present and always first (hardcoded behavior, not configurable)
- Tab order after "All" follows the order sources are defined in config
- Tabs always show even if a source returns zero posts (consistent UI)

**Config Completeness:**
- Full codebase audit for hardcoded BTS-specific strings, URLs, and identifiers
- Every hardcoded BTS reference gets extracted to GroupConfig and read dynamically -- no "document as limitation" exceptions
- GroupConfig uses strict TypeScript types -- all fields required, no optionals with defaults. TypeScript error if a new group config is missing anything
- PWA manifest (app name, theme color, description) generated from GroupConfig at build time

**Label & Display Names:**
- Source types have configurable display labels in config (e.g., "Videos" instead of "YouTube")
- BiasFilter label ("Select Your Bias") is configurable per group via config (e.g., `memberFilterLabel`)
- All labels are required in config -- no fallback defaults. Consistent with strict types decision
- All visible text that references the group should come from config -- empty state messages, page headers, navigation labels, everything user-facing

**Swap Validation:**
- App title and page titles come from GroupConfig -- swap changes branding
- Theme (colors, accents) fully swaps with group config -- theme.ts already exists in config structure
- If a dummy/example group config is created, keep it in the repo permanently as documentation and template

### Claude's Discretion

- Validation approach (dummy config, TypeScript-only, or combination)
- How to structure the labels/strings section of GroupConfig
- PWA manifest generation approach (build plugin, vite config, etc.)
- Exact audit methodology for finding hardcoded references

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONFIG-03 | FeedFilter tabs and BiasFilter chips generated dynamically from config instead of hardcoded arrays | FeedFilter currently has hardcoded `filters` array (6 items). Derive tabs from `config.sources` unique types with display labels. BiasFilter already reads from config (reference pattern). BiasId type needs to become config-derived. |
| CONFIG-04 | Changing the config import in `config/index.ts` swaps the entire app to a different group with no code changes | Audit found hardcoded BTS references in: index.html (title, meta), manifest.json, Home.tsx (quote), Tours.tsx (title, subtitle), FeedFilter.tsx (filter array), feed.ts (FeedSource/BiasId types), data/*.ts (news, events). All must be extracted to config or generated from config. |

</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 | Strict typing for GroupConfig -- `satisfies` for compile-time validation | Already used, enforces required fields |
| vite-plugin-pwa | ^1.2.0 | PWA manifest generation from config at build time | Already a dependency, supports `manifest` option in plugin config |
| Vite | ^7.3.1 | Build tool -- `define` option for injecting config values into index.html | Already used, supports build-time injection |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa `manifest` | ^1.2.0 | Generate manifest.json from JS/TS config instead of static file | Replace static `public/manifest.json` with config-driven generation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa manifest generation | Vite `transformIndexHtml` hook | PWA plugin already handles manifest; using its built-in option is simpler than a custom transform |
| Vite `define` for index.html | `vite-plugin-html` | Extra dependency for something achievable with built-in `transformIndexHtml` hook |

**Installation:** No new packages needed. All required capabilities exist in current dependencies.

## Architecture Patterns

### Recommended Changes to Project Structure

```
src/
├── config/
│   ├── types.ts              # MODIFY: Add labels/strings to GroupConfig, add SourceTypeConfig
│   ├── index.ts              # No change (swap point)
│   ├── applyTheme.ts         # No change
│   └── groups/
│       ├── bts/
│       │   ├── index.ts      # MODIFY: Add labels
│       │   ├── members.ts    # No change
│       │   ├── sources.ts    # No change
│       │   └── theme.ts      # No change
│       └── example/          # NEW: Permanent example/template config
│           └── index.ts
├── types/
│   └── feed.ts               # MODIFY: FeedSource/BiasId become config-derived
├── components/
│   ├── FeedFilter.tsx         # MODIFY: Derive tabs from config.sources
│   └── BiasFilter.tsx         # MODIFY: Read label from config.labels
├── pages/
│   ├── Home.tsx               # MODIFY: Read quote from config.labels
│   ├── Tours.tsx              # MODIFY: Read title/subtitle from config.labels
│   └── News.tsx               # No change (already config-driven)
├── data/
│   ├── members.ts             # DELETE: Legacy, unused (config/groups/bts/members.ts is used)
│   ├── news.ts                # ASSESS: Hardcoded BTS news -- this is fallback static content
│   └── events.ts              # ASSESS: Hardcoded BTS events -- group-specific data
└── index.html                 # MODIFY: Title/meta from config via Vite plugin
```

### Pattern 1: Derive Filter Tabs from Config Sources

**What:** Generate FeedFilter tabs by extracting unique source types from `config.sources`, preserving the order they first appear in the config array.
**When to use:** Replacing the hardcoded `filters` array in FeedFilter.tsx.

```typescript
// FeedFilter.tsx
import { getConfig } from "../config";

export default function FeedFilter({ active, onChange }: FeedFilterProps) {
  const config = getConfig();

  // Derive unique source types in config-defined order
  const sourceTypes = new Map<string, string>();
  for (const source of config.sources) {
    if (source.enabled !== false && !sourceTypes.has(source.type)) {
      sourceTypes.set(source.type, config.labels.sourceLabels[source.type]);
    }
  }

  return (
    <div className="feed-filter">
      <button
        className={`feed-filter-tab${active === "all" ? " active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {Array.from(sourceTypes).map(([type, label]) => (
        <button
          key={type}
          className={`feed-filter-tab${active === type ? " active" : ""}`}
          onClick={() => onChange(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Pattern 2: Config-Driven Type Derivation

**What:** Derive FeedSource and BiasId types from config rather than hardcoding them.
**When to use:** Making the type system reflect config.

```typescript
// types/feed.ts -- replace hardcoded union with string
// Since source types come from runtime config, the type becomes string
// TypeScript can't derive a union from runtime data, so use string
// The config's sourceLabels (required keys) provides compile-time validation
export type FeedSource = string;

// BiasId similarly becomes string -- validated at runtime by config.members[].id
export type BiasId = string;
```

**Note:** True union types from config values aren't possible at runtime in TypeScript. The `sourceLabels` record in GroupConfig (with required keys) provides compile-time validation that all expected source types have labels. Runtime validation happens naturally since only types present in `config.sources` generate tabs.

### Pattern 3: PWA Manifest from Config via vite-plugin-pwa

**What:** Replace static `public/manifest.json` with config-driven manifest generation.
**When to use:** Making PWA app name, description, and theme color swap with config.

```typescript
// vite.config.ts
import { getConfig } from "./src/config/index.ts";

// Note: This requires the config to be importable at build time
// (no browser APIs, no side effects that need DOM)
const config = getConfig();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: config.labels.appName,
        short_name: config.theme.groupName,
        description: config.labels.appDescription,
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
```

### Pattern 4: index.html Title/Meta from Config via Vite transformIndexHtml

**What:** Inject config values into index.html at build time.
**When to use:** Making the HTML `<title>` and `<meta>` tags swap with config.

```typescript
// vite.config.ts -- custom plugin approach
{
  name: "inject-config-html",
  transformIndexHtml(html) {
    const cfg = getConfig();
    return html
      .replace(/<title>.*<\/title>/, `<title>${cfg.labels.appTitle}</title>`)
      .replace(
        /content="BTS"/,
        `content="${cfg.theme.groupName}"`
      );
  },
}
```

### Pattern 5: Labels/Strings Section in GroupConfig

**What:** A required `labels` object in GroupConfig that holds all user-facing text.
**When to use:** Any text that references the group name, fandom, or group-specific content.

```typescript
// config/types.ts
export interface GroupLabels {
  // App-level
  appName: string;           // "BTS ARMY App"
  appTitle: string;          // "BTS - ARMY App" (browser tab)
  appDescription: string;    // "BTS Fan App for ARMY"

  // Source type display labels
  sourceLabels: Record<string, string>;  // { reddit: "Reddit", youtube: "YouTube", ... }

  // Component labels
  memberFilterLabel: string; // "Select Your Bias"

  // Page content
  homeQuote: string;         // "Love yourself, speak yourself"
  tourTitle: string;         // "BTS WORLD TOUR 'ARIRANG'"
  tourSubtitle: string;      // "82+ shows across 34 cities in 23 countries"
}

export interface GroupConfig {
  members: MemberConfig[];
  sources: SourceEntry[];
  theme: ThemeConfig;
  keywords: RegExp;
  labels: GroupLabels;
}
```

### Anti-Patterns to Avoid

- **Fallback defaults for labels:** Decision explicitly says "no fallback defaults." Every label must be required in GroupConfig. If a field is missing, TypeScript should error at compile time.
- **Optional fields in GroupConfig:** Decision says "strict TypeScript types -- all fields required, no optionals with defaults." Use `satisfies GroupConfig` (already in use) to enforce this.
- **Dynamic imports for config:** The config swap is a build-time/source-code change (change the import in `config/index.ts`), not a runtime switch. Don't add dynamic import complexity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PWA manifest generation | Custom file writer that generates manifest.json | vite-plugin-pwa `manifest` option | Already a dependency, handles hashing, service worker integration |
| HTML meta injection | Manual string replacement in a build script | Vite `transformIndexHtml` hook | Built-in Vite plugin API, runs at build time, type-safe |
| Source type deduplication | Custom set logic spread across files | `Map` preserving insertion order from `config.sources` | Built-in JS Map maintains insertion order, which matches the "tab order follows config source order" decision |

**Key insight:** This phase is primarily a refactoring/extraction task, not a new-feature task. The risk is missing a hardcoded reference, not choosing the wrong library.

## Common Pitfalls

### Pitfall 1: Vite Config Importing App Config

**What goes wrong:** `vite.config.ts` runs in Node.js at build time. If `src/config/index.ts` or its transitive imports use browser APIs (like `document`, `window`, `localStorage`), the build will crash.
**Why it happens:** The config module tree may contain browser-only code.
**How to avoid:** Audit the config import chain: `config/index.ts` -> `groups/bts/index.ts` -> `members.ts`, `sources.ts`, `theme.ts`. Currently these are pure data files with no browser API calls. The `applyTheme.ts` file uses `document.documentElement.style` but is NOT in the import chain -- it's imported separately in `main.tsx`. So this is safe. Keep it that way -- never add browser APIs to the config data files.
**Warning signs:** Build errors mentioning `document is not defined` or `ReferenceError: window is not defined`.

### Pitfall 2: FeedSource Type Becoming Too Loose

**What goes wrong:** Changing `FeedSource` from a union (`"reddit" | "youtube" | ...`) to `string` loses type safety. Code that pattern-matches on source types (like `getEngagementValue` in `feeds.ts` or `sourceBadgeColors` in `FeedCard.tsx`) won't get exhaustiveness checking.
**Why it happens:** TypeScript can't derive union types from runtime config values.
**How to avoid:** Accept `string` as the runtime type but use the `sourceLabels` record in GroupConfig as the compile-time source of truth. The `sourceLabels` record keys serve as the "registry" of valid source types. The `sourceBadgeColors` and `sourceEmojis` maps in components already handle unknown keys gracefully (they just return `undefined`). The `getEngagementValue` switch has a `default: return 0` case.
**Warning signs:** Components rendering `undefined` for source badges or engagement values.

### Pitfall 3: Missing Hardcoded References

**What goes wrong:** After the swap, some UI element still says "BTS" or shows BTS-specific content.
**Why it happens:** Hardcoded references are scattered across many files. Easy to miss one.
**How to avoid:** Systematic audit. Here is the complete list from research:

**Files with hardcoded BTS references that MUST be extracted:**

| File | Line(s) | Hardcoded Value | Extract To |
|------|---------|-----------------|------------|
| `index.html:9` | `content="BTS"` | apple-mobile-web-app-title | `config.labels` via Vite plugin |
| `index.html:13` | `<title>BTS - ARMY App</title>` | Page title | `config.labels.appTitle` via Vite plugin |
| `public/manifest.json` | name, short_name, description | PWA manifest | vite-plugin-pwa `manifest` option |
| `src/components/FeedFilter.tsx:8-15` | Hardcoded `filters` array | Tab definitions | Derive from `config.sources` |
| `src/components/BiasFilter.tsx:21` | `"Select Your Bias"` | Label text | `config.labels.memberFilterLabel` |
| `src/pages/Home.tsx:61` | `"Love yourself, speak yourself"` | Group quote | `config.labels.homeQuote` |
| `src/pages/Tours.tsx:25` | `"BTS WORLD TOUR 'ARIRANG'"` | Tour title | `config.labels.tourTitle` |
| `src/pages/Tours.tsx:26` | `"82+ shows across..."` | Tour subtitle | `config.labels.tourSubtitle` |
| `src/types/feed.ts:1` | `FeedSource` union type | Hardcoded source types | `string` (config-derived at runtime) |
| `src/types/feed.ts:6` | `BiasId` union type | Hardcoded member IDs | `string` (config-derived at runtime) |
| `src/data/members.ts` | Entire file | Legacy duplicate | Delete (unused) |
| `src/data/news.ts` | BTS-specific news items | Static fallback news | Move to config or group data directory |
| `src/data/events.ts` | BTS-specific events | Static events | Move to config or group data directory |

**Warning signs:** Run `grep -ri "bts\|bangtan\|army\|방탄" src/ --include="*.ts" --include="*.tsx" --exclude-dir="config/groups"` after the phase. Result should be empty (excluding config group files).

### Pitfall 4: Forgetting to Delete public/manifest.json

**What goes wrong:** Both the static `public/manifest.json` and the vite-plugin-pwa generated manifest exist. The static one takes precedence (Vite copies public/ files as-is).
**Why it happens:** vite-plugin-pwa generates the manifest into the build output, but `public/manifest.json` gets copied directly.
**How to avoid:** Delete `public/manifest.json` when switching to `manifest` option in vite-plugin-pwa config. Also remove the `<link rel="manifest">` from `index.html` -- vite-plugin-pwa injects it automatically.
**Warning signs:** PWA still shows "BTS ARMY App" after swapping to a different group config.

### Pitfall 5: Tours/Events/News Data Not Part of Config Swap

**What goes wrong:** The app swaps group name and members correctly, but Tours page still shows BTS tour dates and News fallback still shows BTS news.
**Why it happens:** `src/data/events.ts` and `src/data/news.ts` are separate from GroupConfig and imported directly.
**How to avoid:** These are group-specific data files. Either: (a) move them into the group config directory (`src/config/groups/bts/events.ts`, `src/config/groups/bts/news.ts`) and re-export through GroupConfig, or (b) add them as fields on GroupConfig. Either way, the swap must include this data.
**Warning signs:** Tours page shows BTS events for a non-BTS group.

## Code Examples

### Deriving Filter Tabs from Config Sources (Preserving Order)

```typescript
// Extracts unique source types from config in definition order
function getSourceTabs(config: GroupConfig): { type: string; label: string }[] {
  const seen = new Set<string>();
  const tabs: { type: string; label: string }[] = [];

  for (const source of config.sources) {
    if (source.enabled !== false && !seen.has(source.type)) {
      seen.add(source.type);
      tabs.push({
        type: source.type,
        label: config.labels.sourceLabels[source.type],
      });
    }
  }

  return tabs;
}
```

### GroupConfig Labels Structure

```typescript
// BTS group config labels
const labels: GroupLabels = {
  appName: "BTS ARMY App",
  appTitle: "BTS - ARMY App",
  appDescription: "BTS Fan App for ARMY",
  sourceLabels: {
    reddit: "Reddit",
    youtube: "YouTube",
    rss: "News",
    twitter: "Twitter",
    tumblr: "Tumblr",
  },
  memberFilterLabel: "Select Your Bias",
  homeQuote: "Love yourself, speak yourself",
  tourTitle: "BTS WORLD TOUR 'ARIRANG'",
  tourSubtitle: "82+ shows across 34 cities in 23 countries",
};
```

### Dummy/Example Group Config (Template)

```typescript
// src/config/groups/example/index.ts
import type { GroupConfig } from "../../types.ts";

/**
 * Example group configuration.
 *
 * Copy this directory to create a new group. All fields are required --
 * TypeScript will error if any are missing. Then change the import in
 * src/config/index.ts to point to your new group.
 */
export const exampleConfig = {
  members: [
    {
      id: "member1",
      stageName: "Stage Name",
      realName: "Real Name",
      aliases: ["alias1", "alias2"],
      emoji: "",
      color: "#000000",
      birthday: "January 1, 2000",
      role: "Role",
      position: "Position",
      image: "/members/member1.jpg",
      bio: "Member bio.",
      funFacts: ["Fun fact 1"],
      soloProjects: ["Project 1"],
      socialMedia: [{ platform: "Instagram", handle: "@handle" }],
    },
  ],
  sources: [
    {
      type: "reddit",
      id: "reddit-example",
      label: "r/example",
      url: "example",
      needsFilter: false,
      fetchCount: 10,
      priority: 1,
    },
  ],
  theme: {
    groupName: "Example Group",
    groupNameNative: "Example",
    tagline: "Your tagline here",
    fandomName: "Fans",
    primaryColor: "#333333",
    accentColor: "#666666",
    darkColor: "#111111",
    logoUrl: "/members/group.jpg",
    socialLinks: [],
  },
  keywords: /\bexample\b/i,
  labels: {
    appName: "Example Fan App",
    appTitle: "Example - Fan App",
    appDescription: "Fan app for Example Group",
    sourceLabels: { reddit: "Reddit" },
    memberFilterLabel: "Select Your Favorite",
    homeQuote: "Your group quote here",
    tourTitle: "EXAMPLE WORLD TOUR",
    tourSubtitle: "Tour details here",
  },
  // events and news would also be here
} satisfies GroupConfig;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `manifest: false` with static `public/manifest.json` | `manifest: { ... }` inline in vite-plugin-pwa config | Available since vite-plugin-pwa v0.12+ | Config-driven manifest generation, no static file needed |
| Hardcoded type unions (`FeedSource`, `BiasId`) | String types with config-driven validation | N/A (this phase) | Enables config swap without type file changes |
| Component-level hardcoded filter arrays | Config-derived filter generation | N/A (this phase) | Filter tabs reflect configured sources automatically |

**Deprecated/outdated:**
- `public/manifest.json` static file: Will be replaced by vite-plugin-pwa manifest generation
- `src/data/members.ts`: Legacy file, appears unused (no imports found) -- should be deleted

## Open Questions

1. **Events and News Data Ownership**
   - What we know: `src/data/events.ts` and `src/data/news.ts` contain BTS-specific content and are imported by Tours.tsx and News.tsx (as fallback content). These are clearly group-specific.
   - What's unclear: Should these become part of GroupConfig (potentially making it very large) or remain as separate files in the group directory re-exported through the config?
   - Recommendation: Add `events` and `news` (or `staticNews`) as fields on GroupConfig, with the actual data defined in separate files within `src/config/groups/bts/` and imported/re-exported. This keeps GroupConfig as the single swap point while keeping individual files manageable. The example config can have minimal placeholder data.

2. **sourceLabels Record Key Validation**
   - What we know: The `sourceLabels` record maps source type strings to display labels. With `FeedSource` becoming `string`, there's no compile-time check that sourceLabels covers all source types in `sources[]`.
   - What's unclear: Whether a runtime check is needed or if TypeScript's `Record<string, string>` is sufficient.
   - Recommendation: Use a runtime assertion in dev mode that checks `config.sources` types are all present in `config.labels.sourceLabels`. Alternatively, define a more specific `sourceLabels` type where keys match the source types used in the config, but this adds complexity for little gain since the filter tab derivation naturally surfaces missing labels (they'd show `undefined`).

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis of all files in `src/` -- full audit of hardcoded references, component structure, config types, and import chains
- `src/config/types.ts` -- current GroupConfig interface
- `src/components/FeedFilter.tsx` -- current hardcoded filter array (lines 8-15)
- `src/components/BiasFilter.tsx` -- reference pattern for config-driven component (already reads from config)
- `vite.config.ts` -- current vite-plugin-pwa setup with `manifest: false`
- `public/manifest.json` -- current static manifest with hardcoded BTS values

### Secondary (MEDIUM confidence)

- vite-plugin-pwa `manifest` option behavior -- based on standard vite-plugin-pwa documentation. The `manifest: false` is currently set which means "use public/manifest.json." Changing to an object generates the manifest from that object. HIGH confidence this is correct based on the existing code pattern.
- Vite `transformIndexHtml` hook -- standard Vite plugin API for modifying index.html at build time. Well-documented in Vite docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies needed, all capabilities exist in current stack
- Architecture: HIGH -- patterns are straightforward refactoring, reference implementation exists (BiasFilter)
- Pitfalls: HIGH -- comprehensive codebase audit performed, all hardcoded references catalogued with file/line numbers

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain, no fast-moving dependencies)
