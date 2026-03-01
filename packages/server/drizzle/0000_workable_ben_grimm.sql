CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`source_detail` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`flair` text,
	`content_type` text,
	`external_id` text NOT NULL,
	`published_at` integer NOT NULL,
	`scraped_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_normalized_url_unique` ON `content_items` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `content_items` (`source`);--> statement-breakpoint
CREATE INDEX `idx_scraped_at` ON `content_items` (`scraped_at`);--> statement-breakpoint
CREATE INDEX `idx_published_at` ON `content_items` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_source_detail` ON `content_items` (`source_detail`);--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`source_detail` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`items_found` integer DEFAULT 0,
	`items_new` integer DEFAULT 0,
	`items_updated` integer DEFAULT 0,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text
);
