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


## v3.0 Immersive Feed Experience (Shipped: 2026-03-03)

**Phases completed:** 4 phases, 10 plans, 18 feat commits
**Timeline:** 7 days (2026-02-24 → 2026-03-03)
**Codebase:** 9,384 LOC TypeScript (57 files modified, +7,727 insertions)

**Key accomplishments:**
- TikTok-style vertical snap feed with CSS scroll-snap (100svh cards) and DOM virtualization
- Three adaptive card layouts (video/image/text) with See More bottom sheet overlay
- Video autoplay/pause lifecycle with single-iframe performance and session mute persistence
- Unified control bar with 5 sort modes and tabbed filter bottom sheet (source/member/type)
- Card entrance animations (slide-up + fade), engagement stats bar, shimmer skeleton loading
- Server-side sort API, URL-persisted feed state, feedMode config flag, semantic theme tokens

**Known tech debt (3 items):**
- windowedItems (DOM_WINDOW_SIZE=5) computed but only 3-item visibleItems rendered
- SortMode type duplicated between @bts/shared and useFeedState.ts
- startIndex position-preserve dead code — feed resets to card 0 on sort/filter change

---


## v4.0 Enhanced Feed UI & Navigation (Shipped: 2026-03-06)

**Phases completed:** 3 phases, 5 plans, 10 tasks
**Timeline:** 3 days (2026-03-04 → 2026-03-06)
**Codebase:** 11,697 LOC TypeScript/CSS (13 files modified, +860/-849 lines)

**Key accomplishments:**
- Fixed header with "Army Feed" branding and sort/filter icons always visible — replaced auto-hide control bar
- Sort bottom sheet matching filter design with 5 sort options, swipe-to-dismiss, and checkmark indicator
- Transparent touch overlay on video iframes enabling swipe navigation and tap play/pause (verified on physical iOS)
- Unified two-zone card layout (60% media / 40% info) across video, image, and text cards
- Shared InfoPanel component with title, metadata row, engagement stats, and "(Show More)" source links
- Deleted 3 dead components (SnapControlBar, useControlBarVisibility, SeeMoreSheet) and 117 lines of dead CSS

**Known tech debt:** None new — all prior items from v1.0-v3.0 still apply.

---


## v5.1 Quick Wins (Shipped: 2026-03-07)

**Phases completed:** 2 phases, 4 plans, 8 tasks
**Timeline:** 1 day (2026-03-06)
**Codebase:** 12,042 LOC TypeScript/CSS (39 files modified, +2,515/-166 lines)

**Key accomplishments:**
- Expanded scraping sources from 22 to 47 — Google News RSS (8 feeds), AO3 fan fiction (5 feeds), solo member subreddits (7), Billboard, Rolling Stone
- End-to-end description pipeline: scraper extracts snippets → DB column → API response → frontend preview text
- Content type taxonomy expanded from 7 to 8 types (fan_fiction, music, social_posts, media, general replace meme, video, translation, official)
- Source-level content type defaults: AO3→fan_fiction, Google News→news, YouTube→media, Bluesky→social_posts (skip LLM)
- Combined "Source · Content Type" pill badges on all card types with warm/cool/neutral color grouping
- FilterSheet: grouped source display with expandable detail chips + dynamic content type chip ordering by volume

**Known tech debt (6 items from audit):**
- Bluesky missing from frontend sources.ts (can't filter by Bluesky in FilterSheet)
- Frontend sources.ts detail entries diverged from server config (googlenews, ao3, RSS)
- sourceBadgeColors duplicated across SnapCard/FeedCard/SwipeFeed
- useFeed.ts doesn't pass contentType to server — client-side filtering works but server filter unused
- feedState.contentTypes absent from useFeed useCallback dependency array
- DB migration needed for description column + server rebuild needed for Phase 16 sources

---

