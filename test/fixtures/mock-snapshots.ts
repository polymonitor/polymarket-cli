/**
 * Mock snapshot data for testing
 */

import type { Position, Snapshot } from "@/types/core";

export const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
export const TIMESTAMP_1 = "2024-01-15T10:00:00.000Z";
export const TIMESTAMP_2 = "2024-01-15T11:00:00.000Z";
export const TIMESTAMP_3 = "2024-01-15T12:00:00.000Z";

/**
 * Create a mock position with optional overrides
 */
export function createPosition(overrides: Partial<Position> = {}): Position {
  return {
    marketId: "market-1",
    marketTitle: "Will Bitcoin reach $100k in 2024?",
    yesShares: 100,
    noShares: 0,
    yesAvgPrice: 0.5,
    noAvgPrice: null,
    resolvedOutcome: "unresolved",
    ...overrides,
  };
}

/**
 * Create a mock snapshot with optional positions and timestamp
 */
export function createSnapshot(
  positions: Position[],
  timestamp: string = TIMESTAMP_1,
  wallet: string = WALLET_ADDRESS,
): Snapshot {
  return {
    wallet,
    timestamp,
    positions,
  };
}

/**
 * Mock snapshot with a single YES position
 */
export const mockSnapshotSingleYes = createSnapshot([
  createPosition({
    marketId: "market-1",
    marketTitle: "Will Bitcoin reach $100k in 2024?",
    yesShares: 100,
    noShares: 0,
    yesAvgPrice: 0.5,
    noAvgPrice: null,
  }),
]);

/**
 * Mock snapshot with multiple positions
 */
export const mockSnapshotMultiple = createSnapshot([
  createPosition({
    marketId: "market-1",
    marketTitle: "Will Bitcoin reach $100k in 2024?",
    yesShares: 100,
    noShares: 50,
    yesAvgPrice: 0.5,
    noAvgPrice: 0.3,
  }),
  createPosition({
    marketId: "market-2",
    marketTitle: "Will Ethereum surpass Bitcoin in 2024?",
    yesShares: 0,
    noShares: 200,
    yesAvgPrice: null,
    noAvgPrice: 0.7,
  }),
]);

/**
 * Mock snapshot with resolved market
 */
export const mockSnapshotResolved = createSnapshot([
  createPosition({
    marketId: "market-1",
    marketTitle: "Will Bitcoin reach $100k in 2024?",
    yesShares: 100,
    noShares: 0,
    yesAvgPrice: 0.5,
    noAvgPrice: null,
    resolvedOutcome: "yes",
  }),
]);

/**
 * Empty snapshot (no positions)
 */
export const mockSnapshotEmpty = createSnapshot([]);
