/**
 * Snapshot Command
 *
 * CLI command for manually triggering wallet snapshots
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import type { SnapshotService } from "@/services/snapshot-service";
import type { WalletEvent } from "@/types/core";
import {
  formatWalletAddress,
  formatEventSummary,
  getEventIcon,
  createEventTable,
  truncateTitle,
} from "./utils/format";
import { formatError } from "./utils/errors";

/**
 * Command options
 */
interface SnapshotCommandOptions {
  verbose?: boolean;
}

/**
 * Creates the snapshot command
 *
 * @param snapshotService - Snapshot service instance
 * @returns Commander command
 */
export function createSnapshotCommand(
  snapshotService: SnapshotService,
): Command {
  return new Command("snapshot")
    .description("Take a snapshot of a wallet")
    .argument("<wallet>", "Wallet address to snapshot")
    .option("-v, --verbose", "Show detailed output")
    .action(async (wallet: string, options: SnapshotCommandOptions) => {
      await handleSnapshotCommand(wallet, options, snapshotService);
    });
}

/**
 * Handles the snapshot command execution
 *
 * @param wallet - Wallet address
 * @param options - Command options
 * @param snapshotService - Snapshot service instance
 */
async function handleSnapshotCommand(
  wallet: string,
  options: SnapshotCommandOptions,
  snapshotService: SnapshotService,
): Promise<void> {
  const spinner = ora("Fetching wallet positions...").start();

  try {
    // Call the snapshot service
    const result = await snapshotService.takeSnapshot(wallet);

    // Stop spinner
    spinner.stop();

    // Display results based on outcome
    displayResults(wallet, result, options.verbose ?? false);

    // Exit with success
    process.exit(0);
  } catch (error) {
    // Stop spinner on error
    spinner.stop();

    // Display formatted error
    console.error("\n" + formatError(error));

    // Exit with error code
    process.exit(1);
  }
}

/**
 * Displays the results of a snapshot
 *
 * @param wallet - Wallet address
 * @param result - Snapshot result
 * @param verbose - Whether to show verbose output
 */
function displayResults(
  wallet: string,
  result: {
    events: WalletEvent[];
    isFirstSnapshot: boolean;
    saved: boolean;
  },
  verbose: boolean,
): void {
  const formattedWallet = formatWalletAddress(wallet);

  // Scenario 1: Events generated
  if (result.events.length > 0) {
    console.log(chalk.green(`✓ Snapshot taken for ${formattedWallet}`));
    console.log("");
    console.log(
      chalk.white(
        `Generated ${result.events.length} event${result.events.length === 1 ? "" : "s"}:`,
      ),
    );

    result.events.forEach((event) => {
      if (verbose) {
        console.log("");
        console.log(chalk.cyan(`Event: ${event.eventType}`));
        console.log(createEventTable(event));
      } else {
        const icon = getEventIcon(event.eventType);
        const summary = formatEventSummary(event);
        const title = truncateTitle(event.marketTitle);
        console.log(
          chalk.white(
            `  ${icon} ${chalk.bold(event.eventType.padEnd(18))} ${title.padEnd(52)} ${summary}`,
          ),
        );
      }
    });

    console.log("");
    return;
  }

  // Scenario 2: First snapshot
  if (result.isFirstSnapshot) {
    console.log(chalk.cyan(`✓ Initial snapshot taken for ${formattedWallet}`));
    console.log("");
    console.log(chalk.gray("No events generated (first snapshot)."));
    console.log("");
    return;
  }

  // Scenario 3: No changes
  console.log(chalk.blue(`✓ No changes detected for ${formattedWallet}`));
  console.log("");
  console.log(chalk.gray("Wallet positions unchanged since last snapshot."));
  console.log(chalk.gray("Snapshot not saved."));
  console.log("");
}
