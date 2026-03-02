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
import { getProvider } from './provider.js';
import { BatchResultSchema } from './schemas.js';
import { buildBatchPrompt } from './prompts.js';
import { shouldUseFallback, recordCost } from './budget.js';
import { handleFallback } from './fallback.js';
import type { Db } from '../db/index.js';

const BATCH_SIZE = 15;
const MAX_ITEMS_PER_RUN = BATCH_SIZE * 5; // 75 items per pipeline run

/**
 * Run the LLM moderation pipeline on raw content items.
 *
 * 1. Check budget -- fallback mode if exceeded
 * 2. Select raw items and atomically mark as 'pending'
 * 3. Process in batches via LLM (relevance + safety + classification)
 * 4. Update items with decisions, track costs, clean up old decisions
 */
export async function runPipeline(db: Db): Promise<void> {
  // Check budget first
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

  // Atomically claim items by marking as 'pending' (prevents double-processing)
  const itemIds = rawItems.map((item) => item.id);
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

  let totalApproved = 0;
  let totalRejected = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Process in batches
  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);
    const batchItems = batch.map((item, idx) => ({
      index: idx,
      title: item.title,
      source: item.sourceDetail,
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
    `[pipeline] Complete: processed=${rawItems.length} approved=${totalApproved} ` +
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
