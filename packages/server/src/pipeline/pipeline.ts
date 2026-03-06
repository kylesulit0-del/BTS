/**
 * Core LLM moderation pipeline orchestrator.
 *
 * Processes raw content items in batches through the LLM for relevance,
 * safety, and content type classification. Uses AI SDK generateText +
 * Output.object for structured output with Zod schema validation.
 *
 * Flow: raw -> pending (claimed) -> approved/rejected (after LLM)
 */

import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { eq, and, isNull, inArray, sql, lt } from 'drizzle-orm';
import { contentItems, pipelineRuns, pipelineDecisions } from '../db/schema.js';
import { getProvider, hasApiKey } from './provider.js';
import { BatchResultSchema } from './schemas.js';
import { buildBatchPrompt } from './prompts.js';
import { shouldUseFallback, recordCost } from './budget.js';
import { handleFallback } from './fallback.js';
import type { Db } from '../db/index.js';

const BATCH_SIZE = 15;
const MAX_ITEMS_PER_RUN = BATCH_SIZE * 5; // 75 items per pipeline run

/** Source types with hardcoded contentType that skip LLM classification. */
const SOURCE_DEFAULT_CONTENT_TYPES = new Map<string, string>([
  ['ao3', 'fan_fiction'],
  ['googlenews', 'news'],
  ['youtube', 'media'],
  ['bluesky', 'social_posts'],
]);

/**
 * Run the LLM moderation pipeline on raw content items.
 *
 * 1. No API key → auto-approve all raw items (moderation disabled)
 * 2. Check budget → fallback mode if exceeded
 * 3. Select raw items and atomically mark as 'pending'
 * 4. Process in batches via LLM (relevance + safety + classification)
 * 5. Update items with decisions, track costs, clean up old decisions
 *
 * NOTE: When no API key is configured, ALL content is auto-approved without
 * moderation. Once an API key is provided, new content will go through proper
 * LLM moderation. Previously auto-approved content is NOT re-evaluated.
 */
export async function runPipeline(db: Db): Promise<void> {
  // No API key → auto-approve everything (moderation disabled)
  if (!hasApiKey()) {
    const rawItems = db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.moderationStatus, 'raw'),
          isNull(contentItems.deletedAt),
        )
      )
      .all();

    if (rawItems.length === 0) return;

    for (const item of rawItems) {
      db.update(contentItems)
        .set({ moderationStatus: 'approved', moderatedAt: new Date() })
        .where(eq(contentItems.id, item.id))
        .run();
    }

    console.log(`[pipeline] No API key configured — auto-approved ${rawItems.length} items. Set OPENAI_API_KEY or ANTHROPIC_API_KEY to enable LLM moderation.`);
    return;
  }

  // Check budget — fallback mode if exceeded
  if (shouldUseFallback(db)) {
    const rawItems = db
      .select({ id: contentItems.id, sourceDetail: contentItems.sourceDetail })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.moderationStatus, 'raw'),
          isNull(contentItems.deletedAt),
        )
      )
      .all();

    if (rawItems.length === 0) return;

    handleFallback(db, rawItems);

    // Record a fallback run
    db.insert(pipelineRuns).values({
      startedAt: new Date(),
      completedAt: new Date(),
      itemsProcessed: rawItems.length,
      status: 'fallback',
      fallbackMode: true,
      provider: 'fallback',
    }).run();

    return;
  }

  // Select raw items to process
  const rawItems = db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.moderationStatus, 'raw'),
        isNull(contentItems.deletedAt),
      )
    )
    .limit(MAX_ITEMS_PER_RUN)
    .all();

  if (rawItems.length === 0) return;

  // Partition: items with source-level defaults vs items needing LLM
  const defaultItems: typeof rawItems = [];
  const llmItems: typeof rawItems = [];

  for (const item of rawItems) {
    const defaultType = SOURCE_DEFAULT_CONTENT_TYPES.get(item.source);
    if (defaultType) {
      defaultItems.push(item);
    } else {
      llmItems.push(item);
    }
  }

  // Apply source-level defaults immediately (skip LLM)
  for (const item of defaultItems) {
    const defaultType = SOURCE_DEFAULT_CONTENT_TYPES.get(item.source)!;
    db.update(contentItems)
      .set({
        moderationStatus: 'approved',
        contentType: defaultType,
        moderatedAt: new Date(),
      })
      .where(eq(contentItems.id, item.id))
      .run();
  }

  if (defaultItems.length > 0) {
    console.log(`[pipeline] Source defaults applied: ${defaultItems.length} items (${[...new Set(defaultItems.map(i => i.source))].join(', ')})`);
  }

  // If no items need LLM, record the run and return
  if (llmItems.length === 0) {
    db.insert(pipelineRuns).values({
      startedAt: new Date(),
      completedAt: new Date(),
      itemsProcessed: rawItems.length,
      itemsApproved: defaultItems.length,
      itemsRejected: 0,
      status: 'success',
      provider: 'source-defaults',
    }).run();

    console.log(`[pipeline] Complete: all ${rawItems.length} items handled by source defaults`);
    return;
  }

  // Atomically claim LLM items by marking as 'pending' (prevents double-processing)
  const itemIds = llmItems.map((item) => item.id);
  db.update(contentItems)
    .set({ moderationStatus: 'pending' })
    .where(inArray(contentItems.id, itemIds))
    .run();

  // Get LLM provider config
  const providerConfig = getProvider();

  // Create pipeline run record
  const run = db.insert(pipelineRuns).values({
    startedAt: new Date(),
    status: 'running',
    provider: providerConfig.name,
  }).returning().get();

  let totalApproved = defaultItems.length;
  let totalRejected = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Process LLM items in batches
  for (let i = 0; i < llmItems.length; i += BATCH_SIZE) {
    const batch = llmItems.slice(i, i + BATCH_SIZE);
    const batchItems = batch.map((item, idx) => ({
      index: idx,
      title: item.title,
      source: item.sourceDetail,
      description: item.description ?? undefined,
    }));

    try {
      const prompt = buildBatchPrompt(batchItems);
      const result = await generateText({
        model: providerConfig.model,
        output: Output.object({ schema: BatchResultSchema }),
        prompt,
      });

      // Track token usage
      if (result.usage) {
        totalInputTokens += result.usage.inputTokens ?? 0;
        totalOutputTokens += result.usage.outputTokens ?? 0;
      }

      // Process LLM decisions from structured output
      if (result.output && result.output.items) {
        for (const decision of result.output.items) {
          const item = batch[decision.index];
          if (!item) continue;

          const isApproved = decision.relevant && decision.safe;
          const status = isApproved ? 'approved' : 'rejected';
          const now = new Date();

          // Update content item
          db.update(contentItems)
            .set({
              moderationStatus: status,
              contentType: isApproved ? decision.contentType : null,
              moderatedAt: now,
            })
            .where(eq(contentItems.id, item.id))
            .run();

          // Record decision
          db.insert(pipelineDecisions).values({
            contentItemId: item.id,
            runId: run.id,
            relevant: decision.relevant,
            safe: decision.safe,
            contentType: decision.contentType,
            decision: status,
            decidedAt: now,
          }).run();

          if (isApproved) {
            totalApproved++;
          } else {
            totalRejected++;
          }
        }
      }
    } catch (error) {
      // On LLM error: auto-approve entire batch to prevent items stuck as 'pending'
      const isNoObject = error instanceof NoObjectGeneratedError;
      const errorType = isNoObject ? 'NoObjectGeneratedError' : 'LLM error';
      console.warn(`[pipeline] ${errorType} on batch ${Math.floor(i / BATCH_SIZE) + 1}, auto-approving ${batch.length} items:`, error);

      for (const item of batch) {
        db.update(contentItems)
          .set({
            moderationStatus: 'approved',
            moderatedAt: new Date(),
          })
          .where(eq(contentItems.id, item.id))
          .run();
        totalApproved++;
      }
    }
  }

  // Finalize pipeline run record
  const totalCost = (totalInputTokens * providerConfig.costPerInputToken) +
    (totalOutputTokens * providerConfig.costPerOutputToken);

  db.update(pipelineRuns)
    .set({
      status: 'success',
      completedAt: new Date(),
      itemsProcessed: rawItems.length,
      itemsApproved: totalApproved,
      itemsRejected: totalRejected,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost: totalCost.toFixed(6),
    })
    .where(eq(pipelineRuns.id, run.id))
    .run();

  console.log(
    `[pipeline] Complete: total=${rawItems.length} source-defaults=${defaultItems.length} ` +
    `llm-processed=${llmItems.length} approved=${totalApproved} ` +
    `rejected=${totalRejected} tokens=${totalInputTokens + totalOutputTokens} ` +
    `cost=$${totalCost.toFixed(6)}`
  );

  // Clean up pipeline decisions older than 30 days (hard delete)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cleaned = db.delete(pipelineDecisions)
    .where(lt(pipelineDecisions.decidedAt, thirtyDaysAgo))
    .run();
  if (cleaned.changes > 0) {
    console.log(`[pipeline] Cleaned up ${cleaned.changes} pipeline decisions older than 30 days`);
  }
}
