# BTS Army Feed Expansion

## What This Is

A fan community web app for BTS (currently) that aggregates content from across the internet into a unified feed. The Army Feed tab is the heart of the app — pulling in news, videos, memes, fan discussions, and short-form content from multiple platforms. Built as a React SPA with no backend, designed to be cloned and reconfigured for any group/team/fandom.

## Core Value

Fans see a rich, diverse stream of BTS content from everywhere — official and fan-created — with engagement stats that help surface the best content, all without leaving the app.

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

### Active

- [ ] Engagement stats on feed cards (likes, views, comments scraped from each source)
- [ ] Embedded short-form video (TikTok, Instagram Reels, YouTube Shorts via oEmbed)
- [ ] Expanded Reddit sources (memes subreddits, fan discussion subreddits)
- [ ] Tumblr fan content integration
- [ ] Fan forum/site content (Weverse, fan community sites)
- [ ] Fan YouTube channels (not just official BTS/HYBE channels)
- [ ] Config-driven architecture — all group-specific data (keywords, subreddits, channels, member info) in a single config so the app can be cloned for other groups

### Out of Scope

- Backend server — staying client-side with CORS proxies for now
- Direct TikTok/Instagram feed scraping — using embed approach instead
- Multi-group support in one instance — config is per-clone, not multi-tenant
- User accounts or authentication
- Content posting or commenting within the app

## Context

**Existing codebase:** React 19 + TypeScript + Vite 7 SPA. Feed system in `src/services/feeds.ts` fetches from 5 sources via CORS proxies. `FeedItem` type in `src/types/feed.ts` currently lacks engagement fields. BTS-specific keywords, subreddit names, and channel IDs are hardcoded throughout `feeds.ts` and `feed.ts`.

**Key technical considerations:**
- CORS proxies are the bottleneck — every new source adds proxy load
- TikTok and Instagram block scraping; oEmbed/embed is the viable path
- Reddit JSON API exposes upvotes, comment counts natively
- YouTube Atom feeds don't include view counts; may need supplementary fetch
- Tumblr has RSS feeds that can be parsed similarly to news sources
- Generalizing to config-driven means refactoring existing hardcoded values, not just adding new ones

**Existing concerns from codebase audit:**
- No test coverage for any feed logic
- HTML parsing (stripHtml) has potential XSS risk
- CORS proxy services have no SLA
- Twitter/Nitter scraping is particularly fragile

## Constraints

- **No backend**: All fetching must happen client-side through CORS proxies
- **Embed-only for short-form**: TikTok and Instagram content via oEmbed/embed iframes, not direct scraping
- **Config-driven generalization**: Architecture must support clone-and-swap for other groups — no BTS-specific logic in core code
- **Existing stack**: React 19, TypeScript, Vite 7 — no framework changes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Config-driven architecture over multi-tenant | Simpler to implement, each clone is independent | — Pending |
| oEmbed for TikTok/Instagram over scraping | Platform scraping blocked, embeds are sanctioned approach | — Pending |
| Scrape engagement stats from source APIs | Reddit/YouTube expose this data; enriches feed cards | — Pending |
| Keep client-side only (no backend) | Matches existing architecture, reduces deployment complexity | — Pending |

---
*Last updated: 2026-02-25 after initialization*
