# Epic 9: Status Command

## Goal

Implement CLI command to display system statistics and status.

## Prerequisites

- Repositories completed (Epic 5)
- Database connection established (Epic 1)

## Command Specification

**Command:** `status`  
**Usage:** `npx polymarket-cli status`  
**Description:** Show system status and statistics

**No arguments or options.**

## Tasks

### Register Command with Commander

```typescript
export function createStatusCommand(
  repos: Repositories,
  db: Database,
): Command {
  return new Command("status")
    .description("Show system status and statistics")
    .action(async () => {
      await handleStatusCommand(repos, db);
    });
}
```

### Command Handler

**1. Gather Statistics**

Query database for various metrics:

- Total snapshots count
- Total events count
- Number of unique wallets monitored
- Database file size
- Last snapshot time per wallet

**2. Format Output**

- Use cli-table3 for formatted display
- Use chalk for colors
- Show all statistics clearly

**3. Handle Errors**

- Catch database errors
- Display friendly error message

### Statistics to Display

**System Information:**

```
System Status
┌──────────────────────┬─────────────────────────────────┐
│ Database Path        │ ./data/polymonitor.db            │
│ Database Size        │ 2.4 MB                          │
│ Database Status      │ ✓ Connected                     │
└──────────────────────┴─────────────────────────────────┘
```

**Overview Statistics:**

```
Overview
┌──────────────────────┬─────────────────────────────────┐
│ Total Snapshots      │ 1,247                           │
│ Total Events         │ 3,891                           │
│ Unique Wallets       │ 15                              │
│ Events per Snapshot  │ 3.1 avg                         │
└──────────────────────┴─────────────────────────────────┘
```

**Monitored Wallets:**

```
Recent Activity
┌──────────────────────┬──────────────┬─────────────────────┐
│ Wallet               │ Snapshots    │ Last Snapshot       │
├──────────────────────┼──────────────┼─────────────────────┤
│ 0x742d35...0bEb      │ 127          │ 2024-12-27 10:30:00 │
│ 0x8f3c21...3a9F      │ 84           │ 2024-12-27 09:15:00 │
│ 0x1b9d5e...7cD2      │ 56           │ 2024-12-26 18:45:00 │
└──────────────────────┴──────────────┴─────────────────────┘
```

### Statistics Queries

Implement queries to gather stats:

**Total snapshots:**

```sql
SELECT COUNT(*) FROM snapshots
```

**Total events:**

```sql
SELECT COUNT(*) FROM events
```

**Unique wallets:**

```sql
SELECT COUNT(DISTINCT wallet) FROM snapshots
```

**Per-wallet statistics:**

```sql
SELECT
  wallet,
  COUNT(*) as snapshot_count,
  MAX(timestamp) as last_snapshot
FROM snapshots
GROUP BY wallet
ORDER BY last_snapshot DESC
LIMIT 10
```

**Database file size:**

- Use Node.js fs module to get file size
- Format as human-readable (KB, MB, GB)

### Formatting Utilities

**formatFileSize(bytes: number): string**

- Convert bytes to appropriate unit
- Examples: "1.2 KB", "3.4 MB", "1.2 GB"

**formatNumber(num: number): string**

- Add thousand separators
- Example: "1,247"

**formatWalletAddress(address: string): string**

- Shorten to first 8 and last 4 characters
- Example: "0x742d35...0bEb"

**calculateAverage(total: number, count: number): string**

- Calculate and format average
- Example: "3.1 avg"
- Handle division by zero

### Database Connection Check

Verify database is accessible:

- Try to execute a simple query
- Display "✓ Connected" if successful
- Display "✗ Connection failed" if error

### Empty Database Handling

If no snapshots exist yet:

```
System Status
┌──────────────────────┬─────────────────────────────────┐
│ Database Path        │ ./data/polymonitor.db            │
│ Database Size        │ 24 KB (empty)                   │
│ Database Status      │ ✓ Connected                     │
└──────────────────────┴─────────────────────────────────┘

No snapshots have been taken yet.

Get started: npx polymarket-cli snapshot <wallet_address>
```

### Error Display

**Database connection error:**

```
✗ Error: Cannot connect to database

  Database path: ./data/polymonitor.db

  Please ensure the database has been initialized.
```

**Query error:**

```
✗ Error: Failed to retrieve statistics

  Database error: [error details]
```

## Acceptance Criteria

- [ ] Command registered with Commander
- [ ] Command: `npx polymarket-cli status`
- [ ] Shows database path and size
- [ ] Shows connection status
- [ ] Shows total snapshots count
- [ ] Shows total events count
- [ ] Shows unique wallets count
- [ ] Shows events per snapshot average
- [ ] Shows per-wallet activity (top 10)
- [ ] Timestamps formatted readably
- [ ] Numbers formatted with separators
- [ ] File sizes formatted in appropriate units
- [ ] Wallet addresses abbreviated
- [ ] Tables formatted nicely
- [ ] Empty database handled gracefully
- [ ] Errors caught and displayed clearly
- [ ] Colors used appropriately

## Testing

Manual testing:

1. Test with empty database
2. Test after taking some snapshots
3. Test with multiple wallets
4. Test with database that doesn't exist
5. Verify all statistics are accurate

## Files to Create

Suggested files (organize as you prefer):

- Status command definition
- Command handler function
- Statistics query functions
- Formatting utilities
