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
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_source').on(table.source),
  index('idx_scraped_at').on(table.scrapedAt),
  index('idx_published_at').on(table.publishedAt),
  index('idx_source_detail').on(table.sourceDetail),
]);

export const scrapeRuns = sqliteTable('scrape_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  sourceDetail: text('source_detail'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  itemsFound: integer('items_found').default(0),
  itemsNew: integer('items_new').default(0),
  itemsUpdated: integer('items_updated').default(0),
  status: text('status').notNull().default('running'),       // 'running' | 'success' | 'error'
  error: text('error'),
});
