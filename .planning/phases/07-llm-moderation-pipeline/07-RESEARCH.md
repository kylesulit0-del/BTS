# Phase 7: LLM Moderation Pipeline - Research

**Researched:** 2026-03-02
**Domain:** LLM-powered content classification and moderation pipeline
**Confidence:** HIGH

## Summary

Phase 7 adds a three-stage content pipeline (raw -> pending -> approved/rejected) powered by LLM calls for relevance filtering, safety moderation, and content type classification. The Vercel AI SDK (v6) is the clear standard for provider abstraction in TypeScript -- it provides a unified `generateText` + `Output.object()` API with Zod schema validation, letting you swap providers (Anthropic, OpenAI, etc.) by changing a single model parameter. The SDK includes built-in token usage tracking, mock providers for testing, and structured output support across all major LLM providers.

The architecture is straightforward: after each scrape cycle, new content items are batched (10-20 per call) and sent through a single LLM call that performs relevance filtering, safety moderation, and content type classification simultaneously. Results are stored in new DB columns on `content_items` plus a new `pipeline_runs` table for cost tracking and history. The feed API filters to only serve approved items. A budget tracking system with daily/monthly limits triggers fallback mode (auto-approve BTS-focused sources, queue broad sources) when the LLM is unavailable or over budget.

**Primary recommendation:** Use Vercel AI SDK v6 (`ai` + `@ai-sdk/openai`) with GPT-4.1 Nano as the default provider. It costs $0.10/$0.40 per million tokens -- processing the entire feed daily should cost under $0.10/month. Build a simple provider factory that reads `LLM_PROVIDER` env var and returns the appropriate AI SDK model instance.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Moderate strictness: BTS content plus BTS-adjacent (HYBE news, solo member activities, collaborations, award shows involving BTS)
- Solo member content always counts as BTS-relevant
- HYBE corporate news is included as BTS-adjacent
- Cross-group content included only if BTS is a primary focus (not just a passing mention)
- When uncertain, exclude -- prefer a cleaner feed over completeness
- All sources go through relevance filtering, including BTS-focused sources
- Full LLM check for all sources (no lightweight pass-through for BTS sources)
- Assess all languages equally (Korean, Japanese, etc.)
- Binary relevant/not-relevant decision -- no confidence scores, no reason text
- Config-driven relevance criteria: group config defines member names, stage names, real names, and common aliases; LLM prompt is built from this
- Relevance prompt template stored in config file, editable without code changes
- Merch/shopping/album release/concert ticket content is relevant
- No manual override or feedback loop for relevance decisions in this phase
- 7 content types: news, fan art, meme, video, discussion, translation, official
- Exactly one type per item (single label, no multi-label)
- Content type displayed as a badge/tag on feed cards
- Users can filter the feed by content type
- Hard daily/monthly budget limit for LLM calls; once exceeded, switch to fallback mode
- Fallback mode: auto-approve content from BTS-focused sources; queue broad-source content as pending until LLM is back or budget resets
- Default to cheapest available provider with good quality for classification (e.g., Haiku, GPT-4o-mini)
- Provider swappable via environment variable without code changes
- Pipeline runs in periodic batches (after each scrape cycle), not real-time per item
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

### Deferred Ideas (OUT OF SCOPE)
- Manual feedback loop for relevance filtering (mark false negatives to improve future filtering) -- future enhancement
- Multi-label content classification -- keep single-label for now, revisit if needed
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | LLM provider abstraction with configurable provider (Claude, OpenAI, etc.) | Vercel AI SDK v6 provides unified `generateText` API with provider-specific packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`). Swap by changing model parameter. Mock provider available for testing. |
| PIPE-02 | LLM relevance filtering -- classify scraped content as group-related or not | `Output.object()` with Zod schema returning `{relevant: boolean}` per item. Prompt template built from group config (member names, aliases). Binary decision as specified. |
| PIPE-03 | LLM content moderation -- flag inappropriate or unsafe content | Combined in same LLM call as relevance check. Schema includes `{safe: boolean}` field. Unsafe items are rejected regardless of relevance. |
| PIPE-04 | LLM content type classification (news, fan art, meme, video, discussion, translation, official) | `Output.object()` with Zod enum for content types. Single label per item. Stored in existing `content_type` column on `content_items`. |
| PIPE-05 | Batched LLM processing -- combine relevance + moderation + classification in single call, 10-20 items per batch | Single `generateText` call with array of items in prompt, returns array of decisions. Batch size 15 (midpoint). Token usage tracked per call for cost monitoring. |
| PIPE-06 | Three-stage content status pipeline (raw -> pending -> approved/rejected) with auto-approve fallback | New `moderation_status` column on `content_items` (values: 'raw', 'pending', 'approved', 'rejected'). Feed API filters to `moderation_status = 'approved'`. Fallback mode auto-approves BTS-focused sources when LLM unavailable or over budget. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | ^6.0.0 | Vercel AI SDK core -- unified generateText/Output.object() | 20M+ monthly downloads, de facto standard for TypeScript LLM integration, provider-agnostic |
| @ai-sdk/openai | ^3.0.37 | OpenAI provider (GPT-4.1 Nano/Mini) | Official Vercel AI SDK provider, supports all GPT-4.1 models |
| @ai-sdk/anthropic | ^3.0.50 | Anthropic provider (Claude Haiku) | Official Vercel AI SDK provider, swap-in alternative |
| zod | ^3.23 | Schema validation for structured LLM output | Already used by AI SDK, standard for TypeScript schema validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ai/test | (bundled) | MockLanguageModelV3 for testing | Unit testing pipeline without real API calls |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Direct OpenAI/Anthropic SDKs | More control but no provider abstraction, must hand-roll switching logic |
| Vercel AI SDK | multi-llm-ts | Smaller community, less maintained, no structured output support |
| GPT-4.1 Nano (default) | Claude Haiku 4.5 | Haiku costs 10x more ($1/$5 vs $0.10/$0.40 per M tokens), similar quality for classification |
| GPT-4.1 Nano | GPT-4o-mini | GPT-4o-mini slightly more expensive ($0.15/$0.60), GPT-4.1 Nano is newer and faster |

**Installation:**
```bash
cd packages/server && npm install ai @ai-sdk/openai @ai-sdk/anthropic zod
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── pipeline/                    # NEW: LLM moderation pipeline
│   ├── provider.ts              # Provider factory: reads env, returns AI SDK model
│   ├── pipeline.ts              # Main orchestrator: batch, call LLM, store results
│   ├── prompts.ts               # Prompt templates: relevance, classification, moderation
│   ├── schemas.ts               # Zod schemas for LLM structured output
│   ├── budget.ts                # Cost tracking and budget enforcement
│   └── fallback.ts              # Fallback mode logic (auto-approve / queue)
├── routes/
│   ├── pipeline.ts              # NEW: Admin API for pipeline inspection/override
│   └── feed.ts                  # MODIFIED: filter to approved items only
├── db/
│   └── schema.ts                # MODIFIED: add moderation columns + pipeline_runs table
└── scrapers/
    └── base.ts                  # MODIFIED: trigger pipeline after scrape completes
```

### Pattern 1: Provider Factory
**What:** A single function that reads `LLM_PROVIDER` env var and returns the appropriate AI SDK model instance.
**When to use:** At pipeline startup and whenever a provider reference is needed.
**Example:**
```typescript
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

type ProviderConfig = {
  model: Parameters<typeof import('ai').generateText>[0]['model'];
  costPerInputToken: number;   // USD per token
  costPerOutputToken: number;
};

export function getProvider(): ProviderConfig {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const model = process.env.LLM_MODEL || 'gpt-4.1-nano';

  switch (provider) {
    case 'openai':
      return {
        model: openai(model),
        costPerInputToken: 0.10 / 1_000_000,  // GPT-4.1 Nano default
        costPerOutputToken: 0.40 / 1_000_000,
      };
    case 'anthropic':
      return {
        model: anthropic(model || 'claude-haiku-4-5'),
        costPerInputToken: 1.00 / 1_000_000,
        costPerOutputToken: 5.00 / 1_000_000,
      };
    case 'mock':
      // For testing -- returns deterministic results
      return {
        model: getMockModel(),
        costPerInputToken: 0,
        costPerOutputToken: 0,
      };
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
```

### Pattern 2: Batched Classification with Structured Output
**What:** Single LLM call processes 10-20 items, returning structured decisions for each.
**When to use:** After each scrape cycle completes.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { generateText, Output } from 'ai';
import { z } from 'zod';

const ContentDecisionSchema = z.object({
  items: z.array(z.object({
    index: z.number().describe('0-based index matching input order'),
    relevant: z.boolean().describe('Is this content about BTS or BTS-adjacent?'),
    safe: z.boolean().describe('Is this content safe and appropriate?'),
    contentType: z.enum([
      'news', 'fan_art', 'meme', 'video',
      'discussion', 'translation', 'official'
    ]).describe('Content category'),
  })),
});

async function classifyBatch(items: ContentItem[], provider: ProviderConfig) {
  const prompt = buildPrompt(items); // Uses template from config

  const { output, usage } = await generateText({
    model: provider.model,
    output: Output.object({ schema: ContentDecisionSchema }),
    prompt,
  });

  // Track cost
  const cost = (usage.promptTokens * provider.costPerInputToken)
             + (usage.completionTokens * provider.costPerOutputToken);

  return { decisions: output.items, usage, cost };
}
```

### Pattern 3: Three-Stage Pipeline Integration
**What:** New content enters as 'raw', pipeline processes to 'pending' then 'approved'/'rejected'. Feed API only serves 'approved'.
**When to use:** All content flow.
**Example:**
```typescript
// After scrape completes in base.ts:
// 1. All new items inserted with moderation_status = 'raw'
// 2. Pipeline picks up 'raw' items in batches
// 3. Each item moves to 'approved' or 'rejected'

// Feed query change:
const conditions = [
  isNull(contentItems.deletedAt),
  eq(contentItems.moderationStatus, 'approved'),  // NEW
];
```

### Pattern 4: Budget-Aware Fallback
**What:** Track daily/monthly LLM spend. When budget exceeded, auto-approve BTS-focused sources, queue broad sources.
**When to use:** Before each LLM call and on budget reset.
**Example:**
```typescript
async function shouldUseFallback(db: Db): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const dailySpend = getDailySpend(db, today);
  const monthlySpend = getMonthlySpend(db);

  const dailyLimit = parseFloat(process.env.LLM_DAILY_BUDGET || '1.00');
  const monthlyLimit = parseFloat(process.env.LLM_MONTHLY_BUDGET || '10.00');

  return dailySpend >= dailyLimit || monthlySpend >= monthlyLimit;
}

function autoApproveFallback(db: Db, items: ContentItem[]) {
  for (const item of items) {
    const source = getSourceConfig(item.sourceDetail);
    if (!source.needsFilter) {
      // BTS-focused source: auto-approve
      updateStatus(db, item.id, 'approved');
    } else {
      // Broad source: keep as pending until LLM available
      updateStatus(db, item.id, 'pending');
    }
  }
}
```

### Anti-Patterns to Avoid
- **Separate LLM calls per task:** Do NOT make 3 separate calls (relevance, moderation, classification) per item. Combine all three in a single structured output call per batch.
- **Per-item API calls:** Do NOT call the LLM once per content item. Always batch 10-20 items per call.
- **Hardcoded prompts:** Do NOT embed prompt text in TypeScript code. Store templates in config files, build dynamically from group config data.
- **Blocking scrape on pipeline:** Do NOT make the scrape cycle wait for LLM processing. Pipeline runs after scrape completes, asynchronously.
- **No fallback path:** Do NOT let LLM failures or budget overruns block the entire feed. Always have a fallback that keeps content flowing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider abstraction | Custom HTTP clients per provider | Vercel AI SDK `generateText` | Handles auth, retries, rate limits, response parsing, streaming, token counting |
| Structured output parsing | Manual JSON.parse + validation | AI SDK `Output.object()` + Zod | Handles schema enforcement, validation errors, retries on malformed output |
| Token counting | Manual tokenizer (tiktoken, etc.) | AI SDK `usage` return field | SDK tracks prompt/completion tokens automatically per call |
| Mock LLM for testing | Fake HTTP server or stubbed functions | `MockLanguageModelV3` from `ai/test` | Purpose-built, matches real SDK interface, controls output deterministically |

**Key insight:** The Vercel AI SDK handles all the gnarly LLM integration details (provider differences, structured output enforcement, token tracking, error handling). Custom solutions for any of these will be buggier and harder to maintain.

## Common Pitfalls

### Pitfall 1: LLM Output Schema Validation Failures
**What goes wrong:** LLM returns JSON that doesn't match the Zod schema (wrong field names, missing items, extra fields).
**Why it happens:** LLMs are probabilistic; smaller/cheaper models occasionally produce malformed output, especially with complex schemas.
**How to avoid:** Keep the schema simple and flat. Use `Output.object()` which automatically validates and can retry. Catch `NoObjectGeneratedError` and fall back to auto-approve for that batch. Add `.describe()` hints on every schema field.
**Warning signs:** Frequent validation errors in logs, items stuck in 'raw' status.

### Pitfall 2: Prompt Token Budget Explosion
**What goes wrong:** Batching 20 items with full titles and metadata into a single prompt exceeds context limits or becomes very expensive.
**Why it happens:** Content titles can be long (especially translated titles), and metadata adds up across 20 items.
**How to avoid:** Truncate titles to ~150 characters in the prompt. Include only title and source in the prompt (not full URLs or metadata). Start with batch size 15, measure actual token usage, adjust. GPT-4.1 Nano has a 1M token context window, so this is about cost, not limits.
**Warning signs:** Token usage per batch exceeding ~2000 tokens, individual batch costs above $0.001.

### Pitfall 3: Race Condition Between Scrape and Pipeline
**What goes wrong:** A new scrape cycle starts while the pipeline is still processing the previous batch, leading to items being processed twice or skipped.
**Why it happens:** Scrape cycle (20 min interval) and pipeline processing run concurrently.
**How to avoid:** Pipeline selects items with `moderation_status = 'raw'` and immediately sets them to `'pending'` before sending to LLM. This atomic SELECT+UPDATE prevents double-processing. Use the same flag-based guard pattern as the scrape endpoint.
**Warning signs:** Duplicate entries in pipeline_runs, items with duplicate moderation history.

### Pitfall 4: Budget Tracking Drift
**What goes wrong:** Estimated cost diverges from actual API billing because token costs change or estimation is inaccurate.
**Why it happens:** Using hardcoded cost-per-token values that don't match actual provider pricing, or not accounting for cached input tokens.
**How to avoid:** Store cost-per-token in config alongside provider settings. Log actual token usage from every API response. The budget system is a guardrail, not an accounting system -- set limits conservatively.
**Warning signs:** Budget tracking shows $X but provider dashboard shows significantly different amount.

### Pitfall 5: Feed Goes Empty During Migration
**What goes wrong:** After adding `moderation_status` column, all existing items have `NULL` status and the feed API filters them out, returning an empty feed.
**Why it happens:** The migration adds the column but doesn't backfill existing items.
**How to avoid:** The migration MUST set `moderation_status = 'approved'` for all existing items. This is critical -- use `UPDATE content_items SET moderation_status = 'approved' WHERE moderation_status IS NULL` in the migration SQL.
**Warning signs:** Feed returns 0 items after deploying the migration.

### Pitfall 6: AI SDK v6 API Changes
**What goes wrong:** Using `generateObject()` which is deprecated in AI SDK v6, or importing from wrong package paths.
**Why it happens:** Most tutorials and examples online still reference AI SDK v4/v5 APIs.
**How to avoid:** Use `generateText()` with `Output.object()` parameter, not `generateObject()`. Import `Output` from `'ai'`. Use `MockLanguageModelV3` (not V1/V2) for testing.
**Warning signs:** Deprecation warnings in console, TypeScript type errors.

## Code Examples

### Database Schema Extension
```typescript
// Add to packages/server/src/db/schema.ts

export const contentItems = sqliteTable('content_items', {
  // ... existing columns ...
  moderationStatus: text('moderation_status').notNull().default('raw'),
    // 'raw' | 'pending' | 'approved' | 'rejected'
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
}, (table) => [
  // ... existing indexes ...
  index('idx_moderation_status').on(table.moderationStatus),
]);

// New table for pipeline run tracking and cost monitoring
export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  itemsProcessed: integer('items_processed').default(0),
  itemsApproved: integer('items_approved').default(0),
  itemsRejected: integer('items_rejected').default(0),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  estimatedCost: text('estimated_cost'),       // USD string, e.g., "0.000042"
  provider: text('provider').notNull(),         // e.g., 'openai/gpt-4.1-nano'
  status: text('status').notNull().default('running'),
    // 'running' | 'success' | 'fallback' | 'error'
  error: text('error'),
  fallbackMode: integer('fallback_mode', { mode: 'boolean' }).default(false),
});

// Pipeline decision history (retained 30 days)
export const pipelineDecisions = sqliteTable('pipeline_decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentItemId: integer('content_item_id').notNull(),
  runId: integer('run_id').notNull(),
  relevant: integer('relevant', { mode: 'boolean' }).notNull(),
  safe: integer('safe', { mode: 'boolean' }).notNull(),
  contentType: text('content_type'),
  decision: text('decision').notNull(),       // 'approved' | 'rejected'
  decidedAt: integer('decided_at', { mode: 'timestamp' }).notNull(),
});
```

### Prompt Template (Config File)
```typescript
// packages/shared/src/config/prompts.ts (new file)

export interface RelevanceCriteria {
  groupName: string;
  memberNames: string[];       // Stage names
  realNames: string[];
  aliases: string[];
  adjacentTopics: string[];    // e.g., ['HYBE', 'BigHit']
}

export const MODERATION_PROMPT_TEMPLATE = `
You are a content moderator for a {{groupName}} fan feed app.

## Group Members
{{memberList}}

## Relevance Criteria
Content is RELEVANT if it is primarily about:
- {{groupName}} as a group
- Any individual member (solo activities, collaborations, personal updates)
- {{adjacentTopics}} when directly related to {{groupName}} members
- Merch, album releases, concert tickets, award shows involving {{groupName}}

Content is NOT RELEVANT if:
- {{groupName}} or members are only mentioned in passing
- It is about other K-pop groups without {{groupName}} involvement
- When uncertain, mark as NOT relevant

## Safety Criteria
Content is UNSAFE if it contains:
- Explicit sexual content or graphic violence
- Hate speech or harassment targeting individuals
- Dangerous misinformation about real people
- Spam or purely commercial content unrelated to fandom

## Content Types
Classify each item into exactly ONE type:
- news: Official announcements, industry news, interviews
- fan_art: Fan-created artwork, edits, graphics
- meme: Humor, jokes, meme formats
- video: Video content, MVs, performances, vlogs
- discussion: Opinions, analyses, forum discussions, questions
- translation: Translated content from Korean/Japanese/etc.
- official: Direct posts from {{groupName}} members or official accounts

## Task
For each content item below, determine:
1. Is it relevant? (true/false)
2. Is it safe? (true/false)
3. What content type is it?

Assess content in any language equally (Korean, Japanese, English, etc.).
`;
```

### Pipeline Orchestrator
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { eq, isNull, and, sql } from 'drizzle-orm';

const BATCH_SIZE = 15;

const BatchResultSchema = z.object({
  items: z.array(z.object({
    index: z.number().describe('0-based index of the item in the input list'),
    relevant: z.boolean().describe('Is this content relevant to BTS?'),
    safe: z.boolean().describe('Is this content safe and appropriate?'),
    contentType: z.enum([
      'news', 'fan_art', 'meme', 'video',
      'discussion', 'translation', 'official',
    ]).describe('Single content type classification'),
  })),
});

async function runPipeline(db: Db) {
  const provider = getProvider();

  // Check budget before proceeding
  if (await shouldUseFallback(db)) {
    await handleFallback(db);
    return;
  }

  // Grab raw items and immediately mark as pending (prevents double-processing)
  const rawItems = db.select()
    .from(contentItems)
    .where(and(
      eq(contentItems.moderationStatus, 'raw'),
      isNull(contentItems.deletedAt),
    ))
    .limit(BATCH_SIZE * 5) // Grab enough for multiple batches
    .all();

  if (rawItems.length === 0) return;

  // Mark as pending
  const ids = rawItems.map(i => i.id);
  db.update(contentItems)
    .set({ moderationStatus: 'pending' })
    .where(sql`id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
    .run();

  // Process in batches
  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);
    await processBatch(db, batch, provider);
  }
}
```

### Admin API Endpoints
```typescript
// packages/server/src/routes/pipeline.ts (new file)
export function registerPipelineRoutes(server: FastifyInstance, db: Db) {
  // GET /pipeline/stats -- pipeline overview for status page
  server.get('/pipeline/stats', async (request, reply) => { /* ... */ });

  // GET /pipeline/rejected -- inspect rejected items
  server.get('/pipeline/rejected', async (request, reply) => { /* ... */ });

  // POST /pipeline/override/:id -- manually approve/reject
  server.post('/pipeline/override/:id', async (request, reply) => { /* ... */ });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` | `generateText()` + `Output.object()` | AI SDK v6 (2025) | generateObject deprecated, Output.object() is the standard |
| Multiple provider SDKs | Vercel AI SDK unified interface | 2024-2025 | Single API for all providers, no provider-specific code |
| GPT-4o-mini ($0.15/$0.60) | GPT-4.1 Nano ($0.10/$0.40) | April 2025 | 33% cheaper, faster, 1M context window |
| JSON mode | Structured Outputs (Zod schemas) | 2024-2025 | Schema-validated output, not just valid JSON |
| MockLanguageModelV1 | MockLanguageModelV3 | AI SDK v6 | V3 spec matches current provider interface |

**Deprecated/outdated:**
- `generateObject()` / `streamObject()`: Deprecated in AI SDK v6, use `generateText()` + `Output.object()` instead
- `@ai-sdk/provider` v1/v2: Must use v3.0.0+ for AI SDK v6 compatibility
- GPT-4o-mini: Still works but GPT-4.1 Nano is cheaper and faster for classification

## Cost Estimation

Based on typical content volume (est. ~500 items/day across all sources):

| Provider | Input Cost/M | Output Cost/M | Est. Daily Cost | Est. Monthly Cost |
|----------|-------------|---------------|-----------------|-------------------|
| GPT-4.1 Nano | $0.10 | $0.40 | ~$0.002 | ~$0.06 |
| GPT-4o-mini | $0.15 | $0.60 | ~$0.003 | ~$0.09 |
| GPT-4.1 Mini | $0.60 | $2.40 | ~$0.012 | ~$0.36 |
| Claude Haiku 4.5 | $1.00 | $5.00 | ~$0.020 | ~$0.60 |

Assumptions: ~33 batches/day (500 items / 15 per batch), ~800 input tokens + ~200 output tokens per batch call.

**Recommendation:** Default to GPT-4.1 Nano. Set conservative budget limits ($1/day, $10/month) as guardrails. At ~$0.06/month actual cost, this gives 16x headroom before hitting daily limit.

## Open Questions

1. **Existing content migration strategy**
   - What we know: Adding `moderation_status` column requires backfilling existing items as 'approved' to avoid empty feed
   - What's unclear: Should we also retroactively classify content types for existing items, or only classify new items going forward?
   - Recommendation: Backfill existing items as 'approved' with `content_type = NULL`. Optionally run a one-time batch to classify existing items after pipeline is working. Not blocking.

2. **Feed API backward compatibility**
   - What we know: Current feed API returns all non-deleted items. Phase 7 adds `moderation_status = 'approved'` filter.
   - What's unclear: Should there be a query parameter to include pending items (for admin/debug purposes)?
   - Recommendation: Default to approved-only. Add `?status=all` or `?include_pending=true` query parameter for admin use.

3. **Pipeline run trigger timing**
   - What we know: Pipeline runs "after each scrape cycle" per user decision. Scrape runs every 20 minutes.
   - What's unclear: Should pipeline be triggered within `runAllScrapers()` or as a separate scheduled task?
   - Recommendation: Trigger within `runAllScrapers()` after all scrapers complete, before the function returns. This keeps it simple and ensures new content is classified promptly.

## Sources

### Primary (HIGH confidence)
- [AI SDK Introduction](https://ai-sdk.dev/docs/introduction) - Core architecture, v6 API surface
- [AI SDK Structured Data Generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Output.object(), Output.choice(), Zod schema usage
- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) - generateObject deprecation, v6 breaking changes
- [AI SDK Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing) - MockLanguageModelV3, deterministic testing
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - Model names, setup, configuration
- [@ai-sdk/openai npm](https://www.npmjs.com/package/@ai-sdk/openai) - v3.0.37, latest
- [@ai-sdk/anthropic npm](https://www.npmjs.com/package/@ai-sdk/anthropic) - v3.0.50, latest
- [OpenAI GPT-4.1 Nano Model](https://platform.openai.com/docs/models/gpt-4.1-nano) - Pricing, capabilities
- [OpenAI Pricing](https://platform.openai.com/docs/pricing) - Current token costs

### Secondary (MEDIUM confidence)
- [AI API Pricing Comparison 2026](https://intuitionlabs.ai/articles/ai-api-pricing-comparison-grok-gemini-openai-claude) - Cross-provider pricing comparison
- [Claude Haiku 4.5 vs GPT-4o-mini](https://blog.galaxy.ai/compare/claude-haiku-4-5-vs-gpt-4o-mini) - Performance comparison for classification
- [GPT-4.1 Nano Pricing Guide](https://gptbreeze.io/blog/gpt-41-nano-pricing-guide/) - Cost analysis for budget models

### Tertiary (LOW confidence)
- [LLM Abstraction Layer article](https://www.proxai.co/blog/archive/llm-abstraction-layer) - Industry patterns for provider abstraction (general guidance, not code-verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vercel AI SDK v6 API verified against official docs and migration guide; package versions confirmed on npm
- Architecture: HIGH - Patterns follow AI SDK official examples; database schema follows existing Drizzle patterns in codebase
- Pitfalls: HIGH - Migration pitfall (empty feed) is critical and verified by understanding existing feed query; AI SDK v6 breaking changes verified in migration guide
- Cost estimates: MEDIUM - Based on published pricing and estimated content volumes; actual costs depend on real usage patterns

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days -- stable domain, pricing may shift)
