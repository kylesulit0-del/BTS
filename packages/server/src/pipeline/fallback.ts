/**
 * Fallback mode logic for the LLM moderation pipeline.
 *
 * When the LLM is unavailable or budget is exceeded, this module
 * determines which items to auto-approve vs queue based on whether
 * the source is BTS-focused (needsFilter: false) or broad (needsFilter: true).
 */

import { eq } from 'drizzle-orm';
import { contentItems } from '../db/schema.js';
import { getBtsScrapingConfig } from '@bts/shared/config/sources.js';
import type { Db } from '../db/index.js';

// Build a lookup Set of sourceDetail values where needsFilter === false
// These are BTS-dedicated sources that can be auto-approved without LLM classification
const config = getBtsScrapingConfig();
const btsFocusedSources = new Set<string>(
  config.sources
    .filter((s) => !s.needsFilter)
    .map((s) => s.label)
);

/**
 * Handles items in fallback mode (no LLM available).
 *
 * - BTS-focused sources (needsFilter=false): auto-approved
 * - Broad sources (needsFilter=true): queued as 'pending' until LLM available
 */
export function handleFallback(
  db: Db,
  items: { id: number; sourceDetail: string }[],
): void {
  let autoApproved = 0;
  let queued = 0;

  for (const item of items) {
    if (btsFocusedSources.has(item.sourceDetail)) {
      // BTS-focused source: auto-approve without classification
      db.update(contentItems)
        .set({
          moderationStatus: 'approved',
          moderatedAt: new Date(),
        })
        .where(eq(contentItems.id, item.id))
        .run();
      autoApproved++;
    } else {
      // Broad source: queue as pending until LLM is available
      db.update(contentItems)
        .set({ moderationStatus: 'pending' })
        .where(eq(contentItems.id, item.id))
        .run();
      queued++;
    }
  }

  console.log(`[pipeline] Fallback mode: auto-approved=${autoApproved} queued=${queued}`);
}
