/**
 * Integration tests for snapshot command
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "../fixtures/test-helpers";
import { SnapshotRepository } from "@/db/repositories/snapshot-repository";
import { EventRepository } from "@/db/repositories/event-repository";
import { SnapshotService } from "@/services/snapshot-service";
import type { Snapshot } from "@/types/core";

describe("Snapshot Command Integration", () => {
  let db: ReturnType<typeof createTestDatabase>;
  let snapshotRepo: SnapshotRepository;
  let eventRepo: EventRepository;
  let snapshotService: SnapshotService;

  const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";

  before(() => {
    // Create test database and repositories
    db = createTestDatabase();
    snapshotRepo = new SnapshotRepository(db);
    eventRepo = new EventRepository(db);

    // Create mock API client
    const mockApiClient = {
      getWalletPositions: async (wallet: string): Promise<Snapshot> => {
        return {
          wallet,
          timestamp: new Date().toISOString(),
          positions: [
            {
              marketId: "market-1",
              marketTitle: "Will Bitcoin reach $100k in 2024?",
              yesShares: 100,
              noShares: 0,
              yesAvgPrice: 0.5,
              noAvgPrice: null,
              resolvedOutcome: "unresolved",
            },
          ],
        };
      },
    };

    snapshotService = new SnapshotService(mockApiClient, {
      snapshots: snapshotRepo,
      events: eventRepo,
    });
  });

  it("should execute complete snapshot flow for first snapshot", async () => {
    // Execute snapshot
    const result = await snapshotService.takeSnapshot(WALLET_ADDRESS);

    // Verify result
    assert.strictEqual(result.isFirstSnapshot, true);
    assert.strictEqual(result.saved, true);
    assert.strictEqual(result.events.length, 0);
    assert.strictEqual(result.snapshot.wallet, WALLET_ADDRESS);

    // Verify snapshot in database
    const snapshotData = await snapshotRepo.getLatest(WALLET_ADDRESS);
    assert.ok(snapshotData);
    assert.strictEqual(snapshotData.snapshot.wallet, WALLET_ADDRESS);
    assert.strictEqual(snapshotData.snapshot.positions.length, 1);
  });

  it("should execute complete snapshot flow with changes", async () => {
    // Take first snapshot
    await snapshotService.takeSnapshot(WALLET_ADDRESS);

    // Update mock API to return different positions
    const mockApiClient = {
      getWalletPositions: async (wallet: string): Promise<Snapshot> => {
        return {
          wallet,
          timestamp: new Date().toISOString(),
          positions: [
            {
              marketId: "market-1",
              marketTitle: "Will Bitcoin reach $100k in 2024?",
              yesShares: 200, // Changed from 100 to 200
              noShares: 0,
              yesAvgPrice: 0.55, // Changed from 0.5 to 0.55
              noAvgPrice: null,
              resolvedOutcome: "unresolved",
            },
          ],
        };
      },
    };

    const updatedService = new SnapshotService(mockApiClient, {
      snapshots: snapshotRepo,
      events: eventRepo,
    });

    // Take second snapshot
    const result = await updatedService.takeSnapshot(WALLET_ADDRESS);

    // Verify result
    assert.strictEqual(result.isFirstSnapshot, false);
    assert.strictEqual(result.saved, true);
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.events[0].eventType, "POSITION_UPDATED");

    // Verify events in database
    const events = await eventRepo.getByWallet(WALLET_ADDRESS, 10);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
    assert.strictEqual(events[0].prevYesShares, 100);
    assert.strictEqual(events[0].currYesShares, 200);
  });

  it("should not save snapshot when no changes detected", async () => {
    // Take first snapshot
    const firstResult = await snapshotService.takeSnapshot(WALLET_ADDRESS);

    // Get the snapshot ID before taking second snapshot
    const firstSnapshotData = await snapshotRepo.getLatest(WALLET_ADDRESS);
    assert.ok(firstSnapshotData);
    const firstSnapshotId = firstSnapshotData.id;

    // Take second snapshot with same data
    const secondResult = await snapshotService.takeSnapshot(WALLET_ADDRESS);

    // Verify second snapshot was not saved
    assert.strictEqual(secondResult.saved, false);
    assert.strictEqual(secondResult.events.length, 0);

    // Verify latest snapshot ID hasn't changed
    const latestSnapshot = await snapshotRepo.getLatest(WALLET_ADDRESS);
    assert.ok(latestSnapshot);
    assert.strictEqual(latestSnapshot.id, firstSnapshotId);
  });
});
