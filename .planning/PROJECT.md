# BTS Army Feed

## What This Is

A fan community web app that aggregates content from across the internet into an immersive, TikTok-style vertical snap feed. A server-side scraping engine collects content from 6+ sources (Reddit, YouTube, Tumblr, Bluesky, RSS/news sites) on a schedule, stores it in SQLite, filters it through LLM-based moderation, ranks it with a multi-signal blend algorithm, and serves it via REST API. The frontend renders a full-viewport snap feed with adaptive card layouts, inline video, sort/filter controls, entrance animations, and engagement stats. Built as a config-driven monorepo — clone, swap the config, and it becomes a feed for any fandom.

## Core Value

Fans see a rich, diverse stream of content from everywhere — official and fan-created — with engagement stats that help surface the best content, all without leaving the app.

## Requirements

### Validated

- ✓ Multi-source feed aggregation (Reddit, YouTube, Soompi, AllKPop, Twitter) — existing
- ✓ Incremental feed loading with CORS proxy fallback chain — existing
- ✓ Member bias filtering with keyword matching — existing
- ✓ Feed caching with 5-minute TTL in localStorage — existing
- ✓ List and swipe view modes — existing
- ✓ Member profiles with social links — existing
- ✓ Tour/event information display — existing
- ✓ PWA support for installable web app — existing
- ✓ DOMPurify XSS sanitization for all RSS/HTML content — v1.0
- ✓ Parallel CORS proxy failover (Promise.any) — v1.0
- ✓ Config-driven architecture with typed GroupConfig — v1.0
- ✓ Clone-and-swap: changing config import swaps entire app — v1.0
- ✓ Expanded Reddit sources (memes, fan discussion subreddits) — v1.0
- ✓ Fan YouTube channels (beyond official BANGTANTV/HYBE) — v1.0
- ✓ Tumblr fan content integration via RSS — v1.0
- ✓ Engagement stats on feed cards (upvotes, comments, views) — v1.0
- ✓ YouTube Shorts embedded as 9:16 vertical players — v1.0
- ✓ TikTok embedded as lazy-loaded iframe players — v1.0
- ✓ Engagement-weighted feed ordering (50% recency, 50% engagement) — v1.0
- ✓ Dynamic filter tabs and member chips from config — v1.0
- ✓ PWA manifest generated from config at build time — v1.0
- ✓ Monorepo with shared types between frontend and backend — v2.0
- ✓ SQLite database with Drizzle ORM for content, engagement, moderation — v2.0
- ✓ Scraper framework with abstract interface, error handling, rate limiting — v2.0
- ✓ Scheduled scraping via node-cron at configurable intervals — v2.0
- ✓ URL-based deduplication with normalized canonical URLs — v2.0
- ✓ Config-driven group targeting for scrape targets — v2.0
- ✓ Reddit, YouTube, RSS/news, Tumblr, Bluesky scrapers with engagement stats — v2.0
- ✓ Thumbnail/media URL extraction per source — v2.0
- ✓ Content age windowing with periodic cleanup — v2.0
- ✓ LLM provider abstraction (Claude, OpenAI, mock) — v2.0
- ✓ LLM relevance filtering, moderation, and content type classification — v2.0
- ✓ Batched LLM processing with auto-approve fallback — v2.0
- ✓ Three-stage content pipeline (raw → pending → approved/rejected) — v2.0
- ✓ Cross-source engagement normalization via percentile ranking — v2.0
- ✓ Multi-signal blend scoring (recency, engagement, diversity, variety) — v2.0
- ✓ Fan translation priority boost via configurable source boost — v2.0
- ✓ Dual-mode frontend (API mode with client-side fallback) — v2.0
- ✓ REST API with paginated feed, single-item, and health endpoints — v2.0
- ✓ TikTok-style vertical snap feed with 100svh cards and CSS scroll-snap — v3.0
- ✓ Adaptive card layouts (video/image/text) with type discrimination — v3.0
- ✓ Video autoplay/pause with single-iframe performance and session mute — v3.0
- ✓ See More bottom sheet overlay for long text content — v3.0
- ✓ Right-swipe gesture to open source link in new tab — v3.0
- ✓ Server-side sort API (Recommended/Newest/Oldest/Popular/Discussed) — v3.0
- ✓ Multi-select filter bottom sheet (source/member/content type) — v3.0
- ✓ Auto-hide control bar with sort tabs, filter icon, and active filter chips — v3.0
- ✓ Feed state persistence in localStorage surviving page refresh — v3.0
- ✓ Config feedMode flag toggling snap vs list view — v3.0
- ✓ Semantic theme tokens as CSS custom properties — v3.0
- ✓ Card entrance animations (slide-up + fade-in, 250ms decelerate) — v3.0
- ✓ Engagement stats bar with SVG icons and abbreviated counts — v3.0
- ✓ Shimmer skeleton loading state for initial feed load — v3.0

### Active

(No active requirements — plan next milestone)

### Out of Scope

- Multi-group in single instance — config is per-clone, not multi-tenant
- User accounts or authentication — member bias filtering + localStorage sufficient
- Real-time feed updates (WebSocket) — 15-min scheduled scraping sufficient
- Weverse content scraping — no public API, HMAC-authenticated, legal risk
- Twitter/X scraper — HIGH complexity, $25-50/mo third-party API or 10-15 hrs/month DIY
- TikTok scraper — HIGH complexity, Playwright + anti-bot, periodic breakage
- Instagram scraper — HIGH complexity, GraphQL rotates every 2-4 weeks, needs proxies
- Framer Motion drag-based navigation — conflicts with native CSS scroll-snap physics
- Infinite scroll auto-fetch — wrong model for snap feed; API returns full ranked feed
- Pull-to-refresh — conflicts with scroll-snap overscroll behavior on mobile
- Dark/light mode toggle — app is dark-first; light mode doubles CSS surface area

## Context

**Current state:** 9,384 LOC TypeScript across 3 packages (frontend, server, shared). React 19 + Vite 7 frontend, Fastify API server, SQLite + Drizzle ORM. Monorepo with npm workspaces.

**Architecture:** Server scrapes 6 sources on 20-min cron → stores in SQLite → LLM pipeline filters/classifies → rankFeed() scores and interleaves → API serves ranked feed → frontend renders immersive snap feed with sort/filter controls, adaptive card layouts, and animations.

**Shipped:** v1.0 (feed expansion), v2.0 (scraping engine), v3.0 (immersive snap feed). 3 milestones, 12 phases, 36 plans.

**Known tech debt:**
- Zero test coverage
- Dead code in frontend: sanitizeHtml, fetchAllFeeds (v1.0 leftovers)
- TikTok short URL embeds degraded (CORS blocks)
- Reddit/Bluesky/Tumblr scrapers returning empty on some server IPs
- Seoul Space RSS source disabled pending URL verification
- v2.0 UAT tests all skipped (need live deployment verification)
- windowedItems (5-item) computed but only 3-item visibleItems rendered (v3.0)
- SortMode type duplicated between @bts/shared and useFeedState.ts (v3.0)
- startIndex position-preserve dead code — feed resets on sort/filter change (v3.0)

## Constraints

- **Config-driven**: No group-specific logic in core code — all in config
- **Frontend stack**: React 19, TypeScript, Vite 7
- **Backend stack**: Node.js/TypeScript monorepo, shared types, SQLite
- **Scraping-first**: Prefer public pages/RSS over authenticated APIs
- **LLM provider agnostic**: Moderation layer supports provider swapping
- **CSS animations only**: No JS animation libraries for snap feed (CSS scroll-snap + keyframes)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Config-driven over multi-tenant | Simpler, each clone independent | ✓ Good — clean separation |
| oEmbed/iframe for TikTok over scraping | Platform scraping blocked | ✓ Good — works for YouTube Shorts, TikTok partial |
| Engagement stats from source APIs | Reddit/YouTube expose natively | ✓ Good — enriches feed cards |
| DOMPurify over custom stripHtml | Security-first, handles edge cases | ✓ Good — eliminated XSS risk |
| Promise.any for CORS proxy failover | Parallel faster than sequential | ✓ Good — resilient to proxy failures |
| 30-day feed age window | YouTube posting cadences (2-3 weeks) | ✓ Good — captures more content |
| Backend scraping engine over client-side | Removes CORS limitations, enables DB + moderation | ✓ Good — 6 sources working |
| Scraping-first over API-first | Avoids API key requirements and rate limits | ✓ Good — RSS/JSON endpoints reliable |
| LLM moderation over keyword rules | More accurate for nuanced relevance decisions | ✓ Good — filters irrelevant content |
| Configurable LLM provider | Avoid vendor lock-in, cost optimization | ✓ Good — GPT-4.1 Nano at $0.10/M tokens |
| Monorepo over separate service | Shared TypeScript types, single config | ✓ Good — clean type sharing |
| Percentile normalization per source | Makes engagement comparable across sources | ✓ Good — Reddit upvotes vs YouTube views |
| Exponential time decay (k=8) | ~0.47 at 6h, ~0.05 at 24h per user preference | ✓ Good — fresh content surfaces |
| Page-based pagination for ranked feeds | Cursor-based breaks with re-ranking | ✓ Good — no item overlap |
| Silent API fallback to client-side | Graceful degradation, no user-facing errors | ✓ Good — zero-downtime experience |
| Twitter/X, TikTok, Instagram deferred | Fragile, expensive, high maintenance | ✓ Good — avoided cost sink |
| CSS scroll-snap over Framer Motion drag | Native snap physics, no JS overhead | ✓ Good — smooth 60fps on mobile |
| 100svh with 100vh fallback | Avoids iOS Safari dvh regression | ✓ Good — consistent viewport fill |
| localStorage over useSearchParams for feed state | Multi-select arrays, no URL clutter | ✓ Good — cleaner URLs |
| Manual 3-item DOM window over TanStack Virtual | Scroll-snap incompatibility documented | ✓ Good — simple, predictable |
| CSS-only animations over Motion library | No exit animations, no springs needed | ✓ Good — zero bundle cost |
| createPortal for bottom sheets | Escape scroll-snap stacking context | ✓ Good — z-index isolation |
| Single iframe for videos | Browser memory + autoplay policy | ✓ Good — facade pattern works |
| Server-side sort on 500-item candidate set | Client sort on full feed too slow | ✓ Good — fast sort response |

---
*Last updated: 2026-03-03 after v3.0 milestone completion*
