import { eq, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { events, snapshots } from "@/db/schema";
import type { WalletEvent } from "@/types/core";
import * as schema from "@/db/schema";

/**
 * Repository for querying events
 * Event creation is handled by SnapshotRepository.saveSnapshotWithEvents()
 */
export class EventRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Get events for a wallet
   * @param wallet The wallet address
   * @param limit Maximum number of events to return (default 50)
   * @returns Array of events ordered by timestamp descending (newest first)
   */
  async getByWallet(wallet: string, limit = 50): Promise<WalletEvent[]> {
    try {
      const result = await this.db
        .select({
          id: events.id,
          wallet: events.wallet,
          eventType: events.eventType,
          marketId: events.marketId,
          marketTitle: events.marketTitle,
          snapshotId: events.snapshotId,
          prevYesShares: events.prevYesShares,
          prevNoShares: events.prevNoShares,
          prevYesAvgPrice: events.prevYesAvgPrice,
          prevNoAvgPrice: events.prevNoAvgPrice,
          currYesShares: events.currYesShares,
          currNoShares: events.currNoShares,
          currYesAvgPrice: events.currYesAvgPrice,
          currNoAvgPrice: events.currNoAvgPrice,
          resolvedOutcome: events.resolvedOutcome,
          pnl: events.pnl,
          timestamp: snapshots.timestamp,
        })
        .from(events)
        .innerJoin(snapshots, eq(events.snapshotId, snapshots.id))
        .where(eq(events.wallet, wallet))
        .orderBy(desc(snapshots.timestamp))
        .limit(limit);

      return result.map((row) => ({
        eventId: row.id,
        wallet: row.wallet,
        eventType: row.eventType as WalletEvent["eventType"],
        marketId: row.marketId,
        marketTitle: row.marketTitle,
        snapshotId: row.snapshotId,
        prevYesShares: row.prevYesShares,
        prevNoShares: row.prevNoShares,
        prevYesAvgPrice: row.prevYesAvgPrice,
        prevNoAvgPrice: row.prevNoAvgPrice,
        currYesShares: row.currYesShares,
        currNoShares: row.currNoShares,
        currYesAvgPrice: row.currYesAvgPrice,
        currNoAvgPrice: row.currNoAvgPrice,
        resolvedOutcome: row.resolvedOutcome as WalletEvent["resolvedOutcome"],
        pnl: row.pnl ?? undefined,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get events by wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get all events for a specific market
   * @param marketId The market ID
   * @returns Array of events ordered by timestamp descending
   */
  async getByMarket(marketId: string): Promise<WalletEvent[]> {
    try {
      const result = await this.db
        .select({
          id: events.id,
          wallet: events.wallet,
          eventType: events.eventType,
          marketId: events.marketId,
          marketTitle: events.marketTitle,
          snapshotId: events.snapshotId,
          prevYesShares: events.prevYesShares,
          prevNoShares: events.prevNoShares,
          prevYesAvgPrice: events.prevYesAvgPrice,
          prevNoAvgPrice: events.prevNoAvgPrice,
          currYesShares: events.currYesShares,
          currNoShares: events.currNoShares,
          currYesAvgPrice: events.currYesAvgPrice,
          currNoAvgPrice: events.currNoAvgPrice,
          resolvedOutcome: events.resolvedOutcome,
          pnl: events.pnl,
          timestamp: snapshots.timestamp,
        })
        .from(events)
        .innerJoin(snapshots, eq(events.snapshotId, snapshots.id))
        .where(eq(events.marketId, marketId))
        .orderBy(desc(snapshots.timestamp));

      return result.map((row) => ({
        eventId: row.id,
        wallet: row.wallet,
        eventType: row.eventType as WalletEvent["eventType"],
        marketId: row.marketId,
        marketTitle: row.marketTitle,
        snapshotId: row.snapshotId,
        prevYesShares: row.prevYesShares,
        prevNoShares: row.prevNoShares,
        prevYesAvgPrice: row.prevYesAvgPrice,
        prevNoAvgPrice: row.prevNoAvgPrice,
        currYesShares: row.currYesShares,
        currNoShares: row.currNoShares,
        currYesAvgPrice: row.currYesAvgPrice,
        currNoAvgPrice: row.currNoAvgPrice,
        resolvedOutcome: row.resolvedOutcome as WalletEvent["resolvedOutcome"],
        pnl: row.pnl ?? undefined,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get events by market: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
