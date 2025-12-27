# Epic 10: Testing & Documentation

## Goal

Ensure code quality through comprehensive testing and provide clear documentation.

## Tasks

### Unit Tests

Write unit tests for all core logic:

**Diff Function (Critical):**

- Already covered in Epic 4
- Ensure 100% code coverage
- All edge cases tested
- Test fixtures for various scenarios

**Validation Functions:**

- Test wallet address validation
- Test with valid addresses (pass)
- Test with invalid addresses (fail with clear errors)
- Test Position validation
- Test Snapshot validation
- Test edge cases (empty strings, null values, wrong types)

**Repository Functions:**

- Test with in-memory SQLite database
- Test snapshot save and retrieval
- Test event save and query
- Test queries with no results
- Test foreign key relationships
- Test transaction rollback on errors

**Service Functions:**

- Test with mocked dependencies
- Test first snapshot scenario
- Test no-changes scenario
- Test with-changes scenario
- Test error propagation from API
- Test transaction failures

**Formatting Utilities:**

- Test address formatting
- Test timestamp formatting
- Test number formatting
- Test file size formatting
- Test with edge cases (null, 0, very large numbers)

### Integration Tests

Test end-to-end flows:

**Snapshot Command Integration:**

- Create test database
- Mock Polymarket API responses
- Execute snapshot command
- Verify database contains snapshot and events
- Verify command output is correct

**Events Command Integration:**

- Populate test database with events
- Execute events command
- Verify output shows events correctly
- Test with various limits

**Status Command Integration:**

- Populate test database
- Execute status command
- Verify statistics are accurate

### Test Organization

Organize tests logically:

```
tests/
  unit/
    diff.test.ts          # Diff function tests
    validation.test.ts    # Validation tests
    repositories.test.ts  # Repository tests
    services.test.ts      # Service tests
    formatting.test.ts    # Utility tests

  integration/
    snapshot-command.test.ts
    events-command.test.ts
    status-command.test.ts

  fixtures/
    mock-snapshots.ts     # Test snapshot data
    mock-api-responses.ts # Mock API responses
```

### Test Utilities

Create test helpers:

**createTestDatabase():**

- Create in-memory SQLite database
- Run migrations
- Return configured database

**createMockSnapshot(overrides?: Partial<Snapshot>):**

- Generate realistic test snapshot
- Allow customization with overrides

**createMockAPIResponse(overrides?: Partial<APIResponse>):**

- Generate mock API response
- Match Polymarket API format

### Test Coverage

Aim for high coverage:

- Diff function: 100% (critical)
- Core business logic: >90%
- Repositories: >85%
- Commands: >80%
- Overall project: >85%

Run coverage reports:

```bash
npm run test:coverage
```

### README Documentation

Create comprehensive README.md:

**Sections to include:**

**1. Project Overview**

- What is this tool
- What problem does it solve
- Key features

**2. Installation**

- Prerequisites (Node.js version)
- Clone repository
- Install dependencies
- Setup instructions

**3. Configuration**

- Copy .env.example to .env
- Explain each environment variable
- Show example .env

**4. Usage**

- Command reference
- Examples for each command
- Common workflows

**5. Architecture**

- High-level overview
- Key components
- Data flow diagram (optional)

**6. The Diff Function**

- Explain its importance
- Show function signature
- Explain algorithm
- Note that it's reusable

**7. Database Schema**

- Explain snapshots and events tables
- Show relationships
- Explain why events store complete state

**8. Development**

- How to run tests
- How to add new features
- Code organization

**9. Troubleshooting**

- Common issues and solutions

**Example Usage Section:**

````markdown
## Usage

### Take a Snapshot

```bash
npx polymarket-cli snapshot 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```
````

### View Events

```bash
npx polymarket-cli events 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb --limit 20
```

### Check Status

```bash
npx polymarket-cli status
```

````

### Developer Documentation

Create CONTRIBUTING.md or developer guide:

**1. Project Structure**
- Explain directory organization
- Explain key files and their purpose

**2. The Diff Function**
- Deep dive into the algorithm
- Explain why it's pure
- Show examples of inputs/outputs
- Explain test strategy

**3. Adding New Features**
- How to add new commands
- How to add new event types
- How to modify schema

**4. Testing Guidelines**
- How to write tests
- How to run tests
- Coverage expectations

**5. Code Style**
- TypeScript conventions
- Naming conventions
- Comment expectations

### Inline Code Comments

Add comments where helpful:

**Document complex logic:**
```typescript
// Calculate PnL for resolved market
// Winning side: shares * (1 - avg_price)
// Losing side: -(shares * avg_price)
function calculatePnL(position: Position, outcome: string): number {
  // Implementation
}
````

**Document "why" not "what":**

```typescript
// Don't save snapshots when no changes detected to reduce database size
if (events.length === 0 && !isFirstSnapshot) {
  return { saved: false, ... };
}
```

**Document assumptions:**

```typescript
// Assumes Polymarket returns prices between 0 and 1
const price = Math.max(0, Math.min(1, apiPrice));
```

### JSDoc for Public APIs

Add JSDoc to all exported functions:

```typescript
/**
 * Computes the difference between two wallet snapshots.
 *
 * This pure function detects all changes between snapshots and generates
 * self-contained events describing each change.
 *
 * @param prevSnapshot - Previous snapshot, or null for first snapshot
 * @param currSnapshot - Current snapshot to compare against
 * @returns Array of events describing all detected changes
 *
 * @example
 * const events = computeDiff(prevSnapshot, currSnapshot);
 * console.log(`Generated ${events.length} events`);
 */
export function computeDiff(
  prevSnapshot: Snapshot | null,
  currSnapshot: Snapshot,
): WalletEvent[];
```

## Acceptance Criteria

- [ ] Unit tests cover all core logic
- [ ] Diff function has 100% test coverage
- [ ] Integration tests verify end-to-end flows
- [ ] All tests pass consistently
- [ ] Test coverage >85% overall
- [ ] README explains project clearly
- [ ] README has usage examples
- [ ] Developer documentation explains architecture
- [ ] Diff function thoroughly documented
- [ ] Complex logic has explanatory comments
- [ ] All exported functions have JSDoc
- [ ] Can run tests with npm script
- [ ] Can generate coverage report

## Testing

Verify documentation quality:

- Can a new developer understand the project?
- Are usage examples accurate?
- Is architecture clear?
- Can someone extract the diff function for reuse?

## Files to Create/Update

- README.md
- CONTRIBUTING.md (optional)
- All test files (unit and integration)
- Test fixtures and utilities
- Add JSDoc to existing code
- Add inline comments where helpful
