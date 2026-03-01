# BTS Army Feed

## What This Is

A fan community web app that aggregates content from across the internet into a unified feed. Pulls in news, videos, memes, fan discussions, and short-form content from 8+ sources (Reddit, YouTube, Tumblr, Soompi, AllKPop, Twitter). Built as a config-driven React SPA — clone the repo, swap the config file, and it becomes a feed for any fandom.

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

### Active

- [ ] Backend scraping engine with configurable per-source scrapers
- [ ] Database storage (SQLite/Postgres) for aggregated content
- [ ] LLM-based content moderation and relevance filtering (configurable provider)
- [ ] REST API server to serve finalized content to the frontend
- [ ] Smart blend recommendation engine (recency + engagement + source diversity + content type)
- [ ] Config-driven group targeting (BTS first, swappable for any fandom)
- [ ] Scraping-first approach: public pages/RSS preferred, APIs as fallback
- [ ] 15-30 minute scraping cadence across all sources
- [ ] Wide-net source coverage: Reddit, YouTube, Tumblr, TikTok, Instagram, Twitter/X, and more
- [ ] Engagement data collection (likes, shares, comments) per content item
- [ ] Thumbnail/media extraction for feed cards
- [ ] YouTube view counts on feed cards (requires optional API key)
- [ ] Cross-source engagement normalization for popularity sorting
- [ ] YouTube inline video embed in list view

### Out of Scope

- Multi-group in single instance — config is per-clone, not multi-tenant
- User accounts or authentication
- Real-time feed updates (WebSocket) — scheduled scraping is sufficient
- Weverse content scraping — no public API, no RSS

## Current Milestone: v2.0 Content Scraping Engine

**Goal:** Build a backend scraping and content aggregation engine that collects content from 9+ sources on a schedule, stores it in a database, filters it through LLM-based moderation, and serves finalized content via REST API.

**Target features:**
- Scraping engine with per-source scrapers (Reddit, YouTube, Tumblr, TikTok, Instagram, Twitter/X, news sites, and more)
- Database storage with engagement metrics (likes, shares, comments, views)
- Two-step pipeline: wide-net collection → LLM moderation/relevance filter → finalized data
- Smart blend recommendation engine (recency, engagement, source diversity, content type variety)
- REST API server for frontend consumption
- Config-driven group targeting — swap config to scrape for any fandom
- Configurable LLM provider for moderation (Claude, OpenAI, etc.)

## Context

**Current state:** 3,401 LOC TypeScript. React 19 + Vite 7 SPA. Modular source fetchers with registry pattern. Feed pipeline: fetch → deduplicate → engagement-weight → bias-filter → render. Config-driven: all group data in `src/config/groups/bts/`.

**v2.0 architecture shift:** Moving from client-side fetching through CORS proxies to a server-side scraping engine. The frontend will transition from direct source fetching to consuming a REST API backed by a database of curated content.

**Known tech debt:**
- Zero test coverage for feed logic
- Dead code: sanitizeHtml, fetchAllFeeds
- TikTok short URL embeds degraded (CORS blocks redirect resolution)
- CORS proxy services have no SLA (will be replaced by server-side scraping)
- Twitter/Nitter scraping fragile (will be rebuilt server-side)

## Constraints

- **Config-driven**: No group-specific logic in core code — all in config
- **Existing frontend stack**: React 19, TypeScript, Vite 7
- **Backend stack**: Node.js/TypeScript (monorepo, shared types)
- **Scraping-first**: Prefer public pages/RSS over authenticated APIs
- **LLM provider agnostic**: Moderation layer must support provider swapping

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Config-driven over multi-tenant | Simpler, each clone independent | ✓ Good — clean separation |
| oEmbed/iframe for TikTok over scraping | Platform scraping blocked | ✓ Good — works for YouTube Shorts, TikTok partial (short URL issue) |
| Engagement stats from source APIs | Reddit/YouTube expose natively | ✓ Good — enriches feed cards |
| Client-side only, no backend | Matches architecture, simple deploy | ✓ Good — limits sources but keeps simplicity |
| Weverse/Instagram Reels descoped | Architecturally infeasible client-side | ✓ Good — avoided wasted effort |
| DOMPurify over custom stripHtml | Security-first, handles edge cases | ✓ Good — eliminated XSS risk |
| Promise.any for CORS proxy failover | Parallel faster than sequential | ✓ Good — resilient to proxy failures |
| 30-day feed age window | YouTube posting cadences (2-3 weeks) | ✓ Good — captures more content |

| Backend scraping engine over client-side fetching | Server-side removes CORS limitations, enables database, enables moderation pipeline | — Pending |
| Scraping-first over API-first | Avoids API key requirements and rate limits for most sources | — Pending |
| LLM-based moderation over keyword rules | More accurate for nuanced content relevance decisions | — Pending |
| Configurable LLM provider | Avoid vendor lock-in, optimize cost vs quality | — Pending |
| Monorepo over separate service | Shared TypeScript types, single config, simpler deployment | — Pending |

---
*Last updated: 2026-03-01 after v2.0 milestone start*
