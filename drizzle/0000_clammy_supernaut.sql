CREATE TABLE `arcade_players` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`pseudo` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_players_token` ON `arcade_players` (`token_hash`);--> statement-breakpoint
CREATE TABLE `arcade_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`game_id` text NOT NULL,
	`level_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`ticks` integer,
	`score` integer,
	`secrets` integer,
	FOREIGN KEY (`player_id`) REFERENCES `arcade_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_runs_player_game_level` ON `arcade_runs` (`player_id`,`game_id`,`level_id`);--> statement-breakpoint
CREATE INDEX `idx_runs_leaderboard` ON `arcade_runs` (`game_id`,`level_id`,`score`);--> statement-breakpoint
CREATE INDEX `idx_runs_player_started` ON `arcade_runs` (`player_id`,`started_at`);