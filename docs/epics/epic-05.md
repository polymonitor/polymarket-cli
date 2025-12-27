# Epic 5: Database Repositories

## Goal

Implement data access layer using Drizzle ORM to encapsulate all database operations.

## Prerequisites

- Database schema defined (Epic 1)
- Type definitions completed (Epic 2)
- Database connection established (Epic 1)

## Tasks

### Snapshot Repository

Create repository for snapshot operations.

**Methods to implement:**

**save(snapshot: Snapshot): Promise<number>**

- Insert snapshot into database
- Return the generated snapshot ID
- Snapshot data stored as JSON

**getLatest(wallet: string): Promise<{ id: number; snapshot: Snapshot } | null>**

- Query most recent snapshot for given wallet
- Order by timestamp descending, limit 1
- Return both ID and snapshot data
- Return null if no snapshots exist for wallet

**getById(id: number): Promise<Snapshot | null>**

- Query snapshot by ID
- Parse JSON snapshot_data
- Return typed Snapshot object
- Return null if not found

**Implementation notes:**

- Use Drizzle's query builder for type safety
- Parse JSON data and validate structure
- Handle database errors gracefully
- Add proper indexes on wallet and timestamp columns

### Event Repository

Create repository for event operations.

**Methods to implement:**

**save(events: Array<WalletEvent & { snapshotId: number }>): Promise<void>**

- Batch insert array of events
- All events have snapshotId set
- Use transaction for atomicity

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
- Handle empty results gracefully
- Add proper indexes on wallet and marketId

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

### Database Transaction Support

Repositories should support transactions:

- SnapshotRepository.save() can be used in transaction
- EventRepository.save() can be used in transaction
- Later: SnapshotService will use both in single transaction

### Error Handling

Handle database errors appropriately:

- Constraint violations (foreign key, unique, etc.)
- Connection errors
- Query errors
- Throw descriptive errors for calling code

## Acceptance Criteria

- [ ] SnapshotRepository can save snapshots and return ID
- [ ] SnapshotRepository can retrieve latest snapshot by wallet
- [ ] SnapshotRepository can retrieve snapshot by ID
- [ ] EventRepository can batch save events
- [ ] EventRepository can query events by wallet
- [ ] EventRepository can query events by market
- [ ] Queries use Drizzle for type safety
- [ ] Database results properly typed
- [ ] Joins work correctly (events with snapshot timestamps)
- [ ] Repositories handle errors gracefully
- [ ] Can be used within transactions
- [ ] Empty result sets handled correctly

## Testing

Write tests for repositories:

- Use in-memory SQLite database for testing
- Test snapshot save and retrieval
- Test event batch save
- Test querying events by wallet
- Test querying events by market
- Test limit parameter works
- Test with empty database (no results)
- Test foreign key relationships maintained
- Test transaction support

## Files to Create

Suggested files (organize as you prefer):

- SnapshotRepository class
- EventRepository class
- Repository factory function
- Repository tests
