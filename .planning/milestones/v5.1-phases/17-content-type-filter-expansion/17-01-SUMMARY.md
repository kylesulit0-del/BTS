---
phase: 17-content-type-filter-expansion
plan: 01
subsystem: api, pipeline
tags: [content-types, llm, zod, classification, pipeline]

# Dependency graph
requires:
  - phase: 07-llm-moderation
    provides: LLM pipeline with content type classification
  - phase: 16-source-expansion
    provides: AO3, Google News, Bluesky, YouTube sources with description field
provides:
  - Expanded 8-value ContentType taxonomy (news, fan_art, fan_fiction, music, discussion, social_posts, media, general)
  - Source-level default contentType map skipping LLM for known sources
  - Description field passed to LLM for richer classification
affects: [17-02 frontend filter updates, content-type filtering]

# Tech tracking
tech-stack:
  added: []
  patterns: [source-level content type defaults, LLM bypass for unambiguous sources]

key-files:
  created: []
  modified:
    - packages/shared/src/types/feed.ts
    - packages/server/src/pipeline/schemas.ts
    - packages/shared/src/config/prompts.ts
    - packages/server/src/pipeline/prompts.ts
    - packages/server/src/pipeline/pipeline.ts

key-decisions:
  - "SOURCE_DEFAULT_CONTENT_TYPES stored as Map in pipeline.ts rather than modifying source config -- pipeline-specific optimization logic"
  - "Source defaults applied after API key check but before LLM claiming -- optimization only when LLM is active"

patterns-established:
  - "Source-level defaults: Map<source, contentType> for bypassing LLM on unambiguous sources"

requirements-completed: [CTYP-01, CTYP-02, CTYP-03, CTYP-06]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 17 Plan 01: Backend Content Type Expansion Summary

**Expanded content taxonomy to 8 types with source-level defaults bypassing LLM for AO3, Google News, YouTube, and Bluesky**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T15:38:40Z
- **Completed:** 2026-03-06T15:41:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced 7-type taxonomy (news, fan_art, meme, video, discussion, translation, official) with 8-type set (news, fan_art, fan_fiction, music, discussion, social_posts, media, general)
- Added source-level defaults: AO3->fan_fiction, Google News->news, YouTube->media, Bluesky->social_posts (skip LLM entirely)
- Added description field to LLM batch prompt for richer classification context
- Updated LLM prompt with detailed type definitions and edge case guidance (translations classified by content nature)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update shared ContentType union and LLM classification schemas/prompt** - `91b86ec` (feat)
2. **Task 2: Implement source-level default contentType in pipeline and pass description to LLM** - `14f89e5` (feat)

## Files Created/Modified
- `packages/shared/src/types/feed.ts` - Expanded ContentType union from 7 to 8 values
- `packages/server/src/pipeline/schemas.ts` - Updated Zod ContentTypeEnum to match new union
- `packages/shared/src/config/prompts.ts` - Updated LLM prompt with new type definitions and edge case rules
- `packages/server/src/pipeline/prompts.ts` - Added description field to BatchItem, included in prompt output
- `packages/server/src/pipeline/pipeline.ts` - Added SOURCE_DEFAULT_CONTENT_TYPES map, item partitioning, source-default auto-approval

## Decisions Made
- SOURCE_DEFAULT_CONTENT_TYPES stored as a Map constant in pipeline.ts rather than modifying source config, since this is pipeline-specific optimization logic
- Source defaults applied after API key check but before LLM batch claiming, so they work as an optimization when LLM is active but don't interfere with the no-key auto-approve path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend content type expansion complete
- Plan 02 (frontend filter updates) can proceed to update badge colors, labels, and filter chips for the new content types
- Frontend has its own local ContentType at `packages/frontend/src/types/feed.ts` and `packages/frontend/src/utils/contentTypes.ts` that still use old values -- plan 02 handles this

## Self-Check: PASSED

All 5 modified files verified present. Both task commits (91b86ec, 14f89e5) verified in git log. SUMMARY.md created.

---
*Phase: 17-content-type-filter-expansion*
*Completed: 2026-03-06*
