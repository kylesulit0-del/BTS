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

- [ ] YouTube view counts on feed cards (requires optional API key)
- [ ] Cross-source engagement normalization for popularity sorting
- [ ] YouTube inline video embed in list view
- [ ] Weverse content via curated links (link-out only)

### Out of Scope

- Backend server — staying client-side with CORS proxies
- Instagram Reels embeds — Meta requires server-side proxy with access token
- Weverse content scraping — no public API, no RSS
- Multi-group in single instance — config is per-clone, not multi-tenant
- User accounts or authentication
- Real-time feed updates — no backend for WebSocket

## Context

**Current state:** 3,401 LOC TypeScript. React 19 + Vite 7 SPA. Modular source fetchers with registry pattern. Feed pipeline: fetch → deduplicate → engagement-weight → bias-filter → render. Config-driven: all group data in `src/config/groups/bts/`.

**Known tech debt:**
- Zero test coverage for feed logic
- Dead code: sanitizeHtml, fetchAllFeeds
- TikTok short URL embeds degraded (CORS blocks redirect resolution)
- CORS proxy services have no SLA
- Twitter/Nitter scraping fragile

## Constraints

- **No backend**: All fetching client-side through CORS proxies
- **Embed-only for short-form**: TikTok/YouTube via iframes, not scraping
- **Config-driven**: No group-specific logic in core code
- **Existing stack**: React 19, TypeScript, Vite 7

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

---
*Last updated: 2026-03-01 after v1.0 milestone*
