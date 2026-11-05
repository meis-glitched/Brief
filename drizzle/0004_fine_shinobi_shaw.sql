CREATE TABLE `source_ratings` (
	`source_id` text PRIMARY KEY NOT NULL,
	`bias` text DEFAULT 'unrated' NOT NULL,
	`bias_score` real,
	`confidence` text DEFAULT 'none' NOT NULL,
	`ownership` text,
	`ownership_type` text,
	`country_code` text,
	`paywall` integer DEFAULT 0 NOT NULL,
	`source_type` text,
	`provider` text DEFAULT 'AllSides' NOT NULL,
	`provider_url` text,
	`license` text,
	`notes` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_ratings_bias_idx` ON `source_ratings` (`bias`);