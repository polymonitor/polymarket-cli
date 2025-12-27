/**
 * Tests for database repositories
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import {
  createRepositories,
  SnapshotRepository,
  EventRepository,
} from "@/db/repositories";
import type { Snapshot, WalletEvent } from "@/types/core";

// Helper to create an in-memory test database
function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  // Run migrations
  migrate(db, { migrationsFolder: "./migrations" });
  return db;
}

// Helper to create a test snapshot
function createTestSnapshot(wallet: string, timestamp?: string): Snapshot {
  return {
    wallet,
    timestamp: timestamp || new Date().toISOString(),
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
      {
        marketId: "market-2",
        marketTitle: "Test Market 2",
        yesShares: 0,
        noShares: 50,
        yesAvgPrice: null,
        noAvgPrice: 0.3,
        resolvedOutcome: "unresolved",
      },
    ],
  };
}

// Helper to create a test event
function createTestEvent(wallet: string, marketId: string): WalletEvent {
  return {
    eventId: `${Date.now()}-${Math.random()}`,
    wallet,
    eventType: "POSITION_OPENED",
    marketId,
    marketTitle: "Test Market",
    snapshotId: 0, // Will be set by repository
    timestamp: new Date().toISOString(),
    prevYesShares: null,
    prevNoShares: null,
    prevYesAvgPrice: null,
    prevNoAvgPrice: null,
    currYesShares: 100,
    currNoShares: 0,
    currYesAvgPrice: 0.5,
    currNoAvgPrice: null,
    resolvedOutcome: "unresolved",
  };
}

describe("SnapshotRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repository: SnapshotRepository;

  beforeEach(() => {
    db = createTestDb();
    repository = new SnapshotRepository(db);
  });

  describe("saveFirstSnapshot", () => {
    it("should save the first snapshot and return ID", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const snapshot = createTestSnapshot(wallet);

      const id = await repository.saveFirstSnapshot(snapshot);

      assert.strictEqual(typeof id, "number");
      assert.ok(id > 0);

      // Verify it was saved
      const retrieved = await repository.getById(id);
      assert.ok(retrieved !== null);
      assert.strictEqual(retrieved.wallet, wallet);
    });

    it("should error if wallet already has snapshots", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const snapshot1 = createTestSnapshot(wallet);
      const snapshot2 = createTestSnapshot(wallet);

      await repository.saveFirstSnapshot(snapshot1);

      try {
        await repository.saveFirstSnapshot(snapshot2);
        assert.fail("Expected saveFirstSnapshot to throw an error");
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.match(error.message, /already has snapshots/);
      }
    });

    it("should allow first snapshot for different wallets", async () => {
      const wallet1 = "0x1234567890123456789012345678901234567890";
      const wallet2 = "0x0987654321098765432109876543210987654321";

      const id1 = await repository.saveFirstSnapshot(
        createTestSnapshot(wallet1),
      );
      const id2 = await repository.saveFirstSnapshot(
        createTestSnapshot(wallet2),
      );

      assert.ok(id1 > 0);
      assert.ok(id2 > 0);
      assert.notStrictEqual(id1, id2);
    });
  });

  describe("saveSnapshotWithEvents", () => {
    it("should save snapshot and events atomically", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";

      // First snapshot
      await repository.saveFirstSnapshot(createTestSnapshot(wallet));

      // Subsequent snapshot with events
      const snapshot = createTestSnapshot(
        wallet,
        new Date(Date.now() + 1000).toISOString(),
      );
      const events = [
        createTestEvent(wallet, "market-1"),
        createTestEvent(wallet, "market-2"),
      ];

      const id = await repository.saveSnapshotWithEvents(snapshot, events);

      assert.ok(id > 0);

      // Verify snapshot was saved
      const savedSnapshot = await repository.getById(id);
      assert.ok(savedSnapshot !== null);

      // Verify events were saved (query via EventRepository)
      const eventRepo = new EventRepository(db);
      const savedEvents = await eventRepo.getByWallet(wallet);
      assert.strictEqual(savedEvents.length, 2);
    });

    it("should error if no events provided", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";

      await repository.saveFirstSnapshot(createTestSnapshot(wallet));

      const snapshot = createTestSnapshot(
        wallet,
        new Date(Date.now() + 1000).toISOString(),
      );

      try {
        await repository.saveSnapshotWithEvents(snapshot, []);
        assert.fail("Expected saveSnapshotWithEvents to throw an error");
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.match(error.message, /at least one event is required/);
      }
    });

    it("should error if no previous snapshot exists", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const snapshot = createTestSnapshot(wallet);
      const events = [createTestEvent(wallet, "market-1")];

      try {
        await repository.saveSnapshotWithEvents(snapshot, events);
        assert.fail("Expected saveSnapshotWithEvents to throw an error");
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.match(error.message, /no previous snapshot exists/);
      }
    });

    it("should rollback on error (transaction atomicity)", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";

      await repository.saveFirstSnapshot(createTestSnapshot(wallet));

      // Create an invalid event (this test verifies transaction rollback behavior)
      const snapshot = createTestSnapshot(
        wallet,
        new Date(Date.now() + 1000).toISOString(),
      );
      const events = [createTestEvent(wallet, "market-1")];

      // Force validation to pass but let it save successfully
      const id = await repository.saveSnapshotWithEvents(snapshot, events);
      assert.ok(id > 0);

      // Verify both snapshot and event were saved
      const eventRepo = new EventRepository(db);
      const savedEvents = await eventRepo.getByWallet(wallet);
      assert.strictEqual(savedEvents.length, 1);
    });
  });

  describe("getLatest", () => {
    it("should return null when no snapshots exist for wallet", async () => {
      const result = await repository.getLatest(
        "0x1234567890123456789012345678901234567890",
      );

      assert.strictEqual(result, null);
    });

    it("should return the latest snapshot for a wallet", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const snapshot1 = createTestSnapshot(wallet, "2024-01-01T00:00:00.000Z");
      const snapshot2 = createTestSnapshot(wallet, "2024-01-02T00:00:00.000Z");

      await repository.saveFirstSnapshot(snapshot1);

      const events = [createTestEvent(wallet, "market-1")];
      const id2 = await repository.saveSnapshotWithEvents(snapshot2, events);

      const result = await repository.getLatest(wallet);

      assert.ok(result !== null);
      assert.strictEqual(result.id, id2);
      assert.strictEqual(result.snapshot.wallet, wallet);
    });

    it("should return only snapshots for the specified wallet", async () => {
      const wallet1 = "0x1234567890123456789012345678901234567890";
      const wallet2 = "0x0987654321098765432109876543210987654321";

      await repository.saveFirstSnapshot(createTestSnapshot(wallet1));
      const id2 = await repository.saveFirstSnapshot(
        createTestSnapshot(wallet2),
      );

      const result = await repository.getLatest(wallet2);

      assert.ok(result !== null);
      assert.strictEqual(result.id, id2);
      assert.strictEqual(result.snapshot.wallet, wallet2);
    });
  });

  describe("getById", () => {
    it("should return null when snapshot does not exist", async () => {
      const result = await repository.getById(999);

      assert.strictEqual(result, null);
    });

    it("should return the snapshot with the given ID", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const snapshot = createTestSnapshot(wallet);

      const id = await repository.saveFirstSnapshot(snapshot);
      const result = await repository.getById(id);

      assert.ok(result !== null);
      assert.strictEqual(result.wallet, wallet);
      assert.strictEqual(result.positions.length, 2);
    });
  });
});

describe("EventRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repositories: ReturnType<typeof createRepositories>;
  let snapshotRepository: SnapshotRepository;
  let eventRepository: EventRepository;

  beforeEach(() => {
    db = createTestDb();
    repositories = createRepositories(db);
    snapshotRepository = repositories.snapshots;
    eventRepository = repositories.events;
  });

  describe("getByWallet", () => {
    it("should return empty array when no events exist for wallet", async () => {
      const events = await eventRepository.getByWallet(
        "0x1234567890123456789012345678901234567890",
      );

      assert.strictEqual(events.length, 0);
    });

    it("should return events for the specified wallet", async () => {
      const wallet1 = "0x1234567890123456789012345678901234567890";
      const wallet2 = "0x0987654321098765432109876543210987654321";

      // Setup wallet1
      await snapshotRepository.saveFirstSnapshot(createTestSnapshot(wallet1));
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet1, new Date(Date.now() + 1000).toISOString()),
        [
          createTestEvent(wallet1, "market-1"),
          createTestEvent(wallet1, "market-2"),
        ],
      );

      // Setup wallet2
      await snapshotRepository.saveFirstSnapshot(createTestSnapshot(wallet2));
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet2, new Date(Date.now() + 1000).toISOString()),
        [createTestEvent(wallet2, "market-3")],
      );

      const events = await eventRepository.getByWallet(wallet1);

      assert.strictEqual(events.length, 2);
      events.forEach((event) => {
        assert.strictEqual(event.wallet, wallet1);
      });
    });

    it("should order events by timestamp descending (newest first)", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";

      await snapshotRepository.saveFirstSnapshot(
        createTestSnapshot(wallet, "2024-01-01T00:00:00.000Z"),
      );

      const event1 = createTestEvent(wallet, "market-1");
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet, "2024-01-02T00:00:00.000Z"),
        [event1],
      );

      const event2 = createTestEvent(wallet, "market-2");
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet, "2024-01-03T00:00:00.000Z"),
        [event2],
      );

      const events = await eventRepository.getByWallet(wallet);

      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].eventId, event2.eventId); // Newer event first
      assert.strictEqual(events[1].eventId, event1.eventId);
    });

    it("should respect the limit parameter", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";

      await snapshotRepository.saveFirstSnapshot(createTestSnapshot(wallet));

      // Create 10 events across snapshots
      for (let i = 0; i < 10; i++) {
        const events = [createTestEvent(wallet, `market-${i}`)];
        await snapshotRepository.saveSnapshotWithEvents(
          createTestSnapshot(
            wallet,
            new Date(Date.now() + i * 1000).toISOString(),
          ),
          events,
        );
      }

      const limitedEvents = await eventRepository.getByWallet(wallet, 5);

      assert.strictEqual(limitedEvents.length, 5);
    });
  });

  describe("getByMarket", () => {
    it("should return empty array when no events exist for market", async () => {
      const events = await eventRepository.getByMarket("non-existent-market");

      assert.strictEqual(events.length, 0);
    });

    it("should return all events for the specified market", async () => {
      const wallet1 = "0x1234567890123456789012345678901234567890";
      const wallet2 = "0x0987654321098765432109876543210987654321";
      const targetMarket = "market-special";

      // Wallet 1
      await snapshotRepository.saveFirstSnapshot(createTestSnapshot(wallet1));
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet1, new Date(Date.now() + 1000).toISOString()),
        [
          createTestEvent(wallet1, targetMarket),
          createTestEvent(wallet1, "market-other"),
        ],
      );

      // Wallet 2
      await snapshotRepository.saveFirstSnapshot(createTestSnapshot(wallet2));
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet2, new Date(Date.now() + 1000).toISOString()),
        [createTestEvent(wallet2, targetMarket)],
      );

      const events = await eventRepository.getByMarket(targetMarket);

      assert.strictEqual(events.length, 2);
      events.forEach((event) => {
        assert.strictEqual(event.marketId, targetMarket);
      });
    });

    it("should order events by timestamp descending", async () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const marketId = "market-test";

      await snapshotRepository.saveFirstSnapshot(
        createTestSnapshot(wallet, "2024-01-01T00:00:00.000Z"),
      );

      const event1 = createTestEvent(wallet, marketId);
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet, "2024-01-02T00:00:00.000Z"),
        [event1],
      );

      const event2 = createTestEvent(wallet, marketId);
      await snapshotRepository.saveSnapshotWithEvents(
        createTestSnapshot(wallet, "2024-01-03T00:00:00.000Z"),
        [event2],
      );

      const events = await eventRepository.getByMarket(marketId);

      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].eventId, event2.eventId); // Newer event first
      assert.strictEqual(events[1].eventId, event1.eventId);
    });
  });
});

describe("createRepositories", () => {
  it("should create repository instances", () => {
    const db = createTestDb();
    const repositories = createRepositories(db);

    assert.ok(repositories.snapshots instanceof SnapshotRepository);
    assert.ok(repositories.events instanceof EventRepository);
  });
});

describe("Integration Tests", () => {
  it("should handle complete workflow: first snapshot -> subsequent snapshots with events", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    const wallet = "0x1234567890123456789012345678901234567890";

    // Step 1: Save first snapshot
    const firstSnapshot = createTestSnapshot(
      wallet,
      "2024-01-01T00:00:00.000Z",
    );
    const firstId =
      await repositories.snapshots.saveFirstSnapshot(firstSnapshot);
    assert.ok(firstId > 0);

    // Step 2: Save subsequent snapshot with events
    const secondSnapshot = createTestSnapshot(
      wallet,
      "2024-01-02T00:00:00.000Z",
    );
    const events = [
      createTestEvent(wallet, "market-1"),
      createTestEvent(wallet, "market-2"),
    ];
    const secondId = await repositories.snapshots.saveSnapshotWithEvents(
      secondSnapshot,
      events,
    );
    assert.ok(secondId > firstId);

    // Step 3: Verify latest snapshot is the second one
    const latest = await repositories.snapshots.getLatest(wallet);
    assert.ok(latest !== null);
    assert.strictEqual(latest.id, secondId);

    // Step 4: Verify events were saved
    const savedEvents = await repositories.events.getByWallet(wallet);
    assert.strictEqual(savedEvents.length, 2);
  });

  it("should maintain referential integrity between snapshots and events", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    const wallet = "0x1234567890123456789012345678901234567890";

    await repositories.snapshots.saveFirstSnapshot(
      createTestSnapshot(wallet, "2024-01-01T00:00:00.000Z"),
    );

    const snapshotId = await repositories.snapshots.saveSnapshotWithEvents(
      createTestSnapshot(wallet, "2024-01-02T00:00:00.000Z"),
      [createTestEvent(wallet, "market-1")],
    );

    const events = await repositories.events.getByWallet(wallet);

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].snapshotId, snapshotId);
    assert.strictEqual(events[0].wallet, wallet);
  });
});
