/**
 * Events Command
 *
 * CLI command for viewing stored events for a wallet
 */

import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import type { EventRepository } from "@/db/repositories/event-repository";
import type { WalletEvent } from "@/types/core";
import { validateWalletAddress } from "@/validation/validators";
import {
  formatWalletAddress,
  formatTimestamp,
  formatEventChange,
  truncateTitle,
} from "./utils/format";
import { formatError } from "./utils/errors";

/**
 * Command options
 */
interface EventsCommandOptions {
  limit?: string;
  verbose?: boolean;
}

/**
 * Creates the events command
 *
 * @param eventRepository - Event repository instance
 * @returns Commander command
 */
export function createEventsCommand(eventRepository: EventRepository): Command {
  return new Command("events")
    .description("List events for a wallet")
    .argument("<wallet>", "Wallet address")
    .option("-l, --limit <number>", "Limit number of events", "50")
    .option("-v, --verbose", "Show detailed event data")
    .action(async (wallet: string, options: EventsCommandOptions) => {
      await handleEventsCommand(wallet, options, eventRepository);
    });
}

/**
 * Handles the events command execution
 *
 * @param wallet - Wallet address
 * @param options - Command options
 * @param eventRepository - Event repository instance
 */
async function handleEventsCommand(
  wallet: string,
  options: EventsCommandOptions,
  eventRepository: EventRepository,
): Promise<void> {
  try {
    // Validate wallet address
    validateWalletAddress(wallet);

    // Parse and validate limit
    const limit = parseInt(options.limit ?? "50", 10);
    if (isNaN(limit) || limit <= 0) {
      console.error(chalk.red("✗ Error: Invalid limit value"));
      console.error("");
      console.error(chalk.gray("  Limit must be a positive number."));
      console.error(chalk.gray("  Example: --limit 100"));
      console.error("");
      process.exit(1);
    }

    // Query events
    const events = await eventRepository.getByWallet(wallet, limit);

    // Display results
    if (events.length === 0) {
      displayEmptyResults(wallet);
    } else {
      displayEvents(wallet, events, limit, options.verbose ?? false);
    }

    // Exit with success
    process.exit(0);
  } catch (error) {
    // Display formatted error
    console.error("\n" + formatError(error));

    // Exit with error code
    process.exit(1);
  }
}

/**
 * Displays events in table format
 *
 * @param wallet - Wallet address
 * @param events - Events to display
 * @param limit - Limit applied
 * @param verbose - Whether to show verbose output
 */
function displayEvents(
  wallet: string,
  events: WalletEvent[],
  limit: number,
  verbose: boolean,
): void {
  const formattedWallet = formatWalletAddress(wallet);

  // Display header
  console.log("");
  console.log(
    chalk.white(
      `Events for wallet ${formattedWallet} (showing ${events.length}${events.length === limit ? " of possibly more" : ""})`,
    ),
  );
  console.log("");

  if (verbose) {
    displayVerboseEvents(events);
  } else {
    displayStandardEvents(events);
  }

  console.log("");
}

/**
 * Displays events in standard table format
 *
 * @param events - Events to display
 */
function displayStandardEvents(events: WalletEvent[]): void {
  const table = new Table({
    head: ["Time", "Event Type", "Market", "Change"],
    colWidths: [21, 18, 40, 35],
    style: {
      head: ["cyan"],
    },
  });

  events.forEach((event) => {
    table.push([
      formatTimestamp(event.timestamp),
      event.eventType,
      truncateTitle(event.marketTitle, 37),
      formatEventChange(event),
    ]);
  });

  console.log(table.toString());
}

/**
 * Displays events in verbose format
 *
 * @param events - Events to display
 */
function displayVerboseEvents(events: WalletEvent[]): void {
  events.forEach((event, index) => {
    console.log(chalk.cyan(`Event #${index + 1}: ${event.eventType}`));
    console.log(chalk.gray(`Time: ${formatTimestamp(event.timestamp)}`));
    console.log(chalk.gray(`Market: ${event.marketTitle} (${event.marketId})`));
    console.log("");

    // Create before/after comparison table
    const table = new Table({
      head: ["Field", "Before", "After"],
      colWidths: [22, 20, 20],
      style: {
        head: ["cyan"],
      },
    });

    // Add YES shares row
    table.push([
      "YES shares",
      event.prevYesShares !== null ? event.prevYesShares.toString() : "-",
      event.currYesShares !== null ? event.currYesShares.toString() : "-",
    ]);

    // Add YES avg price row
    table.push([
      "YES avg price",
      event.prevYesAvgPrice !== null
        ? `$${event.prevYesAvgPrice.toFixed(2)}`
        : "-",
      event.currYesAvgPrice !== null
        ? `$${event.currYesAvgPrice.toFixed(2)}`
        : "-",
    ]);

    // Add NO shares row
    table.push([
      "NO shares",
      event.prevNoShares !== null ? event.prevNoShares.toString() : "-",
      event.currNoShares !== null ? event.currNoShares.toString() : "-",
    ]);

    // Add NO avg price row
    table.push([
      "NO avg price",
      event.prevNoAvgPrice !== null
        ? `$${event.prevNoAvgPrice.toFixed(2)}`
        : "-",
      event.currNoAvgPrice !== null
        ? `$${event.currNoAvgPrice.toFixed(2)}`
        : "-",
    ]);

    console.log(table.toString());

    // Show resolution info if applicable
    if (event.resolvedOutcome !== "unresolved") {
      console.log("");
      console.log(
        chalk.yellow(
          `Resolved: ${event.resolvedOutcome.toUpperCase()}${event.pnl !== undefined ? ` | PnL: ${event.pnl >= 0 ? "+" : ""}$${event.pnl.toFixed(2)}` : ""}`,
        ),
      );
    }

    console.log("");
    console.log(chalk.gray("---"));
    console.log("");
  });
}

/**
 * Displays empty results message
 *
 * @param wallet - Wallet address
 */
function displayEmptyResults(wallet: string): void {
  const formattedWallet = formatWalletAddress(wallet);

  console.log("");
  console.log(chalk.yellow(`No events found for wallet ${formattedWallet}`));
  console.log("");
  console.log(
    chalk.gray(
      "This wallet has not been snapshotted yet, or has had no position changes.",
    ),
  );
  console.log("");
  console.log(
    chalk.gray(`Run: npx polymarket-cli snapshot ${formattedWallet}`),
  );
  console.log("");
}
