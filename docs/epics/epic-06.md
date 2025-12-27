# Epic 6: Snapshot Service

## Goal

Implement business logic layer that orchestrates API calls, diff computation, and database operations.

## Prerequisites

- API client completed (Epic 3)
- Diff function completed (Epic 4)
- Repositories completed (Epic 5)

## Tasks

### Service Class Structure

Create service class that coordinates all snapshot operations:

```typescript
class SnapshotService {
  constructor(
    private api: PolymarketAPI,
    private repos: Repositories,
  ) {}

  async takeSnapshot(wallet: string): Promise<SnapshotResult> {
    // Implementation
  }
}

interface SnapshotResult {
  snapshot: Snapshot;
  events: WalletEvent[];
  isFirstSnapshot: boolean;
  saved: boolean; // Whether snapshot was saved
}
```

### Main Snapshot Flow

Implement `takeSnapshot()` method with this flow:

**1. Validate Input**

- Validate wallet address with Zod
- Throw clear error if invalid

**2. Fetch Current State**

- Call API to get current wallet positions
- API client handles retries and errors
- Returns validated Snapshot

**3. Get Previous Snapshot**

- Query database for latest snapshot of this wallet
- Returns `{ id, snapshot }` or null if first snapshot

**4. Compute Diff**

- Call pure diff function with previous and current snapshots
- Returns array of events (without snapshotId)
- If first snapshot, returns empty array

**5. Decide Whether to Save**

- **First snapshot**: Use `saveFirstSnapshot()` - saves snapshot with prev_snapshot_id = NULL
- **Subsequent snapshot with no events**: Don't save, return early
- **Subsequent snapshot with events**: Use `saveSnapshotWithEvents()` - atomically saves snapshot + events

**6. Save Using Repository Methods**

The repository layer handles atomicity and validation:

```typescript
if (prevSnapshot === null) {
  // First snapshot - no events
  const snapshotId =
    await this.repos.snapshots.saveFirstSnapshot(currentSnapshot);
  return {
    snapshot: currentSnapshot,
    events: [],
    isFirstSnapshot: true,
    saved: true,
  };
}

if (events.length === 0) {
  // No changes detected - don't save
  return {
    snapshot: currentSnapshot,
    events: [],
    isFirstSnapshot: false,
    saved: false,
  };
}

// Changes detected - save snapshot with events atomically
// Repository sets prev_snapshot_id to link snapshots in blockchain-like chain
const snapshotId = await this.repos.snapshots.saveSnapshotWithEvents(
  currentSnapshot,
  events,
);
```

**7. Return Result**

- Return snapshot, events, flags indicating what happened
- Allows command to display appropriate message

### No-Save Scenario

When no changes detected (not first snapshot, no events):

```typescript
if (events.length === 0 && prevSnapshot !== null) {
  return {
    snapshot: currentSnapshot,
    events: [],
    isFirstSnapshot: false,
    saved: false,
  };
}
```

### Error Handling

Handle all error scenarios:

**API Errors:**

- Network failures
- Invalid wallet
- Rate limiting
- Wrap API errors with service-level context

**Database Errors:**

- Connection failures
- Transaction failures
- Constraint violations

**Diff Errors:**

- Should not happen (pure function), but handle gracefully

**Error Messages:**

- User-friendly descriptions
- Include wallet address in context
- Suggest recovery actions where appropriate

### Logging

Add logging throughout:

- Log when starting snapshot
- Log API call results
- Log diff results (X events generated)
- Log save decision (saving vs skipping)
- Log transaction success
- Log all errors with context

### Atomicity and Chain Integrity

The repository layer ensures:

- **Atomicity**: Snapshot + events saved together via `saveSnapshotWithEvents()`
- **Chain integrity**: Each snapshot (except first) has `prev_snapshot_id` pointing to its predecessor
- **Validation**: Repository methods enforce preconditions (can't save first snapshot twice, can't save events without previous snapshot)
- **Database constraints**: Foreign keys ensure chain can never be broken

The service delegates all transaction handling to the repository layer.

## Acceptance Criteria

- [ ] Service validates wallet address before processing
- [ ] Service fetches current state from API
- [ ] Service retrieves previous snapshot from database
- [ ] Service calls diff function correctly
- [ ] First snapshot saved using `saveFirstSnapshot()` (sets prev_snapshot_id = NULL)
- [ ] Subsequent snapshots with no events are NOT saved
- [ ] Subsequent snapshots with events saved using `saveSnapshotWithEvents()` (sets prev_snapshot_id)
- [ ] Repository handles atomicity (service doesn't manage transactions directly)
- [ ] Repository validation errors handled gracefully
- [ ] API errors propagated with clear messages
- [ ] All operations logged appropriately
- [ ] Returns complete result with all metadata
- [ ] Can be tested with mocked dependencies

## Testing

Write tests with mocked dependencies:

**Test first snapshot:**

- Mock API to return positions
- Mock empty database (no previous snapshot)
- Verify snapshot saved
- Verify no events saved
- Verify result indicates first snapshot

**Test no changes:**

- Mock API to return identical positions
- Mock previous snapshot exists
- Verify diff returns no events
- Verify nothing saved to database
- Verify result indicates no save

**Test with changes:**

- Mock API to return different positions
- Mock previous snapshot exists
- Verify diff generates events
- Verify atomic save (snapshot + events)
- Verify correct result returned

**Test error scenarios:**

- API failure propagates correctly
- Database failure during transaction rolls back
- Invalid wallet address throws clear error

## Files to Create

Suggested files (organize as you prefer):

- SnapshotService class
- SnapshotResult interface
- Service tests with mocked dependencies
