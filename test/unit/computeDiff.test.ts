/**
 * Comprehensive test suite for computeDiff function
 * Target: 100% code coverage
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { computeDiff } from "@/diff/computeDiff";
import type { Position, Snapshot } from "@/types/core";

describe("computeDiff", () => {
  const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
  const TIMESTAMP_PREV = "2024-01-15T10:00:00.000Z";
  const TIMESTAMP_CURR = "2024-01-15T11:00:00.000Z";

  /**
   * Test fixtures
   */
  const createPosition = (overrides: Partial<Position> = {}): Position => ({
    marketId: "market-1",
    marketTitle: "Will Bitcoin reach $100k in 2024?",
    yesShares: 100,
    noShares: 0,
    yesAvgPrice: 0.5,
    noAvgPrice: null,
    resolvedOutcome: "unresolved",
    ...overrides,
  });

  const createSnapshot = (
    positions: Position[],
    timestamp: string = TIMESTAMP_CURR,
  ): Snapshot => ({
    wallet: WALLET_ADDRESS,
    timestamp,
    positions,
  });

  describe("Position Opened", () => {
    it("should detect a new position opening", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([createPosition()]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_OPENED");
      assert.strictEqual(events[0].wallet, WALLET_ADDRESS);
      assert.strictEqual(events[0].marketId, "market-1");
      assert.strictEqual(
        events[0].marketTitle,
        "Will Bitcoin reach $100k in 2024?",
      );
      assert.strictEqual(events[0].prevYesShares, null);
      assert.strictEqual(events[0].prevNoShares, null);
      assert.strictEqual(events[0].prevYesAvgPrice, null);
      assert.strictEqual(events[0].prevNoAvgPrice, null);
      assert.strictEqual(events[0].currYesShares, 100);
      assert.strictEqual(events[0].currNoShares, 0);
      assert.strictEqual(events[0].currYesAvgPrice, 0.5);
      assert.strictEqual(events[0].currNoAvgPrice, null);
      assert.strictEqual(events[0].resolvedOutcome, "unresolved");
      assert.ok(events[0].eventId);
    });

    it("should detect multiple positions opening", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([
        createPosition({ marketId: "market-1" }),
        createPosition({ marketId: "market-2", marketTitle: "Market 2" }),
        createPosition({ marketId: "market-3", marketTitle: "Market 3" }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 3);
      assert.ok(events.every((e) => e.eventType === "POSITION_OPENED"));
      assert.deepStrictEqual(
        events.map((e) => e.marketId),
        ["market-1", "market-2", "market-3"],
      );
    });
  });

  describe("Position Updated", () => {
    it("should detect YES shares increase", () => {
      const position = createPosition();
      const prev = createSnapshot([position]);
      const curr = createSnapshot([
        createPosition({ yesShares: 150 }), // Increased from 100
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevYesShares, 100);
      assert.strictEqual(events[0].currYesShares, 150);
    });

    it("should detect YES shares decrease", () => {
      const position = createPosition();
      const prev = createSnapshot([position]);
      const curr = createSnapshot([
        createPosition({ yesShares: 50 }), // Decreased from 100
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevYesShares, 100);
      assert.strictEqual(events[0].currYesShares, 50);
    });

    it("should detect NO shares change", () => {
      const prev = createSnapshot([createPosition({ noShares: 100 })]);
      const curr = createSnapshot([createPosition({ noShares: 200 })]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevNoShares, 100);
      assert.strictEqual(events[0].currNoShares, 200);
    });

    it("should detect YES average price change", () => {
      const prev = createSnapshot([createPosition({ yesAvgPrice: 0.5 })]);
      const curr = createSnapshot([createPosition({ yesAvgPrice: 0.6 })]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevYesAvgPrice, 0.5);
      assert.strictEqual(events[0].currYesAvgPrice, 0.6);
    });

    it("should detect NO average price change", () => {
      const prev = createSnapshot([
        createPosition({ noShares: 100, noAvgPrice: 0.4 }),
      ]);
      const curr = createSnapshot([
        createPosition({ noShares: 100, noAvgPrice: 0.45 }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevNoAvgPrice, 0.4);
      assert.strictEqual(events[0].currNoAvgPrice, 0.45);
    });

    it("should detect multiple changes in same position", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          noShares: 50,
          yesAvgPrice: 0.5,
          noAvgPrice: 0.4,
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 150,
          noShares: 75,
          yesAvgPrice: 0.55,
          noAvgPrice: 0.45,
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_UPDATED");
      assert.strictEqual(events[0].prevYesShares, 100);
      assert.strictEqual(events[0].prevNoShares, 50);
      assert.strictEqual(events[0].prevYesAvgPrice, 0.5);
      assert.strictEqual(events[0].prevNoAvgPrice, 0.4);
      assert.strictEqual(events[0].currYesShares, 150);
      assert.strictEqual(events[0].currNoShares, 75);
      assert.strictEqual(events[0].currYesAvgPrice, 0.55);
      assert.strictEqual(events[0].currNoAvgPrice, 0.45);
    });

    it("should not generate event if position unchanged", () => {
      const position = createPosition();
      const prev = createSnapshot([position]);
      const curr = createSnapshot([createPosition()]); // Identical

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 0);
    });
  });

  describe("Position Closed", () => {
    it("should detect a position being closed", () => {
      const prev = createSnapshot([createPosition()]);
      const curr = createSnapshot([]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_CLOSED");
      assert.strictEqual(events[0].wallet, WALLET_ADDRESS);
      assert.strictEqual(events[0].marketId, "market-1");
      assert.strictEqual(
        events[0].marketTitle,
        "Will Bitcoin reach $100k in 2024?",
      );
      assert.strictEqual(events[0].prevYesShares, 100);
      assert.strictEqual(events[0].prevNoShares, 0);
      assert.strictEqual(events[0].prevYesAvgPrice, 0.5);
      assert.strictEqual(events[0].prevNoAvgPrice, null);
      assert.strictEqual(events[0].currYesShares, null);
      assert.strictEqual(events[0].currNoShares, null);
      assert.strictEqual(events[0].currYesAvgPrice, null);
      assert.strictEqual(events[0].currNoAvgPrice, null);
    });

    it("should detect multiple positions closing", () => {
      const prev = createSnapshot([
        createPosition({ marketId: "market-1" }),
        createPosition({ marketId: "market-2" }),
        createPosition({ marketId: "market-3" }),
      ]);
      const curr = createSnapshot([]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 3);
      assert.ok(events.every((e) => e.eventType === "POSITION_CLOSED"));
    });
  });

  describe("Market Resolved", () => {
    it("should detect market resolving to YES", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6,
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6,
          noShares: 0,
          resolvedOutcome: "yes",
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "MARKET_RESOLVED");
      assert.strictEqual(events[0].resolvedOutcome, "yes");
      assert.ok(typeof events[0].pnl === "number");
    });

    it("should detect market resolving to NO", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.4,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.4,
          resolvedOutcome: "no",
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "MARKET_RESOLVED");
      assert.strictEqual(events[0].resolvedOutcome, "no");
      assert.ok(typeof events[0].pnl === "number");
    });

    it("should detect market resolving to invalid", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.5,
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.5,
          noShares: 0,
          resolvedOutcome: "invalid",
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "MARKET_RESOLVED");
      assert.strictEqual(events[0].resolvedOutcome, "invalid");
      assert.strictEqual(events[0].pnl, 0); // Invalid means refund, net zero PnL
    });

    it("should not generate MARKET_RESOLVED if already resolved", () => {
      const prev = createSnapshot([createPosition({ resolvedOutcome: "yes" })]);
      const curr = createSnapshot([createPosition({ resolvedOutcome: "yes" })]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 0);
    });
  });

  describe("PnL Calculation", () => {
    it("should calculate positive PnL for winning YES position", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.4, // Bought at 40 cents
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.4,
          noShares: 0,
          resolvedOutcome: "yes", // Wins, gets $1 per share
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].pnl, 60); // 100 * (1.0 - 0.4) = 60
    });

    it("should calculate negative PnL for losing YES position", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6, // Bought at 60 cents
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6,
          noShares: 0,
          resolvedOutcome: "no", // Loses, gets $0
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].pnl, -60); // 0 - (100 * 0.6) = -60
    });

    it("should calculate positive PnL for winning NO position", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.3, // Bought at 30 cents
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.3,
          resolvedOutcome: "no", // Wins, gets $1 per share
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].pnl, 70); // 100 * (1.0 - 0.3) = 70
    });

    it("should calculate negative PnL for losing NO position", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.5, // Bought at 50 cents
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 0,
          noShares: 100,
          yesAvgPrice: null,
          noAvgPrice: 0.5,
          resolvedOutcome: "yes", // Loses, gets $0
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].pnl, -50); // 0 - (100 * 0.5) = -50
    });

    it("should calculate PnL for position with both YES and NO shares", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6,
          noShares: 50,
          noAvgPrice: 0.3,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.6,
          noShares: 50,
          noAvgPrice: 0.3,
          resolvedOutcome: "yes", // YES wins
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      // YES: 100 * (1.0 - 0.6) = 40
      // NO: 0 - (50 * 0.3) = -15
      // Total: 40 - 15 = 25
      assert.strictEqual(events[0].pnl, 25);
    });

    it("should handle null average prices", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: null, // No cost basis
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: null,
          noShares: 0,
          resolvedOutcome: "yes",
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].pnl, 100); // 100 * (1.0 - 0) = 100
    });
  });

  describe("Multiple Changes", () => {
    it("should detect all change types in single diff", () => {
      const prev = createSnapshot([
        createPosition({ marketId: "market-1", marketTitle: "Market 1" }), // Will be updated
        createPosition({ marketId: "market-2", marketTitle: "Market 2" }), // Will be closed
        createPosition({
          marketId: "market-3",
          marketTitle: "Market 3",
          resolvedOutcome: "unresolved",
        }), // Will be resolved
      ]);

      const curr = createSnapshot([
        createPosition({
          marketId: "market-1",
          marketTitle: "Market 1",
          yesShares: 150,
        }), // Updated
        createPosition({ marketId: "market-4", marketTitle: "Market 4" }), // Opened
        createPosition({
          marketId: "market-3",
          marketTitle: "Market 3",
          resolvedOutcome: "yes",
        }), // Resolved
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 4);

      const types = events.map((e) => e.eventType);
      assert.ok(types.includes("POSITION_UPDATED"));
      assert.ok(types.includes("POSITION_OPENED"));
      assert.ok(types.includes("POSITION_CLOSED"));
      assert.ok(types.includes("MARKET_RESOLVED"));
    });

    it("should generate both POSITION_UPDATED and MARKET_RESOLVED for same market", () => {
      const prev = createSnapshot([
        createPosition({
          yesShares: 100,
          yesAvgPrice: 0.5,
          noShares: 0,
          resolvedOutcome: "unresolved",
        }),
      ]);
      const curr = createSnapshot([
        createPosition({
          yesShares: 150, // Changed
          yesAvgPrice: 0.55, // Changed
          noShares: 0,
          resolvedOutcome: "yes", // Resolved
        }),
      ]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 2);
      assert.deepStrictEqual(
        events.map((e) => e.eventType),
        ["POSITION_UPDATED", "MARKET_RESOLVED"],
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle identical snapshots", () => {
      const position = createPosition();
      const prev = createSnapshot([position]);
      const curr = createSnapshot([createPosition()]); // Same position

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 0);
    });

    it("should handle empty previous positions", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([createPosition()]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eventType, "POSITION_OPENED");
    });

    it("should handle empty current positions (all closed)", () => {
      const prev = createSnapshot([
        createPosition({ marketId: "market-1" }),
        createPosition({ marketId: "market-2" }),
      ]);
      const curr = createSnapshot([]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 2);
      assert.ok(events.every((e) => e.eventType === "POSITION_CLOSED"));
    });

    it("should handle both snapshots with empty positions", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events.length, 0);
    });
  });

  describe("Event Structure", () => {
    it("should generate unique event IDs", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([
        createPosition({ marketId: "market-1" }),
        createPosition({ marketId: "market-2" }),
        createPosition({ marketId: "market-3" }),
      ]);

      const events = computeDiff(prev, curr);

      const eventIds = events.map((e) => e.eventId);
      const uniqueIds = new Set(eventIds);

      assert.strictEqual(uniqueIds.size, events.length);
    });

    it("should include wallet address in all events", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([createPosition()]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(events[0].wallet, WALLET_ADDRESS);
    });

    it("should include market title in all events", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([createPosition()]);

      const events = computeDiff(prev, curr);

      assert.strictEqual(
        events[0].marketTitle,
        "Will Bitcoin reach $100k in 2024?",
      );
    });

    it("should not include snapshotId", () => {
      const prev = createSnapshot([]);
      const curr = createSnapshot([createPosition()]);

      const events = computeDiff(prev, curr);

      assert.ok(!("snapshotId" in events[0]));
    });
  });
});
