# Polymarket Wallet Snapshot CLI

A proof-of-concept CLI tool for detecting and tracking changes in Polymarket wallet positions. This project validates a pure, reusable diff algorithm that can be extracted and used in other applications.

## Overview

This tool helps you:

- **Track position changes**: Monitor when positions are opened, updated, or closed
- **Detect market resolutions**: Get notified when markets resolve with PnL calculations
- **Audit history**: Store complete snapshot and event history in SQLite
- **Test diff logic**: Validate the core diff algorithm with real-world data

The primary deliverable is the **pure diff function** (`computeDiff`) which can be extracted and reused in other projects for detecting changes in Polymarket wallet positions.

## Key Features

- Manual snapshot operation for controlled testing
- Self-contained events with complete before/after state
- Atomic database transactions (snapshot + events saved together)
- Type-safe validation with Zod
- Comprehensive test coverage
- Pretty CLI output with colors and formatting

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd polymarket-cli

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (Default values work out of the box for testing)
```

## Database Initialization

**You must manually initialize the database before using the CLI.**

The default database location is `./data/polymonitor.db` (configurable in `.env`).

### Initialize Database

To create and initialize the database with the required schema:

```bash
# Create the data directory if it doesn't exist
mkdir -p ./data

# Initialize the database by running migrations
npx drizzle-kit push:sqlite
```

This creates the database file and sets up all required tables.

### Refresh/Reset Database

To start fresh with a clean database:

```bash
# Delete the existing database file
rm ./data/polymonitor.db

# Reinitialize with migrations
npx drizzle-kit push:sqlite
```

Alternatively, you can change the `DB_PATH` in your `.env` file to point to a different location.

## Configuration

Edit `.env` to configure the tool:

```env
# Database Configuration
DB_PATH=./data/polymonitor.db

# Polymarket API Configuration
POLYMARKET_DATA_API_URL=https://data-api.polymarket.com
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
```

### Configuration Options

- **DB_PATH**: SQLite database file location (default: `./data/polymonitor.db`)
- **POLYMARKET_DATA_API_URL**: Polymarket data API endpoint
- **POLYMARKET_GAMMA_API_URL**: Polymarket gamma API endpoint

## Usage

### Take a Snapshot

Capture the current state of a wallet:

```bash
npx polymarket-cli snapshot <wallet_address>
```

**Example:**

```bash
npx polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**What happens:**

- Fetches current positions from Polymarket API
- Compares with previous snapshot (if exists)
- Generates events for any detected changes
- Saves to database atomically (or skips if no changes)

**Output:**

```
✓ Snapshot completed for 0x742d35Cc...0bEb

Changes Detected: 2 events

  ▴ Will Bitcoin reach $100k in 2024?
    100→200 YES shares

  ◆ Will Ethereum surpass Bitcoin?
    Resolved: NO (-$15.50)
```

### View Events

Display event history for a wallet:

```bash
# Show last 20 events (default)
npx polymarket-cli events <wallet_address>

# Show last 50 events
npx polymarket-cli events <wallet_address> --limit 50

# Show detailed event information
npx polymarket-cli events <wallet_address> --verbose
```

**Example:**

```bash
npx polymarket-cli events 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb --limit 10
```

**Output:**

```
Events for 0x742d35Cc...0bEb (Last 10)

┌──────────────────────┬────────────────────────────┬─────────────────────────────┐
│ Time                 │ Event                      │ Market                      │
├──────────────────────┼────────────────────────────┼─────────────────────────────┤
│ 2024-12-27 10:30:00  │ POSITION_UPDATED           │ Will Bitcoin reach $100k... │
│                      │ 100→200 YES shares         │                             │
├──────────────────────┼────────────────────────────┼─────────────────────────────┤
│ 2024-12-27 09:15:00  │ POSITION_OPENED            │ Will Ethereum surpass...    │
│                      │ +150 YES shares            │                             │
└──────────────────────┴────────────────────────────┴─────────────────────────────┘
```

### Check System Status

View database statistics and system health:

```bash
npx polymarket-cli status
```

**Output:**

```
System Status
┌─────────────────────┬───────────────────────────────────┐
│ Database Path       │ ./data/snapshots.db               │
│ Database Size       │ 24.5 KB                           │
│ Database Status     │ ✓ Connected                       │
└─────────────────────┴───────────────────────────────────┘

Overview
┌─────────────────────┬────────────────┐
│ Total Snapshots     │ 47             │
│ Total Events        │ 23             │
│ Unique Wallets      │ 3              │
│ Events per Snapshot │ 0.5 avg        │
└─────────────────────┴────────────────┘

Recent Activity
┌────────────────────┬───────────┬─────────────────────────┐
│ Wallet             │ Snapshots │ Last Snapshot           │
├────────────────────┼───────────┼─────────────────────────┤
│ 0x742d35Cc...0bEb  │ 25        │ 2024-12-27 10:30:00     │
│ 0xabcdef12...3456  │ 15        │ 2024-12-27 09:15:00     │
└────────────────────┴───────────┴─────────────────────────┘
```

## Architecture

### High-Level Overview

```
┌─────────────┐
│   CLI       │  (Commander.js - thin command wrappers)
└──────┬──────┘
       │
┌──────▼──────┐
│  Services   │  (Business logic orchestration)
└──────┬──────┘
       │
  ┌────┴────┬─────────┬──────────┐
  │         │         │          │
┌─▼──┐  ┌──▼───┐  ┌──▼────┐  ┌──▼────────┐
│API │  │ Diff │  │Repos  │  │Validation │
└────┘  └──────┘  └───────┘  └───────────┘
          ★ CORE              (Zod schemas)
       (Pure func)
```

### Key Components

**Commands** (`src/commands/`)

- Thin wrappers around services
- Parse CLI arguments
- Format output for display
- Handle user interaction

**Services** (`src/services/`)

- Orchestrate business logic
- Coordinate API calls, diff computation, and database operations
- Manage transactions and error handling

**Diff Function** (`src/diff/computeDiff.ts`) ⭐

- **Pure function** with no side effects
- Detects all changes between snapshots
- Generates self-contained events
- **Can be extracted and reused in any project**
- 100% test coverage

**Repositories** (`src/db/repositories/`)

- Encapsulate all database access
- Enforce business rules via API design
- Manage transactions
- Two atomic operations:
  - `saveFirstSnapshot()` - Initialize tracking
  - `saveSnapshotWithEvents()` - Save snapshot + events atomically

**API Client** (`src/api/`)

- Fetch positions from Polymarket
- Transform API responses to internal types
- Handle errors and retries

**Validation** (`src/validation/`)

- Zod schemas for all data types
- Type-safe input validation
- Clear error messages

## The Diff Function

The core intellectual property of this project is the `computeDiff` function. This pure, reusable function detects changes between wallet snapshots.

### Function Signature

```typescript
/**
 * Computes the difference between two wallet snapshots.
 *
 * @param prevSnapshot - Previous snapshot, or null for first snapshot
 * @param currSnapshot - Current snapshot to compare against
 * @returns Array of events describing all detected changes
 */
export function computeDiff(
  prevSnapshot: Snapshot | null,
  currSnapshot: Snapshot,
): DiffEvent[];
```

### Key Properties

- **Pure**: No side effects, no external dependencies
- **Reusable**: Can be extracted to any project
- **Self-contained events**: Each event contains complete before/after state
- **Comprehensive**: Detects opens, updates, closes, and resolutions
- **Well-tested**: 100% code coverage with extensive test suite

### Example Usage

```typescript
import { computeDiff } from "./diff/computeDiff";

const prevSnapshot = await getPreviousSnapshot(wallet);
const currSnapshot = await getCurrentSnapshot(wallet);

const events = computeDiff(prevSnapshot, currSnapshot);

if (events.length > 0) {
  console.log(`Detected ${events.length} changes`);
  events.forEach((event) => {
    console.log(`${event.eventType}: ${event.marketTitle}`);
  });
}
```

### Event Types

- **POSITION_OPENED**: New position detected
- **POSITION_UPDATED**: Share count or average price changed
- **POSITION_CLOSED**: Position no longer exists
- **MARKET_RESOLVED**: Market resolved with outcome and PnL

## Database Schema

### Snapshots Table

Stores complete wallet state at a point in time:

```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  snapshot_data JSON NOT NULL,
  timestamp TEXT NOT NULL,
  prev_snapshot_id INTEGER,
  FOREIGN KEY (prev_snapshot_id) REFERENCES snapshots(id)
);
```

**Design notes:**

- `prev_snapshot_id` creates a blockchain-like chain of snapshots
- Complete snapshot stored as JSON for flexibility
- Timestamps in ISO 8601 format

### Events Table

Stores detected changes with complete before/after state:

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,        -- UUID
  wallet TEXT NOT NULL,
  event_type TEXT NOT NULL,   -- POSITION_OPENED, POSITION_UPDATED, etc.
  market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  snapshot_id INTEGER NOT NULL,
  prev_yes_shares REAL,       -- Before state
  prev_no_shares REAL,
  prev_yes_avg_price REAL,
  prev_no_avg_price REAL,
  curr_yes_shares REAL,       -- After state
  curr_no_shares REAL,
  curr_yes_avg_price REAL,
  curr_no_avg_price REAL,
  resolved_outcome TEXT,
  pnl REAL,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);
```

**Why store complete state?**
Events are self-contained and can be used for notifications without querying additional data. Each event has all information needed to understand what changed.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Test Organization

```
test/
├── unit/
│   ├── computeDiff.test.ts    (100% coverage - critical)
│   ├── validators.test.ts
│   ├── repositories.test.ts
│   ├── snapshot-service.test.ts
│   ├── api.test.ts
│   └── formatting.test.ts
│
├── integration/
│   ├── snapshot-command.test.ts
│   ├── events-command.test.ts
│   └── status-command.test.ts
│
└── fixtures/
    ├── mock-snapshots.ts
    ├── mock-api-responses.ts
    └── test-helpers.ts
```

### Type Checking

```bash
npm run typecheck
```

### Project Structure

```
polymarket-cli/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── services/          # Business logic layer
│   ├── diff/              # ⭐ Core diff function
│   ├── db/                # Database schema and repositories
│   ├── api/               # Polymarket API client
│   ├── validation/        # Zod schemas and validators
│   ├── utils/             # Logging and helpers
│   ├── types/             # TypeScript type definitions
│   ├── config.ts          # Configuration loading
│   └── index.ts           # CLI entry point
│
├── test/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test fixtures and helpers
│
├── migrations/            # Database migrations
├── data/                  # Database files (gitignored)
├── docs/                  # Epic documentation
└── package.json
```

## Troubleshooting

### Database locked error

If you see "database is locked", ensure no other process is accessing the database:

```bash
# Find processes using the database
lsof ./data/polymonitor.db

# Kill the process if needed
kill -9 <PID>
```

### API timeout errors

If you experience timeouts, increase the timeout in `.env`:

```env
POLYMARKET_API_TIMEOUT=60000
```

### Invalid wallet address

Ensure the wallet address:

- Starts with `0x`
- Is exactly 42 characters long
- Contains only hexadecimal characters (0-9, a-f, A-F)

### Database corruption

If the database becomes corrupted:

```bash
# Backup the corrupted database
cp ./data/polymonitor.db ./data/polymonitor.db.backup

# Remove and reinitialize
rm ./data/polymonitor.db
npx drizzle-kit push:sqlite
```

## Common Workflows

### Monitor a wallet over time

```bash
# Take initial snapshot
npx polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Wait for some activity...

# Take another snapshot to detect changes
npx polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# View event history
npx polymarket-cli events 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Test the diff algorithm

```bash
# Take snapshots at different times
npx polymarket-cli snapshot 0xWALLET1

# Make some trades on Polymarket...

npx polymarket-cli snapshot 0xWALLET1

# Verify events were correctly detected
npx polymarket-cli events 0xWALLET1 --verbose
```

### Track multiple wallets

```bash
npx polymarket-cli snapshot 0xWALLET1
npx polymarket-cli snapshot 0xWALLET2
npx polymarket-cli snapshot 0xWALLET3

# Check overall status
npx polymarket-cli status
```

## Extracting the Diff Function

The `computeDiff` function in `src/diff/computeDiff.ts` is designed to be extracted and reused:

1. Copy `src/diff/computeDiff.ts` to your project
2. Copy the relevant types from `src/types/core.ts`
3. Import and use:

```typescript
import { computeDiff } from "./computeDiff";
import type { Snapshot, DiffEvent } from "./types";

// Your implementation
const events = computeDiff(previousSnapshot, currentSnapshot);
```

The function has:

- Zero external dependencies (pure TypeScript)
- Comprehensive type definitions
- Extensive test suite you can adapt
- Complete JSDoc documentation

## Success Criteria

- ✅ Can manually snapshot any wallet
- ✅ Diff function is isolated, pure, and thoroughly tested (100% coverage)
- ✅ Events contain complete before/after state
- ✅ Events stored in SQLite with proper relations
- ✅ Snapshots only saved when changes detected (or first snapshot)
- ✅ Commands are thin wrappers around services
- ✅ All inputs validated with Zod
- ✅ Pretty terminal output with colors and formatting
- ✅ System handles errors gracefully
- ✅ Documentation allows understanding and extension
- ✅ Diff function can be extracted and reused elsewhere

## License

MIT
