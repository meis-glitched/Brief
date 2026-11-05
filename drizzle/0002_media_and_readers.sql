CREATE TABLE `article_content` (
	`article_id` integer PRIMARY KEY NOT NULL,
	`blocks` text NOT NULL,
	`text` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'full' NOT NULL,
	`fetched_at` integer NOT NULL,
	`error` text,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_content_fetched_idx` ON `article_content` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `wiki_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`file_title` text NOT NULL,
	`url` text NOT NULL,
	`thumb_url` text,
	`width` integer,
	`height` integer,
	`caption` text,
	`artist` text,
	`license` text,
	`license_url` text,
	`file_page_url` text,
	`non_free` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `wiki_pages`(`page_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_images_page_file_idx` ON `wiki_images` (`page_id`,`file_title`);--> statement-breakpoint
CREATE INDEX `wiki_images_page_idx` ON `wiki_images` (`page_id`);--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`page_id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`extract` text,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`lead_image_url` text,
	`lead_image_width` integer,
	`lead_image_height` integer,
	`lead_image_license` text,
	`lead_image_license_url` text,
	`lead_image_artist` text,
	`lead_image_file_page` text,
	`lead_image_non_free` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_title_idx` ON `wiki_pages` (`title`);--> statement-breakpoint
CREATE INDEX `wiki_pages_fetched_idx` ON `wiki_pages` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `wiki_searches` (
	`query` text PRIMARY KEY NOT NULL,
	`results` text NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wiki_searches_fetched_idx` ON `wiki_searches` (`fetched_at`);--> statement-breakpoint
ALTER TABLE `articles` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `image_width` integer;--> statement-breakpoint
ALTER TABLE `articles` ADD `image_height` integer;--> statement-breakpoint
ALTER TABLE `articles` ADD `feed_content` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `resolved_url` text;