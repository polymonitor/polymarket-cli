import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { SnapshotRepository } from "./snapshot-repository";
import { EventRepository } from "./event-repository";
import * as schema from "@/db/schema";

/**
 * Container for all repositories
 *
 * Usage:
 * - Use snapshots.saveFirstSnapshot() to initialize tracking for a new wallet
 * - Use snapshots.saveSnapshotWithEvents() to atomically save snapshot + diff events
 * - Use snapshots.getLatest() to retrieve previous snapshot for diff comparison
 * - Use events.getByWallet() / getByMarket() to query historical events
 */
export interface Repositories {
  snapshots: SnapshotRepository;
  events: EventRepository;
}

/**
 * Factory function to create repository instances
 * @param db The database instance
 * @returns Object containing all repository instances
 */
export function createRepositories(
  db: BetterSQLite3Database<typeof schema>,
): Repositories {
  return {
    snapshots: new SnapshotRepository(db),
    events: new EventRepository(db),
  };
}

// Export repository classes for direct use if needed
export { SnapshotRepository } from "./snapshot-repository";
export { EventRepository } from "./event-repository";
