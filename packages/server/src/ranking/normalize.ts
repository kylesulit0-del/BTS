/**
 * Per-source percentile engagement normalization.
 *
 * Converts raw engagement metrics (upvotes, views, notes, likes) to a 0-1
 * percentile score relative to other items from the same source in the batch.
 * Items with no engagement data (RSS/news) receive a neutral 0.5 score.
 */

/** Minimum item shape needed for normalization. */
export interface NormalizableItem {
  id: number;
  source: string;
  engagementStats: Record<string, number> | null;
}

/** Primary engagement metric per source type. */
const PRIMARY_METRIC: Record<string, string> = {
  reddit: 'upvotes',
  youtube: 'views',
  tumblr: 'notes',
  twitter: 'likes',
  bluesky: 'likes',
};

/** Extract the primary engagement value for a source. Returns null for RSS/unknown. */
function getPrimaryEngagement(item: NormalizableItem): number | null {
  if (!item.engagementStats) return null;
  const metric = PRIMARY_METRIC[item.source];
  if (!metric) return null;
  return item.engagementStats[metric] ?? null;
}

/**
 * Assign percentile rank (0-1) within each source group.
 *
 * - Items with engagement data are ranked within their source group.
 * - Percentile = position / (count - 1), or 0.5 if only 1 item in group.
 * - Items with no engagement data (RSS, unknown sources) get 0.5 (neutral).
 *
 * @returns Map of item.id -> normalized engagement score (0-1)
 */
export function normalizeEngagement(items: NormalizableItem[]): Map<number, number> {
  const scores = new Map<number, number>();

  // Group by source
  const groups = new Map<string, NormalizableItem[]>();
  for (const item of items) {
    const group = groups.get(item.source) ?? [];
    group.push(item);
    groups.set(item.source, group);
  }

  for (const [_source, group] of groups) {
    const withEngagement = group
      .map(item => ({ item, value: getPrimaryEngagement(item) }))
      .filter((e): e is { item: NormalizableItem; value: number } => e.value !== null);

    if (withEngagement.length === 0) {
      // No engagement data for this source (e.g., RSS) -- all get 0.5
      for (const item of group) {
        scores.set(item.id, 0.5);
      }
      continue;
    }

    // Sort by engagement value ascending
    withEngagement.sort((a, b) => a.value - b.value);

    // Assign percentile rank: position / (count - 1), or 0.5 if only 1 item
    const count = withEngagement.length;
    for (let i = 0; i < count; i++) {
      const percentile = count > 1 ? i / (count - 1) : 0.5;
      scores.set(withEngagement[i].item.id, percentile);
    }

    // Items in this source group with null engagement get 0.5
    for (const item of group) {
      if (!scores.has(item.id)) {
        scores.set(item.id, 0.5);
      }
    }
  }

  return scores;
}
