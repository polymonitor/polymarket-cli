# Epic 2: Type Definitions & Validation

## Goal

Define all TypeScript types and Zod validation schemas for the project.

## Tasks

### Core Data Types

Define TypeScript interfaces for all core data structures.

**Position interface:**

```typescript
interface Position {
  marketId: string;
  marketTitle: string;
  yesShares: number;
  noShares: number;
  yesAvgPrice: number | null;
  noAvgPrice: number | null;
  marketResolved: boolean;
  resolvedOutcome?: "yes" | "no" | "invalid";
}
```

**Snapshot interface:**

```typescript
interface Snapshot {
  wallet: string;
  timestamp: string; // ISO 8601
  positions: Position[];
}
```

### Event Types

Define event-related types.

**EventType enum/union:**

```typescript
type EventType =
  | "POSITION_OPENED"
  | "POSITION_UPDATED"
  | "POSITION_CLOSED"
  | "MARKET_RESOLVED";
```

**WalletEvent interface:**

```typescript
interface WalletEvent {
  eventId: string; // UUID
  wallet: string;
  eventType: EventType;
  marketId: string;
  marketTitle: string;
  snapshotId: number; // References snapshot that created this event

  // Before state (null if position opened)
  prevYesShares: number | null;
  prevNoShares: number | null;
  prevYesAvgPrice: number | null;
  prevNoAvgPrice: number | null;

  // After state (null if position closed)
  currYesShares: number | null;
  currNoShares: number | null;
  currYesAvgPrice: number | null;
  currNoAvgPrice: number | null;

  // For resolved markets
  resolvedOutcome?: "yes" | "no" | "invalid";
  pnl?: number;
}
```

### Zod Validation Schemas

Create Zod schemas for runtime validation.

**Wallet Address Validation:**

- Must start with "0x"
- Must be followed by exactly 40 hexadecimal characters
- Case-insensitive
- Provide clear error message on validation failure

**Position Schema:**

- Validate all fields match Position interface
- Ensure shares are non-negative numbers
- Ensure avg prices are between 0 and 1 (or null)
- Ensure marketResolved is boolean

**Snapshot Schema:**

- Validate wallet address format
- Validate timestamp is ISO 8601 format
- Validate positions is array of Position objects

**Additional validation schemas as needed:**

- Market ID format (if specific format required)
- Event type validation
- Numeric value ranges

### Validation Utilities

Create helper functions for common validations:

**validateWalletAddress(address: string):**

- Uses Zod schema to validate
- Throws clear error if invalid
- Returns validated address (or throws)

**validateSnapshot(data: unknown):**

- Validates complete snapshot structure
- Returns typed Snapshot object
- Throws on validation failure with detailed error

### Error Messages

Ensure all validation errors provide:

- What was invalid
- What format is expected
- Example of valid input

Example error message:

```
Invalid wallet address '0x123'.
Expected format: 0x followed by 40 hexadecimal characters.
Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Acceptance Criteria

- [ ] All core types defined with TypeScript interfaces
- [ ] EventType properly typed (union or enum)
- [ ] WalletEvent interface includes all fields
- [ ] Zod schema validates Ethereum addresses correctly
- [ ] Zod schema validates Position objects
- [ ] Zod schema validates complete Snapshots
- [ ] Validation functions throw clear, actionable errors
- [ ] Error messages explain what's wrong and what's expected
- [ ] All validation is type-safe

## Testing

Write tests for validation:

- Valid wallet addresses pass
- Invalid wallet addresses fail with clear errors
- Valid positions pass validation
- Invalid positions (negative shares, invalid prices) fail
- Valid snapshots pass validation
- Invalid snapshots fail appropriately

## Files to Create

Suggested files (organize as you prefer):

- Type definitions (Position, Snapshot, WalletEvent, EventType)
- Zod validation schemas
- Validation utility functions
