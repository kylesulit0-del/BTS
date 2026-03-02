# Phase 7: LLM Moderation Pipeline - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Scraped content flows through a three-stage LLM pipeline (raw -> pending -> approved/rejected) that filters for relevance, moderates for safety, and classifies by content type. The API only serves approved items. Provider is swappable via env var, with batched processing and cost controls. Feed ranking and smart blending are Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Relevance filtering
- Moderate strictness: BTS content plus BTS-adjacent (HYBE news, solo member activities, collaborations, award shows involving BTS)
- Solo member content always counts as BTS-relevant
- HYBE corporate news is included as BTS-adjacent
- Cross-group content included only if BTS is a primary focus (not just a passing mention)
- When uncertain, exclude — prefer a cleaner feed over completeness
- All sources go through relevance filtering, including BTS-focused sources
- Full LLM check for all sources (no lightweight pass-through for BTS sources)
- Assess all languages equally (Korean, Japanese, etc.)
- Binary relevant/not-relevant decision — no confidence scores, no reason text
- Config-driven relevance criteria: group config defines member names, stage names, real names, and common aliases; LLM prompt is built from this
- Relevance prompt template stored in config file, editable without code changes
- Merch/shopping/album release/concert ticket content is relevant
- No manual override or feedback loop for relevance decisions in this phase

### Content classification
- 7 content types: news, fan art, meme, video, discussion, translation, official
- Exactly one type per item (single label, no multi-label)
- Content type displayed as a badge/tag on feed cards
- Users can filter the feed by content type

### Fallback & cost controls
- Hard daily/monthly budget limit for LLM calls; once exceeded, switch to fallback mode
- Fallback mode: auto-approve content from BTS-focused sources; queue broad-source content as pending until LLM is back or budget resets
- Default to cheapest available provider with good quality for classification (e.g., Haiku, GPT-4o-mini)
- Provider swappable via environment variable without code changes
- Pipeline runs in periodic batches (after each scrape cycle), not real-time per item

### Pipeline visibility
- Status page section showing pipeline stats: items processed, approved, rejected, pending
- Admin API endpoint for inspecting rejected items with details
- Admin override API endpoint to manually approve rejected items or reject approved ones
- LLM cost tracking (tokens used, estimated spend) displayed on status page
- Status page indicator when pipeline is in fallback mode (LLM down or budget exceeded)
- Pipeline decision history retained for 30 days, then cleaned up

### Claude's Discretion
- Exact LLM prompt engineering for relevance/classification/moderation
- Batch size optimization within the 10-20 item range
- Provider selection logic (which specific model for default)
- Database schema for pipeline states and history
- Safety moderation criteria and thresholds
- Status page layout for pipeline section

</decisions>

<specifics>
## Specific Ideas

- Group config should define member names and aliases so the LLM prompt is automatically built from config data — making the pipeline reusable for other groups
- Relevance prompt template lives in a config file, not hardcoded — allows tuning without deploys
- Content type badges visible on feed cards, with filter-by-type capability in the feed
- Status page as the primary monitoring surface (pipeline stats, cost tracking, fallback warnings)

</specifics>

<deferred>
## Deferred Ideas

- Manual feedback loop for relevance filtering (mark false negatives to improve future filtering) — future enhancement
- Multi-label content classification — keep single-label for now, revisit if needed

</deferred>

---

*Phase: 07-llm-moderation-pipeline*
*Context gathered: 2026-03-02*
