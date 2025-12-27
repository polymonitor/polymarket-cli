# Epic 4: Core Diff Function ⭐

## Goal

Implement the **pure, reusable diff function** - the most important deliverable of this project.

## Why This Is Critical

This diff function is the intellectual property and core value of this POC. Everything else exists to validate that this function works correctly. It must be:

- Completely isolated (no external dependencies)
- Pure (no side effects)
- Thoroughly tested (100% code coverage)
- Well-documented
- Reusable in other projects

## Function Signature

```typescript
/**
 * Computes the difference between two wallet snapshots and generates events.
 *
 * This is a pure function with no side effects. It can be extracted and used
 * in any project that needs to detect changes between snapshots.
 *
 * @param prevSnapshot - Previous wallet snapshot (N-1), or null for first snapshot
 * @param currSnapshot - Current wallet snapshot (N)
 * @returns Array of events representing all changes (without snapshotId)
 */
export function computeDiff(
  prevSnapshot: Snapshot | null,
  currSnapshot: Snapshot,
): Omit<WalletEvent, "snapshotId">[];
```

## Algorithm

### Handle First Snapshot

If `prevSnapshot` is `null`:

- This is the first snapshot
- Return empty array (no events)
- The snapshot will be saved but no events generated

### Create Position Maps

For both snapshots, create maps indexed by `marketId`:

```typescript
const prevPositions = new Map(
  prevSnapshot.positions.map((p) => [p.marketId, p]),
);
const currPositions = new Map(
  currSnapshot.positions.map((p) => [p.marketId, p]),
);
```

### Iterate Current Positions

For each position in current snapshot:

**1. Position Opened (not in previous):**

- Event type: `POSITION_OPENED`
- Previous state: all null
- Current state: all current values
- Include market title for context

**2. Position Updated (in previous, values changed):**

- Event type: `POSITION_UPDATED`
- Previous state: values from prev snapshot
- Current state: values from curr snapshot
- Trigger when:
  - Share counts changed (yes or no)
  - Average prices changed (yes or no)
  - Any combination of the above

**3. Market Resolved (check resolution status):**

- Event type: `MARKET_RESOLVED`
- If market is now resolved but wasn't before
- Include `resolvedOutcome`
- Calculate and include `pnl`

### Iterate Previous Positions

For each position in previous snapshot:

**Position Closed (not in current):**

- Event type: `POSITION_CLOSED`
- Previous state: all previous values
- Current state: all null
- Position was fully exited

### Event Creation

Helper function to create event objects:

```typescript
function createEvent(
  type: EventType,
  wallet: string,
  marketId: string,
  marketTitle: string,
  prev: Position | null,
  curr: Position | null,
): Omit<WalletEvent, "snapshotId"> {
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
    // resolvedOutcome and pnl set for MARKET_RESOLVED events
  };
}
```

Note: `snapshotId` is not included - it's added later when saving to database.

### PnL Calculation

Create helper function for resolved market PnL:

```typescript
function calculatePnL(
  position: Position,
  resolvedOutcome: "yes" | "no" | "invalid",
): number {
  // Calculate profit/loss based on:
  // - Shares held (yes/no)
  // - Outcome (yes/no/invalid)
  // - Average price paid
  // Research Polymarket settlement mechanics:
  // - Winning side: payout = shares * (1 - avg_price)
  // - Losing side: payout = -shares * avg_price
  // - Invalid: all get refunded?
  // Return calculated PnL
}
```

**Note:** Research exact Polymarket settlement formulas to ensure accuracy.

## Edge Cases to Handle

1. **Identical snapshots** - Return empty array (no changes)
2. **First snapshot** - Return empty array
3. **Position with only price change** - Still POSITION_UPDATED
4. **Position with only share count change** - Still POSITION_UPDATED
5. **Market resolves while position held** - Generate MARKET_RESOLVED event
6. **Multiple changes to same position** - Should only generate one event with all changes
7. **Empty previous positions** - First snapshot case
8. **Empty current positions** - All positions closed

## Testing Requirements

Create comprehensive test suite with 100% coverage:

### Test Scenarios

**First snapshot:**

- Previous is null → returns empty array
- Verify no events generated

**Position opened:**

- Market in current but not previous
- Verify POSITION_OPENED event
- Verify all previous values are null
- Verify all current values populated

**Position updated - shares changed:**

- Market in both snapshots
- Share count different
- Verify POSITION_UPDATED event
- Verify correct before/after values

**Position updated - prices changed:**

- Market in both snapshots
- Average price different
- Verify POSITION_UPDATED event
- Verify correct before/after values

**Position updated - multiple changes:**

- Both shares and prices changed
- Verify single POSITION_UPDATED event captures all changes

**Position closed:**

- Market in previous but not current
- Verify POSITION_CLOSED event
- Verify all current values are null
- Verify all previous values populated

**Market resolved:**

- Market resolution status changed
- Verify MARKET_RESOLVED event
- Verify resolvedOutcome included
- Verify PnL calculated correctly

**Multiple changes:**

- Some opened, some updated, some closed
- Verify all events generated correctly
- Verify events are distinct and correct

**Identical snapshots:**

- Previous and current are same
- Verify empty array returned
- No events generated

**Empty positions:**

- Handle empty position arrays gracefully

### Test Implementation

Use test fixtures:

- Create mock snapshot objects
- Test with various position combinations
- Use descriptive test names
- Assert on exact event properties
- Verify event counts

## Documentation

Add comprehensive JSDoc to the function:

- Clear description of what it does
- Explanation of parameters
- Explanation of return value
- Examples of usage
- Notes on purity and reusability

## Acceptance Criteria

- [ ] Function signature matches specification
- [ ] Function is pure (no side effects, no external calls)
- [ ] No dependencies except standard library and types
- [ ] Handles first snapshot (null previous) correctly
- [ ] Detects position opened correctly
- [ ] Detects position updated correctly (shares)
- [ ] Detects position updated correctly (prices)
- [ ] Detects position updated correctly (multiple changes)
- [ ] Detects position closed correctly
- [ ] Detects market resolution correctly
- [ ] Calculates PnL correctly for resolved markets
- [ ] Handles identical snapshots correctly (no events)
- [ ] Handles multiple simultaneous changes correctly
- [ ] All edge cases handled
- [ ] Test coverage is 100%
- [ ] Function is well-documented with JSDoc
- [ ] Code is clean and readable
- [ ] Can be extracted to another project without modification

## Files to Create

Suggested files (organize as you prefer):

- Core diff function
- PnL calculation helper
- Event creation helper
- Comprehensive test suite
- Test fixtures
