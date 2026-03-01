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

