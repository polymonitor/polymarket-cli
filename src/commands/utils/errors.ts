/**
 * Error formatting utilities for CLI
 */

import chalk from "chalk";

/**
 * Formats an error for display to the user
 *
 * @param error - Error object
 * @returns Formatted error message
 */
export function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return chalk.red("✗ Error: Unknown error occurred");
  }

  const lines: string[] = [];
  lines.push(chalk.red(`✗ Error: ${getErrorTitle(error)}`));
  lines.push("");

  const details = getErrorDetails(error);
  if (details) {
    lines.push(chalk.gray(`  ${details}`));
    lines.push("");
  }

  const suggestion = getErrorSuggestion(error);
  if (suggestion) {
    lines.push(chalk.gray(`  ${suggestion}`));
  }

  return lines.join("\n");
}

/**
 * Gets a user-friendly title for an error
 *
 * @param error - Error object
 * @returns Error title
 */
function getErrorTitle(error: Error): string {
  // Check error name for known types
  switch (error.name) {
    case "ValidationError":
      return "Invalid wallet address";
    case "NetworkError":
      return "Network request failed";
    case "RateLimitError":
      return "Rate limit exceeded";
    case "ClientError":
      return "Invalid request";
    case "ServerError":
      return "Polymarket API error";
    case "PolymarketAPIError":
      return "Failed to fetch wallet data";
    default:
      // Check error message for patterns
      if (error.message.includes("not a valid Ethereum address")) {
        return "Invalid wallet address";
      }
      if (
        error.message.includes("network") ||
        error.message.includes("ENOTFOUND")
      ) {
        return "Network error";
      }
      if (error.message.includes("timeout")) {
        return "Request timeout";
      }
      return "Operation failed";
  }
}

/**
 * Gets detailed error information
 *
 * @param error - Error object
 * @returns Error details
 */
function getErrorDetails(error: Error): string | null {
  // For validation errors, show the specific validation issue
  if (
    error.name === "ValidationError" ||
    error.message.includes("Invalid wallet address")
  ) {
    const addressMatch = error.message.match(/'([^']+)'/);
    const address = addressMatch ? addressMatch[1] : "provided value";
    return `'${address}' is not a valid Ethereum address.`;
  }

  // For API errors, show the API message
  if (error.name === "PolymarketAPIError" || error.name === "ServerError") {
    return `Polymarket API returned: ${error.message}`;
  }

  // For network errors
  if (error.name === "NetworkError" || error.message.includes("ENOTFOUND")) {
    return "Could not connect to Polymarket API.";
  }

  // For rate limit errors
  if (error.name === "RateLimitError") {
    return "You have made too many requests. Please wait before trying again.";
  }

  // For other errors, show the message if it's user-friendly
  if (error.message && error.message.length < 100) {
    return error.message;
  }

  return null;
}

/**
 * Gets a suggestion for fixing the error
 *
 * @param error - Error object
 * @returns Suggestion text
 */
function getErrorSuggestion(error: Error): string | null {
  switch (error.name) {
    case "ValidationError":
      if (error.message.includes("Invalid wallet address")) {
        return "Expected format: 0x followed by 40 hexadecimal characters\n  Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      }
      return null;

    case "NetworkError":
      return "Please check your internet connection and try again.";

    case "PolymarketAPIError":
    case "ServerError":
      return "Please verify the wallet address is correct.";

    case "RateLimitError":
      return "Please wait a few moments before making another request.";

    default:
      return null;
  }
}
