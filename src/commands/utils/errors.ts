/**
 * Error formatting utilities for CLI
 */

import chalk from "chalk";
import { ZodError } from "zod";

/**
 * Exit codes for different error types
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  API_ERROR: 3,
  DATABASE_ERROR: 4,
} as const;

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

  // Handle Zod validation errors specially
  if (error instanceof ZodError) {
    return formatValidationError(error);
  }

  const lines: string[] = [];
  lines.push(chalk.red(`✗ ${getErrorTitle(error)}`));
  lines.push("");

  const details = getErrorDetails(error);
  if (details) {
    lines.push(chalk.gray(details));
    lines.push("");
  }

  const suggestion = getErrorSuggestion(error);
  if (suggestion) {
    lines.push(chalk.yellow("Suggestions:"));
    lines.push(chalk.gray(suggestion));
    lines.push("");
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
      return "Network connection failed";
    case "RateLimitError":
      return "Rate limit exceeded";
    case "ClientError":
      return "Invalid request";
    case "ServerError":
      return "Polymarket API error";
    case "PolymarketAPIError":
      return "Failed to fetch wallet data";
    case "DatabaseError":
      return "Database error";
    case "DatabaseConnectionError":
      return "Cannot access database";
    case "DatabaseTransactionError":
      return "Failed to save data";
    case "DatabaseConstraintError":
      return "Database integrity error";
    default:
      // Check error message for patterns
      if (error.message.includes("not a valid Ethereum address")) {
        return "Invalid wallet address";
      }
      if (
        error.message.includes("network") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return "Network error";
      }
      if (error.message.includes("timeout")) {
        return "Connection timeout";
      }
      if (
        error.message.includes("database") ||
        error.message.includes("SQLite")
      ) {
        return "Database error";
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
    const addressMatch = error.message.match(/['"`]([^'"`]+)['"`]/);
    const address = addressMatch ? addressMatch[1] : "provided value";
    return `  '${address}' is not a valid Ethereum address.`;
  }

  // For API errors, show the API message
  if (error.name === "PolymarketAPIError" || error.name === "ServerError") {
    return `  ${error.message}`;
  }

  // For network errors
  if (error.name === "NetworkError" || error.message.includes("ENOTFOUND")) {
    return "  Failed to connect to Polymarket API.\n  Please check your internet connection.";
  }

  // For connection timeout
  if (error.message.includes("timeout")) {
    return "  The request took too long to complete.\n  The Polymarket API may be slow or unreachable.";
  }

  // For rate limit errors
  if (error.name === "RateLimitError") {
    return "  Too many requests made to Polymarket API.\n  Please wait a moment before trying again.";
  }

  // For database connection errors
  if (error.name === "DatabaseConnectionError") {
    return "  Cannot open or access the database file.\n  Location: ./data/polymonitor.db";
  }

  // For database transaction errors
  if (error.name === "DatabaseTransactionError") {
    return "  Failed to save snapshot to database.\n  The transaction was rolled back. No data was saved.";
  }

  // For database constraint errors
  if (error.name === "DatabaseConstraintError") {
    return "  Database constraint violation occurred.\n  This may indicate a bug. Please report this issue.";
  }

  // For other database errors
  if (error.name === "DatabaseError") {
    return `  ${error.message}`;
  }

  // For other errors, show the message if it's user-friendly
  if (
    error.message &&
    error.message.length < 150 &&
    !error.message.includes("Error:")
  ) {
    return `  ${error.message}`;
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
        return "  • Verify the address is correct\n  • Ensure address starts with 0x\n  • Address must have exactly 40 hexadecimal characters after 0x\n  • Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      }
      return null;

    case "NetworkError":
      return "  • Check your internet connection\n  • Verify Polymarket API is operational\n  • Try again in a moment";

    case "PolymarketAPIError":
    case "ServerError":
      return "  • Verify the wallet address is correct\n  • Check if the wallet has any positions on Polymarket\n  • Try again in a few minutes if API is down";

    case "RateLimitError":
      return "  • Wait 30-60 seconds before retrying\n  • Avoid making too many requests in quick succession";

    case "DatabaseConnectionError":
      return "  • Ensure the ./data directory exists and is writable\n  • Check file permissions on the database\n  • Close any other processes using the database";

    case "DatabaseTransactionError":
      return "  • Try the operation again\n  • Check if database has sufficient disk space\n  • Verify database is not corrupted";

    case "DatabaseConstraintError":
      return "  • This indicates a bug in the application\n  • Please report this issue with the error details";

    case "ClientError":
      return "  • Verify the wallet address format is correct\n  • Check that all parameters are valid";

    default:
      if (error.message.includes("timeout")) {
        return "  • Check your internet connection\n  • The API may be experiencing high load\n  • Try again in a moment";
      }
      if (error.message.includes("ECONNREFUSED")) {
        return "  • Verify Polymarket API is operational\n  • Check for any network restrictions or firewalls\n  • Try again later";
      }
      return null;
  }
}

/**
 * Formats Zod validation errors into user-friendly messages
 *
 * @param error - Zod error object
 * @returns Formatted error message
 */
function formatValidationError(error: ZodError): string {
  const lines: string[] = [];
  lines.push(chalk.red("✗ Validation Error"));
  lines.push("");

  // Get the first error (most relevant)
  const firstIssue = error.issues[0];

  if (firstIssue) {
    const path = firstIssue.path.join(".");
    const received = (firstIssue as any).received;

    lines.push(chalk.gray(`  Invalid ${path || "input"}`));
    lines.push(chalk.gray(`  ${firstIssue.message}`));

    if (received !== undefined) {
      lines.push(chalk.gray(`  Received: ${received}`));
    }

    lines.push("");
    lines.push(chalk.yellow("Suggestions:"));

    // Provide context-specific suggestions
    if (path.includes("wallet") || firstIssue.message.includes("address")) {
      lines.push(
        chalk.gray(
          "  • Wallet address must start with 0x\n  • Must have exactly 40 hexadecimal characters after 0x\n  • Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        ),
      );
    } else if (
      path.includes("limit") ||
      firstIssue.message.includes("number")
    ) {
      lines.push(
        chalk.gray("  • Must be a positive number\n  • Example: --limit 10"),
      );
    } else {
      lines.push(
        chalk.gray("  • Check the input format\n  • Use --help for examples"),
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Determines the appropriate exit code for an error
 *
 * @param error - Error object
 * @returns Exit code number
 */
export function getExitCodeForError(error: unknown): number {
  if (!(error instanceof Error)) {
    return EXIT_CODES.GENERAL_ERROR;
  }

  // Database errors
  if (
    error.name === "DatabaseError" ||
    error.name === "DatabaseConnectionError" ||
    error.name === "DatabaseTransactionError" ||
    error.name === "DatabaseConstraintError"
  ) {
    return EXIT_CODES.DATABASE_ERROR;
  }

  // API errors
  if (
    error.name === "PolymarketAPIError" ||
    error.name === "NetworkError" ||
    error.name === "ClientError" ||
    error.name === "ServerError" ||
    error.name === "RateLimitError"
  ) {
    return EXIT_CODES.API_ERROR;
  }

  // Validation errors (invalid arguments)
  if (error.name === "ValidationError" || error instanceof ZodError) {
    return EXIT_CODES.INVALID_ARGUMENTS;
  }

  // General error
  return EXIT_CODES.GENERAL_ERROR;
}
