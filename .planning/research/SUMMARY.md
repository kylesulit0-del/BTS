# Project Research Summary

**Project:** BTS Army Feed Expansion
**Domain:** Fan content aggregator — feed expansion with engagement stats, short-form video embeds, new sources, and config-driven architecture
**Researched:** 2026-02-25
**Confidence:** HIGH (stack, architecture, pitfalls) / MEDIUM (embed reliability)

## Executive Summary

This is a client-side React SPA expansion for a BTS fan content aggregator. The project has two concurrent goals: adding new features (engagement stats, short-form video embeds, additional content sources like Tumblr and fan YouTube channels) while refactoring the hardcoded BTS-specific data into a config-driven architecture that enables clone-and-swap for other fandoms. The existing stack (React 19, TypeScript, Vite, react-router-dom) is sound and requires only two additions: `react-social-media-embed` for TikTok/YouTube Shorts embeds and `dompurify` for XSS-safe HTML sanitization. Both are well-validated choices with minimal footprint. Nearly all planned features extend existing patterns (RSS parsing, CORS proxy chain, JSON API fetching) rather than introducing new paradigms.

The recommended approach is to treat config-driven refactoring as the foundation — extract all BTS-specific values first, verify the app still works identically, then layer in new sources and features on top of the config system. This order is critical: building new features on top of hardcoded values would mean doing the config extraction twice. Architecture research identifies a source registry pattern (`sourceType -> fetcher function`) that keeps the orchestration layer thin and makes adding sources a config-only change. Reddit engagement stats are zero-cost (data already in API responses), Tumblr integration reuses the existing RSS pipeline exactly, and YouTube Shorts embeds require only a URL transformation. These four features form a high-value, low-risk v1 core.

The primary risks are scope traps and infrastructure fragility. Weverse and Instagram Reels are both infeasible for client-side implementation and must be explicitly descoped — any development effort on either would be wasted. The CORS proxy chain, currently sequential with a 21-second worst-case timeout, will degrade under the increased request load from new sources and must be upgraded to parallel proxy attempts before sources are added. A pre-existing XSS vulnerability in `stripHtml` (using `div.innerHTML` on untrusted RSS content) will be amplified by Tumblr fan content and must be patched with DOMPurify before Tumblr integration begins. YouTube view counts require a free API key but add deployment friction; defer to a later phase and make it optional in config.

## Key Findings

### Recommended Stack

The existing stack needs only two additions. `react-social-media-embed@^2.5.18` covers TikTok, Instagram, and YouTube embeds with explicit React 19 peer dependency support, handling the SPA lifecycle complexities of loading platform embed scripts. `dompurify@^3.3.1` is the industry standard HTML sanitizer (maintained by security firm cure53, zero dependencies, browser-native DOMParser, 3KB gzipped) and directly patches the existing XSS vulnerability in `stripHtml`. Everything else — Tumblr RSS, expanded Reddit/YouTube sources, YouTube Shorts embedding, engagement stats — requires zero new dependencies because it extends existing fetch/parse patterns.

One conditional new dependency exists: YouTube Data API v3 for view counts. This requires a free API key (10,000 units/day quota), is safe for client-side use when restricted to a domain referrer, but adds deployment friction for every clone. It should be optional in config and deferred to a later phase.

**Core technologies:**
- `react-social-media-embed@^2.5.18`: TikTok/YouTube Shorts embed rendering — handles platform embed.js lifecycle in React SPA context
- `dompurify@^3.3.1`: HTML sanitization — patches pre-existing XSS risk, required before adding any HTML-rich sources
- YouTube Data API v3 (optional): View count enrichment — free tier sufficient, make API key optional in GroupConfig

**What NOT to add:** axios (native fetch already works), @tanstack/react-query (existing useFeed hook is adequate), Redux/Zustand/Jotai (app state is simple), cheerio (Node-only, app uses DOMParser), any Weverse npm packages (server-side only), any TikTok API packages (oEmbed or direct iframe construction is sufficient).

### Expected Features

Config-driven architecture is the prerequisite dependency for every other feature in this milestone. Nearly all new features involve adding configurable data (subreddit names, channel IDs, blog names, curated embed URLs). The dependency tree is clear: config first, new sources second, embed rendering third, polish fourth.

**Must have (table stakes):**
- Config-driven architecture — prerequisite for clone-and-swap goal; all BTS-specific data extracted from 6+ files into a single typed config object
- Reddit engagement stats (score, comments, upvote ratio) — data is already in the API response being parsed, zero additional fetches required
- Expanded Reddit sources (r/btsmemes, r/heungtan, r/bts7, r/bts_army_lounge) — trivial config-only change once architecture is in place
- Fan YouTube channels — same as expanded Reddit; existing `fetchYouTubeChannel()` handles any channel ID
- Tumblr fan content via RSS — reuses existing `parseRSS` + CORS proxy pipeline exactly; identical pattern to Soompi/AllKPop

**Should have (competitive differentiators):**
- TikTok URL detection and lazy-loaded embeds — detect TikTok URLs in Reddit posts, render as embedded players; use IntersectionObserver to manage 8-12MB per-embed performance cost
- YouTube Shorts vertical rendering — detect `/shorts/` URLs, rewrite to `/embed/`, render in 9:16 aspect ratio container; trivial URL transform
- YouTube inline embed in list view (FeedCard) — port the existing iframe pattern from SwipeFeed; low effort

**Defer (v2+):**
- Instagram Reels embeds — requires Meta developer app + access token + server-side proxy for token management; blocks the no-backend constraint
- Weverse content — no public API, no RSS, client-side scraping is impossible; alternatives are curated links and fan translation Twitter accounts
- YouTube view counts — optional API key in config; defer until users explicitly want popularity-based sorting
- Cross-source engagement normalization — Reddit scores and YouTube views are different scales; useful but requires tuning

### Architecture Approach

The target architecture introduces a config layer (`src/config/`) that serves as the single source of truth for all group-specific data, consumed by services via function parameters and by components via React context (`useConfig` hook). The monolithic `feeds.ts` is split into per-source modules under `services/sources/` with a registry (`services/registry.ts`) that maps source type strings to fetcher functions. This means adding a new source is a config change plus a new source module — no orchestration code changes required. Two new components handle the new UI concerns: `StatsBar` (engagement metrics display, reusable across FeedCard and SwipeFeed) and `EmbedCard` (TikTok/Shorts renderer). A new utility `embedResolver.ts` handles URL pattern detection and oEmbed resolution as a post-processing step after feed items are fetched.

**Major components:**
1. `config/` layer (NEW) — TypeScript interfaces + BTS config file + index re-export; the clone-and-swap mechanism
2. `services/registry.ts` (NEW) — maps source type string to fetcher function; keeps orchestrator thin
3. `utils/embedResolver.ts` (NEW) — detects TikTok/YouTube Shorts URLs via regex, generates embed URLs or fetches oEmbed HTML
4. `components/StatsBar.tsx` (NEW) — reusable engagement stats display; returns null when stats unavailable
5. `components/EmbedCard.tsx` (NEW) — TikTok/Shorts embed renderer with lazy-loading
6. `services/feeds.ts` (MAJOR REFACTOR) — parameterized by config; delegates to registry
7. `FeedFilter.tsx` + `BiasFilter.tsx` (MODIFY) — generate tabs/chips from config instead of hardcoded arrays

### Critical Pitfalls

1. **Instagram oEmbed requires server-side auth (impossible without backend)** — Meta retired unauthenticated oEmbed April 2025. The new API requires a registered Facebook app and access token that cannot be safely embedded client-side. Drop Instagram from v1 scope entirely; link out instead of embedding.

2. **CORS proxy collapse under increased source load** — The current sequential 3-proxy fallback has a 21-second worst-case timeout per failed request. Doubling sources doubles proxy load. Refactor `corsProxy.ts` to parallel proxy attempts (try all 3 simultaneously, use first success) before adding any new sources. Set a hard budget of 12 proxied requests per feed load.

3. **XSS via `stripHtml` amplified by Tumblr content** — The current `div.innerHTML = untrustedHtml` pattern in `feeds.ts` is a known XSS vector. Tumblr fan content is HTML-rich and user-generated — high attack surface. Replace with `DOMPurify.sanitize()` before integrating any new HTML-content sources. This is a pre-existing vulnerability, not new work.

4. **Config refactor breaks existing functionality without tests** — The codebase has zero test coverage. Extracting hardcoded values from 6+ files simultaneously with no regression testing is high-risk. Write integration tests for feed-fetching functions before starting config extraction; extract config as a standalone phase separate from any new feature work.

5. **Weverse is architecturally infeasible client-side** — Weverse is a React SPA with no RSS, no public API, and active anti-scraping. Fetching `weverse.io` through a CORS proxy returns an empty app shell. Do not invest development time. Alternative: curated links in config + fan translation Twitter accounts.

## Implications for Roadmap

Based on combined research, a 4-phase structure is recommended. The ordering is driven by: (1) security vulnerabilities that increase attack surface as features are added, (2) the dependency graph where config must precede sources and sources must precede embeds, and (3) the build order explicitly recommended in ARCHITECTURE.md.

### Phase 1: Foundation (Security + Config Infrastructure)

**Rationale:** Must come first because both the XSS vulnerability and the CORS proxy architecture get worse as more features are added. Config extraction must precede any new sources — doing it after means touching the same files twice. This phase contains no user-visible features but prevents cascading failure in all subsequent phases.

**Delivers:** Patched XSS vulnerability, parallel CORS proxy fetching, fully typed GroupConfig interface, BTS config file with all extracted values, integration tests for feed-fetching functions

**Addresses:** Config-driven architecture prerequisite (FEATURES.md P1), FeedItem type extension

**Avoids:**
- XSS via stripHtml (PITFALLS Critical #3)
- CORS proxy collapse (PITFALLS Critical #2)
- Config refactor regression (PITFALLS Critical #5)
- Weverse scope trap (PITFALLS Critical #6)

**No research-phase needed:** All patterns are well-understood (DOMPurify integration, TypeScript config pattern, parallel Promise.allSettled).

### Phase 2: Core Feed Expansion

**Rationale:** With config in place and infrastructure hardened, adding new sources is low-risk extension of existing patterns. Reddit engagement stats surface data already being fetched. Tumblr reuses the RSS pipeline verbatim. Expanded Reddit/YouTube sources are config-only changes. This phase delivers the most user-visible value for the least implementation risk.

**Delivers:** Reddit engagement stats displayed on cards (upvotes, comment count, upvote ratio), Tumblr RSS feed integration, expanded Reddit subreddits (meme + discussion subs), fan YouTube channel integration, StatsBar component

**Uses:** `dompurify` (Tumblr HTML sanitization), existing `parseRSS` + `fetchWithProxy` pipeline, existing `fetchYouTubeChannel()` and `fetchSubreddit()` patterns

**Implements:** Source registry pattern, per-source modules under `services/sources/`, EngagementStats type on FeedItem

**Avoids:** TikTok embed performance trap (PITFALLS Performance), YouTube API key friction (PITFALLS Critical #7)

**No research-phase needed:** All integrations directly extend existing, proven code paths.

### Phase 3: Embed System (Short-Form Video)

**Rationale:** Embeds are architecturally more complex than feed sources (SPA script lifecycle, aspect ratio handling, performance management) and depend on the config and source infrastructure being stable. YouTube Shorts is trivial (URL transform). TikTok requires the `embedResolver` utility and lazy-loading infrastructure. Build YouTube Shorts first to validate the EmbedCard component, then add TikTok.

**Delivers:** YouTube Shorts vertical embeds (9:16 aspect ratio), TikTok URL detection from Reddit posts with lazy-loaded embeds via IntersectionObserver, EmbedCard component, embedResolver utility, YouTube inline embed in FeedCard list view

**Uses:** `react-social-media-embed` for TikTok embed lifecycle management, existing CORS proxy for TikTok oEmbed (or direct iframe URL construction — prefer direct URL pattern over oEmbed to avoid proxy overhead)

**Implements:** `utils/embedResolver.ts`, `components/EmbedCard.tsx`, post-processing embed detection step in `useFeed`

**Avoids:** TikTok oEmbed CORS mistake (PITFALLS Critical #4 — use direct `https://www.tiktok.com/embed/v2/{VIDEO_ID}` iframe instead of oEmbed API call), iframe performance trap (PITFALLS Performance — click-to-load pattern), wrong YouTube Shorts aspect ratio (PITFALLS "Looks Done But Isn't")

**May need research-phase:** TikTok embed.js lifecycle behavior in React SPA context (react-social-media-embed is moderately maintained; verify current behavior with React 19 before building EmbedCard).

### Phase 4: Config-Driven UI + Polish

**Rationale:** UI components (FeedFilter, BiasFilter) can be config-driven in parallel with embed work but are lower priority than working features. Polish (localStorage quota guard, feed UX improvements, CSP headers, Weverse curated links) closes the remaining gaps. This phase completes the clone-and-swap promise by making all UI components read from config.

**Delivers:** Config-driven FeedFilter tabs (generated from config.sources), config-driven BiasFilter chips (generated from config.members), shared `timeAgo` utility (currently duplicated in FeedCard and SwipeFeed), localStorage cache guard with try/catch + LRU eviction, Content Security Policy headers, Weverse curated links in config, source grouping in filter UI (Social/Video/News categories)

**Avoids:** Badge color duplication anti-pattern (ARCHITECTURE Anti-Pattern #4), localStorage quota exceeded (PITFALLS Performance), UX pitfall of overwhelming source filter (PITFALLS UX)

**No research-phase needed:** Standard patterns throughout.

### Phase Ordering Rationale

- Security and infrastructure hardening precedes feature addition because the XSS attack surface grows with each new HTML source added and the CORS proxy bottleneck compounds with each new source
- Config extraction precedes new sources because all new source URLs, subreddit names, channel IDs, and blog names belong in config — building features first forces doing the extraction twice
- Core feed sources (Reddit stats, Tumblr, expanded channels) precede embeds because embeds depend on the FeedItem type extension and embed detection running on items produced by sources
- The source registry pattern (ARCHITECTURE Pattern 1) is the mechanism that keeps Phases 2, 3, and 4 from touching orchestration code — establish it in Phase 1 config work, populate it in Phase 2, extend it in Phase 3
- YouTube view counts (YouTube Data API v3) are intentionally deferred past Phase 4 — they add API key management friction to every clone and provide low incremental value over the Reddit engagement stats delivered in Phase 2

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (TikTok embeds):** `react-social-media-embed` was last published ~1 year ago with 311 GitHub stars. Before committing to it as the TikTok embed solution, verify React 19 compatibility in practice and confirm TikTok's embed.js still works with the library's blockquote approach. Alternative: build a thin wrapper directly using `https://www.tiktok.com/embed/v2/{VIDEO_ID}` iframe (no library needed, no oEmbed needed, simpler).

Phases with standard patterns (skip research-phase):
- **Phase 1 (DOMPurify, config):** DOMPurify is the industry standard with 14K+ GitHub stars; TypeScript config pattern is well-understood
- **Phase 2 (RSS, Reddit, YouTube):** All extend existing, already-working code paths in the codebase
- **Phase 4 (UI polish, CSP):** Standard React and web security patterns throughout

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack is fixed; two additions (react-social-media-embed, dompurify) are well-validated with clear rationale; YouTube Data API v3 is well-documented |
| Features | HIGH | Feature feasibility is confirmed at source level — Reddit stats verified in JSON response, Tumblr RSS verified as standard RSS 2.0, YouTube Atom feed limitations confirmed. Anti-features (Instagram, Weverse) confirmed infeasible with clear rationale |
| Architecture | HIGH | Full codebase audit completed; all hardcoded values and their extraction targets are enumerated; build order is specific and dependency-driven |
| Pitfalls | HIGH | Multiple corroborating sources per pitfall; most are confirmed by direct codebase observation (XSS in feeds.ts, sequential proxy in corsProxy.ts) or official documentation (Meta oEmbed deprecation, Weverse closed platform) |

**Overall confidence:** HIGH

### Gaps to Address

- **TikTok embed library decision:** `react-social-media-embed` vs. direct iframe construction. Research flag for Phase 3. Decide before writing EmbedCard — the direct iframe approach (`https://www.tiktok.com/embed/v2/{VIDEO_ID}`) may be preferable to the library dependency given the library's maintenance status. Test both in a spike before committing.

- **CORS proxy for TikTok oEmbed vs. direct iframe:** Research confirms TikTok oEmbed lacks CORS headers and requires proxy. PITFALLS.md recommends the direct iframe construction to bypass this entirely. Confirm that `https://www.tiktok.com/embed/v2/{VIDEO_ID}` works for all TikTok video URL formats encountered in Reddit posts.

- **Tumblr RSS content richness:** PITFALLS.md notes that Tumblr RSS may truncate long posts and exclude some media for image-heavy posts. Validate with 3-5 candidate BTS fan Tumblr blogs before committing their URLs to the config — ensure RSS output is sufficient for FeedCard rendering.

- **Fan YouTube channel ID discovery:** Fan channel IDs must be manually discovered (70+ notable channels identified, need to curate a representative initial set of 5-10). This is operational work for the BTS config file, not implementation work.

- **YouTube Data API key management:** If YouTube view counts are eventually enabled, the API key must be restricted by HTTP referrer in Google Cloud Console. Document this setup process in the config file comments so clone users know what to configure.

## Sources

### Primary (HIGH confidence)
- [YouTube Data API v3 - videos.list](https://developers.google.com/youtube/v3/docs/videos/list) — statistics part, quota costs (1 unit/read, 10K/day free)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify) — v3.3.1, bundled TypeScript types, zero deps, maintained by cure53
- [Reddit JSON API Wiki](https://github.com/reddit-archive/reddit/wiki/JSON) — score, num_comments, upvote_ratio field locations confirmed
- [Tumblr RSS format (Feedly docs)](https://docs.feedly.com/article/360-how-to-follow-tumblr-feeds) — standard RSS 2.0 at `{blog}.tumblr.com/rss` confirmed
- [YouTube Shorts embed](https://docs.document360.com/docs/embed-youtube-shorts) — `/shorts/` to `/embed/` URL pattern confirmed
- [Meta oEmbed Read changes](https://www.bluehost.com/blog/meta-oembed-read-explained/) — Instagram oEmbed requires access token as of April 2025
- [Weverse HMAC scraping gist](https://gist.github.com/Xetera/d50af9c42615d66d55755b3708c2a70e) — confirms server-side auth requirement
- [innerHTML XSS vulnerability (Sourcery)](https://www.sourcery.ai/vulnerabilities/innerHTML-xss-vulnerable) — attack vectors via innerHTML confirmed
- Codebase audit: `src/services/feeds.ts`, `src/utils/corsProxy.ts`, `src/types/feed.ts` — direct observation

### Secondary (MEDIUM confidence)
- [react-social-media-embed](https://github.com/justinmahar/react-social-media-embed) — v2.5.18, React 19 support in peer deps, 311 GitHub stars, ~1 year since last publish
- [Instagram client-side embed approach](https://dev.to/ljcdev/embedding-an-instagram-post-in-your-website-3666) — blockquote + embed.js still works for public posts today, but Meta history suggests fragility
- [TikTok oEmbed documentation](https://developers.tiktok.com/doc/embed-videos/) — endpoint confirmed unauthenticated; CORS behavior not documented
- [TikTok embed performance analysis](https://justinribeiro.com/chronicle/2022/07/15/terrible-tiktok-embed-web-performance-and-my-imperfect-web-component-solution/) — 8-12MB per embed confirmed

### Tertiary (LOW confidence)
- [Weverse MujyKun unofficial API](https://github.com/MujyKun/Weverse) — last confirmed working details unclear; Weverse had a data breach January 2026 increasing risk of any unofficial API use
- Fan translation Twitter accounts for Weverse content — community-maintained, assumed active but not guaranteed

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
