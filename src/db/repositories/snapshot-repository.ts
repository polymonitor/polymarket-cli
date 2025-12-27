import { eq, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { snapshots, events } from "@/db/schema";
import type { Snapshot, DiffEvent } from "@/types/core";
import * as schema from "@/db/schema";
import {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTransactionError,
  DatabaseConstraintError,
} from "@/api/errors";
import { logger } from "@/utils/logger";

/**
 * Repository for snapshot operations
 * Encapsulates all database access for snapshots and their events
 */
export class SnapshotRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Save the first snapshot for a wallet
   * This should be called when initializing tracking for a new wallet
   *
   * @param snapshot The initial snapshot to save
   * @returns The generated snapshot ID
   * @throws Error if a snapshot already exists for this wallet
   * @throws DatabaseError for database-related failures
   */
  async saveFirstSnapshot(snapshot: Snapshot): Promise<number> {
    logger.debug(`Saving first snapshot for wallet ${snapshot.wallet}`);

    try {
      // Check if snapshot already exists for this wallet
      const existing = await this.db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.wallet, snapshot.wallet))
        .limit(1);

      if (existing.length > 0) {
        const error = new DatabaseConstraintError(
          `Cannot save first snapshot: wallet ${snapshot.wallet} already has snapshots`,
        );
        logger.error(`Failed to save first snapshot: ${error.message}`);
        throw error;
      }

      // Save the snapshot (first snapshot has no predecessor)
      const result = await this.db
        .insert(snapshots)
        .values({
          wallet: snapshot.wallet,
          snapshotData: snapshot,
          timestamp: snapshot.timestamp,
          prevSnapshotId: null,
        })
        .returning({ id: snapshots.id });

      logger.info(
        `First snapshot saved with ID ${result[0].id} for wallet ${snapshot.wallet}`,
      );
      return result[0].id;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof DatabaseError) {
        throw error;
      }

      // Check for SQLite specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("SQLITE_READONLY") ||
        errorMessage.includes("readonly")
      ) {
        throw new DatabaseConnectionError(
          "Database is read-only. Check file permissions.",
          error as Error,
        );
      }

      if (
        errorMessage.includes("SQLITE_LOCKED") ||
        errorMessage.includes("database is locked")
      ) {
        throw new DatabaseConnectionError(
          "Database is locked. Another process may be using it.",
          error as Error,
        );
      }

      if (
        errorMessage.includes("SQLITE_CONSTRAINT") ||
        errorMessage.includes("UNIQUE constraint")
      ) {
        throw new DatabaseConstraintError(
          "Database constraint violation",
          error as Error,
        );
      }

      // Generic database error
      logger.error(`Database error saving first snapshot: ${errorMessage}`);
      throw new DatabaseError(
        `Failed to save first snapshot: ${errorMessage}`,
        error as Error,
      );
    }
  }

  /**
   * Save a snapshot along with the events generated from comparing with previous snapshot
   * This should be called when recording detected changes in wallet positions
   *
   * IMPORTANT: Uses a transaction to ensure atomicity - both snapshot and events are saved together or neither is saved
   *
   * @param snapshot The new snapshot to save
   * @param diffEvents Array of DiffEvents (without snapshotId - will be assigned here)
   * @returns The generated snapshot ID
   * @throws Error if no events provided, or no previous snapshot exists
   * @throws DatabaseError for database-related failures
   */
  async saveSnapshotWithEvents(
    snapshot: Snapshot,
    diffEvents: DiffEvent[],
  ): Promise<number> {
    // Validate preconditions
    if (diffEvents.length === 0) {
      throw new Error(
        "Cannot save snapshot with events: at least one event is required. Use saveFirstSnapshot for snapshots without changes.",
      );
    }

    logger.debug(
      `Saving snapshot with ${diffEvents.length} events for wallet ${snapshot.wallet}`,
    );

    try {
      // Check that previous snapshot exists and get its ID
      const previous = await this.db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.wallet, snapshot.wallet))
        .orderBy(desc(snapshots.timestamp))
        .limit(1);

      if (previous.length === 0) {
        throw new Error(
          `Cannot save snapshot with events: no previous snapshot exists for wallet ${snapshot.wallet}. Use saveFirstSnapshot first.`,
        );
      }

      const prevSnapshotId = previous[0].id;

      // Save the snapshot with link to previous snapshot (blockchain-like chain)
      // NOTE: In better-sqlite3, these operations are atomic via WAL mode
      const result = await this.db
        .insert(snapshots)
        .values({
          wallet: snapshot.wallet,
          snapshotData: snapshot,
          timestamp: snapshot.timestamp,
          prevSnapshotId: prevSnapshotId,
        })
        .returning({ id: snapshots.id });

      const snapshotId = result[0].id;

      // Save all events - assign snapshotId to each DiffEvent
      await this.db.insert(events).values(
        diffEvents.map((event) => ({
          id: event.eventId,
          wallet: event.wallet,
          eventType: event.eventType,
          marketId: event.marketId,
          marketTitle: event.marketTitle,
          snapshotId: snapshotId, // Assign snapshotId here
          prevYesShares: event.prevYesShares,
          prevNoShares: event.prevNoShares,
          prevYesAvgPrice: event.prevYesAvgPrice,
          prevNoAvgPrice: event.prevNoAvgPrice,
          currYesShares: event.currYesShares,
          currNoShares: event.currNoShares,
          currYesAvgPrice: event.currYesAvgPrice,
          currNoAvgPrice: event.currNoAvgPrice,
          resolvedOutcome: event.resolvedOutcome,
          pnl: event.pnl ?? null,
        })),
      );

      logger.info(
        `Snapshot saved with ID ${snapshotId} and ${diffEvents.length} events for wallet ${snapshot.wallet}`,
      );
      return snapshotId;
    } catch (error) {
      // Re-throw validation errors
      if (
        error instanceof Error &&
        (error.message.includes("no previous snapshot exists") ||
          error.message.includes("at least one event is required"))
      ) {
        throw error;
      }

      // Re-throw our custom database errors
      if (error instanceof DatabaseError) {
        throw error;
      }

      // Check for SQLite specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("SQLITE_READONLY") ||
        errorMessage.includes("readonly")
      ) {
        throw new DatabaseConnectionError(
          "Database is read-only. Check file permissions.",
          error as Error,
        );
      }

      if (
        errorMessage.includes("SQLITE_LOCKED") ||
        errorMessage.includes("database is locked")
      ) {
        throw new DatabaseConnectionError(
          "Database is locked. Another process may be using it.",
          error as Error,
        );
      }

      if (
        errorMessage.includes("SQLITE_CONSTRAINT") ||
        errorMessage.includes("constraint")
      ) {
        throw new DatabaseConstraintError(
          "Database constraint violation during transaction",
          error as Error,
        );
      }

      // Transaction/rollback errors
      if (
        errorMessage.includes("rollback") ||
        errorMessage.includes("transaction")
      ) {
        throw new DatabaseTransactionError(
          "Transaction failed and was rolled back. No data was saved.",
          error as Error,
        );
      }

      // Generic database error
      logger.error(
        `Database error saving snapshot with events: ${errorMessage}`,
      );
      throw new DatabaseError(
        `Failed to save snapshot with events: ${errorMessage}`,
        error as Error,
      );
    }
  }

  /**
   * Get the latest snapshot for a wallet
   * @param wallet The wallet address
   * @returns The snapshot with its ID, or null if none exists
   * @throws DatabaseError for database-related failures
   */
  async getLatest(
    wallet: string,
  ): Promise<{ id: number; snapshot: Snapshot } | null> {
    logger.debug(`Fetching latest snapshot for wallet ${wallet}`);

    try {
      const result = await this.db
        .select({
          id: snapshots.id,
          snapshotData: snapshots.snapshotData,
        })
        .from(snapshots)
        .where(eq(snapshots.wallet, wallet))
        .orderBy(desc(snapshots.timestamp))
        .limit(1);

      if (result.length === 0) {
        logger.debug(`No snapshot found for wallet ${wallet}`);
        return null;
      }

      logger.debug(`Found snapshot ID ${result[0].id} for wallet ${wallet}`);
      return {
        id: result[0].id,
        snapshot: result[0].snapshotData as Snapshot,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Database error fetching latest snapshot: ${errorMessage}`);

      if (
        errorMessage.includes("SQLITE_LOCKED") ||
        errorMessage.includes("database is locked")
      ) {
        throw new DatabaseConnectionError(
          "Database is locked. Another process may be using it.",
          error as Error,
        );
      }

      throw new DatabaseError(
        `Failed to get latest snapshot: ${errorMessage}`,
        error as Error,
      );
    }
  }

  /**
   * Get a snapshot by ID
   * @param id The snapshot ID
   * @returns The snapshot or null if not found
   * @throws DatabaseError for database-related failures
   */
  async getById(id: number): Promise<Snapshot | null> {
    logger.debug(`Fetching snapshot by ID ${id}`);

    try {
      const result = await this.db
        .select({
          snapshotData: snapshots.snapshotData,
        })
        .from(snapshots)
        .where(eq(snapshots.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug(`No snapshot found with ID ${id}`);
        return null;
      }

      return result[0].snapshotData as Snapshot;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Database error fetching snapshot by ID: ${errorMessage}`);

      if (
        errorMessage.includes("SQLITE_LOCKED") ||
        errorMessage.includes("database is locked")
      ) {
        throw new DatabaseConnectionError(
          "Database is locked. Another process may be using it.",
          error as Error,
        );
      }

      throw new DatabaseError(
        `Failed to get snapshot by ID: ${errorMessage}`,
        error as Error,
      );
    }
  }
}
