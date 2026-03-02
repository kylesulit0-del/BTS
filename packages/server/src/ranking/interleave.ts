/**
 * Post-sort diversity interleaving.
 *
 * Reorders a scored-and-sorted list so no more than `maxConsecutive` items
 * from the same source appear in a row. Preserves relative score ordering
 * as much as possible.
 */

/** Minimum item shape for interleaving. */
export interface InterleavableItem {
  source: string;
  blendScore: number;
}

/**
 * Reorder items so no more than maxConsecutive items from the same source
 * appear consecutively. Items are expected to already be sorted by blendScore
 * descending. The algorithm picks the highest-scored item that doesn't violate
 * the consecutive constraint; if no such item exists, it appends the next item
 * anyway (graceful degradation).
 *
 * @param items - Items sorted by blendScore descending
 * @param maxConsecutive - Max allowed consecutive items from same source (default 2)
 * @returns Reordered items respecting the diversity constraint
 */
export function interleaveBySource<T extends InterleavableItem>(
  items: T[],
  maxConsecutive: number = 2,
): T[] {
  if (items.length <= maxConsecutive) return [...items];

  const result: T[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    // Count consecutive items from same source at end of result
    let consecutiveCount = 0;
    const lastSource = result.length > 0 ? result[result.length - 1].source : null;

    if (lastSource) {
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].source === lastSource) {
          consecutiveCount++;
        } else {
          break;
        }
      }
    }

    if (consecutiveCount >= maxConsecutive && lastSource) {
      // Find the highest-scored item from a different source
      const idx = remaining.findIndex(item => item.source !== lastSource);
      if (idx >= 0) {
        result.push(remaining.splice(idx, 1)[0]);
      } else {
        // All remaining items are same source; just append (graceful degradation)
        result.push(remaining.shift()!);
      }
    } else {
      result.push(remaining.shift()!);
    }
  }

  return result;
}
