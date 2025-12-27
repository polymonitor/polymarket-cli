# Epic 8: Events Command

## Goal

Implement CLI command to view stored events for a wallet.

## Prerequisites

- EventRepository completed (Epic 5)
- Event types defined (Epic 2)

## Command Specification

**Command:** `events`  
**Usage:** `npx polymarket-cli events <wallet> [options]`  
**Description:** List events for a wallet

**Arguments:**

- `<wallet>` - Wallet address (required)

**Options:**

- `-l, --limit <number>` - Limit number of events (default: 50)
- `-v, --verbose` - Show detailed event data

## Tasks

### Register Command with Commander

```typescript
export function createEventsCommand(eventRepository: EventRepository): Command {
  return new Command("events")
    .description("List events for a wallet")
    .argument("<wallet>", "Wallet address")
    .option("-l, --limit <number>", "Limit number of events", "50")
    .option("-v, --verbose", "Show detailed event data")
    .action(async (wallet: string, options) => {
      await handleEventsCommand(wallet, options, eventRepository);
    });
}
```

### Command Handler

**1. Validate Input**

- Validate wallet address format
- Parse limit option as number
- Display error if invalid

**2. Query Events**

- Call `eventRepository.getByWallet(wallet, limit)`
- Returns events with snapshot timestamps (from join)

**3. Handle Empty Results**

- If no events found, display friendly message
- Don't show empty table

**4. Display Events**

- Format as table using cli-table3
- Show most recent first (already ordered by repository)
- Different display for regular vs verbose mode

**5. Handle Errors**

- Catch and display user-friendly errors

### Standard Output Format

Display events in formatted table:

```
Events for wallet 0x742d35...0bEb (showing 10 of 145)

┌─────────────────────┬─────────────────┬───────────────────────┬────────────────────┐
│ Time                │ Event Type      │ Market                │ Change             │
├─────────────────────┼─────────────────┼───────────────────────┼────────────────────┤
│ 2024-12-27 10:30:00 │ POSITION_OPENED │ BTC reaches $100k     │ +150 YES shares    │
│ 2024-12-27 10:25:00 │ POSITION_UPDATED│ ETH reaches $5k       │ 100→200 YES shares │
│ 2024-12-27 10:20:00 │ POSITION_CLOSED │ Trump wins 2024       │ -500 NO shares     │
│ 2024-12-27 10:15:00 │ MARKET_RESOLVED │ Biden approval <40%   │ YES won, +$245.00  │
└─────────────────────┴─────────────────┴───────────────────────┴────────────────────┘
```

**Table columns:**

- **Time**: Snapshot timestamp (from joined data)
- **Event Type**: POSITION_OPENED, etc.
- **Market**: Market title (truncated if too long)
- **Change**: Human-readable summary of what changed

**Header line:**

- Show abbreviated wallet address
- Show count: "showing X of Y" if limited

### Change Summary Format

Format the "Change" column based on event type:

**POSITION_OPENED:**

- `+150 YES shares`
- `+500 NO shares`

**POSITION_UPDATED:**

- `100→200 YES shares` (if shares changed)
- `$0.52→$0.54 avg price` (if only price changed)
- `100→200 YES, $0.52→$0.54` (if both changed)

**POSITION_CLOSED:**

- `-150 YES shares`
- `-500 NO shares`

**MARKET_RESOLVED:**

- `YES won, +$245.00` (with PnL)
- `NO won, -$130.00`
- `Invalid, $0.00`

### Verbose Output Format

When `--verbose` flag used, show complete event details:

```
Event #1: POSITION_UPDATED
Time: 2024-12-27 10:30:00
Market: BTC reaches $100k by EOY (market_id: 0xabc...)

┌──────────────────────┬──────────┬──────────┐
│ Field                │ Before   │ After    │
├──────────────────────┼──────────┼──────────┤
│ YES shares           │ 100      │ 200      │
│ YES avg price        │ $0.52    │ $0.54    │
│ NO shares            │ 0        │ 0        │
│ NO avg price         │ -        │ -        │
└──────────────────────┴──────────┴──────────┘

---

Event #2: POSITION_OPENED
[... similar detailed format ...]
```

### Empty Results Display

If no events found:

```
No events found for wallet 0x742d35...0bEb

This wallet has not been snapshotted yet, or has had no position changes.

Run: npx polymarket-cli snapshot 0x742d35...0bEb
```

### Error Display

**Invalid wallet address:**

```
✗ Error: Invalid wallet address

  See: npx polymarket-cli events --help
```

**Invalid limit:**

```
✗ Error: Invalid limit value

  Limit must be a positive number.
  Example: --limit 100
```

**Database error:**

```
✗ Error: Failed to retrieve events

  Database error: [error details]
```

## Formatting Utilities

Create helper functions:

**formatEventChange(event: WalletEvent): string**

- Returns human-readable change summary
- Different format per event type

**formatTimestamp(isoString: string): string**

- Convert ISO 8601 to readable format
- Example: "2024-12-27 10:30:00"

**formatPrice(price: number | null): string**

- Format as currency: "$0.52"
- Handle null as "-"

**formatShares(shares: number | null): string**

- Format with commas for large numbers
- Handle null as "-"

**truncateMarketTitle(title: string, maxLength: number): string**

- Truncate long market titles
- Add "..." if truncated

## Acceptance Criteria

- [ ] Command registered with Commander
- [ ] Command: `npx polymarket-cli events <wallet>`
- [ ] Wallet address validated
- [ ] Limit option parsed and applied
- [ ] Events displayed in formatted table
- [ ] Events ordered newest first
- [ ] Timestamps formatted readably
- [ ] Change summaries are clear and concise
- [ ] Verbose mode shows complete event details
- [ ] Empty results display helpful message
- [ ] Header shows wallet and count
- [ ] Errors caught and displayed clearly
- [ ] Table uses appropriate column widths
- [ ] Long market titles truncated gracefully

## Testing

Manual testing:

1. Test with wallet that has events
2. Test with wallet that has no events
3. Test with different limit values
4. Test with `--verbose` flag
5. Test with invalid wallet address
6. Test with non-numeric limit

## Files to Create

Suggested files (organize as you prefer):

- Events command definition
- Command handler function
- Formatting utilities for events display
