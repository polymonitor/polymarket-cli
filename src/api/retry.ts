/**
 * Retry logic with exponential backoff for API requests
 */

import { logger } from "@/utils/logger.js";
import { NetworkError, RateLimitError, ServerError } from "./errors.js";

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  exponentialFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  exponentialFactor: 2,
};

/**
 * Determines if an error should be retried
 */
function shouldRetry(error: Error): boolean {
  // Retry on network errors
  if (error instanceof NetworkError) {
    return true;
  }

  // Retry on server errors (5xx)
  if (error instanceof ServerError) {
    return true;
  }

  // Retry on rate limiting
  if (error instanceof RateLimitError) {
    return true;
  }

  // Don't retry on client errors (4xx except 429)
  return false;
}

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff retry logic
 * @param fn The async function to execute
 * @param config Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw the error
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // Check if we should retry
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delayMs =
        config.initialDelayMs * Math.pow(config.exponentialFactor, attempt);

      logger.warn(
        `Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}. Retrying in ${delayMs}ms...`,
      );

      // Wait before retrying
      await delay(delayMs);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}
