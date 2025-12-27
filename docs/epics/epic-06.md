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
    private db: Database, // For transactions
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

- **First snapshot**: Always save (even with no events)
- **Subsequent snapshot with no events**: Don't save, return early
- **Subsequent snapshot with events**: Save in transaction

**6. Save Atomically (if needed)**

If saving (first snapshot or events generated):

```typescript
await this.db.transaction(async (tx) => {
  // 1. Insert current snapshot, get ID
  const snapshotId = await this.repos.snapshots.save(currentSnapshot);

  // 2. Add snapshotId to all events
  const eventsWithSnapshotId = events.map((e) => ({
    ...e,
    snapshotId,
  }));

  // 3. Insert all events
  if (events.length > 0) {
    await this.repos.events.save(eventsWithSnapshotId);
  }
});
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

### Transaction Integrity

Critical: Snapshot and events MUST be saved together atomically:

- Use database transaction
- If snapshot save fails, no events saved
- If events save fails, snapshot rolled back
- All or nothing - maintains data integrity

## Acceptance Criteria

- [ ] Service validates wallet address before processing
- [ ] Service fetches current state from API
- [ ] Service retrieves previous snapshot from database
- [ ] Service calls diff function correctly
- [ ] First snapshot always saved (even with no events)
- [ ] Subsequent snapshots with no events are NOT saved
- [ ] Subsequent snapshots with events ARE saved
- [ ] Snapshot and events saved in single atomic transaction
- [ ] Transaction failures handled gracefully
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
