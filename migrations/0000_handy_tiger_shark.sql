CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet` text NOT NULL,
	`event_type` text NOT NULL,
	`market_id` text NOT NULL,
	`market_title` text NOT NULL,
	`snapshot_id` integer NOT NULL,
	`prev_yes_shares` real,
	`prev_no_shares` real,
	`prev_yes_avg_price` real,
	`prev_no_avg_price` real,
	`curr_yes_shares` real,
	`curr_no_shares` real,
	`curr_yes_avg_price` real,
	`curr_no_avg_price` real,
	`resolved_outcome` text,
	`pnl` real,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wallet` text NOT NULL,
	`snapshot_data` text NOT NULL,
	`timestamp` text NOT NULL,
	`prev_snapshot_id` integer,
	FOREIGN KEY (`prev_snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
