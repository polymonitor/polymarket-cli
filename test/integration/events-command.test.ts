/**
 * Integration tests for events command
 */

import { describe, it, before } from "node:test";
import assert from "node:assert";
import { createTestDatabase } from "../fixtures/test-helpers";
import { SnapshotRepository } from "@/db/repositories/snapshot-repository";
import { EventRepository } from "@/db/repositories/event-repository";
import type { Snapshot } from "@/types/core";

describe("Events Command Integration", () => {
  let db: ReturnType<typeof createTestDatabase>;
  let snapshotRepo: SnapshotRepository;
  let eventRepo: EventRepository;

  const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";

  before(async () => {
    // Create test database and repositories
    db = createTestDatabase();
    snapshotRepo = new SnapshotRepository(db);
    eventRepo = new EventRepository(db);

    // Create test snapshots and events
    const snapshot1: Snapshot = {
      wallet: WALLET_ADDRESS,
      timestamp: "2024-01-15T10:00:00.000Z",
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

    const snapshot2: Snapshot = {
      wallet: WALLET_ADDRESS,
      timestamp: "2024-01-15T11:00:00.000Z",
      positions: [
        {
          marketId: "market-1",
          marketTitle: "Will Bitcoin reach $100k in 2024?",
          yesShares: 200,
          noShares: 0,
          yesAvgPrice: 0.55,
          noAvgPrice: null,
          resolvedOutcome: "unresolved",
        },
      ],
    };

    // Save snapshots
    const snapshotId1 = await snapshotRepo.saveFirstSnapshot(snapshot1);

    // Create events
    const events = [
      {
        eventId: "evt-1",
        wallet: WALLET_ADDRESS,
        eventType: "POSITION_UPDATED" as const,
        marketId: "market-1",
        marketTitle: "Will Bitcoin reach $100k in 2024?",
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

    await snapshotRepo.saveSnapshotWithEvents(snapshot2, events);
  });

  it("should retrieve events for wallet", async () => {
    const events = await eventRepo.getByWallet(WALLET_ADDRESS, 10);

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
    assert.strictEqual(events[0].wallet, WALLET_ADDRESS);
  });

  it("should respect limit parameter", async () => {
    // Add more events first
    const snapshot3: Snapshot = {
      wallet: WALLET_ADDRESS,
      timestamp: "2024-01-15T12:00:00.000Z",
      positions: [
        {
          marketId: "market-1",
          marketTitle: "Will Bitcoin reach $100k in 2024?",
          yesShares: 300,
          noShares: 0,
          yesAvgPrice: 0.6,
          noAvgPrice: null,
          resolvedOutcome: "unresolved",
        },
      ],
    };

    const prevSnapshot = await snapshotRepo.getLatest(WALLET_ADDRESS);
    const events = [
      {
        eventId: "evt-2",
        wallet: WALLET_ADDRESS,
        eventType: "POSITION_UPDATED" as const,
        marketId: "market-1",
        marketTitle: "Will Bitcoin reach $100k in 2024?",
        snapshotId: (prevSnapshot?.id ?? 0) + 1,
        prevYesShares: 200,
        prevNoShares: 0,
        prevYesAvgPrice: 0.55,
        prevNoAvgPrice: null,
        currYesShares: 300,
        currNoShares: 0,
        currYesAvgPrice: 0.6,
        currNoAvgPrice: null,
        resolvedOutcome: "unresolved" as const,
      },
    ];

    await snapshotRepo.saveSnapshotWithEvents(snapshot3, events);

    // Test limit
    const limitedEvents = await eventRepo.getByWallet(WALLET_ADDRESS, 1);
    assert.strictEqual(limitedEvents.length, 1);

    const allEvents = await eventRepo.getByWallet(WALLET_ADDRESS, 10);
    assert.strictEqual(allEvents.length, 2);
  });

  it("should return events in reverse chronological order", async () => {
    const events = await eventRepo.getByWallet(WALLET_ADDRESS, 10);

    // Events should be ordered by timestamp descending
    for (let i = 0; i < events.length - 1; i++) {
      const timestamp1 = new Date(events[i].timestamp).getTime();
      const timestamp2 = new Date(events[i + 1].timestamp).getTime();
      assert.ok(timestamp1 >= timestamp2);
    }
  });

  it("should return empty array for wallet with no events", async () => {
    const otherWallet = "0x0000000000000000000000000000000000000000";
    const events = await eventRepo.getByWallet(otherWallet, 10);

    assert.deepStrictEqual(events, []);
  });
});
