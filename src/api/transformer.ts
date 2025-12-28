/**
 * Transforms Polymarket API responses to our internal Snapshot format
 */

import { PolymarketPosition } from "./types";
import { Position, Snapshot } from "@/types/core";

/**
 * Transforms Polymarket API positions into a Snapshot
 * Groups positions by market (conditionId) and combines YES/NO positions
 */
export function transformToSnapshot(
  wallet: string,
  apiPositions: PolymarketPosition[],
): Snapshot {
  // Group positions by conditionId (marketId)
  const positionsByMarket = new Map<string, Position>();

  for (const apiPos of apiPositions) {
    const marketId = apiPos.conditionId;

    // Get or create position for this market
    let position = positionsByMarket.get(marketId);
    if (!position) {
      position = {
        marketId,
        marketTitle: apiPos.title,
        yesShares: 0,
        noShares: 0,
        yesAvgPrice: null,
        noAvgPrice: null,
        resolvedOutcome: "unresolved", // Will be updated if market is resolved
      };
      positionsByMarket.set(marketId, position);
    }

    // Determine if this is a YES or NO position
    const isYesPosition = apiPos.outcome.toUpperCase() === "YES";

    if (isYesPosition) {
      position.yesShares = apiPos.size;
      // Clamp negative prices to 0 (API sometimes returns small negative values)
      position.yesAvgPrice =
        apiPos.avgPrice !== null ? Math.max(0, apiPos.avgPrice) : null;
    } else {
      position.noShares = apiPos.size;
      // Clamp negative prices to 0 (API sometimes returns small negative values)
      position.noAvgPrice =
        apiPos.avgPrice !== null ? Math.max(0, apiPos.avgPrice) : null;
    }

    // Note: We can't determine resolution status from positions API alone
    // Market must be queried separately if needed
    // For now, we assume unresolved unless we add market data enrichment
  }

  return {
    wallet,
    timestamp: new Date().toISOString(),
    positions: Array.from(positionsByMarket.values()),
  };
}

/**
 * Validates that a wallet address is properly formatted
 */
export function validateWalletAddress(address: string): boolean {
  // Must be 0x-prefixed hex string of 40 characters (20 bytes)
  const pattern = /^0x[a-fA-F0-9]{40}$/;
  return pattern.test(address);
}
