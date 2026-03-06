import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const contentItems = sqliteTable('content_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  normalizedUrl: text('normalized_url').notNull().unique(),
  title: text('title').notNull(),
  source: text('source').notNull(),                          // e.g., 'reddit'
  sourceDetail: text('source_detail').notNull(),             // e.g., 'r/bangtan'
  score: integer('score').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  flair: text('flair'),                                      // Reddit post flair
  contentType: text('content_type'),                         // Phase 7 LLM classification
  externalId: text('external_id').notNull(),                 // Reddit post ID for dedup/update
  // LEGAL NOTE: Stores external URL references only — never binary media or
  // base64 content. Do not modify this column to store media files or proxied
  // content without legal review.
  thumbnailUrl: text('thumbnail_url'),                       // Hotlinked image URL
  engagementStats: text('engagement_stats'),                 // JSON string, e.g., {"upvotes":42,"comments":5}
  moderationStatus: text('moderation_status').notNull().default('raw'),
    // 'raw' | 'pending' | 'approved' | 'rejected'
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),   // Soft delete timestamp
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_source').on(table.source),
  index('idx_scraped_at').on(table.scrapedAt),
  index('idx_published_at').on(table.publishedAt),
  index('idx_source_detail').on(table.sourceDetail),
  index('idx_deleted_at').on(table.deletedAt),
  index('idx_moderation_status').on(table.moderationStatus),
]);

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

export const scrapeRuns = sqliteTable('scrape_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  sourceDetail: text('source_detail'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  itemsFound: integer('items_found').default(0),
  itemsNew: integer('items_new').default(0),
  itemsUpdated: integer('items_updated').default(0),
  status: text('status').notNull().default('running'),       // 'running' | 'success' | 'empty' | 'error'
  error: text('error'),
  duration: integer('duration'),                             // Milliseconds
  errorStack: text('error_stack'),                           // Full stack trace on failure
});
