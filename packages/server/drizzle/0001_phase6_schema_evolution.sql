ALTER TABLE `content_items` ADD COLUMN `thumbnail_url` text;
--> statement-breakpoint
ALTER TABLE `content_items` ADD COLUMN `engagement_stats` text;
--> statement-breakpoint
ALTER TABLE `content_items` ADD COLUMN `deleted_at` integer;
--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `content_items` (`deleted_at`);
--> statement-breakpoint
ALTER TABLE `scrape_runs` ADD COLUMN `duration` integer;
--> statement-breakpoint
ALTER TABLE `scrape_runs` ADD COLUMN `error_stack` text;
