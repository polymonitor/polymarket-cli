# Polymarket API Documentation

## Overview

Polymarket provides REST APIs for accessing market data and user positions. No authentication is required for read-only operations.

## Rate Limits

- Free tier: ~1,000 calls/hour for non-trading queries
- Generous limits for basic data access

## Endpoints

### 1. Get User Positions

Fetches current positions for a wallet address.

**Endpoint:**

```
GET https://data-api.polymarket.com/positions
```

**Required Parameters:**

- `user` (string): User wallet address (0x-prefixed, 40 hex characters)

**Optional Parameters:**

- `market` (string[]): Comma-separated condition IDs
- `eventId` (integer[]): Comma-separated event IDs
- `sizeThreshold` (number): Minimum position size (default: 1)
- `redeemable` (boolean): Filter redeemable positions (default: false)
- `mergeable` (boolean): Filter mergeable positions (default: false)
- `limit` (integer): Max results (default: 100, range: 0-500)
- `offset` (integer): Skip results (default: 0, range: 0-10000)
- `sortBy` (enum): CURRENT, INITIAL, TOKENS, CASHPNL, PERCENTPNL, TITLE, RESOLVING, PRICE, AVGPRICE (default: TOKENS)
- `sortDirection` (enum): ASC or DESC (default: DESC)
- `title` (string): Filter by market title (max 100 chars)

**Response Fields:**
Each position object contains:

- `proxyWallet`: User's proxy wallet address
- `asset`: Asset/token ID
- `conditionId`: Market condition ID
- `size`: Position size (number of shares)
- `avgPrice`: Average price paid
- `initialValue`: Initial investment value
- `currentValue`: Current position value
- `cashPnl`: Cash profit/loss
- `percentPnl`: Percentage profit/loss
- `totalBought`: Total shares bought
- `realizedPnl`: Realized profit/loss
- `percentRealizedPnl`: Percent realized PnL
- `curPrice`: Current market price
- `redeemable`: Can be redeemed
- `mergeable`: Can be merged
- `title`: Market title
- `slug`: Market slug
- `icon`: Market icon URL
- `eventSlug`: Event slug
- `outcome`: Outcome name (YES/NO)
- `outcomeIndex`: Outcome index (0 or 1)
- `oppositeOutcome`: Opposite outcome name
- `oppositeAsset`: Opposite asset ID
- `endDate`: Market end date
- `negativeRisk`: Negative risk flag

**Example Request:**

```
GET https://data-api.polymarket.com/positions?user=0x1234567890123456789012345678901234567890&limit=100
```

### 2. List Markets

Fetches market metadata including titles, condition IDs, and resolution status.

**Endpoint:**

```
GET https://gamma-api.polymarket.com/markets
```

**Required Parameters:**

- `limit` (integer, ≥ 0): Maximum records to return
- `offset` (integer, ≥ 0): Number of records to skip

**Optional Parameters:**

- `condition_ids` (string[]): Filter by condition IDs
- `clob_token_ids` (string[]): Filter by CLOB token IDs
- `slug` (string[]): Filter by market slugs
- `closed` (boolean): Filter by market status
- `order` (string): Comma-separated fields for ordering
- `ascending` (boolean): Sort direction

**Response Fields:**
Each market object contains:

- `id`: Market ID
- `question`: Market question
- `conditionId`: Unique condition identifier
- `slug`: URL slug
- `active`: Market is active
- `closed`: Market is closed
- `archived`: Market is archived
- `volumeNum`: Total volume
- `liquidityNum`: Total liquidity
- `lastTradePrice`: Last trade price
- `outcomes`: Array of outcome names
- `outcomePrices`: Current outcome prices
- `endDate`: Market end date
- `description`: Market description
- `resolutionSource`: Resolution source

**Example Request:**

```
GET https://gamma-api.polymarket.com/markets?limit=10&offset=0
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful request
- **400 Bad Request**: Invalid parameters (e.g., malformed wallet address)
- **404 Not Found**: Resource not found (wallet has no positions)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: API server error
- **502 Bad Gateway**: Gateway error
- **503 Service Unavailable**: Service temporarily unavailable

### Network Errors

- Connection timeout
- DNS resolution failure
- Network unreachable

## Best Practices

1. **Validate wallet addresses** before making requests (0x-prefixed, 40 hex chars)
2. **Implement retry logic** with exponential backoff for transient failures (5xx errors, network issues)
3. **Don't retry** on 4xx client errors (except 429 rate limiting)
4. **Cache market metadata** to reduce API calls
5. **Respect rate limits** to avoid 429 errors
6. **Use appropriate User-Agent** header to identify your client

## References

- [Get User Positions (Data-API) - Polymarket Documentation](https://docs.polymarket.com/developers/misc-endpoints/data-api-get-positions)
- [List markets - Polymarket Documentation](https://docs.polymarket.com/api-reference/markets/list-markets)
- [Polymarket Documentation](https://docs.polymarket.com/)
