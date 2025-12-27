/**
 * Polymarket API module exports
 */

export type { RetryConfig } from "./retry.js";
export type { PolymarketAPIConfig } from "./polymarket-client.js";
export type { PolymarketPosition, PolymarketMarket } from "./types.js";
export { PolymarketAPI, DEFAULT_CONFIG } from "./polymarket-client.js";
export {
  PolymarketAPIError,
  NetworkError,
  ClientError,
  ServerError,
  RateLimitError,
  ValidationError,
  createUserFriendlyError,
} from "./errors.js";
export { withRetry, DEFAULT_RETRY_CONFIG } from "./retry.js";
export { transformToSnapshot, validateWalletAddress } from "./transformer.js";
