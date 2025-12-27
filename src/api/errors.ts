/**
 * Custom error classes for Polymarket API interactions
 */

/**
 * Base class for all Polymarket API errors
 */
export class PolymarketAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "PolymarketAPIError";
    Object.setPrototypeOf(this, PolymarketAPIError.prototype);
  }
}

/**
 * Network-related errors (timeout, DNS, connection failures)
 */
export class NetworkError extends PolymarketAPIError {
  constructor(message: string, cause?: Error) {
    super(message, undefined, cause);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * HTTP 4xx client errors
 */
export class ClientError extends PolymarketAPIError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = "ClientError";
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * HTTP 5xx server errors
 */
export class ServerError extends PolymarketAPIError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = "ServerError";
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Rate limiting error (HTTP 429)
 */
export class RateLimitError extends PolymarketAPIError {
  constructor(message: string = "Polymarket API rate limit exceeded") {
    super(message, 429);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Validation error for API responses
 */
export class ValidationError extends PolymarketAPIError {
  constructor(message: string, cause?: Error) {
    super(message, undefined, cause);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "DatabaseError";
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Database connection error
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseConnectionError";
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }
}

/**
 * Database transaction error
 */
export class DatabaseTransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseTransactionError";
    Object.setPrototypeOf(this, DatabaseTransactionError.prototype);
  }
}

/**
 * Database constraint violation error
 */
export class DatabaseConstraintError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseConstraintError";
    Object.setPrototypeOf(this, DatabaseConstraintError.prototype);
  }
}

/**
 * Creates user-friendly error messages from HTTP errors
 */
export function createUserFriendlyError(
  statusCode: number,
  defaultMessage: string,
): PolymarketAPIError {
  switch (statusCode) {
    case 400:
      return new ClientError(
        "Invalid wallet address format or parameters",
        statusCode,
      );
    case 404:
      return new ClientError(
        "Wallet address not found on Polymarket or has no positions",
        statusCode,
      );
    case 429:
      return new RateLimitError(
        "Polymarket API rate limit exceeded. Please try again in a moment.",
      );
    case 500:
    case 502:
    case 503:
      return new ServerError(
        "Polymarket API is temporarily unavailable. Please try again later.",
        statusCode,
      );
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return new ClientError(defaultMessage, statusCode);
      } else if (statusCode >= 500) {
        return new ServerError(defaultMessage, statusCode);
      }
      return new PolymarketAPIError(defaultMessage, statusCode);
  }
}
