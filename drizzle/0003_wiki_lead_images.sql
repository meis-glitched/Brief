CREATE TABLE `wiki_lead_images` (
	`title` text PRIMARY KEY NOT NULL,
	`page_id` integer,
	`image_url` text NOT NULL,
	`width` integer,
	`height` integer,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wiki_lead_images_fetched_idx` ON `wiki_lead_images` (`fetched_at`);