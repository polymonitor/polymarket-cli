/**
 * Integration tests for status command
 */

import { describe, it, before } from "node:test";
import assert from "node:assert";
import { count, sql } from "drizzle-orm";
import { createTestDatabase } from "../fixtures/test-helpers";
import { SnapshotRepository } from "@/db/repositories/snapshot-repository";
import { EventRepository } from "@/db/repositories/event-repository";
import { snapshots, events } from "@/db/schema";
import type { Snapshot } from "@/types/core";

describe("Status Command Integration", () => {
  let db: ReturnType<typeof createTestDatabase>;
  let snapshotRepo: SnapshotRepository;
  let eventRepo: EventRepository;

  const WALLET_1 = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
  const WALLET_2 = "0x0000000000000000000000000000000000000001";

  before(async () => {
    // Create test database and repositories
    db = createTestDatabase();
    snapshotRepo = new SnapshotRepository(db);
    eventRepo = new EventRepository(db);

    // Create test data for multiple wallets
    const snapshot1: Snapshot = {
      wallet: WALLET_1,
      timestamp: "2024-01-15T10:00:00.000Z",
      positions: [
        {
          marketId: "market-1",
          marketTitle: "Test Market 1",
          yesShares: 100,
          noShares: 0,
          yesAvgPrice: 0.5,
          noAvgPrice: null,
          resolvedOutcome: "unresolved",
        },
      ],
    };

    const snapshot2: Snapshot = {
      wallet: WALLET_1,
      timestamp: "2024-01-15T11:00:00.000Z",
      positions: [
        {
          marketId: "market-1",
          marketTitle: "Test Market 1",
          yesShares: 200,
          noShares: 0,
          yesAvgPrice: 0.55,
          noAvgPrice: null,
          resolvedOutcome: "unresolved",
        },
      ],
    };

    const snapshot3: Snapshot = {
      wallet: WALLET_2,
      timestamp: "2024-01-15T12:00:00.000Z",
      positions: [],
    };

    // Save snapshots with events
    const snapshotId1 = await snapshotRepo.saveFirstSnapshot(snapshot1);

    const events1 = [
      {
        eventId: "evt-1",
        wallet: WALLET_1,
        eventType: "POSITION_UPDATED" as const,
        marketId: "market-1",
        marketTitle: "Test Market 1",
        snapshotId: snapshotId1 + 1,
        prevYesShares: 100,
        prevNoShares: 0,
        prevYesAvgPrice: 0.5,
        prevNoAvgPrice: null,
        currYesShares: 200,
        currNoShares: 0,
        currYesAvgPrice: 0.55,
        currNoAvgPrice: null,
        resolvedOutcome: "unresolved" as const,
      },
    ];

    await snapshotRepo.saveSnapshotWithEvents(snapshot2, events1);
    await snapshotRepo.saveFirstSnapshot(snapshot3);
  });

  it("should return accurate system statistics", async () => {
    const totalSnapshotsResult = await db
      .select({ count: count() })
      .from(snapshots);
    const totalSnapshots = totalSnapshotsResult[0]?.count ?? 0;

    const totalEventsResult = await db.select({ count: count() }).from(events);
    const totalEvents = totalEventsResult[0]?.count ?? 0;

    const uniqueWalletsResult = await db
      .select({ wallet: snapshots.wallet })
      .from(snapshots)
      .groupBy(snapshots.wallet);
    const uniqueWallets = uniqueWalletsResult.length;

    assert.strictEqual(totalSnapshots, 3);
    assert.strictEqual(uniqueWallets, 2);
    assert.strictEqual(totalEvents, 1);
  });

  it("should return correct wallet count", async () => {
    const uniqueWalletsResult = await db
      .select({ wallet: snapshots.wallet })
      .from(snapshots)
      .groupBy(snapshots.wallet);

    assert.strictEqual(uniqueWalletsResult.length, 2);
  });

  it("should return correct snapshot count", async () => {
    const totalSnapshotsResult = await db
      .select({ count: count() })
      .from(snapshots);
    const totalSnapshots = totalSnapshotsResult[0]?.count ?? 0;

    assert.strictEqual(totalSnapshots, 3);
  });

  it("should return correct event count", async () => {
    const totalEventsResult = await db.select({ count: count() }).from(events);
    const totalEvents = totalEventsResult[0]?.count ?? 0;

    assert.strictEqual(totalEvents, 1);
  });

  it("should return oldest snapshot timestamp", async () => {
    const result = await db
      .select({ oldest: sql<string>`MIN(${snapshots.timestamp})` })
      .from(snapshots);

    const oldestSnapshot = result[0]?.oldest;
    assert.ok(oldestSnapshot);
    assert.strictEqual(oldestSnapshot, "2024-01-15T10:00:00.000Z");
  });

  it("should return most recent snapshot timestamp", async () => {
    const result = await db
      .select({ newest: sql<string>`MAX(${snapshots.timestamp})` })
      .from(snapshots);

    const mostRecentSnapshot = result[0]?.newest;
    assert.ok(mostRecentSnapshot);
    assert.strictEqual(mostRecentSnapshot, "2024-01-15T12:00:00.000Z");
  });

  it("should handle empty database", async () => {
    const emptyDb = createTestDatabase();

    const totalSnapshotsResult = await emptyDb
      .select({ count: count() })
      .from(snapshots);
    const totalSnapshots = totalSnapshotsResult[0]?.count ?? 0;

    const totalEventsResult = await emptyDb
      .select({ count: count() })
      .from(events);
    const totalEvents = totalEventsResult[0]?.count ?? 0;

    const uniqueWalletsResult = await emptyDb
      .select({ wallet: snapshots.wallet })
      .from(snapshots)
      .groupBy(snapshots.wallet);

    assert.strictEqual(totalSnapshots, 0);
    assert.strictEqual(uniqueWalletsResult.length, 0);
    assert.strictEqual(totalEvents, 0);
  });
});
