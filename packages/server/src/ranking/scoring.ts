/**
 * Multi-signal blend score computation.
 *
 * Combines recency, normalized engagement, content type variety, and source
 * diversity into a single blend score. Supports a boost factor multiplier
 * for priority accounts (e.g., fan translation sources).
 */

/** Minimum item shape needed for scoring. */
export interface ScorableItem {
  source: string;
  contentType: string | null;
  publishedAt: Date | number;
}

/** Blend weights -- sum to 1.0 for the base signals. */
const WEIGHTS = {
  recency: 0.40,
  engagement: 0.35,
  contentTypeVariety: 0.10,
  sourceDiversity: 0.15,
} as const;

/**
 * Recency score via exponential decay.
 * ~0.47 at 6 hours, ~0.05 at 24 hours.
 * Tuned so 6h-old content drops noticeably per user decision.
 */
function recencyScore(publishedMs: number, now: number): number {
  const ageHours = (now - publishedMs) / (1000 * 60 * 60);
  if (ageHours < 0) return 1.0; // Future dates get max recency
  return Math.exp(-ageHours / 8);
}

/**
 * Content type variety bonus: items of rare content types in the batch
 * score higher to promote variety. Null content types get 0.5.
 */
function contentTypeVarietyScore(
  contentType: string | null,
  typeCounts: Map<string, number>,
  totalItems: number,
): number {
  if (!contentType || totalItems === 0) return 0.5;
  const count = typeCounts.get(contentType) ?? 1;
  return 1 - (count / totalItems);
}

/**
 * Source diversity bonus: items from underrepresented sources score higher.
 */
function sourceDiversityScore(
  source: string,
  sourceCounts: Map<string, number>,
  totalItems: number,
): number {
  if (totalItems === 0) return 0.5;
  const count = sourceCounts.get(source) ?? 1;
  return 1 - (count / totalItems);
}

/**
 * Compute the blend score for a single item.
 *
 * @param item - The item to score
 * @param engagementPercentile - Pre-computed 0-1 percentile from normalizeEngagement()
 * @param typeCounts - Map of contentType -> count in the batch
 * @param sourceCounts - Map of source -> count in the batch
 * @param totalItems - Total items in the batch
 * @param now - Current time in milliseconds
 * @param boostFactor - Multiplier for priority accounts (default 1.0)
 * @returns Blend score (higher = ranked higher)
 */
export function computeBlendScore(
  item: ScorableItem,
  engagementPercentile: number,
  typeCounts: Map<string, number>,
  sourceCounts: Map<string, number>,
  totalItems: number,
  now: number,
  boostFactor: number = 1.0,
): number {
  // Normalize publishedAt to milliseconds -- Drizzle may return Date or epoch seconds
  const publishedMs = item.publishedAt instanceof Date
    ? item.publishedAt.getTime()
    : (item.publishedAt as number) * 1000;

  const r = recencyScore(publishedMs, now);
  const e = engagementPercentile;
  const ct = contentTypeVarietyScore(item.contentType, typeCounts, totalItems);
  const sd = sourceDiversityScore(item.source, sourceCounts, totalItems);

  const baseScore =
    WEIGHTS.recency * r +
    WEIGHTS.engagement * e +
    WEIGHTS.contentTypeVariety * ct +
    WEIGHTS.sourceDiversity * sd;

  return baseScore * boostFactor;
}
