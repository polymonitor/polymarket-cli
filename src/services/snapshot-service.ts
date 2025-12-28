/**
 * Snapshot Service
 *
 * Business logic layer that orchestrates API calls, diff computation,
 * and database operations for taking wallet snapshots.
 */

import type { Snapshot, WalletEvent, DiffEvent } from "@/types/core";
import type { Repositories } from "@/db/repositories";
import { computeDiff } from "@/diff";
import { validateWalletAddress } from "@/validation/validators";
import { logger } from "@/utils/logger";

/**
 * Interface for fetching wallet positions
 * This interface defines the contract for any API client that can provide wallet positions
 */
export interface IWalletPositionProvider {
  getWalletPositions(wallet: string): Promise<Snapshot>;
}

/**
 * Result of taking a snapshot
 */
export interface SnapshotResult {
  snapshot: Snapshot;
  events: WalletEvent[];
  isFirstSnapshot: boolean;
  saved: boolean; // Whether snapshot was saved to database
}

/**
 * Service for managing wallet snapshots
 *
 * Orchestrates:
 * - API calls to fetch current wallet state
 * - Diff computation to detect changes
 * - Database operations to persist snapshots and events
 */
export class SnapshotService {
  constructor(
    private api: IWalletPositionProvider,
    private repos: Repositories,
  ) {}

  /**
   * Takes a snapshot of a wallet's current positions
   *
   * Flow:
   * 1. Validate wallet address
   * 2. Fetch current positions from API
   * 3. Get previous snapshot from database
   * 4. Compute diff to detect changes
   * 5. Save if first snapshot OR if changes detected
   * 6. Return result with metadata
   *
   * @param wallet - Wallet address to snapshot
   * @returns Snapshot result with events and metadata
   * @throws Error on validation, API, or database failures
   */
  async takeSnapshot(wallet: string): Promise<SnapshotResult> {
    try {
      // Step 1: Validate wallet address
      logger.info(`Starting snapshot for wallet: ${wallet}`);
      const validWallet = validateWalletAddress(wallet);

      // Step 2: Fetch current state from API
      logger.info(`Fetching current positions from API for ${validWallet}`);
      const currentSnapshot = await this.api.getWalletPositions(validWallet);
      logger.info(
        `Fetched snapshot with ${currentSnapshot.positions.length} positions`,
      );

      // Step 3: Get previous snapshot from database
      logger.info(`Retrieving previous snapshot from database`);
      const prevSnapshotData =
        await this.repos.snapshots.getLatest(validWallet);

      // Step 4: Handle first snapshot (no previous exists)
      if (!prevSnapshotData) {
        logger.info(`No previous snapshot found - this is the first snapshot`);
        logger.info(
          `Saving first snapshot for wallet ${validWallet} (no events)`,
        );
        const snapshotId =
          await this.repos.snapshots.saveFirstSnapshot(currentSnapshot);
        logger.info(`First snapshot saved with ID: ${snapshotId}`);

        return {
          snapshot: currentSnapshot,
          events: [],
          isFirstSnapshot: true,
          saved: true,
        };
      }

      const prevSnapshot = prevSnapshotData.snapshot;
      logger.info(`Found previous snapshot (ID: ${prevSnapshotData.id})`);

      // Step 5: Compute diff between two existing snapshots
      logger.info(`Computing diff between snapshots`);
      const diffEvents = computeDiff(prevSnapshot, currentSnapshot);
      logger.info(`Diff generated ${diffEvents.length} events`);

      // Step 6: Decide whether to save
      if (diffEvents.length === 0) {
        // No changes detected - don't save
        logger.info(
          `No changes detected for wallet ${validWallet} - skipping save`,
        );
        return {
          snapshot: currentSnapshot,
          events: [],
          isFirstSnapshot: false,
          saved: false,
        };
      }

      // Changes detected - save snapshot with events atomically
      logger.info(
        `Saving snapshot with ${diffEvents.length} events for wallet ${validWallet}`,
      );

      // Repository will assign snapshotId to each DiffEvent when saving
      const snapshotId = await this.repos.snapshots.saveSnapshotWithEvents(
        currentSnapshot,
        diffEvents,
      );

      // Attach snapshotId and timestamp to events for return value
      const events: WalletEvent[] = diffEvents.map((event) => ({
        ...event,
        snapshotId,
        timestamp: currentSnapshot.timestamp,
      }));

      logger.info(
        `Snapshot and events saved successfully with snapshot ID: ${snapshotId}`,
      );

      return {
        snapshot: currentSnapshot,
        events,
        isFirstSnapshot: false,
        saved: true,
      };
    } catch (error) {
      // Wrap errors with service-level context
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(
        `Failed to take snapshot for wallet ${wallet}: ${errorMessage}`,
      );

      // Re-throw with additional context if not already a known error type
      if (
        error instanceof Error &&
        (error.name === "ValidationError" ||
          error.name === "PolymarketAPIError" ||
          error.name === "NetworkError" ||
          error.name === "ClientError" ||
          error.name === "ServerError" ||
          error.name === "RateLimitError")
      ) {
        // Known error types - re-throw as-is
        throw error;
      }

      // Unknown error - wrap with context
      throw new Error(
        `Failed to take snapshot for wallet ${wallet}: ${errorMessage}`,
        { cause: error },
      );
    }
  }
}
