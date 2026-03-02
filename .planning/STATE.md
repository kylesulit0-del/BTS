# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Fans see a rich, diverse stream of content from everywhere with engagement stats that help surface the best content, all without leaving the app.
**Current focus:** Phase 8 in progress -- Smart Blend and Integration

## Current Position

Phase: 8 of 8 (Smart Blend and Integration)
Plan: 1 of 2 complete
Status: Executing phase 8
Last activity: 2026-03-02 -- Completed 08-01-PLAN.md (Server-side ranking module and feed endpoint integration)

Progress: [==========================.] 94% (7.5/8 phases)

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
| 7. LLM Moderation Pipeline | 3/3 | Complete |
| 8. Smart Blend & Integration | 1/2 | In progress |

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
- 07-01: AI SDK v6 uses LanguageModel type (not LanguageModelV1) and generateText + Output.object pattern
- 07-01: Zod 4 installed as latest; compatible with AI SDK v6 structured output
- 07-01: GPT-4.1 Nano as default LLM model ($0.10/$0.40 per M tokens)
- 07-01: Existing content backfilled to 'approved' in migration to prevent empty feed
- 07-01: Mock provider uses empty cast object; Plan 02 adds MockLanguageModelV3 for testing
- 07-02: AI SDK v6 uses result.output (not result.object) and usage.inputTokens/outputTokens (not promptTokens/completionTokens)
- 07-02: Fallback source matching uses sourceDetail label against scraping config needsFilter flag
- 07-02: Failed LLM batches auto-approve all items to prevent stuck pending state
- 07-02: Pipeline decisions older than 30 days are hard-deleted after each run
- 07-03: Content type labels and badge colors extracted to shared utility file (contentTypes.ts) for reuse across components
- 07-03: Pipeline stats fetched in parallel with health data on status page using Promise.all
- 08-01: Blend weights: recency 0.40, engagement 0.35, contentTypeVariety 0.10, sourceDiversity 0.15
- 08-01: Exponential decay constant k=8 gives ~0.47 at 6h, ~0.05 at 24h
- 08-01: Candidate set of 500 items fetched from DB for ranking per request
- 08-01: Page-based pagination for ranked feeds, cursor-based retained as backward-compat fallback
- 08-01: bts-trans fan translation account boosted at 1.5x via ScrapingSource.boost field

### Pending Todos

None.

### Blockers/Concerns

- ~~ESM/CJS module interop must be resolved in Phase 5 before any cross-package code~~ (resolved: all packages use "type": "module", tsx handles .ts imports)
- ~~LLM moderation costs need guardrails (batching, pre-filtering, spending limits)~~ (resolved: budget.ts enforces daily/monthly limits, fallback mode auto-approves BTS sources)
- ~~Engagement normalization needs 7+ days of real data before percentile calculation works~~ (resolved: per-batch percentile works with any amount of data, neutral 0.5 for items without engagement)

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 08-01-PLAN.md (Server-side ranking module and feed endpoint integration)
Resume with: `/gsd:execute-phase` (Phase 8, Plan 02)
Resume file: .planning/phases/08-smart-blend-and-integration/08-02-PLAN.md
