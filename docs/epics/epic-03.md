# Epic 3: Polymarket API Integration

## Goal

Integrate with Polymarket's REST API to fetch wallet positions and market data.

## Prerequisites

- Configuration module completed (Epic 1)
- Type definitions and validation completed (Epic 2)

## Tasks

### Research Polymarket API

Before implementing, research and document:

- API endpoint for fetching wallet positions
- Response format and structure
- Authentication requirements (if any)
- Rate limits and throttling policies
- Error response formats
- Example requests and responses

Create documentation of findings for reference.

### API Client Class

Implement a client class for interacting with Polymarket API.

**Class structure:**

```typescript
class PolymarketAPI {
  constructor(baseUrl: string) {
    // Initialize with base URL from config
  }

  async getWalletPositions(address: string): Promise<Snapshot> {
    // Fetch wallet positions
    // Transform to Snapshot format
    // Validate with Zod
    // Return typed Snapshot
  }

  async getMarketDetails(marketId: string): Promise<MarketDetails> {
    // Fetch market metadata
    // Useful for getting market titles, resolution status
  }
}
```

**Requirements:**

- Use native `fetch` API (Node 18+)
- Validate wallet address before making request
- Transform API response to match our Snapshot interface
- Validate response data with Zod schemas
- Return strongly typed data

### HTTP Request Handling

Implement robust HTTP request handling:

- Set appropriate headers (Content-Type, User-Agent, etc.)
- Include authentication if required by Polymarket
- Parse JSON responses
- Handle different status codes appropriately

### Error Handling

Handle all API error scenarios:

**Network errors:**

- Connection timeout
- DNS resolution failure
- Network unreachable
- Retry with exponential backoff

**HTTP errors:**

- 400 Bad Request - invalid wallet address format
- 404 Not Found - wallet doesn't exist or has no positions
- 429 Too Many Requests - rate limited
- 500/502/503 Server errors - API temporarily down

**Response validation errors:**

- Unexpected response format
- Missing required fields
- Invalid data types

**Error messages should be user-friendly:**

- "Failed to fetch wallet positions: network timeout. Retrying..."
- "Wallet address not found on Polymarket"
- "Polymarket API rate limit exceeded. Please try again in a moment."

### Retry Logic

Implement exponential backoff for transient failures:

- Initial delay: 1 second
- Max retries: 3
- Exponential factor: 2 (1s, 2s, 4s)
- Only retry on network errors and 5xx status codes
- Don't retry on 4xx client errors (except 429)

### Response Transformation

Transform Polymarket API response to our Snapshot format:

- Map API field names to our interface
- Calculate or fetch average prices if not provided
- Determine market resolution status
- Handle missing or null values appropriately
- Ensure timestamp is ISO 8601 format

### API Response Validation

After transforming response:

- Validate entire Snapshot with Zod schema
- Ensure all positions are valid
- Validate all numeric values are in expected ranges
- Throw clear error if validation fails

## Acceptance Criteria

- [ ] API client successfully connects to Polymarket
- [ ] Can fetch wallet positions for any valid address
- [ ] Responses transformed to match Snapshot interface
- [ ] All responses validated with Zod before returning
- [ ] Network errors handled with retry logic
- [ ] HTTP errors produce clear, user-friendly messages
- [ ] Rate limiting errors handled gracefully
- [ ] Invalid/malformed responses caught and reported
- [ ] Client can fetch market details for metadata
- [ ] All errors are logged appropriately

## Testing

Create tests for API client:

- Mock successful API responses
- Test transformation from API format to Snapshot
- Test validation of API responses
- Mock network errors and verify retry behavior
- Mock rate limiting and verify handling
- Mock invalid responses and verify error handling
- Test with real Polymarket API (optional, for integration testing)

**Test with known public wallets** to verify real API integration works.

## Files to Create

Suggested files (organize as you prefer):

- API client class
- HTTP utility functions
- Response transformation logic
- Error handling utilities
- API documentation/notes
