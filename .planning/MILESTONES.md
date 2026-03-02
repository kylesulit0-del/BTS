# Milestones

## v1.0 Army Feed Expansion (Shipped: 2026-03-01)

**Phases completed:** 4 phases, 13 plans, 25 feat commits
**Timeline:** 5 days (2026-02-24 → 2026-03-01)
**Codebase:** 3,401 LOC TypeScript

**Key accomplishments:**
- Security & infrastructure hardened — DOMPurify XSS sanitization, parallel CORS proxy failover
- Config-driven architecture — all group-specific data in typed GroupConfig, zero hardcoded BTS references
- Feed expanded to 8+ sources — Tumblr, fan YouTube, additional Reddit subreddits with engagement stats
- Short-form video embeds — YouTube Shorts and TikTok rendered as 9:16 iframe players with autoplay-on-scroll
- Clone-and-swap ready — changing one import swaps entire app to different fandom, PWA manifest generated from config
- Engagement-weighted feed — 50/50 recency/engagement scoring with per-source stat extraction

**Known tech debt (10 items, all low/info):**
- Dead code: sanitizeHtml, fetchAllFeeds
- Cosmetic: SwipeFeed tumblr badge color, index.html fallbacks
- TikTok: short URL embeds degraded, PENDING_CHANNEL_ID placeholder

---


## v2.0 Content Scraping Engine (Shipped: 2026-03-02)

**Phases completed:** 4 phases, 13 plans, 26 feat commits
**Timeline:** 6 days (2026-02-24 → 2026-03-02)
**Codebase:** 5,707 LOC TypeScript (136 files modified, +9,943 insertions)

**Key accomplishments:**
- Monorepo architecture with shared TypeScript types, SQLite + Drizzle ORM, and Fastify API server
- 6-source scraping engine (Reddit, YouTube, RSS/news, Tumblr, Bluesky) with engagement stats and thumbnails
- LLM moderation pipeline with provider abstraction, relevance filtering, content type classification, and auto-approve fallback
- Multi-signal feed ranking with per-source percentile normalization, exponential time decay, and source diversity interleaving
- Dual-mode frontend consuming server API with silent client-side fallback
- Fan translation priority boost (bts-trans at 1.5x via configurable source boost)

**Known gaps:**
- UAT: 7/7 tests skipped (all require live deployment to verify)
- Reddit/Bluesky/Tumblr scrapers returning empty results (server IP blocks or missing credentials)
- Seoul Space RSS source disabled pending URL verification

---

