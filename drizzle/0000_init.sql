CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`source_id` text NOT NULL,
	`summary` text,
	`author` text,
	`published_at` integer,
	`fetched_at` integer NOT NULL,
	`content_hash` text,
	`story_id` integer,
	`read_at` integer,
	`saved_at` integer,
	`hidden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_idx` ON `articles` (`url`);--> statement-breakpoint
CREATE INDEX `articles_published_idx` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `articles_source_idx` ON `articles` (`source_id`);--> statement-breakpoint
CREATE INDEX `articles_story_idx` ON `articles` (`story_id`);--> statement-breakpoint
CREATE INDEX `articles_saved_idx` ON `articles` (`saved_at`);--> statement-breakpoint
CREATE TABLE `briefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`content` text NOT NULL,
	`model` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `briefs_date_idx` ON `briefs` (`date`);--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`inserted` integer DEFAULT 0 NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`errors` text
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`homepage` text NOT NULL,
	`feed_url` text,
	`html_url` text,
	`selectors` text,
	`gnews_query` text,
	`gnews_publishers` text,
	`limit` integer DEFAULT 25 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`last_fetched_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sources_enabled_idx` ON `sources` (`enabled`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`article_count` integer DEFAULT 0 NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stories_last_seen_idx` ON `stories` (`last_seen`);--> statement-breakpoint
CREATE INDEX `stories_score_idx` ON `stories` (`score`);