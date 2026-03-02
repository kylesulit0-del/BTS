---
phase: 07-llm-moderation-pipeline
plan: 01
subsystem: database, api, pipeline
tags: [ai-sdk, openai, anthropic, zod, llm, moderation, drizzle, sqlite]

# Dependency graph
requires:
  - phase: 05-foundation-v2
    provides: "Drizzle ORM schema, contentItems table, scrape pipeline"
  - phase: 06-scraper-expansion
    provides: "Expanded scraping sources and content_type column on contentItems"
provides:
  - "contentItems.moderationStatus column with 'raw' default and index"
  - "pipelineRuns table for cost tracking and run history"
  - "pipelineDecisions table for per-item decision history"
  - "LLM provider factory (openai/anthropic/mock via env var)"
  - "Zod schemas for batched structured LLM output"
  - "Config-driven prompt template with BTS member data"
  - "Prompt builder function for batched classification"
affects: [07-02-pipeline-orchestrator, 07-03-frontend-integration]

# Tech tracking
tech-stack:
  added: [ai@6.x, "@ai-sdk/openai@3.x", "@ai-sdk/anthropic@3.x", zod@4.x]
  patterns: [provider-factory, structured-output-schemas, config-driven-prompts]

key-files:
  created:
    - packages/server/src/pipeline/provider.ts
    - packages/server/src/pipeline/schemas.ts
    - packages/server/src/pipeline/prompts.ts
    - packages/shared/src/config/prompts.ts
    - packages/server/drizzle/0002_phase7_moderation_pipeline.sql
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/drizzle/meta/_journal.json
    - packages/shared/src/types/feed.ts
    - packages/server/package.json

key-decisions:
  - "AI SDK v6 uses LanguageModel type (not LanguageModelV1) and generateText + Output.object pattern"
  - "Zod 4 installed (latest) -- compatible with AI SDK v6 Output.object"
  - "GPT-4.1 Nano as default model ($0.10/$0.40 per M tokens)"
  - "Mock provider uses empty object cast for now; Plan 02 adds MockLanguageModelV3"
  - "Existing content backfilled to 'approved' in migration to prevent empty feed"

patterns-established:
  - "Provider factory: env-var-driven LLM provider switching (LLM_PROVIDER, LLM_MODEL)"
  - "Structured output: Zod schemas with AI SDK Output.object for schema-validated LLM responses"
  - "Config-driven prompts: template in shared config, builder in server pipeline"

requirements-completed: [PIPE-01]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 7 Plan 01: Schema & Pipeline Foundation Summary

**DB moderation columns + AI SDK provider factory + Zod structured output schemas + config-driven BTS prompt templates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T04:04:59Z
- **Completed:** 2026-03-02T04:09:40Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Extended contentItems table with moderationStatus (raw/pending/approved/rejected) and moderatedAt columns with index
- Created pipelineRuns and pipelineDecisions tables for cost tracking and decision history
- Migration SQL backfills existing items to 'approved' to prevent empty feed
- AI SDK v6 provider factory supporting openai, anthropic, and mock providers via env vars
- Zod schemas defining batched classification output (relevant, safe, contentType per item)
- Config-driven prompt template with BTS member names, real names, aliases, and adjacent topics

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend DB schema with moderation columns and pipeline tables** - `f211a7c` (feat)
2. **Task 2: Install AI SDK and create provider factory, Zod schemas, and prompt templates** - `543905c` (feat)

## Files Created/Modified
- `packages/server/src/db/schema.ts` - Added moderationStatus/moderatedAt columns, pipelineRuns table, pipelineDecisions table
- `packages/server/drizzle/0002_phase7_moderation_pipeline.sql` - Migration with ALTER TABLE, CREATE TABLE, backfill UPDATE
- `packages/server/drizzle/meta/_journal.json` - Added migration entry (idx 2)
- `packages/shared/src/types/feed.ts` - Added optional moderationStatus to FeedItem interface
- `packages/server/src/pipeline/provider.ts` - LLM provider factory with openai/anthropic/mock switching
- `packages/server/src/pipeline/schemas.ts` - Zod schemas: ContentTypeEnum, BatchItemDecisionSchema, BatchResultSchema
- `packages/server/src/pipeline/prompts.ts` - Prompt builder: template substitution + item list formatting
- `packages/shared/src/config/prompts.ts` - MODERATION_PROMPT_TEMPLATE, BTS_RELEVANCE_CRITERIA, RelevanceCriteria interface
- `packages/server/package.json` - Added ai, @ai-sdk/openai, @ai-sdk/anthropic, zod dependencies

## Decisions Made
- AI SDK v6 exports `LanguageModel` (not `LanguageModelV1`) -- fixed during implementation
- Zod 4.3.6 installed as latest; fully compatible with AI SDK v6 Output.object()
- Mock provider returns empty cast object -- adequate for type satisfaction; Plan 02 will add MockLanguageModelV3 for actual testing
- Prompt template uses `{{variable}}` mustache-style substitution for readability

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed LanguageModelV1 type name to LanguageModel**
- **Found during:** Task 2 (provider factory)
- **Issue:** Plan referenced `LanguageModelV1` from 'ai' package but AI SDK v6 exports it as `LanguageModel`
- **Fix:** Changed import and all references from `LanguageModelV1` to `LanguageModel`
- **Files modified:** packages/server/src/pipeline/provider.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 543905c (Task 2 commit)

**2. [Rule 1 - Bug] Added explicit type annotations on map callback parameters**
- **Found during:** Task 2 (prompt builder)
- **Issue:** `.map((name, i) => ...)` had implicit `any` types under strict mode
- **Fix:** Added explicit `(name: string, i: number)` annotations
- **Files modified:** packages/server/src/pipeline/prompts.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 543905c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both were minor type issues caught by strict TypeScript. No scope creep.

## Issues Encountered
None beyond the type fixes documented above.

## User Setup Required

**External services require manual configuration.** The OPENAI_API_KEY environment variable must be set before running the moderation pipeline (Plan 02). See plan frontmatter for details:
- **OPENAI_API_KEY**: Obtain from OpenAI Platform -> API keys (https://platform.openai.com/api-keys)
- Set via environment variable: `export OPENAI_API_KEY=sk-...`

## Next Phase Readiness
- Schema and migration ready for pipeline orchestrator (Plan 02)
- Provider factory ready to be called from pipeline.ts
- Zod schemas ready for Output.object() structured output
- Prompt builder ready to format content items for LLM classification
- All TypeScript compiles cleanly in both packages

## Self-Check: PASSED

All 10 claimed files exist on disk. Both commit hashes (f211a7c, 543905c) verified in git log.

---
*Phase: 07-llm-moderation-pipeline*
*Completed: 2026-03-02*
