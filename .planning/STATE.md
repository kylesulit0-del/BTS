# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** Phase 6 complete -- ready for Phase 7 (LLM Moderation Pipeline)

## Current Position

Phase: 6 of 8 (Scraper Expansion)
Plan: 4 of 4 complete
Status: Phase 6 complete
Last activity: 2026-03-02 -- Completed 06-04-PLAN.md (Status page, thumbnails, Phase 6 verification)

Progress: [===================.....] 75% (6/8 phases complete -- v1.0 shipped, Phase 5 complete, Phase 6 complete)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 13
- Total execution time: ~5 days
- Average: ~2.6 plans/day

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 4 | Complete |
| 2. Feed Expansion | 5 | Complete |
| 3. Short-Form Video | 2 | Complete |
| 4. Config-Driven UI | 2 | Complete |

**By Phase (v2.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 5. Foundation | 4 | Complete (verified) |
| 6. Scraper Expansion | 4/4 | Complete |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0: Backend scraping engine over client-side fetching (removes CORS limitations)
- v2.0: Scraping-first over API-first (avoids API key requirements)
- v2.0: Monorepo over separate service (shared TypeScript types)
- v2.0: Twitter/X, TikTok, Instagram descoped to v2.1+ (fragile, expensive)
- 05-01: Live TypeScript exports from @bts/shared (no build step) via package.json exports pointing at .ts files
- 05-01: import.meta.url-based path resolution for DB and migrations to avoid CWD sensitivity
- 05-01: fetchCount set to 50 per subreddit in scraping config (matching user decision)
- 05-02: Pre-check SELECT before upsert to accurately track new vs updated items in scrape_runs
- 05-02: Reddit 403s handled gracefully as empty results (Reddit blocks server IPs)
- 05-02: 30-day content retention cleanup integrated into runAllScrapers() orchestration
- 05-03: Cursor pagination uses descending item ID for stable page traversal
- 05-03: Flag-based concurrent-run guard on scrape endpoint to prevent overlapping scrapes
- 05-03: Server init order: DB first, then routes, then scheduler, then listen
- 05-04: Default cron interval set to 20 minutes (midpoint of INFRA-04's 15-30 min range)
- 05-04: Invalid CRON_SCHEDULE values log warning and fall back to default rather than crashing
- 06-01: Soft delete uses publishedAt (not scrapedAt) to catch content published long ago but scraped recently
- 06-01: Reddit engagement_stats migration is idempotent -- runs every scrape, only affects rows without engagement_stats
- 06-01: Existing score/commentCount fields kept for backward compatibility
- 06-02: YouTube thumbnails constructed from videoId (mqdefault.jpg) instead of parsing media:thumbnail (known rss-parser bug)
- 06-02: Seoul Space source added as enabled:false pending URL verification
- 06-02: RSS thumbnail extraction uses progressive fallback: enclosure -> og:image -> first article image
- 06-02: Thumbnail validation skips known CDNs (YouTube, Tumblr, Bluesky) to reduce HTTP overhead
- 06-03: Bluesky scraper degrades gracefully when credentials missing -- logs warning, returns empty result
- 06-03: Tumblr thumbnail extraction uses regex on HTML content -- first image only per user decision
- 06-03: Bluesky deduplicates posts by AT URI across multiple keyword searches
- 06-04: Traffic light thresholds: red if no runs in 24h or >50% errors, yellow if any errors <50%, green otherwise
- 06-04: Broken images collapse entirely (hide img) rather than showing placeholder -- card becomes text-only
- 06-04: scrape_runs cleanup is hard delete (operational metadata, not user content)

### Pending Todos

None.

### Blockers/Concerns

- ~~ESM/CJS module interop must be resolved in Phase 5 before any cross-package code~~ (resolved: all packages use "type": "module", tsx handles .ts imports)
- LLM moderation costs need guardrails (batching, pre-filtering, spending limits)
- Engagement normalization needs 7+ days of real data before percentile calculation works

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 06-04-PLAN.md (Phase 6 complete)
Resume with: `/gsd:execute-phase` (Phase 7)
Resume file: Phase 7 planning needed
