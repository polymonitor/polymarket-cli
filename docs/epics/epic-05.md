# Epic 5: Database Repositories

## Goal

Implement data access layer using Drizzle ORM to encapsulate all database operations with domain-specific methods that enforce business rules.

## Prerequisites

- Database schema defined (Epic 1)
- Type definitions completed (Epic 2)
- Database connection established (Epic 1)

## Design Philosophy

The repository layer enforces the **two valid operations** in this domain:

1. **First Snapshot**: Initialize tracking for a wallet (no events, prev_snapshot_id = NULL)
2. **Subsequent Snapshot**: Record detected changes (snapshot + events together, prev_snapshot_id set)

By providing distinct methods for each operation, we make invalid states **impossible to represent** at the API level.

### Blockchain-Like Chain Structure

Each snapshot (except the first) has a `prev_snapshot_id` foreign key pointing to the previous snapshot. This creates:

- **Explicit chain structure**: Snapshots form a linked list that can be traversed backward
- **Database-enforced integrity**: FK constraint ensures the chain is never broken
- **Immutable audit trail**: Each snapshot explicitly references its predecessor
- **Self-documenting schema**: The relationship is visible in the database structure

This makes the snapshot sequence explicit rather than implicit through timestamps.

## Tasks

### Snapshot Repository

Create repository with two atomic save operations and query methods.

**saveFirstSnapshot(snapshot: Snapshot): Promise<number>**

- Insert the first snapshot for a wallet
- Return the generated snapshot ID
- **Precondition check**: Error if wallet already has snapshots (prevents duplicate initialization)
- Used when initializing tracking for a new wallet

**saveSnapshotWithEvents(snapshot: Snapshot, events: WalletEvent[]): Promise<number>**

- Insert snapshot and all associated events atomically
- Return the generated snapshot ID
- **Precondition checks**:
  - Error if events array is empty (use saveFirstSnapshot instead)
  - Error if no previous snapshot exists (must initialize first)
- Used when recording detected changes from diff operation

**getLatest(wallet: string): Promise<{ id: number; snapshot: Snapshot } | null>**

- Query most recent snapshot for given wallet
- Order by timestamp descending, limit 1
- Return both ID and snapshot data
- Return null if no snapshots exist for wallet
- Used by service to get previous snapshot for diff comparison

**getById(id: number): Promise<Snapshot | null>**

- Query snapshot by ID
- Parse JSON snapshot_data
- Return typed Snapshot object
- Return null if not found

**Implementation notes:**

- Use Drizzle's query builder for type safety
- Parse JSON data and validate structure
- Handle database errors gracefully with descriptive messages
- Validation happens at method entry (fail-fast)
- Atomicity guaranteed by better-sqlite3's synchronous operations

### Event Repository

Create repository for event queries only (creation handled by SnapshotRepository).

**getByWallet(wallet: string, limit?: number): Promise<WalletEvent[]>**

- Query events for given wallet
- Join with snapshots table to get timestamp
- Order by snapshot timestamp descending (newest first)
- Apply limit if provided (default to 50)
- Return array of events with all fields

**getByMarket(marketId: string): Promise<WalletEvent[]>**

- Query all events for specific market
- Useful for analyzing market-specific activity
- Join with snapshots for timestamp
- Order by timestamp descending

**Implementation notes:**

- Use Drizzle joins to include snapshot timestamp
- Map database rows back to WalletEvent type
- Handle empty results gracefully (return empty array)
- Event creation is NOT exposed - handled by SnapshotRepository.saveSnapshotWithEvents()

### Repository Factory/Container

Create a way to instantiate and access repositories:

```typescript
interface Repositories {
  snapshots: SnapshotRepository;
  events: EventRepository;
}

export function createRepositories(db: Database): Repositories {
  return {
    snapshots: new SnapshotRepository(db),
    events: new EventRepository(db),
  };
}
```

### Error Handling

Handle database errors appropriately:

- Constraint violations (foreign key, unique, etc.)
- Connection errors
- Query errors
- Throw descriptive errors for calling code
- Preserve original error for precondition failures (wallet exists, no previous snapshot, etc.)

## Acceptance Criteria

- [x] SnapshotRepository.saveFirstSnapshot() errors if wallet already has snapshots
- [x] SnapshotRepository.saveFirstSnapshot() saves snapshot and returns ID
- [x] SnapshotRepository.saveSnapshotWithEvents() errors if no events provided
- [x] SnapshotRepository.saveSnapshotWithEvents() errors if no previous snapshot exists
- [x] SnapshotRepository.saveSnapshotWithEvents() saves snapshot + events atomically
- [x] SnapshotRepository.getLatest() retrieves most recent snapshot by wallet
- [x] SnapshotRepository.getById() retrieves snapshot by ID
- [x] EventRepository.getByWallet() queries events for wallet with limit
- [x] EventRepository.getByMarket() queries events by market ID
- [x] Queries use Drizzle for type safety
- [x] Database results properly typed
- [x] Joins work correctly (events with snapshot timestamps)
- [x] Repositories handle errors gracefully
- [x] Empty result sets handled correctly (return null or empty array)
- [x] API design prevents invalid operations (two methods, not one with conditionals)

## Testing

Write tests for repositories:

- Use in-memory SQLite database for testing
- Test saveFirstSnapshot success and duplicate prevention
- Test saveSnapshotWithEvents with all preconditions
- Test querying events by wallet and market
- Test limit parameter works
- Test with empty database (no results)
- Test foreign key relationships maintained
- Test complete workflow: first snapshot → subsequent snapshots with events

## Files Created

- `src/db/repositories/snapshot-repository.ts` - Snapshot operations
- `src/db/repositories/event-repository.ts` - Event queries
- `src/db/repositories/index.ts` - Repository factory
- `test/repositories.test.ts` - Comprehensive test suite

## Key Design Decision: Two Methods vs One

**Why `saveFirstSnapshot()` and `saveSnapshotWithEvents()` instead of one method?**

1. **Explicit Intent**: Method name tells you exactly what operation you're performing
2. **Type Safety**: Events parameter is required (not optional) in saveSnapshotWithEvents
3. **Fail-Fast**: Each method validates its specific preconditions
4. **No Conditional Logic**: No if/else checking events.length inside method
5. **Self-Documenting**: Code reads like the domain model
6. **Impossible to Misuse**: API prevents invalid calls (empty events, missing previous snapshot)

This follows the principle of "making illegal states unrepresentable" - the API itself enforces business rules.
