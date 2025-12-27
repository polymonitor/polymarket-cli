/**
 * Tests for SnapshotService
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { SnapshotService } from "@/services/snapshot-service";
import type { SnapshotResult } from "@/services/snapshot-service";
import type { PolymarketAPI } from "@/api";
import type { Repositories } from "@/db/repositories";
import type { Snapshot, WalletEvent } from "@/types/core";
import { ValidationError } from "@/validation/validators";

// Test data
const TEST_WALLET = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";

const createMockSnapshot = (
  wallet: string,
  timestamp: string,
  positions: any[] = [],
): Snapshot => ({
  wallet,
  timestamp,
  positions,
});

const MOCK_POSITION_1 = {
  marketId: "market1",
  marketTitle: "Will BTC hit $100k?",
  yesShares: 10,
  noShares: 5,
  yesAvgPrice: 0.6,
  noAvgPrice: 0.4,
  resolvedOutcome: "unresolved" as const,
};

const MOCK_POSITION_2 = {
  marketId: "market2",
  marketTitle: "Will ETH flip BTC?",
  yesShares: 20,
  noShares: 0,
  yesAvgPrice: 0.3,
  noAvgPrice: null,
  resolvedOutcome: "unresolved" as const,
};

describe("SnapshotService", () => {
  describe("takeSnapshot - first snapshot", () => {
    it("should save first snapshot with no events", async () => {
      // Create mocks
      const mockSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => mockSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => null), // No previous snapshot
          saveFirstSnapshot: mock.fn(async () => 1), // Returns snapshot ID 1
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify
      assert.strictEqual(result.isFirstSnapshot, true);
      assert.strictEqual(result.saved, true);
      assert.strictEqual(result.events.length, 0);
      assert.deepStrictEqual(result.snapshot, mockSnapshot);

      // Verify mocks were called correctly
      const apiCalls = (mockApi.getWalletPositions as any).mock.calls;
      assert.strictEqual(apiCalls.length, 1);
      assert.strictEqual(apiCalls[0].arguments[0], TEST_WALLET);

      const getLatestCalls = (mockRepos.snapshots.getLatest as any).mock.calls;
      assert.strictEqual(getLatestCalls.length, 1);
      assert.strictEqual(getLatestCalls[0].arguments[0], TEST_WALLET);

      const saveFirstCalls = (mockRepos.snapshots.saveFirstSnapshot as any).mock
        .calls;
      assert.strictEqual(saveFirstCalls.length, 1);
      assert.deepStrictEqual(saveFirstCalls[0].arguments[0], mockSnapshot);
    });
  });

  describe("takeSnapshot - no changes", () => {
    it("should not save when positions are identical", async () => {
      // Create identical snapshots
      const previousSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      const currentSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T01:00:00Z",
        [MOCK_POSITION_1], // Identical positions
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => currentSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => ({
            id: 1,
            snapshot: previousSnapshot,
          })),
          saveSnapshotWithEvents: mock.fn(async () => 2),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify
      assert.strictEqual(result.isFirstSnapshot, false);
      assert.strictEqual(result.saved, false);
      assert.strictEqual(result.events.length, 0);
      assert.deepStrictEqual(result.snapshot, currentSnapshot);

      // Verify saveSnapshotWithEvents was NOT called
      const saveCalls = (mockRepos.snapshots.saveSnapshotWithEvents as any).mock
        .calls;
      assert.strictEqual(saveCalls.length, 0);
    });
  });

  describe("takeSnapshot - with changes", () => {
    it("should save snapshot and events when positions changed", async () => {
      // Create snapshots with different positions
      const previousSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      const updatedPosition = {
        ...MOCK_POSITION_1,
        yesShares: 15, // Changed from 10 to 15
      };

      const currentSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T01:00:00Z",
        [updatedPosition],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => currentSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => ({
            id: 1,
            snapshot: previousSnapshot,
          })),
          saveSnapshotWithEvents: mock.fn(async () => 2), // Returns snapshot ID 2
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify
      assert.strictEqual(result.isFirstSnapshot, false);
      assert.strictEqual(result.saved, true);
      assert.strictEqual(result.events.length, 1);
      assert.strictEqual(result.events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(result.events[0].snapshotId, 2);

      // Verify saveSnapshotWithEvents was called
      const saveCalls = (mockRepos.snapshots.saveSnapshotWithEvents as any).mock
        .calls;
      assert.strictEqual(saveCalls.length, 1);
      assert.deepStrictEqual(saveCalls[0].arguments[0], currentSnapshot);

      const savedEvents = saveCalls[0].arguments[1];
      assert.strictEqual(savedEvents.length, 1);
      assert.strictEqual(savedEvents[0].eventType, "POSITION_UPDATED");
    });

    it("should detect position opened", async () => {
      // Previous: only position 1
      const previousSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      // Current: position 1 and 2
      const currentSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T01:00:00Z",
        [MOCK_POSITION_1, MOCK_POSITION_2],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => currentSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => ({
            id: 1,
            snapshot: previousSnapshot,
          })),
          saveSnapshotWithEvents: mock.fn(async () => 2),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify
      assert.strictEqual(result.saved, true);
      assert.strictEqual(result.events.length, 1);
      assert.strictEqual(result.events[0].eventType, "POSITION_OPENED");
      assert.strictEqual(result.events[0].marketId, "market2");
      assert.strictEqual(result.events[0].prevYesShares, null);
      assert.strictEqual(result.events[0].currYesShares, 20);
    });

    it("should detect position closed", async () => {
      // Previous: positions 1 and 2
      const previousSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1, MOCK_POSITION_2],
      );

      // Current: only position 1
      const currentSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T01:00:00Z",
        [MOCK_POSITION_1],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => currentSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => ({
            id: 1,
            snapshot: previousSnapshot,
          })),
          saveSnapshotWithEvents: mock.fn(async () => 2),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify
      assert.strictEqual(result.saved, true);
      assert.strictEqual(result.events.length, 1);
      assert.strictEqual(result.events[0].eventType, "POSITION_CLOSED");
      assert.strictEqual(result.events[0].marketId, "market2");
      assert.strictEqual(result.events[0].prevYesShares, 20);
      assert.strictEqual(result.events[0].currYesShares, null);
    });

    it("should detect market resolution", async () => {
      // Previous: unresolved
      const previousSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      // Current: resolved to YES
      const resolvedPosition = {
        ...MOCK_POSITION_1,
        resolvedOutcome: "yes" as const,
      };

      const currentSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T01:00:00Z",
        [resolvedPosition],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => currentSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => ({
            id: 1,
            snapshot: previousSnapshot,
          })),
          saveSnapshotWithEvents: mock.fn(async () => 2),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute
      const result = await service.takeSnapshot(TEST_WALLET);

      // Verify - should have MARKET_RESOLVED event
      assert.strictEqual(result.saved, true);
      assert.ok(result.events.length >= 1);

      const resolvedEvent = result.events.find(
        (e) => e.eventType === "MARKET_RESOLVED",
      );
      assert.ok(resolvedEvent, "Should have MARKET_RESOLVED event");
      assert.strictEqual(resolvedEvent!.marketId, "market1");
      assert.strictEqual(resolvedEvent!.resolvedOutcome, "yes");
      assert.ok(typeof resolvedEvent!.pnl === "number");
    });
  });

  describe("takeSnapshot - error handling", () => {
    it("should throw ValidationError for invalid wallet", async () => {
      const mockApi = {} as unknown as PolymarketAPI;
      const mockRepos = {} as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute and verify error
      await assert.rejects(
        async () => {
          await service.takeSnapshot("invalid-wallet");
        },
        {
          name: "ValidationError",
        },
      );
    });

    it("should propagate API errors", async () => {
      const mockApi = {
        getWalletPositions: mock.fn(async () => {
          throw new Error("Network failure");
        }),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => null),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute and verify error
      await assert.rejects(
        async () => {
          await service.takeSnapshot(TEST_WALLET);
        },
        {
          message: /Network failure/,
        },
      );
    });

    it("should propagate database errors", async () => {
      const mockSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => mockSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => null),
          saveFirstSnapshot: mock.fn(async () => {
            throw new Error("Database connection failed");
          }),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute and verify error
      await assert.rejects(
        async () => {
          await service.takeSnapshot(TEST_WALLET);
        },
        {
          message: /Database connection failed/,
        },
      );
    });

    it("should wrap unknown errors with context", async () => {
      const mockSnapshot = createMockSnapshot(
        TEST_WALLET,
        "2025-01-01T00:00:00Z",
        [MOCK_POSITION_1],
      );

      const mockApi = {
        getWalletPositions: mock.fn(async () => mockSnapshot),
      } as unknown as PolymarketAPI;

      const mockRepos = {
        snapshots: {
          getLatest: mock.fn(async () => {
            throw new Error("Unknown database error");
          }),
        },
        events: {},
      } as unknown as Repositories;

      const service = new SnapshotService(mockApi, mockRepos);

      // Execute and verify error includes wallet context
      await assert.rejects(
        async () => {
          await service.takeSnapshot(TEST_WALLET);
        },
        {
          message: new RegExp(TEST_WALLET),
        },
      );
    });
  });
});
