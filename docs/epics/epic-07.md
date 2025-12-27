# Epic 7: Snapshot Command

## Goal

Implement CLI command for manually triggering wallet snapshots.

## Prerequisites

- SnapshotService completed (Epic 6)
- All supporting infrastructure in place

## Command Specification

**Command:** `snapshot`  
**Usage:** `npx polymarket-cli snapshot <wallet> [options]`  
**Description:** Take a snapshot of a Polymarket wallet

**Arguments:**

- `<wallet>` - Wallet address (required)

**Options:**

- `-v, --verbose` - Show detailed output including full event data

## Tasks

### Register Command with Commander

In main CLI entry point, register the snapshot command:

```typescript
import { Command } from "commander";

export function createSnapshotCommand(
  snapshotService: SnapshotService,
): Command {
  return new Command("snapshot")
    .description("Take a snapshot of a wallet")
    .argument("<wallet>", "Wallet address to snapshot")
    .option("-v, --verbose", "Show detailed output")
    .action(async (wallet: string, options) => {
      await handleSnapshotCommand(wallet, options, snapshotService);
    });
}
```

### Command Handler

Implement the command action handler:

**1. Validate Input**

- Validate wallet address format
- Display clear error if invalid
- Exit with error code

**2. Show Loading State**

- Use `ora` spinner during API call
- Display: "Fetching wallet positions..."
- Shows user something is happening

**3. Call Service**

- Call `snapshotService.takeSnapshot(wallet)`
- Spinner stops when complete

**4. Display Results**

- Format output based on result
- Use `chalk` for colors
- Different messages for different scenarios

**5. Handle Errors**

- Catch all errors
- Display user-friendly error message in red
- Exit with error code

### Output Formatting

**Scenario 1: Events Generated**

```
✓ Snapshot taken for 0x742d35...0bEb

Generated 3 events:
  • POSITION_OPENED   BTC reaches $100k by EOY    150 YES shares
  • POSITION_UPDATED  ETH reaches $5k             100→200 YES shares
  • POSITION_CLOSED   Trump wins 2024             500 NO shares
```

- Green checkmark
- Abbreviated wallet address
- List each event with icon
- Show event type, market name, and summary of change

**Scenario 2: First Snapshot**

```
✓ Initial snapshot taken for 0x742d35...0bEb

No events generated (first snapshot).
```

- Yellow/cyan color to distinguish from regular success
- Explain why no events

**Scenario 3: No Changes**

```
✓ No changes detected for 0x742d35...0bEb

Wallet positions unchanged since last snapshot.
Snapshot not saved.
```

- Blue color to distinguish
- Explain no changes detected
- Note that snapshot was not saved

### Verbose Mode

When `--verbose` flag is used:

**Show full event details:**

- Complete before/after state
- Use `cli-table3` for formatted tables
- Show all numeric values with precision
- Include event IDs, timestamps

Example verbose output:

```
Event: POSITION_UPDATED
┌─────────────────────┬──────────────────────┐
│ Field               │ Value                │
├─────────────────────┼──────────────────────┤
│ Event ID            │ abc123...            │
│ Market              │ BTC reaches $100k    │
│ Previous YES shares │ 100                  │
│ Current YES shares  │ 200                  │
│ Previous YES price  │ $0.52                │
│ Current YES price   │ $0.54                │
│ Previous NO shares  │ 0                    │
│ Current NO shares   │ 0                    │
└─────────────────────┴──────────────────────┘
```

### Error Display

**Invalid wallet address:**

```
✗ Error: Invalid wallet address

  '0x123' is not a valid Ethereum address.

  Expected format: 0x followed by 40 hexadecimal characters
  Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**API errors:**

```
✗ Error: Failed to fetch wallet data

  Polymarket API returned: Wallet not found

  Please verify the wallet address is correct.
```

**Network errors:**

```
✗ Error: Network request failed

  Could not connect to Polymarket API.

  Please check your internet connection and try again.
```

### Utility Functions

Create helper functions for formatting:

**formatWalletAddress(address: string): string**

- Shorten to first 8 and last 4 characters
- Example: `0x742d35Cc...0bEb`

**formatEventSummary(event: WalletEvent): string**

- Return human-readable summary
- Example: "100→200 YES shares"
- Handle different event types appropriately

**createEventTable(event: WalletEvent): string**

- Use cli-table3 to format event as table
- For verbose mode

## Acceptance Criteria

- [ ] Command registered with Commander
- [ ] Command: `npx polymarket-cli snapshot <wallet>`
- [ ] Wallet address validated, clear error on invalid
- [ ] Loading spinner shows during API call
- [ ] Success message displays for events generated
- [ ] Distinct message for first snapshot
- [ ] Distinct message for no changes
- [ ] Events listed with clear formatting
- [ ] Verbose mode shows full event details
- [ ] Errors caught and displayed in user-friendly format
- [ ] Colors used appropriately (chalk)
- [ ] Tables formatted nicely (cli-table3)
- [ ] Command exits with appropriate status code

## Testing

Manual testing workflow:

1. Test with invalid wallet address
2. Test with valid wallet (first time)
3. Test with same wallet again (no changes)
4. Test after positions change (events generated)
5. Test with network disconnected (error handling)
6. Test with `--verbose` flag
7. Test with non-existent wallet

## Files to Create

Suggested files (organize as you prefer):

- Snapshot command definition
- Command handler function
- Output formatting utilities
- Error formatting utilities
