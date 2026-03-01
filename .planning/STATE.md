# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** Phase 6 -- Scraper Expansion (v2.0 Content Scraping Engine)

## Current Position

Phase: 6 of 8 (Scraper Expansion)
Plan: 0 of ? complete
Status: Phase 5 complete, ready for Phase 6 planning
Last activity: 2026-03-01 -- Completed 05-03-PLAN.md (Fastify API server + end-to-end verification)

Progress: [===============...........] 63% (5/8 phases complete -- v1.0 shipped, Phase 5 complete)

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
| 5. Foundation | 3 | Complete |

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

### Pending Todos

None.

### Blockers/Concerns

- ~~ESM/CJS module interop must be resolved in Phase 5 before any cross-package code~~ (resolved: all packages use "type": "module", tsx handles .ts imports)
- LLM moderation costs need guardrails (batching, pre-filtering, spending limits)
- Engagement normalization needs 7+ days of real data before percentile calculation works

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 05-03-PLAN.md (Phase 5 complete)
Resume with: `/gsd:plan-phase` (Phase 6 planning)
Resume file: N/A -- Phase 6 needs planning
