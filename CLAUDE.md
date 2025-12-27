# Polymarket Wallet Snapshot CLI - Development Guide

## Project Purpose

This is a proof-of-concept CLI tool to validate a diff algorithm for detecting changes in Polymarket wallet positions. The core deliverable is a **pure, reusable diff function** that can be extracted and used in other projects.

## What This Tool Does

1. Fetches current positions for a Polymarket wallet via API
2. Compares with previous snapshot stored in database
3. Generates self-contained events describing all changes
4. Stores snapshots and events in SQLite for audit trail

## Key Design Decisions

**Manual Operation Only**: This is a POC for validating the diff logic. No automation, no WebSockets, no real-time monitoring. Just manual commands to test the algorithm.

**Event Sourcing Pattern**: Events contain complete before/after state, not just deltas. This makes them self-contained and useful for notifications without querying additional data.

**Atomic Saves**: Snapshots and their generated events are saved together in a database transaction. If no events are generated (no changes), nothing is saved (except first snapshot).

**The Diff Function is Everything**: The core intellectual property is the pure `computeDiff()` function. It must be isolated, thoroughly tested, and reusable in other contexts.

## Tech Stack

- **Runtime**: TypeScript + Node.js
- **CLI**: Commander.js (commands are thin wrappers, no business logic)
- **Database**: SQLite + Drizzle ORM
- **Validation**: Zod for all inputs
- **Pretty Output**: chalk, ora, cli-table3
- **Execution**: `npx polymarket-cli <command>`

## Commands

```bash
# Take a snapshot of a wallet
npx polymarket-cli snapshot <wallet_address>

# View events for a wallet
npx polymarket-cli events <wallet_address> [--limit N] [--verbose]

# Show system status
npx polymarket-cli status
```

## Core Principles

1. **Commands are thin**: Only parse input, call services, format output
2. **Diff function is pure**: No side effects, no external dependencies, fully testable
3. **Events are self-contained**: Each event has all data needed to understand the change
4. **Database integrity**: Snapshots + events saved in single transaction
5. **No saves without changes**: Only save snapshot if events generated (except first snapshot)

## Database Schema

**snapshots table:**

- id (autoincrement primary key)
- wallet (text)
- snapshot_data (JSON)
- timestamp (ISO 8601)

**events table:**

- id (UUID primary key)
- wallet (text)
- event_type (text)
- market_id, market_title (text)
- snapshot_id (foreign key to snapshots.id)
- prev_yes_shares, prev_no_shares, prev_yes_avg_price, prev_no_avg_price (nullable)
- curr_yes_shares, curr_no_shares, curr_yes_avg_price, curr_no_avg_price (nullable)
- resolved_outcome, pnl (nullable)

## Implementation Epics

The project is broken down into the following epics, to be implemented in order:

1. [Configuration & Database Setup](./docs/epics/epic-01.md)
2. [Type Definitions & Validation](./docs/epics/epic-02.md)
3. [Polymarket API Integration](./docs/epics/epic-03.md)
4. [Core Diff Function](./docs/epics/epic-04.md) ⭐ **CRITICAL - This is the key deliverable**
5. [Database Repositories](./docs/epics/epic-05.md)
6. [Snapshot Service](./docs/epics/epic-06.md)
7. [Snapshot Command](./docs/epics/epic-07.md)
8. [Events Command](./docs/epics/epic-08.md)
9. [Status Command](./docs/epics/epic-09.md)
10. [Testing & Documentation](./docs/epics/epic-10.md)
11. [Error Handling & Polish](./docs/epics/epic-11.md)

## Development Workflow

When asked to "implement epic N":

1. Read the corresponding epic file from `docs/epics/`
2. Understand the tasks and acceptance criteria
3. Implement the functionality following the tech stack
4. Ensure acceptance criteria are met
5. Write tests where specified

## Key Deliverable

The most important output of this project is the **diff function** in Epic 4. This pure function should be:

- Isolated from all external dependencies
- Thoroughly tested (100% coverage)
- Well-documented
- Reusable in other projects

Everything else exists to validate that this function works correctly.

## Success Criteria

- ✅ Can manually snapshot any wallet
- ✅ Diff function is isolated, pure, and thoroughly tested
- ✅ Events contain complete before/after state
- ✅ Events stored in SQLite via Drizzle with proper relations
- ✅ Snapshots only saved when changes detected (or first snapshot)
- ✅ Commands are thin wrappers around services
- ✅ All inputs validated with Zod
- ✅ Pretty terminal output with colors and formatting
- ✅ System handles errors gracefully
- ✅ Documentation allows understanding and extension
- ✅ **Diff function can be extracted and reused elsewhere**
