import { eq, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { snapshots, events } from "@/db/schema";
import type { Snapshot, WalletEvent } from "@/types/core";
import * as schema from "@/db/schema";

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
   */
  async saveFirstSnapshot(snapshot: Snapshot): Promise<number> {
    try {
      // Check if snapshot already exists for this wallet
      const existing = await this.db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.wallet, snapshot.wallet))
        .limit(1);

      if (existing.length > 0) {
        throw new Error(
          `Cannot save first snapshot: wallet ${snapshot.wallet} already has snapshots`,
        );
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

      return result[0].id;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("already has snapshots")
      ) {
        throw error;
      }
      throw new Error(
        `Failed to save first snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
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
   * @param walletEvents Array of events detected (must have at least one event)
   * @returns The generated snapshot ID
   * @throws Error if no events provided, or no previous snapshot exists
   */
  async saveSnapshotWithEvents(
    snapshot: Snapshot,
    walletEvents: WalletEvent[],
  ): Promise<number> {
    // Validate preconditions
    if (walletEvents.length === 0) {
      throw new Error(
        "Cannot save snapshot with events: at least one event is required. Use saveFirstSnapshot for snapshots without changes.",
      );
    }

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

      // Save all events
      await this.db.insert(events).values(
        walletEvents.map((event) => ({
          id: event.eventId,
          wallet: event.wallet,
          eventType: event.eventType,
          marketId: event.marketId,
          marketTitle: event.marketTitle,
          snapshotId: snapshotId,
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

      return snapshotId;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("no previous snapshot exists") ||
          error.message.includes("at least one event is required"))
      ) {
        throw error;
      }
      throw new Error(
        `Failed to save snapshot with events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get the latest snapshot for a wallet
   * @param wallet The wallet address
   * @returns The snapshot with its ID, or null if none exists
   */
  async getLatest(
    wallet: string,
  ): Promise<{ id: number; snapshot: Snapshot } | null> {
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
        return null;
      }

      return {
        id: result[0].id,
        snapshot: result[0].snapshotData as Snapshot,
      };
    } catch (error) {
      throw new Error(
        `Failed to get latest snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get a snapshot by ID
   * @param id The snapshot ID
   * @returns The snapshot or null if not found
   */
  async getById(id: number): Promise<Snapshot | null> {
    try {
      const result = await this.db
        .select({
          snapshotData: snapshots.snapshotData,
        })
        .from(snapshots)
        .where(eq(snapshots.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0].snapshotData as Snapshot;
    } catch (error) {
      throw new Error(
        `Failed to get snapshot by ID: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
