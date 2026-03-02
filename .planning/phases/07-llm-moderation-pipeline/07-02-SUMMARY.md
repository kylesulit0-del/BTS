---
phase: 07-llm-moderation-pipeline
plan: 02
subsystem: pipeline, api, database
tags: [ai-sdk, openai, llm, moderation, batch-processing, budget, fallback, admin-api, drizzle]

# Dependency graph
requires:
  - phase: 07-llm-moderation-pipeline
    plan: 01
    provides: "DB schema (pipelineRuns, pipelineDecisions, moderationStatus), AI SDK provider factory, Zod schemas, prompt builder"
provides:
  - "runPipeline() orchestrator processing raw items in batches of 15 via LLM"
  - "Budget tracking with daily/monthly spend limits from env vars"
  - "Fallback mode: auto-approve BTS sources, queue broad sources"
  - "Admin API: GET /pipeline/stats, GET /pipeline/rejected, POST /pipeline/override/:id"
  - "Feed endpoint filtered to approved items only with ?contentType= support"
  - "Pipeline triggered after each scrape cycle (non-blocking)"
affects: [07-03-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [batch-pipeline-orchestrator, budget-gated-fallback, admin-override-api, moderation-status-filtering]

key-files:
  created:
    - packages/server/src/pipeline/pipeline.ts
    - packages/server/src/pipeline/budget.ts
    - packages/server/src/pipeline/fallback.ts
    - packages/server/src/routes/pipeline.ts
  modified:
    - packages/server/src/routes/feed.ts
    - packages/server/src/scrapers/base.ts
    - packages/server/src/index.ts

key-decisions:
  - "AI SDK v6 uses result.output (not result.object) and usage.inputTokens/outputTokens (not promptTokens/completionTokens)"
  - "Fallback source matching uses sourceDetail label against scraping config needsFilter flag"
  - "Failed LLM batches auto-approve all items to prevent stuck pending state"
  - "Pipeline decisions older than 30 days are hard-deleted after each run"

patterns-established:
  - "Budget-gated fallback: check spend before LLM call, fall back to rule-based processing"
  - "Atomic claim: mark items as pending before processing to prevent double-processing"
  - "Non-blocking pipeline: scrape completes first, pipeline errors logged not thrown"

requirements-completed: [PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 7 Plan 02: Pipeline Orchestrator & Integration Summary

**LLM batch pipeline with budget-gated fallback, admin API for inspection/override, and feed moderation filtering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T04:12:31Z
- **Completed:** 2026-03-02T04:17:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Pipeline orchestrator processes raw items in batches of 15 via AI SDK generateText + Output.object with Zod schema validation
- Budget system enforces daily ($1) and monthly ($10) limits with automatic fallback to rule-based processing
- Fallback mode auto-approves BTS-focused sources and queues broad sources as pending
- Admin API exposes pipeline stats, rejected items inspection, and manual approve/reject override
- Feed endpoint now only serves approved items and supports contentType filtering
- Pipeline runs automatically after each scrape cycle without blocking future scrapes

## Task Commits

Each task was committed atomically:

1. **Task 1: Build pipeline orchestrator with budget tracking and fallback** - `b06257f` (feat)
2. **Task 2: Admin API routes, feed integration, and scrape-to-pipeline wiring** - `113822f` (feat)

## Files Created/Modified
- `packages/server/src/pipeline/pipeline.ts` - Core pipeline orchestrator: batch LLM calls, decision processing, 30-day cleanup
- `packages/server/src/pipeline/budget.ts` - Daily/monthly spend tracking and budget enforcement
- `packages/server/src/pipeline/fallback.ts` - Rule-based fallback using scraping config needsFilter flag
- `packages/server/src/routes/pipeline.ts` - Admin API: stats, rejected items, manual override
- `packages/server/src/routes/feed.ts` - Added moderation_status='approved' filter and ?contentType= param
- `packages/server/src/scrapers/base.ts` - Added runPipeline() call after scrape completion
- `packages/server/src/index.ts` - Registered pipeline admin routes under /api prefix

## Decisions Made
- AI SDK v6 result shape: `result.output` for structured output, `result.usage.inputTokens`/`outputTokens` for token counts (not the v4/v5 names)
- Fallback source matching uses the `label` field from scraping config (e.g., "r/bangtan") matched against contentItems.sourceDetail
- Failed LLM batches auto-approve all items rather than leaving them stuck as pending -- ensures content always flows through
- Pipeline decisions hard-deleted after 30 days (operational data, not user content)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AI SDK v6 property names**
- **Found during:** Task 1 (pipeline orchestrator)
- **Issue:** Plan referenced `result.object` and `usage.promptTokens`/`completionTokens` which are v4/v5 API names. AI SDK v6 uses `result.output` and `usage.inputTokens`/`outputTokens`.
- **Fix:** Changed property access to match v6 API: `result.output.items`, `result.usage.inputTokens`, `result.usage.outputTokens`
- **Files modified:** packages/server/src/pipeline/pipeline.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** b06257f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor API name difference between SDK versions. No scope creep.

## Issues Encountered
None beyond the SDK type fix documented above.

## User Setup Required

**External services require manual configuration.** The OPENAI_API_KEY environment variable must be set before the pipeline can make real LLM calls. Without it, the pipeline will error on LLM calls and auto-approve all items as fallback.
- `export OPENAI_API_KEY=sk-...` (obtain from https://platform.openai.com/api-keys)
- Optional: `LLM_DAILY_BUDGET` (default $1.00) and `LLM_MONTHLY_BUDGET` (default $10.00)

## Next Phase Readiness
- Pipeline fully operational: raw -> pending -> approved/rejected flow
- Admin API ready for frontend status page integration (Plan 03)
- Feed endpoint ready for frontend content type filtering (Plan 03)
- All TypeScript compiles cleanly in packages/server

## Self-Check: PASSED

All 7 claimed files exist on disk. Both commit hashes (b06257f, 113822f) verified in git log.

---
*Phase: 07-llm-moderation-pipeline*
*Completed: 2026-03-02*
