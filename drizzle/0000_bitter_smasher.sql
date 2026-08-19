CREATE TABLE `collection_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_name` text NOT NULL,
	`query_text` text NOT NULL,
	`status` text NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`unresolved_count` integer DEFAULT 0 NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`publication_number` text NOT NULL,
	`title` text NOT NULL,
	`applicant` text NOT NULL,
	`applicant_address` text DEFAULT '' NOT NULL,
	`abstract` text DEFAULT '' NOT NULL,
	`filing_date` text DEFAULT '' NOT NULL,
	`publication_date` text DEFAULT '' NOT NULL,
	`grant_date` text DEFAULT '' NOT NULL,
	`ipc` text DEFAULT '' NOT NULL,
	`legal_status` text DEFAULT '' NOT NULL,
	`eco_domain` text NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '待解析' NOT NULL,
	`city_adcode` text DEFAULT '' NOT NULL,
	`latitude` real,
	`longitude` real,
	`location_source` text DEFAULT '未解析' NOT NULL,
	`location_confidence` real DEFAULT 0 NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`source_query` text DEFAULT '' NOT NULL,
	`data_quality` text DEFAULT '待核验' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_patents_publication_number` ON `patents` (`publication_number`);--> statement-breakpoint
CREATE INDEX `idx_patents_domain_city` ON `patents` (`eco_domain`,`city`);--> statement-breakpoint
CREATE INDEX `idx_patents_publication_date` ON `patents` (`publication_date`);