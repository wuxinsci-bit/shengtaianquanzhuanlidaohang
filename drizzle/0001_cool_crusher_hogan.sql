CREATE TABLE `catalog_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `patents` ADD `classification_confidence` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `patents` ADD `classification_basis` text DEFAULT '待分类复核' NOT NULL;