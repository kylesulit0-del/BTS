/**
 * Feed ranking orchestrator.
 *
 * Pipeline: normalize engagement -> compute blend scores -> sort -> interleave.
 * Produces a ranked, diversity-enforced feed from raw DB items.
 */

import { normalizeEngagement } from './normalize.js';
import { computeBlendScore } from './scoring.js';
import { interleaveBySource } from './interleave.js';

/** Minimum item shape required for the full ranking pipeline. */
export interface RankableItem {
  id: number;
  source: string;
  sourceDetail: string;
  contentType: string | null;
  engagementStats: Record<string, number> | null;
  publishedAt: Date | number;
  [key: string]: unknown;
}

/**
 * Rank a list of feed items using multi-signal blend scoring with
 * diversity interleaving.
 *
 * @param items - Raw items from the database
 * @param boostMap - Map of sourceDetail (label) -> boost factor for priority accounts
 * @returns Items in ranked order with diversity constraints applied
 */
export function rankFeed<T extends RankableItem>(
  items: T[],
  boostMap: Map<string, number>,
): T[] {
  if (items.length === 0) return [];

  const now = Date.now();

  // Step 1: Normalize engagement (percentile within source)
  const engagementScores = normalizeEngagement(items);

  // Step 2: Compute distribution counts for variety/diversity signals
  const typeCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const item of items) {
    const typeKey = item.contentType ?? 'unknown';
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
  }

  // Step 3: Score each item
  const scored = items.map(item => ({
    item,
    blendScore: computeBlendScore(
      item,
      engagementScores.get(item.id) ?? 0.5,
      typeCounts,
      sourceCounts,
      items.length,
      now,
      boostMap.get(item.sourceDetail) ?? 1.0,
    ),
    source: item.source,
    contentType: item.contentType,
    id: item.id,
  }));

  // Step 4: Sort by blend score descending
  scored.sort((a, b) => b.blendScore - a.blendScore);

  // Step 5: Diversity interleaving (max 2 consecutive from same source)
  const interleaved = interleaveBySource(scored, 2);

  // Return original items in new order
  return interleaved.map(s => s.item);
}
