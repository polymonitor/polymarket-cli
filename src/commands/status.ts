/**
 * Status Command
 *
 * CLI command for displaying system statistics and status
 */

import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { existsSync, statSync } from "fs";
import { count, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Repositories } from "@/db/repositories";
import * as schema from "@/db/schema";
import { snapshots, events } from "@/db/schema";
import { config } from "@/config";
import {
  formatFileSize,
  formatNumberWithCommas,
  formatWalletAddress,
  formatTimestamp,
  formatAverage,
} from "./utils/format";
import { formatError } from "./utils/errors";

/**
 * Interface for wallet statistics
 */
interface WalletStats {
  wallet: string;
  snapshotCount: number;
  lastSnapshot: string;
}

/**
 * Interface for system statistics
 */
interface SystemStats {
  totalSnapshots: number;
  totalEvents: number;
  uniqueWallets: number;
  walletStats: WalletStats[];
}

/**
 * Creates the status command
 *
 * @param repos - Repositories instance
 * @param db - Database instance
 * @returns Commander command
 */
export function createStatusCommand(
  repos: Repositories,
  db: BetterSQLite3Database<typeof schema>,
): Command {
  return new Command("status")
    .description("Show system status and statistics")
    .action(async () => {
      await handleStatusCommand(repos, db);
    });
}

/**
 * Handles the status command execution
 *
 * @param repos - Repositories instance
 * @param db - Database instance
 */
async function handleStatusCommand(
  repos: Repositories,
  db: BetterSQLite3Database<typeof schema>,
): Promise<void> {
  try {
    // Check database connection
    const isConnected = await checkDatabaseConnection(db);
    if (!isConnected) {
      displayDatabaseError();
      process.exit(1);
    }

    // Get database file info
    const dbPath = config.database.path;
    const dbSize = getDatabaseSize(dbPath);

    // Get system statistics
    const stats = await getSystemStatistics(db);

    // Display output
    if (stats.totalSnapshots === 0) {
      displayEmptyDatabase(dbPath, dbSize);
    } else {
      displaySystemStatus(dbPath, dbSize, stats);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n" + formatError(error));
    process.exit(1);
  }
}

/**
 * Checks if database connection is working
 *
 * @param db - Database instance
 * @returns True if connected, false otherwise
 */
async function checkDatabaseConnection(
  db: BetterSQLite3Database<typeof schema>,
): Promise<boolean> {
  try {
    await db.select({ count: count() }).from(snapshots);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the database file size
 *
 * @param dbPath - Database file path
 * @returns File size in bytes
 */
function getDatabaseSize(dbPath: string): number {
  if (!existsSync(dbPath)) {
    return 0;
  }
  const stats = statSync(dbPath);
  return stats.size;
}

/**
 * Retrieves system statistics from database
 *
 * @param db - Database instance
 * @returns System statistics
 */
async function getSystemStatistics(
  db: BetterSQLite3Database<typeof schema>,
): Promise<SystemStats> {
  // Total snapshots
  const totalSnapshotsResult = await db
    .select({ count: count() })
    .from(snapshots);
  const totalSnapshots = totalSnapshotsResult[0]?.count ?? 0;

  // Total events
  const totalEventsResult = await db.select({ count: count() }).from(events);
  const totalEvents = totalEventsResult[0]?.count ?? 0;

  // Unique wallets
  const uniqueWalletsResult = await db
    .select({ wallet: snapshots.wallet })
    .from(snapshots)
    .groupBy(snapshots.wallet);
  const uniqueWallets = uniqueWalletsResult.length;

  // Per-wallet statistics
  const walletStatsResult = await db
    .select({
      wallet: snapshots.wallet,
      snapshotCount: count(),
      lastSnapshot: sql<string>`MAX(${snapshots.timestamp})`,
    })
    .from(snapshots)
    .groupBy(snapshots.wallet)
    .orderBy(sql`MAX(${snapshots.timestamp}) DESC`)
    .limit(10);

  const walletStats: WalletStats[] = walletStatsResult.map((row) => ({
    wallet: row.wallet,
    snapshotCount: row.snapshotCount,
    lastSnapshot: row.lastSnapshot,
  }));

  return {
    totalSnapshots,
    totalEvents,
    uniqueWallets,
    walletStats,
  };
}

/**
 * Displays system status with statistics
 *
 * @param dbPath - Database file path
 * @param dbSize - Database file size in bytes
 * @param stats - System statistics
 */
function displaySystemStatus(
  dbPath: string,
  dbSize: number,
  stats: SystemStats,
): void {
  console.log("");

  // System Status table
  console.log(chalk.white.bold("System Status"));
  const statusTable = new Table({
    colWidths: [25, 50],
    style: {
      head: [],
      border: ["gray"],
    },
  });

  statusTable.push(
    ["Database Path", dbPath],
    ["Database Size", formatFileSize(dbSize)],
    ["Database Status", chalk.green("✓ Connected")],
  );

  console.log(statusTable.toString());
  console.log("");

  // Overview statistics table
  console.log(chalk.white.bold("Overview"));
  const overviewTable = new Table({
    colWidths: [25, 50],
    style: {
      head: [],
      border: ["gray"],
    },
  });

  overviewTable.push(
    ["Total Snapshots", formatNumberWithCommas(stats.totalSnapshots)],
    ["Total Events", formatNumberWithCommas(stats.totalEvents)],
    ["Unique Wallets", formatNumberWithCommas(stats.uniqueWallets)],
    [
      "Events per Snapshot",
      formatAverage(stats.totalEvents, stats.totalSnapshots),
    ],
  );

  console.log(overviewTable.toString());
  console.log("");

  // Recent Activity table
  if (stats.walletStats.length > 0) {
    console.log(chalk.white.bold("Recent Activity"));
    const activityTable = new Table({
      head: [
        chalk.cyan("Wallet"),
        chalk.cyan("Snapshots"),
        chalk.cyan("Last Snapshot"),
      ],
      colWidths: [22, 15, 25],
      style: {
        head: [],
        border: ["gray"],
      },
    });

    stats.walletStats.forEach((walletStat) => {
      activityTable.push([
        formatWalletAddress(walletStat.wallet),
        formatNumberWithCommas(walletStat.snapshotCount),
        formatTimestamp(walletStat.lastSnapshot),
      ]);
    });

    console.log(activityTable.toString());
    console.log("");
  }
}

/**
 * Displays empty database message
 *
 * @param dbPath - Database file path
 * @param dbSize - Database file size in bytes
 */
function displayEmptyDatabase(dbPath: string, dbSize: number): void {
  console.log("");

  // System Status table
  console.log(chalk.white.bold("System Status"));
  const statusTable = new Table({
    colWidths: [25, 50],
    style: {
      head: [],
      border: ["gray"],
    },
  });

  statusTable.push(
    ["Database Path", dbPath],
    ["Database Size", `${formatFileSize(dbSize)} (empty)`],
    ["Database Status", chalk.green("✓ Connected")],
  );

  console.log(statusTable.toString());
  console.log("");

  console.log(chalk.yellow("No snapshots have been taken yet."));
  console.log("");
  console.log(
    chalk.gray("Get started: npx polymarket-cli snapshot <wallet_address>"),
  );
  console.log("");
}

/**
 * Displays database connection error
 */
function displayDatabaseError(): void {
  console.log("");
  console.log(chalk.red("✗ Error: Cannot connect to database"));
  console.log("");
  console.log(chalk.gray(`  Database path: ${config.database.path}`));
  console.log("");
  console.log(chalk.gray("  Please ensure the database has been initialized."));
  console.log("");
}
