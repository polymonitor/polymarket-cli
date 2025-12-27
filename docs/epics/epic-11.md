# Epic 11: Error Handling & Polish

## Goal

Ensure robust error handling throughout the application and polish the user experience.

## Tasks

### API Error Handling

Improve error handling for all API interactions:

**Network Errors:**

- Connection timeout
- DNS resolution failure
- Network unreachable
- Connection refused

**HTTP Status Errors:**

- 400 Bad Request - Invalid parameters
- 401 Unauthorized - Authentication failed
- 404 Not Found - Wallet/resource doesn't exist
- 429 Too Many Requests - Rate limited
- 500 Internal Server Error - API server error
- 502/503 Bad Gateway/Service Unavailable - API temporarily down

**Response Errors:**

- Invalid JSON response
- Unexpected response structure
- Missing required fields

**Error Messages:**

Create user-friendly messages for each:

```typescript
// Network timeout
"Failed to connect to Polymarket API (timeout).
Please check your internet connection and try again."

// Rate limited
"Polymarket API rate limit exceeded.
Please wait a moment before trying again."

// Wallet not found
"Wallet not found on Polymarket.
Please verify the address is correct: 0x..."

// API down
"Polymarket API is temporarily unavailable.
Please try again in a few minutes."
```

### Database Error Handling

Handle all database operation failures:

**Connection Errors:**

- Cannot open database file
- Database file corrupted
- Insufficient permissions

**Query Errors:**

- Invalid SQL syntax (shouldn't happen with Drizzle, but handle)
- Constraint violations
- Foreign key violations

**Transaction Errors:**

- Transaction rollback
- Deadlocks (unlikely with SQLite, but handle)

**Error Messages:**

```typescript
// Cannot open database
"Cannot access database file.
Location: ./data/polymonitor.db
Please ensure the directory exists and is writable."

// Transaction failed
"Failed to save snapshot (transaction error).
No data was saved. Please try again."

// Constraint violation
"Database integrity error (constraint violation).
This indicates a bug. Please report this issue."
```

### Validation Error Formatting

Improve Zod validation error messages:

**Current Zod errors can be cryptic:**

```
Invalid input: Expected string, received number at path "wallet"
```

**Transform to user-friendly:**

```
Invalid wallet address.
Expected: Ethereum address (0x + 40 hex characters)
Received: [what user provided]
Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Create error formatter:**

```typescript
function formatValidationError(error: ZodError): string {
  // Transform Zod errors into friendly messages
  // Include what was expected
  // Include what was received
  // Include examples
}
```

### Command Help Text

Improve help text for all commands:

**Snapshot command:**

```
Usage: polymarket-cli snapshot <wallet> [options]

Take a snapshot of a Polymarket wallet and detect position changes.

Arguments:
  wallet                 Ethereum wallet address to snapshot

Options:
  -v, --verbose         Show detailed output including full event data
  -h, --help            Display help for command

Examples:
  $ polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  $ polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb --verbose

Description:
  Fetches current positions from Polymarket, compares with previous snapshot,
  and generates events for any detected changes. The first snapshot for a
  wallet will not generate events.
```

**Add similar help for all commands.**

### Global Error Handler

Add top-level error handler in CLI entry point:

```typescript
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection:", reason);
  console.error(chalk.red("✗ An unexpected error occurred."));
  console.error(chalk.red("  Please report this issue."));
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  console.error(chalk.red("✗ An unexpected error occurred."));
  console.error(chalk.red("  Please report this issue."));
  process.exit(1);
});
```

### Exit Codes

Use proper exit codes:

```typescript
// Success
process.exit(0);

// General error
process.exit(1);

// Invalid arguments
process.exit(2);

// API error
process.exit(3);

// Database error
process.exit(4);
```

Document exit codes in help text.

### Input Sanitization

Sanitize all user inputs:

**Wallet addresses:**

- Trim whitespace
- Convert to lowercase (or preserve case as needed)
- Validate format

**Numeric inputs:**

- Parse as numbers
- Validate ranges
- Handle invalid values

**String inputs:**

- Trim whitespace
- Handle empty strings
- Validate length limits

### Logging Improvements

Enhance logging throughout:

**Add context to all logs:**

```typescript
// Bad
logger.error("Failed");

// Good
logger.error("Failed to fetch wallet positions", {
  wallet: "0x742d35...",
  error: error.message,
});
```

**Log levels:**

- DEBUG: Verbose details for debugging
- INFO: Normal operations
- WARN: Warning conditions
- ERROR: Error conditions

**Log to file (optional):**

- Configure logger to write to file
- Useful for troubleshooting
- Rotate logs to prevent unbounded growth

### Edge Cases

Handle all edge cases:

**Empty data:**

- Wallet with no positions
- Snapshot with no positions
- Query returning no results

**Extreme values:**

- Very large share counts
- Very small prices (close to 0)
- Very large PnL values

**Special characters:**

- Market titles with emojis
- Market titles with newlines
- Very long market titles

**Concurrent operations:**

- Multiple snapshots of same wallet
- SQLite handles this, but test

### User Experience Polish

**Progress indication:**

- Show spinner during long operations
- Show progress for batch operations
- Don't leave user wondering

**Helpful suggestions:**

- If command fails, suggest next steps
- If no events, explain why
- If first snapshot, explain what to do next

**Consistent formatting:**

- All timestamps in same format
- All addresses abbreviated consistently
- All numbers formatted consistently
- All tables have consistent styling

**Color usage:**

- Green: Success
- Yellow: Warning/info
- Red: Error
- Blue: Neutral info
- Cyan: Highlights

### Recovery Suggestions

Include recovery suggestions in error messages:

```typescript
// Network error
"Failed to connect to Polymarket API.

Suggestions:
  • Check your internet connection
  • Verify Polymarket API is operational
  • Try again in a moment"

// Invalid wallet
"Invalid wallet address format.

Suggestions:
  • Verify address is correct
  • Ensure address starts with 0x
  • Check for typos or extra characters"

// Database locked
"Database is locked (possibly in use).

Suggestions:
  • Wait a moment and try again
  • Check no other processes are using the database
  • Restart the terminal if problem persists"
```

## Acceptance Criteria

- [ ] All API errors handled with clear messages
- [ ] All database errors handled with clear messages
- [ ] Validation errors formatted for users
- [ ] All commands have comprehensive help text
- [ ] Global error handler catches unhandled errors
- [ ] Proper exit codes used
- [ ] All inputs sanitized
- [ ] Logging includes context
- [ ] Edge cases handled gracefully
- [ ] Progress indication during operations
- [ ] Recovery suggestions in error messages
- [ ] Consistent formatting throughout
- [ ] Color usage is consistent and helpful
- [ ] No crashes without explanation

## Testing

Test error scenarios:

**API errors:**

- Disconnect network and run snapshot
- Use invalid API URL
- Mock 429 rate limit response
- Mock 500 server error

**Database errors:**

- Delete database file mid-operation
- Use read-only database file
- Corrupt database file

**Validation errors:**

- Invalid wallet addresses
- Invalid limit values
- Missing required arguments

**Edge cases:**

- Empty wallets
- Very large numbers
- Special characters in data

## Files to Update

- All command files (improve error handling)
- API client (improve error messages)
- Repositories (improve error handling)
- Services (improve error handling)
- Validation utilities (improve error formatting)
- CLI entry point (add global error handler)
- Help text for all commands
