ALTER TABLE `content_items` ADD COLUMN `moderation_status` text DEFAULT 'raw' NOT NULL;
--> statement-breakpoint
ALTER TABLE `content_items` ADD COLUMN `moderated_at` integer;
--> statement-breakpoint
CREATE INDEX `idx_moderation_status` ON `content_items` (`moderation_status`);
--> statement-breakpoint
UPDATE `content_items` SET `moderation_status` = 'approved' WHERE `moderation_status` = 'raw';
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`items_processed` integer DEFAULT 0,
	`items_approved` integer DEFAULT 0,
	`items_rejected` integer DEFAULT 0,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`estimated_cost` text,
	`provider` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text,
	`fallback_mode` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `pipeline_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_item_id` integer NOT NULL,
	`run_id` integer NOT NULL,
	`relevant` integer NOT NULL,
	`safe` integer NOT NULL,
	`content_type` text,
	`decision` text NOT NULL,
	`decided_at` integer NOT NULL
);
