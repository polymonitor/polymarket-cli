#!/usr/bin/env tsx

import { Command } from "commander";
import chalk from "chalk";
import { db } from "@/db/client";
import { createRepositories } from "@/db/repositories";
import { PolymarketAPI } from "@/api";
import { SnapshotService } from "@/services";
import { createSnapshotCommand } from "@/commands/snapshot";
import { createEventsCommand } from "@/commands/events";
import { createStatusCommand } from "@/commands/status";
import { config } from "@/config";
import { logger } from "@/utils/logger";

/**
 * Exit codes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  API_ERROR: 3,
  DATABASE_ERROR: 4,
} as const;

/**
 * Global error handlers
 * Catch unhandled promise rejections and uncaught exceptions
 */
process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    const errorMessage =
      reason instanceof Error ? reason.message : String(reason);
    logger.error("Unhandled promise rejection: " + errorMessage);

    console.error("");
    console.error(chalk.red("✗ An unexpected error occurred"));
    console.error(chalk.gray("  " + errorMessage));
    console.error("");
    console.error(chalk.gray("  This may be a bug. Please report this issue."));
    console.error("");

    process.exit(EXIT_CODES.GENERAL_ERROR);
  },
);

process.on("uncaughtException", (error: Error) => {
  logger.error(
    "Uncaught exception: " + error.message + " | Stack: " + error.stack,
  );

  console.error("");
  console.error(chalk.red("✗ A critical error occurred"));
  console.error(chalk.gray("  " + error.message));
  console.error("");
  console.error(chalk.gray("  This may be a bug. Please report this issue."));
  console.error("");

  process.exit(EXIT_CODES.GENERAL_ERROR);
});

/**
 * Handle process termination signals gracefully
 */
process.on("SIGINT", () => {
  console.log("");
  console.log(chalk.yellow("Operation cancelled by user"));
  console.log("");
  process.exit(EXIT_CODES.SUCCESS);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM signal, shutting down gracefully");
  process.exit(EXIT_CODES.SUCCESS);
});

// Initialize dependencies
const repositories = createRepositories(db);
const polymarketAPI = new PolymarketAPI({
  dataApiUrl: config.polymarket.dataApiUrl,
  gammaApiUrl: config.polymarket.gammaApiUrl,
});
const snapshotService = new SnapshotService(polymarketAPI, repositories);

// Create CLI program
const program = new Command();

program
  .name("polymarket-cli")
  .description("CLI tool for monitoring Polymarket wallets")
  .version("1.0.0")
  .addHelpText(
    "after",
    `
For more information and to report issues:
  https://github.com/polymarket/polymarket-cli

Exit Codes:
  0 - Success
  1 - General error
  2 - Invalid arguments
  3 - API error
  4 - Database error
`,
  );

// Register commands
program.addCommand(createSnapshotCommand(snapshotService));
program.addCommand(createEventsCommand(repositories.events));
program.addCommand(createStatusCommand(repositories, db));

program.parse();
