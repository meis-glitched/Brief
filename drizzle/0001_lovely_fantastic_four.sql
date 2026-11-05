CREATE TABLE `article_countries` (
	`article_id` integer NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	PRIMARY KEY(`article_id`, `country_code`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_countries_code_idx` ON `article_countries` (`country_code`);--> statement-breakpoint
CREATE TABLE `event_countries` (
	`event_id` integer NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	PRIMARY KEY(`event_id`, `country_code`),
	FOREIGN KEY (`event_id`) REFERENCES `historical_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_countries_code_idx` ON `event_countries` (`country_code`);--> statement-breakpoint
CREATE TABLE `historical_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`year` integer NOT NULL,
	`month` integer,
	`day` integer,
	`date_text` text,
	`sort_key` integer NOT NULL,
	`kind` text DEFAULT 'event' NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `historical_events_external_idx` ON `historical_events` (`external_id`);--> statement-breakpoint
CREATE INDEX `historical_events_sort_idx` ON `historical_events` (`sort_key`);--> statement-breakpoint
CREATE INDEX `historical_events_year_idx` ON `historical_events` (`year`);--> statement-breakpoint
CREATE INDEX `historical_events_kind_idx` ON `historical_events` (`kind`);