/**
 * Budget tracking and enforcement for the LLM moderation pipeline.
 *
 * Tracks daily/monthly spend from pipeline_runs and enforces configurable
 * budget limits via env vars. When budgets are exceeded, the pipeline
 * falls back to rule-based processing.
 */

import { sql, gte, and } from 'drizzle-orm';
import { pipelineRuns } from '../db/schema.js';
import type { Db } from '../db/index.js';

/**
 * Returns the total estimated cost for pipeline runs on a given date (YYYY-MM-DD).
 */
export function getDailySpend(db: Db, date: string): number {
  // Parse date to get start/end timestamps (UTC)
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const result = db
    .select({ total: sql<string>`coalesce(sum(cast(${pipelineRuns.estimatedCost} as real)), 0)` })
    .from(pipelineRuns)
    .where(
      and(
        gte(pipelineRuns.startedAt, dayStart),
        sql`${pipelineRuns.startedAt} <= ${dayEnd}`
      )
    )
    .get();

  return parseFloat(result?.total ?? '0');
}

/**
 * Returns the total estimated cost for pipeline runs in the current calendar month.
 */
export function getMonthlySpend(db: Db): number {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const result = db
    .select({ total: sql<string>`coalesce(sum(cast(${pipelineRuns.estimatedCost} as real)), 0)` })
    .from(pipelineRuns)
    .where(gte(pipelineRuns.startedAt, monthStart))
    .get();

  return parseFloat(result?.total ?? '0');
}

/**
 * Checks whether the pipeline should use fallback mode based on budget limits.
 *
 * Reads LLM_DAILY_BUDGET (default $1.00) and LLM_MONTHLY_BUDGET (default $10.00)
 * from environment variables. Returns true if either limit is reached.
 */
export function shouldUseFallback(db: Db): boolean {
  const dailyLimit = parseFloat(process.env.LLM_DAILY_BUDGET || '1.00');
  const monthlyLimit = parseFloat(process.env.LLM_MONTHLY_BUDGET || '10.00');

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dailySpend = getDailySpend(db, today);
  const monthlySpend = getMonthlySpend(db);

  if (dailySpend >= dailyLimit) {
    console.log(`[pipeline] Daily budget exceeded: $${dailySpend.toFixed(4)} >= $${dailyLimit.toFixed(2)}`);
    return true;
  }
  if (monthlySpend >= monthlyLimit) {
    console.log(`[pipeline] Monthly budget exceeded: $${monthlySpend.toFixed(4)} >= $${monthlyLimit.toFixed(2)}`);
    return true;
  }

  return false;
}

/**
 * Records cost data for a completed pipeline run.
 */
export function recordCost(
  db: Db,
  runId: number,
  inputTokens: number,
  outputTokens: number,
  costPerInput: number,
  costPerOutput: number,
): void {
  const estimatedCost = (inputTokens * costPerInput) + (outputTokens * costPerOutput);

  db.update(pipelineRuns)
    .set({
      inputTokens,
      outputTokens,
      estimatedCost: estimatedCost.toFixed(6),
    })
    .where(sql`${pipelineRuns.id} = ${runId}`)
    .run();
}
