---
phase: 07-llm-moderation-pipeline
verified: 2026-03-02T05:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Start server, trigger a scrape, observe pipeline logs"
    expected: "[pipeline] Complete: processed=N approved=N rejected=N tokens=N cost=$0.00XXXX"
    why_human: "Requires live OPENAI_API_KEY and real scrape cycle to confirm LLM calls succeed end-to-end"
  - test: "Check /api/feed?limit=5 — inspect returned items"
    expected: "All items have moderationStatus='approved' (not visible in response, but none raw/pending/rejected should appear); contentType populated for LLM-classified items"
    why_human: "Requires running server with populated DB; approved filter is verified in code but live behavior confirms no raw items bleed through"
  - test: "Visit /status page, verify Pipeline section renders with stats, cost, and fallback indicator"
    expected: "LLM Pipeline card visible above Source Status; stats populated after first run; fallback banner absent under normal budget"
    why_human: "Visual rendering and real-data display can only be confirmed with running frontend + server"
  - test: "Select a content type filter pill on the feed page"
    expected: "Feed narrows to only items matching selected type; unclassified items (no contentType) disappear"
    why_human: "Client-side filter logic verified in code, but interaction and empty-state UX requires visual check"
  - test: "Set LLM_DAILY_BUDGET=0 and trigger a scrape"
    expected: "Fallback mode activates; BTS-focused sources auto-approved; broad sources queued as pending; status page shows Fallback Mode indicator"
    why_human: "Budget fallback path requires live environment to confirm correct source classification"
---

# Phase 7: LLM Moderation Pipeline Verification Report

**Phase Goal:** Scraped content is automatically filtered for relevance, moderated for safety, and classified by type -- with configurable LLM provider and cost controls
**Verified:** 2026-03-02T05:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Database has moderation_status column on content_items with index, defaulting to 'raw' | VERIFIED | `schema.ts` line 17: `moderationStatus: text('moderation_status').notNull().default('raw')`. Index at line 30. |
| 2 | Existing content items are backfilled to 'approved' so the feed does not go empty | VERIFIED | `0002_phase7_moderation_pipeline.sql` line 7: `UPDATE content_items SET moderation_status = 'approved' WHERE moderation_status = 'raw'` |
| 3 | pipeline_runs and pipeline_decisions tables exist for cost tracking and decision history | VERIFIED | `schema.ts` lines 33-59 define both tables with all required columns |
| 4 | LLM provider is selectable via LLM_PROVIDER and LLM_MODEL env vars | VERIFIED | `provider.ts` line 27: `process.env.LLM_PROVIDER \|\| 'openai'`; line 28: `process.env.LLM_MODEL` |
| 5 | Provider factory returns AI SDK model instance for openai, anthropic, or mock | VERIFIED | `provider.ts` switch cases at lines 31, 40, 49 for openai/anthropic/mock |
| 6 | Zod schema defines structured output for batched relevance + safety + classification | VERIFIED | `schemas.ts` exports `BatchResultSchema`, `BatchItemDecisionSchema`, `ContentTypeEnum` |
| 7 | Prompt template is config-driven, built from group member names and aliases | VERIFIED | `shared/config/prompts.ts` contains `MODERATION_PROMPT_TEMPLATE` with `{{groupName}}`, `{{memberList}}`, `{{adjacentTopics}}` substitutions and `BTS_RELEVANCE_CRITERIA` constant |
| 8 | New content enters as 'raw' and is classified to 'approved' or 'rejected' by the LLM pipeline | VERIFIED | `pipeline.ts` lines 80-83 claim items as 'pending'; lines 129-158 set approved/rejected per decision |
| 9 | Feed API only returns items with moderation_status = 'approved' | VERIFIED | `routes/feed.ts` lines 28, 62, 122 -- all three query paths (paginated, count, single-item) include `eq(contentItems.moderationStatus, 'approved')` |
| 10 | Pipeline batches 10-20 items per LLM call with single combined relevance + safety + classification call | VERIFIED | `pipeline.ts` line 21: `const BATCH_SIZE = 15`; single `generateText` call with `Output.object({ schema: BatchResultSchema })` at lines 111-115 |
| 11 | When LLM is unavailable or budget exceeded, BTS-focused sources are auto-approved and broad sources queued | VERIFIED | `fallback.ts` lines 37-54 approve BTS-focused sources, queue broad sources as 'pending'; `budget.ts` `shouldUseFallback()` enforces daily/monthly limits |
| 12 | Pipeline runs after each scrape cycle, non-blocking | VERIFIED | `base.ts` lines 219-225: `await runPipeline(db)` in try/catch after scrape completion; errors logged, not thrown |
| 13 | Admin API exposes pipeline stats, rejected items, and manual override | VERIFIED | `routes/pipeline.ts` exports `registerPipelineRoutes` with `GET /pipeline/stats`, `GET /pipeline/rejected`, `POST /pipeline/override/:id` |
| 14 | Frontend shows content type badges, filter, and pipeline stats on status page | VERIFIED | `FeedCard.tsx` renders badge at lines 67-81; `News.tsx` renders filter pills at lines 67-88; `Status.tsx` fetches `/api/pipeline/stats` at line 322 and renders `PipelineSection` |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/server/src/db/schema.ts` | moderation columns, pipelineRuns table, pipelineDecisions table | VERIFIED | All three present; `moderationStatus` with 'raw' default and index; both new tables fully defined |
| `packages/server/src/pipeline/provider.ts` | LLM provider factory, exports `getProvider` | VERIFIED | Exports `getProvider()` and `ProviderConfig` interface; handles openai/anthropic/mock |
| `packages/server/src/pipeline/schemas.ts` | Zod schemas for structured LLM output, exports `BatchResultSchema` | VERIFIED | Exports `BatchResultSchema`, `BatchItemDecisionSchema`, `ContentTypeEnum`, and type aliases |
| `packages/server/src/pipeline/prompts.ts` | Prompt builder, exports `buildBatchPrompt` | VERIFIED | Exports `buildBatchPrompt(items: BatchItem[])` with template substitution and 150-char title truncation |
| `packages/shared/src/config/prompts.ts` | Prompt template and relevance criteria, exports `MODERATION_PROMPT_TEMPLATE` and `RelevanceCriteria` | VERIFIED | Both exported; BTS member data complete with 7 members, real names, aliases |
| `packages/shared/src/types/feed.ts` | Updated FeedItem with moderationStatus field | VERIFIED | Contains `moderationStatus?: string` and `contentType: ContentType` |
| `packages/server/src/pipeline/pipeline.ts` | Core pipeline orchestrator, exports `runPipeline` | VERIFIED | 212-line substantive implementation with batch processing, fallback, cost tracking, 30-day cleanup |
| `packages/server/src/pipeline/budget.ts` | Budget tracking, exports `shouldUseFallback`, `getDailySpend`, `getMonthlySpend` | VERIFIED | All three exported; queries pipelineRuns table for real cost data |
| `packages/server/src/pipeline/fallback.ts` | Fallback mode logic, exports `handleFallback` | VERIFIED | Uses `getBtsScrapingConfig()` needsFilter flag; Set-based O(1) lookup for BTS-focused sources |
| `packages/server/src/routes/pipeline.ts` | Admin API routes, exports `registerPipelineRoutes` | VERIFIED | All three endpoints fully implemented with real DB queries, pagination, validation |
| `packages/server/src/routes/feed.ts` | Feed filtered to approved items only | VERIFIED | Three separate `eq(contentItems.moderationStatus, 'approved')` filter sites; contentType query param supported |
| `packages/server/drizzle/0002_phase7_moderation_pipeline.sql` | Migration matching schema | VERIFIED | All ALTER TABLE, CREATE TABLE, CREATE INDEX, backfill UPDATE statements present |
| `packages/frontend/src/components/FeedCard.tsx` | Content type badge | VERIFIED | Badge renders at lines 67-81 with color map and labels from contentTypes utility |
| `packages/frontend/src/pages/News.tsx` | Content type filter | VERIFIED | Client-side filter state + pill buttons at lines 67-88; imports from contentTypes utility |
| `packages/frontend/src/pages/Status.tsx` | Pipeline stats section | VERIFIED | `PipelineSection` component fetches `/api/pipeline/stats` in parallel with health data; fallback banner, stat grid, cost row all present |
| `packages/frontend/src/utils/contentTypes.ts` | Shared content type label/color maps | VERIFIED | Exports `contentTypeBadgeColors`, `contentTypeLabels`, `contentTypeKeys` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pipeline/provider.ts` | `@ai-sdk/openai, @ai-sdk/anthropic` | import and model factory | VERIFIED | Lines 9-10: `import { openai } from '@ai-sdk/openai'`; `import { anthropic } from '@ai-sdk/anthropic'`; called at lines 34, 43 |
| `pipeline/prompts.ts` | `shared/config/prompts.ts` | import template | VERIFIED | Lines 10-12: imports `MODERATION_PROMPT_TEMPLATE` and `BTS_RELEVANCE_CRITERIA`; used at lines 43-46 |
| `drizzle/0002_phase7_moderation_pipeline.sql` | `src/db/schema.ts` | migration matches schema | VERIFIED | SQL adds `moderation_status`, `moderated_at`, creates `pipeline_runs` and `pipeline_decisions` -- matches schema definitions |
| `pipeline/pipeline.ts` | `pipeline/provider.ts` | getProvider() call | VERIFIED | Line 14 import; line 86 call `const providerConfig = getProvider()` |
| `pipeline/pipeline.ts` | `ai` (generateText + Output.object) | structured output call | VERIFIED | Line 11: `import { generateText, Output }` from 'ai'; line 111: `generateText({ output: Output.object({ schema: BatchResultSchema })` |
| `pipeline/pipeline.ts` | `pipeline/schemas.ts` | Zod schema for structured output | VERIFIED | Line 15: `import { BatchResultSchema }` used at line 113 |
| `pipeline/pipeline.ts` | `pipeline/prompts.ts` | buildBatchPrompt call | VERIFIED | Line 16: import; line 110: `buildBatchPrompt(batchItems)` |
| `scrapers/base.ts` | `pipeline/pipeline.ts` | runPipeline call after scraping | VERIFIED | Line 12: import; line 221: `await runPipeline(db)` in try/catch after all scrape loops |
| `routes/feed.ts` | `db/schema.ts` | moderation_status filter | VERIFIED | Lines 28, 62, 122: `eq(contentItems.moderationStatus, 'approved')` in all query paths |
| `server/index.ts` | `routes/pipeline.ts` | route registration | VERIFIED | Line 14: import; line 44: `registerPipelineRoutes(api, db)` under /api prefix |
| `Status.tsx` | `/api/pipeline/stats` | fetch in useEffect | VERIFIED | Line 322: `fetch(\`${apiUrl}/api/pipeline/stats\`)` in `Promise.allSettled` alongside health fetch |
| `News.tsx` | `FeedItem.contentType` | client-side filter | VERIFIED | Line 25: `rawItems.filter((item) => item.contentType === contentTypeFilter)` |
| `FeedCard.tsx` | `FeedItem.contentType` | badge render | VERIFIED | Line 67: `{item.contentType && (` -- conditional badge rendering with colors from contentTypes utility |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PIPE-01 | 07-01 | LLM provider abstraction with configurable provider | SATISFIED | `provider.ts` factory supports openai/anthropic/mock via LLM_PROVIDER env var; all three cases handle distinct models and cost rates |
| PIPE-02 | 07-02 | LLM relevance filtering -- classify scraped content as group-related or not | SATISFIED | `BatchItemDecisionSchema` includes `relevant: boolean`; pipeline sets status='rejected' when `!relevant` |
| PIPE-03 | 07-02 | LLM content moderation -- flag inappropriate or unsafe content | SATISFIED | `BatchItemDecisionSchema` includes `safe: boolean`; pipeline sets status='rejected' when `!safe`; safety criteria in prompt template |
| PIPE-04 | 07-02, 07-03 | LLM content type classification with 7 types | SATISFIED | `ContentTypeEnum` in schemas.ts; contentType column populated on approved items; badge displayed in FeedCard; filter pills in News.tsx |
| PIPE-05 | 07-02 | Batched LLM processing -- combine relevance + moderation + classification in single call, 10-20 items per batch | SATISFIED | `BATCH_SIZE = 15`; single `generateText` + `Output.object` call per batch with `BatchResultSchema` covering all three classification axes |
| PIPE-06 | 07-02, 07-03 | Three-stage content status pipeline (raw -> pending -> approved/rejected) with auto-approve fallback | SATISFIED | Status flow verified in pipeline.ts; fallback.ts handles budget-exceeded case; status page shows fallback mode indicator with warning banner |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `pipeline/provider.ts` | 53 | `model: {} as LanguageModel` for mock provider | Info | Mock provider has an empty cast object. This is documented in both SUMMARY and code as intentional -- the mock case is a type stub for testing. Does not affect production (openai is default). Not a blocker. |

No blocker anti-patterns found. The mock provider stub is documented and intentional.

### Human Verification Required

#### 1. End-to-End LLM Classification

**Test:** Start server with valid `OPENAI_API_KEY`, trigger a scrape via `POST /api/scrape`, observe console for `[pipeline]` log messages
**Expected:** `[pipeline] Complete: processed=N approved=M rejected=K tokens=T cost=$X` with non-zero processed count
**Why human:** Requires live API key and network connectivity to verify actual LLM calls succeed and structured output is parsed correctly

#### 2. Feed Returns Only Approved Items

**Test:** Immediately after fresh scrape with OPENAI_API_KEY, run `curl http://localhost:3001/api/feed?limit=20` and check each item's classification
**Expected:** All returned items reflect actual LLM decisions (not raw/pending/rejected); contentType non-null for items that went through the pipeline
**Why human:** The approved filter is verified in code, but confirming no raw items bleed through requires a live populated database

#### 3. Pipeline Stats Page (Visual)

**Test:** Open frontend with VITE_API_URL set, navigate to /status
**Expected:** "LLM Pipeline" card appears above "Source Status"; shows processed/approved/rejected/pending counts, provider name, token usage, estimated cost; no fallback banner under normal conditions
**Why human:** Visual layout and real data rendering requires browser inspection

#### 4. Content Type Filter Interaction

**Test:** On feed page, click a content type filter pill (e.g., "News")
**Expected:** Feed narrows to only News items; count reflects filtered result; "All Types" returns to full feed
**Why human:** Client-side filter interaction and empty-state handling require visual and interactive verification

#### 5. Fallback Mode Activation

**Test:** Set `LLM_DAILY_BUDGET=0`, restart server, trigger a scrape
**Expected:** Console shows `[pipeline] Daily budget exceeded`; status page shows "Fallback Mode" with yellow indicator and warning banner; BTS-focused source items approved, broad source items stay pending
**Why human:** Budget-gated path and status page indicator require live environment with controlled budget setting

### Gaps Summary

No gaps found. All 14 observable truths are verified. All 6 requirement IDs (PIPE-01 through PIPE-06) are satisfied with substantive implementations. All key links are wired. TypeScript compiles cleanly in all three packages (server, shared, frontend).

---

_Verified: 2026-03-02T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
