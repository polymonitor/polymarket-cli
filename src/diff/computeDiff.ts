/**
 * Core diff function for detecting changes between wallet snapshots
 *
 * This is a pure, reusable function with no external dependencies.
 * It can be extracted and used in any project that needs to detect
 * changes between Polymarket wallet snapshots.
 */

import type { DiffEvent, EventType, Position, Snapshot } from "@/types/core";

/**
 * Computes the difference between two wallet snapshots and generates events.
 *
 * This is a pure function with no side effects. It can be extracted and used
 * in any project that needs to detect changes between snapshots.
 *
 * Events are self-contained and include complete before/after state, making
 * them suitable for notifications without requiring additional data lookups.
 *
 * @param prevSnapshot - Previous wallet snapshot (N-1), or null for first snapshot
 * @param currSnapshot - Current wallet snapshot (N)
 * @returns Array of DiffEvents (events without snapshotId - assigned by repository)
 *
 * @example
 * ```typescript
 * const prev = await fetchPreviousSnapshot(wallet);
 * const curr = await fetchCurrentSnapshot(wallet);
 * const events = computeDiff(prev, curr);
 *
 * if (events.length > 0) {
 *   console.log(`Detected ${events.length} changes`);
 *   // Save events to database or send notifications
 * }
 * ```
 */
export function computeDiff(
  prevSnapshot: Snapshot | null,
  currSnapshot: Snapshot,
): DiffEvent[] {
  // Handle first snapshot - no events to generate
  if (prevSnapshot === null) {
    return [];
  }

  const events: DiffEvent[] = [];

  // Create position maps indexed by marketId for efficient lookups
  const prevPositions = new Map(
    prevSnapshot.positions.map((p) => [p.marketId, p]),
  );
  const currPositions = new Map(
    currSnapshot.positions.map((p) => [p.marketId, p]),
  );

  // Iterate current positions to detect opened and updated positions
  for (const currPos of currSnapshot.positions) {
    const prevPos = prevPositions.get(currPos.marketId);

    if (!prevPos) {
      // Position opened - new position not in previous snapshot
      events.push(
        createEvent(
          "POSITION_OPENED",
          currSnapshot.wallet,
          currPos.marketId,
          currPos.marketTitle,
          null,
          currPos,
        ),
      );
    } else {
      // Position exists in both - check for updates
      const hasChanged = positionChanged(prevPos, currPos);

      if (hasChanged) {
        events.push(
          createEvent(
            "POSITION_UPDATED",
            currSnapshot.wallet,
            currPos.marketId,
            currPos.marketTitle,
            prevPos,
            currPos,
          ),
        );
      }

      // Check if market resolved
      const wasUnresolved = prevPos.resolvedOutcome === "unresolved";
      const isNowResolved = currPos.resolvedOutcome !== "unresolved";

      if (wasUnresolved && isNowResolved) {
        const pnl = calculatePnL(currPos, currPos.resolvedOutcome);

        events.push({
          ...createEvent(
            "MARKET_RESOLVED",
            currSnapshot.wallet,
            currPos.marketId,
            currPos.marketTitle,
            prevPos,
            currPos,
          ),
          pnl,
        });
      }
    }
  }

  // Iterate previous positions to detect closed positions
  for (const prevPos of prevSnapshot.positions) {
    const currPos = currPositions.get(prevPos.marketId);

    if (!currPos) {
      // Position closed - existed in previous but not in current
      events.push(
        createEvent(
          "POSITION_CLOSED",
          currSnapshot.wallet,
          prevPos.marketId,
          prevPos.marketTitle,
          prevPos,
          null,
        ),
      );
    }
  }

  return events;
}

/**
 * Creates an event object with complete before/after state
 *
 * @param type - Event type
 * @param wallet - Wallet address
 * @param marketId - Market identifier
 * @param marketTitle - Market title for context
 * @param prev - Previous position (null if opened)
 * @param curr - Current position (null if closed)
 * @returns DiffEvent (event without snapshotId)
 */
function createEvent(
  type: EventType,
  wallet: string,
  marketId: string,
  marketTitle: string,
  prev: Position | null,
  curr: Position | null,
): DiffEvent {
  return {
    eventId: crypto.randomUUID(),
    wallet,
    eventType: type,
    marketId,
    marketTitle,
    prevYesShares: prev?.yesShares ?? null,
    prevNoShares: prev?.noShares ?? null,
    prevYesAvgPrice: prev?.yesAvgPrice ?? null,
    prevNoAvgPrice: prev?.noAvgPrice ?? null,
    currYesShares: curr?.yesShares ?? null,
    currNoShares: curr?.noShares ?? null,
    currYesAvgPrice: curr?.yesAvgPrice ?? null,
    currNoAvgPrice: curr?.noAvgPrice ?? null,
    resolvedOutcome:
      curr?.resolvedOutcome ?? prev?.resolvedOutcome ?? "unresolved",
  };
}

/**
 * Checks if a position has changed between snapshots
 *
 * @param prev - Previous position
 * @param curr - Current position
 * @returns True if any values changed
 */
function positionChanged(prev: Position, curr: Position): boolean {
  return (
    prev.yesShares !== curr.yesShares ||
    prev.noShares !== curr.noShares ||
    prev.yesAvgPrice !== curr.yesAvgPrice ||
    prev.noAvgPrice !== curr.noAvgPrice
  );
}

/**
 * Calculates profit/loss for a resolved market position
 *
 * Based on Polymarket settlement mechanics:
 * - Winning side: receives $1 per share
 * - Losing side: shares become worthless
 * - Invalid: all participants get refunded their cost basis
 *
 * PnL = (payout - cost basis)
 * - Payout for winning side: shares * $1
 * - Payout for losing side: $0
 * - Payout for invalid: shares * avgPrice (refund)
 * - Cost basis: shares * avgPrice
 *
 * @param position - Position to calculate PnL for
 * @param resolvedOutcome - How the market resolved
 * @returns Profit/loss in dollars
 */
function calculatePnL(
  position: Position,
  resolvedOutcome: "yes" | "no" | "invalid" | "unresolved",
): number {
  if (resolvedOutcome === "unresolved") {
    return 0;
  }

  let pnl = 0;

  if (resolvedOutcome === "yes") {
    // YES side wins - gets $1 per share
    const yesPayout = position.yesShares * 1.0;
    const yesCost = position.yesShares * (position.yesAvgPrice ?? 0);
    const yesPnL = yesPayout - yesCost;

    // NO side loses - gets $0
    const noCost = position.noShares * (position.noAvgPrice ?? 0);
    const noPnL = 0 - noCost;

    pnl = yesPnL + noPnL;
  } else if (resolvedOutcome === "no") {
    // NO side wins - gets $1 per share
    const noPayout = position.noShares * 1.0;
    const noCost = position.noShares * (position.noAvgPrice ?? 0);
    const noPnL = noPayout - noCost;

    // YES side loses - gets $0
    const yesCost = position.yesShares * (position.yesAvgPrice ?? 0);
    const yesPnL = 0 - yesCost;

    pnl = yesPnL + noPnL;
  } else if (resolvedOutcome === "invalid") {
    // Invalid - all get refunded their cost basis (net zero)
    // Payout equals cost, so PnL = 0
    pnl = 0;
  }

  return pnl;
}
