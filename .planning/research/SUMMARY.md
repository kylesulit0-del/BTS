# Project Research Summary

**Project:** BTS Army Feed v2.0 — Backend Scraping Engine
**Domain:** Server-side content aggregation, LLM moderation pipeline, REST API, smart blend ranking
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

BTS Army Feed v2.0 is a content aggregation backend that replaces the existing client-side fetching architecture with a server-side scraping engine. The pattern is well-established: a scheduled scraper pipeline writes to a persistent database, an LLM moderation layer filters and classifies content, a smart blend ranking engine orders the feed, and a REST API serves the result to the existing React SPA. The v1.0 client-side approach (CORS proxies, browser-side fetching) is the baseline that must remain functional as a fallback throughout the migration; the v2.0 backend proves its value by delivering better, more reliably curated content than the client can fetch directly.

The recommended approach is a npm workspaces monorepo with three packages: `@bts/shared` (TypeScript types shared between frontend and server), `@bts/frontend` (the existing React SPA, moved), and `@bts/server` (the new backend). The server stack is Fastify + Drizzle ORM + SQLite (better-sqlite3) + Cheerio/Playwright for scraping + Vercel AI SDK for provider-agnostic LLM calls + node-cron for scheduling. This stack is lean, TypeScript-native, and avoids infrastructure dependencies (no Redis, no PostgreSQL, no separate queue server) that add operational burden for a single-server deployment.

The primary risks are platform-specific: Twitter/X data access is expensive or fragile, Instagram scraping is a legal and technical minefield, and TikTok anti-bot measures are best-in-class. All three should be either descoped or addressed via paid third-party services — not custom scrapers. LLM moderation costs can spiral without pre-filtering and batching, and engagement normalization across sources with wildly different engagement scales (YouTube views vs. Reddit upvotes) requires percentile-based normalization rather than naive linear scaling. The monorepo ESM/CJS module boundary must be resolved in Phase 1 before any scraper code is written, or it will cause cascading problems in every subsequent phase.

## Key Findings

### Recommended Stack

The backend is built entirely in TypeScript on Node.js 20. **Fastify v5** handles the REST API (3x faster than Express, first-class TypeScript support, built-in JSON schema validation). **Drizzle ORM + better-sqlite3** provides the data layer: SQLite is the right database for this use case — single-file, zero ops, synchronous API that is faster than async Postgres drivers for single-process workloads, and Drizzle makes a future migration to PostgreSQL a schema-level change rather than a rewrite. **Cheerio** handles static HTML parsing; **Playwright** is held in reserve for JS-rendered sources that require a browser. The **Vercel AI SDK** (`ai` package) provides a single unified API for Claude, OpenAI, and other providers — this directly fulfills the requirement for a configurable LLM provider without building a custom abstraction. **node-cron** handles scheduling; no Redis-backed queue is needed for a single-server app scraping a fixed source list every 15-30 minutes.

**Core technologies:**
- **Fastify v5**: REST API — TypeScript-native, schema validation built-in, 3x Express throughput
- **Drizzle ORM v0.45 + better-sqlite3 v12**: Database — SQL-first ORM, zero dependencies, synchronous driver ideal for single-process workloads
- **Cheerio v1.2**: HTML parsing — lightweight, jQuery-like API for static pages; no browser overhead
- **Playwright v1.52**: Headless browser — fallback only for JS-rendered sources; ~800MB RAM per instance, use sparingly
- **Vercel AI SDK v6 + @ai-sdk/anthropic + @ai-sdk/openai**: LLM integration — single `generateObject()` API across providers, structured output via Zod schemas
- **node-cron v4**: Scheduling — in-process cron, zero infrastructure; no Redis needed
- **Zod v4**: Validation — LLM output structure, API request params, scraped data normalization
- **tsx v4**: TypeScript runner for development — esbuild-powered, ESM-native, avoids ts-node ESM issues
- **npm workspaces**: Monorepo — zero-config, built into npm; two packages do not justify Turborepo

### Expected Features

**Must have (table stakes) — v2.0 core:**
- Scraping engine framework with abstract `BaseScraper` interface, error handling, rate limiting
- SQLite database with `content_items`, `scrape_runs`, `moderation_log` tables
- Reddit scraper (JSON endpoints, no CORS proxy required server-side)
- YouTube scraper (RSS/Atom feeds + optional Data API for view counts)
- RSS/news scrapers (Soompi, AllKPop, Koreaboo, HELLOKPOP)
- Tumblr scraper (RSS feeds for configured blogs)
- Scheduled scraping via node-cron (15-30 min intervals, staggered per source)
- URL-based deduplication (UNIQUE constraint on `source + external_id`)
- REST API (`GET /api/feed`, `GET /api/feed/stats`, `GET /api/config`)
- Config-driven group targeting (all scrape targets in `GroupConfig`, no hardcoded BTS references)
- LLM provider abstraction (mock, Claude, OpenAI via AI SDK)
- LLM relevance filtering for `needsFilter: true` sources
- Basic ranking (recency + raw engagement — parity with v1.0)
- Frontend feature flag (`VITE_API_URL`) for dual-mode `useFeed` hook

**Should have (differentiators) — v2.x after core validates:**
- LLM content moderation + content type classification (combined into single relevance call for cost efficiency)
- Cross-source engagement normalization (percentile-based, 7-day rolling window per source)
- Smart blend ranking (recency + normalized engagement + source diversity + content type variety)
- Bluesky scraper (AT Protocol public API, no auth for reads, easiest new social source)
- Expanded K-pop news sources (KpopStarz, Seoulbeats, Asian Junkie)
- Fan translation account prioritization (`priority_boost` in config)
- Full frontend migration to API-only mode

**Defer (v3+):**
- Twitter/X scraper (requires $25-50/month third-party API or intensive ongoing maintenance)
- TikTok scraper (best-in-class anti-bot; oEmbed + cross-platform URL discovery is the pragmatic path)
- Instagram scraper (biweekly `doc_id` rotation, datacenter IP blocking, legal gray zone)
- Near-duplicate semantic detection (SimHash/MinHash)
- Full-text search (SQLite FTS5 available if demand validated)

### Architecture Approach

The system is a monorepo with clear package boundaries: shared types, the existing frontend (minimally modified), and a new server package. The server follows a three-stage content pipeline: scrapers write items with status `raw`, a background moderation job processes them to `approved` or `rejected`, and the API serves only `approved` items. This decoupling means the API never waits for scraping or LLM responses. The scraper engine uses a plugin architecture — each source type extends `BaseScraper` and implements `scrape() -> ScrapedItem[]`; a registry maps `SourceEntry.type` to the concrete class. The LLM layer uses an adapter pattern (`LLMProvider` interface with Claude, OpenAI, and mock implementations) so swapping providers is an environment variable change. Smart blend scoring runs at query time, not at ingest time, so the blend adapts as new content arrives without pre-computation staleness.

**Major components:**
1. **Scraper Engine** — per-source plugin classes extending `BaseScraper`; direct server-side HTTP with no CORS constraints
2. **SQLite Database** — single `content_items` table with all sources normalized to the same row shape; `scrape_runs` for operational visibility; `moderation_log` for LLM cost tracking
3. **Moderation Pipeline** — three-stage state machine (`raw -> pending -> approved/rejected`); batch processing (10-20 items per LLM call); auto-approve fallback if LLM unavailable
4. **Smart Blend Engine** — query-time scoring: recency (0.35), normalized engagement (0.30), source diversity (0.20), content type variety (0.15)
5. **REST API (Fastify)** — cursor-based pagination; `GET /api/feed` with source/member/sort filters; JSON schema validation on all routes
6. **Scheduler (node-cron)** — staggered source scraping across 15-30 min window; separate 5-minute moderation cycle; hourly engagement refresh for recent items
7. **Shared Types Package (`@bts/shared`)** — `FeedItem`, `SourceEntry`, `GroupConfig`, API request/response types shared by both packages via npm workspace

### Critical Pitfalls

1. **Instagram/Twitter/TikTok scraping is a losing battle** — Do not build custom scrapers for these platforms. Instagram has biweekly `doc_id` rotation and datacenter IP blocking; Twitter/X requires $100-5,000/month official API or fragile session scraping; TikTok has device integrity checks, TLS fingerprinting, and behavioral analysis. Descope all three for v2.0 or budget for paid third-party scraping APIs. The TikTok oEmbed endpoint is an acceptable middle path for metadata enrichment of URLs discovered on other platforms.

2. **LLM moderation costs explode without guardrails** — At naive implementation (one item per LLM call, no pre-filtering), costs reach $50-150/month for a fan app. Required mitigations before going live: pre-filter with keyword matching before sending to LLM (reduces calls 60-80%); batch 10-20 items per call; use cheapest adequate model (Claude Haiku, GPT-4o-mini); enable Anthropic prompt caching (0.1x cost on cached system prompts); set hard provider spending limits.

3. **Per-source database schema is an anti-pattern** — Creating separate `reddit_posts`, `youtube_videos` tables makes the unified feed query a UNION nightmare and requires a migration for every new source. Use a single `content_items` table with nullable engagement columns and a JSON `raw` column for source-specific metadata. All sources normalize to the same row shape. This schema decision must be locked before the first scraper writes data.

4. **Monorepo ESM/CJS module conflicts must be resolved first** — The frontend is Vite/ESM; Node.js historically defaults to CJS. Go ESM-only everywhere (`"type": "module"` in all package.json files), share only TypeScript interfaces (no enums, no runtime values), and validate that a single shared type import works in both packages before writing any scraper or API code. If this takes more than one day, the configuration is wrong.

5. **Frontend-backend transition must be explicitly managed** — Remove nothing from the working v1.0 client-side pipeline until the API serves equivalent data. Define the API contract as shared TypeScript types first. Use `VITE_API_URL` environment variable as the feature flag for dual-mode `useFeed`. Migrate sources incrementally (Reddit first, then YouTube, then the rest) rather than all at once.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, five phases make sense. The dependency chain is strict: monorepo and database must exist before any scraper runs; scrapers must run before there is content to moderate; moderation must produce `approved` content before smart blend ranking has anything to rank; all of this must exist before the frontend switches from client-side fetching to the REST API.

### Phase 1: Foundation — Monorepo, Database, and First Scraper

**Rationale:** Everything depends on this. The ESM/CJS module conflict (Pitfall 4) must be resolved before writing any cross-package code. The single `content_items` table schema (Pitfall 3) must be designed before any scraper writes data. The feature flag for dual-mode `useFeed` (Pitfall 5) must exist before any frontend changes. This phase proves the end-to-end pipeline works with one source before expanding to many.

**Delivers:** Working monorepo (`@bts/shared`, `@bts/frontend`, `@bts/server`), Drizzle schema with migrations tooling, Reddit scraper running on node-cron, minimal `GET /api/feed` endpoint returning approved content, frontend `useFeed` with `VITE_API_URL` feature flag preserving v1.0 fallback.

**Addresses:** Scraping engine framework, SQLite database, Reddit scraper, scheduled scraping, URL deduplication, REST API foundation, config-driven group targeting, frontend transition strategy.

**Avoids:** ESM/CJS module hell (resolve before any cross-package imports), per-source schema anti-pattern (design the schema once before any data exists), frontend-backend transition gap (feature flag from day one).

**Research flag:** Monorepo TypeScript project references + Vite proxy configuration may need a focused spike. The pattern is well-documented but ESM interop has known sharp edges specific to the Vite/Node combination.

### Phase 2: Scraper Expansion and Production Validation

**Rationale:** Source coverage must be validated from production infrastructure before the LLM pipeline is built on top of it. Scrapers that work locally but fail from datacenter IPs (Pitfall 9 in PITFALLS.md) would corrupt the moderation pipeline's input. Reddit OAuth and proper rate limiting belong here, not deferred — the unauthenticated `.json` approach should not go to production.

**Delivers:** Full scraper suite (YouTube RSS/Atom, RSS/news for 4+ sources, Tumblr, Bluesky), Reddit OAuth for authenticated API access (60 req/min vs 10 unauth), per-source health monitoring via `scrape_runs` table, engagement data collection, staggered scheduling across all sources.

**Addresses:** YouTube scraper, RSS/news scrapers (Soompi, AllKPop, Koreaboo, HELLOKPOP), Tumblr scraper, Bluesky scraper (AT Protocol, zero auth), engagement data collection, content age windowing (30-day cleanup cron).

**Avoids:** Scraper production failure theater (test from production infrastructure before full pipeline exists), Reddit rate limiting (OAuth + token bucket rate limiter from day one), silent source failures (health monitoring built alongside each scraper, not after).

**Note on high-maintenance sources:** Twitter/X, TikTok, and Instagram require explicit go/no-go decisions before Phase 2 scoping. Default recommendation: descope all three for v2.0. If any are reinstated, budget for paid third-party APIs only — no custom scrapers.

**Research flag:** No additional research needed. All sources in this phase are Tier 1 (RSS/JSON/AT Protocol) with well-documented stable endpoints and no anti-bot measures.

### Phase 3: LLM Moderation Pipeline

**Rationale:** Content must exist in the database before moderation can be designed or calibrated. The moderation prompt needs real examples from the actual source mix to tune false positive/negative rates. Building moderation before having real data means tuning in the dark. This phase is also where the three-stage pipeline (`raw -> pending -> approved`) becomes the live gate for the API.

**Delivers:** Provider-agnostic `LLMProvider` adapter interface with Claude, OpenAI, and mock implementations; three-stage pipeline (`raw -> pending -> approved/rejected`); relevance filtering for `needsFilter: true` sources; content type classification; combined relevance + safety + classification in a single LLM call; batch processing (10-20 items per call); auto-approve fallback with configurable timeout; moderation cost tracking in `moderation_log` (provider, model, tokens, cost).

**Addresses:** LLM provider abstraction, LLM relevance filtering, LLM content moderation, content type classification (enables smart blend diversity in Phase 4).

**Avoids:** LLM cost explosion — pre-filter with keyword matching before any LLM call, batch API enabled, cheapest adequate model selected (Haiku/GPT-4o-mini), Anthropic prompt caching for system prompt, hard spending limits set on API keys.

**Research flag:** Needs research-phase during planning. The moderation prompt design (policy-as-prompt approach for BTS content), false positive calibration strategy, Anthropic batch API mechanics vs. synchronous batching, and combined relevance + safety + classification in a single structured call all warrant a focused research session before implementation begins.

### Phase 4: Smart Blend Ranking and API Polish

**Rationale:** The blend engine needs 7+ days of engagement data in the database to compute meaningful percentile-based normalization. It also requires content type classification tags from Phase 3. Both dependencies are satisfied only after Phase 3 completes and data accumulates. This phase completes the core v2.0 value proposition: a feed that is meaningfully better than chronological or raw-engagement ordering.

**Delivers:** Percentile-based cross-source engagement normalization (7-day rolling window per source), multi-signal smart blend scoring (recency 0.35 + normalized engagement 0.30 + source diversity 0.20 + content type variety 0.15), cursor-based pagination (keyset pagination, O(1) vs offset's O(n)), source/member filtering in API, in-memory response caching (5-minute TTL), feed stats endpoint, fan translation account `priority_boost`.

**Addresses:** Cross-source engagement normalization, smart blend ranking engine, source diversity enforcement (max 30% of feed from any single source), fan translation prioritization, engagement velocity tracking.

**Avoids:** YouTube dominating the feed due to raw view count magnitude (source diversity cap enforced), naive linear normalization producing garbage rankings (percentile-based approach with per-source distribution baselines).

**Research flag:** Standard algorithmic patterns. No research-phase needed. Bootstrap with hardcoded scale factors based on platform engagement benchmarks (TikTok ~3.7%, Instagram ~0.48%, Reddit variable) until 7+ days of real data exists for percentile calculation.

### Phase 5: Frontend Migration and Production Readiness

**Rationale:** The frontend switches from client-side fetching to API consumption only after the backend demonstrably delivers better content than the client fetches directly. This is the proof of value. Production hardening belongs at the end when the system is stable and the migration risk is low.

**Delivers:** Frontend fully on API mode (client-side fallback retained for resilience), Fastify serving the built React SPA as static files in production, health check endpoint (`GET /health`), graceful shutdown (drain scheduler, close SQLite connection), `.env.example` documenting all required environment variables, expanded K-pop news sources added to config, deployment documentation.

**Addresses:** Frontend API migration, expanded K-pop news sources (KpopStarz, Seoulbeats, Asian Junkie), production deployment, operational monitoring.

**Avoids:** Big-bang migration (retain dual-mode `useFeed` with feature flag until API is fully validated in production under real traffic).

**Research flag:** No additional research needed. Standard Node.js deployment and static file serving patterns.

### Phase Ordering Rationale

- **Foundation before scrapers:** ESM/CJS interop, schema design, and the frontend feature flag must exist before any cross-package code runs. Getting the schema wrong means rewriting every downstream query.
- **Scrapers before moderation:** The LLM moderation prompt cannot be calibrated without real scraped content. The mock provider in Phase 1 is a placeholder; Phase 3 builds the real pipeline on real data.
- **Real data before normalization:** Percentile-based engagement normalization requires a 7-day baseline of actual engagement values per source. Phase 4 is blocked on elapsed time, not just code completion.
- **API proven before full migration:** The client-side v1.0 pipeline remains functional throughout. Phase 5 flips the switch only when the backend demonstrably delivers better results.
- **Bluesky in Phase 2 (not later):** The AT Protocol public API requires no auth, no proxies, and no anti-bot evasion. It is the easiest new social source to add, and adding it in Phase 2 expands source diversity for the moderation calibration in Phase 3.

### Research Flags

Needs research-phase during planning:
- **Phase 3 (LLM Moderation Pipeline):** Moderation prompt design for BTS content (policy-as-prompt patterns), Anthropic batch API mechanics and discount structure, false positive calibration approach, combining relevance + safety + content type classification in a single `generateObject()` call with Zod schema.

Phases with standard patterns (skip research-phase):
- **Phase 1:** npm workspaces + TypeScript project references are well-documented. Known ESM sharp edges are catalogued in PITFALLS.md.
- **Phase 2:** RSS/JSON/AT Protocol scraping are standard HTTP patterns. Reddit OAuth and Bluesky public API are fully documented.
- **Phase 4:** Blend scoring is custom logic with no external dependencies. Percentile normalization is standard statistics with a known bootstrap approach.
- **Phase 5:** Node.js deployment, static file serving, graceful shutdown — established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified against npm, official docs, and community comparison articles. Version compatibility matrix confirmed across Fastify 5, Node 20, better-sqlite3 v12, Drizzle v0.45, AI SDK v6, Zod v4. |
| Features | HIGH | Source analysis grounded in direct codebase audit of v1.0. Platform-specific feasibility (Twitter/Instagram/TikTok) verified against 2026 sources including TikTok's own anti-scraping documentation. Feature prioritization matrix matches the dependency graph. |
| Architecture | HIGH | Full codebase audit performed. Architecture builds directly on existing `GroupConfig`, `SourceEntry`, `FeedItem` types. All patterns (plugin scraper, LLM adapter, three-stage pipeline, dual-mode useFeed) are proven patterns for this domain. Database schema and REST API design are fully specified. |
| Pitfalls | HIGH | Pitfalls derived from direct codebase inspection (existing Nitter regex scraper, CORS proxy pattern), legal research (hiQ v. LinkedIn, Meta rulings 2024-2025), platform documentation (TikTok's own anti-scraping blog post), and LLM cost modeling against current provider pricing. |

**Overall confidence:** HIGH

### Gaps to Address

- **Twitter/X go/no-go decision:** Research confirmed the problem (expensive/fragile) but the decision requires budget input. A paid third-party service costs $25-50/month. The recommendation is to descope for v2.0, but this needs explicit confirmation before Phase 2 scoping.
- **Moderation prompt design:** The policy-as-prompt approach is confirmed as viable, but the specific prompt for BTS content relevance (what counts as relevant, how to handle multilingual content, drama vs. music content) requires iteration against real Phase 2 data. Cannot be fully designed before real content exists.
- **Playwright in production:** If TikTok/Instagram are reinstated in Phase 3+, the ~800MB per browser instance and the memory leak pattern (documented in PITFALLS.md) need a validation spike on the actual production server before committing to headless browser scraping.
- **Engagement normalization bootstrap period:** Days 1-7 of operation have insufficient data for percentile normalization. Hardcoded platform scale factors are needed as a bootstrap. These factors should be derived from published engagement benchmarks before launch.

## Sources

### Primary (HIGH confidence)
- Fastify v5 npm and official docs — API framework, TypeScript support, JSON schema validation, Node 20 requirement
- Drizzle ORM official docs (orm.drizzle.team) — SQLite + better-sqlite3 setup, drizzle-kit migration workflow
- better-sqlite3 v12 npm — synchronous driver, Node 20 compatibility, native addon build requirements
- Vercel AI SDK docs (ai-sdk.dev) — multi-provider unified API, `generateObject()` with Zod, provider packages
- Cheerio v1.2 npm — ESM-native rewrite, HTML parsing API
- node-cron v4 npm — in-process scheduling, cron expression support
- tsx v4 npm — esbuild-powered TypeScript runner, ESM-native
- Reddit API — rate limits (10 req/min unauth, 60 req/min OAuth), `.json` endpoint structure
- Bluesky AT Protocol docs — `app.bsky.feed.searchPosts`, public read API, no auth required
- YouTube Data API v3 quota docs — 10K units/day, `videos.list` = 1 unit per batch of 50 videos
- Tumblr API v2 docs — RSS endpoint behavior, API consumer key (free tier, 1000 req/hr)
- hiQ Labs v. LinkedIn (Ninth Circuit, 2022) — CFAA and public data scraping legality
- TikTok official anti-scraping blog — confirmed device integrity checks, behavioral analysis, CAPTCHA rotation
- Existing codebase audit — `src/services/sources/`, `src/config/types.ts`, `src/types/feed.ts`, `src/utils/corsProxy.ts`

### Secondary (MEDIUM confidence)
- BetterStack: Express vs. Fastify comparison — 3x performance gap, TypeScript-first advantage
- Bytebase: Drizzle vs. Prisma 2026 — zero deps, no codegen, SQL-first advantage
- DataDwip: Instagram scraping technical challenges — GraphQL doc_id rotation every 2-4 weeks, datacenter IP blocking
- TLDL/IntuitionLabs: LLM API pricing 2026 — Haiku and GPT-4o-mini cost estimates for classification tasks
- GetMaxim: Anthropic prompt caching — 0.1x cost on cached system prompts
- SocialInsider: Social media engagement benchmarks 2026 — TikTok 3.70%, Instagram 0.48%, Facebook 0.15%
- ScrapeCreators: Twitter/X scraping cost analysis — third-party API $25-50/month for the volume needed
- SitePoint: SQLite production readiness 2026 — appropriate use cases, WAL mode for concurrent reads
- npm workspaces guide — TypeScript project references setup for 2-3 package monorepos
- PainOnSocial: Reddit API rate limits 2026 — OAuth vs. unauthenticated request limits

### Tertiary (LOW confidence)
- datawookie.dev: Playwright browser memory footprint — ~800MB per instance; single source, needs production validation
- Springer: LLM moderation accuracy rates — academic study; real-world BTS content performance may differ
- Instagram legal risk assessment — evolving; Meta enforcement policy changes after 2024 Bright Data ruling

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
