/**
 * Validation utility functions
 * These functions provide type-safe validation with clear error messages
 */

import { ZodError } from "zod";
import type { Position, Snapshot, WalletEvent } from "@/types/core";
import {
  positionSchema,
  snapshotSchema,
  walletAddressSchema,
  walletEventSchema,
} from "@/validation/schemas";

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Formats Zod validation errors into human-readable messages
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? ` at '${issue.path.join(".")}'` : "";
    return `${issue.message}${path}`;
  });
  return issues.join("; ");
}

/**
 * Sanitizes and validates a wallet address
 *
 * Sanitization steps:
 * - Trims leading/trailing whitespace
 * - Removes any internal whitespace
 * - Preserves case (for checksummed addresses)
 *
 * @param address - The wallet address to validate
 * @returns The validated and sanitized wallet address (case preserved)
 * @throws ValidationError if the address is invalid
 */
export function validateWalletAddress(address: string): string {
  // Input validation - must be a string
  if (typeof address !== "string") {
    throw new ValidationError(
      `Wallet address must be a string, received ${typeof address}`,
    );
  }

  // Sanitize: trim whitespace and remove any internal spaces
  let sanitized = address.trim();

  // Remove any whitespace characters (spaces, tabs, newlines)
  sanitized = sanitized.replace(/\s+/g, "");

  // Empty after sanitization
  if (sanitized.length === 0) {
    throw new ValidationError(
      "Wallet address cannot be empty or only whitespace",
    );
  }

  // Validate with Zod schema
  try {
    return walletAddressSchema.parse(sanitized);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        `Invalid wallet address: '${sanitized}' is not a valid Ethereum address. Expected format: 0x followed by 40 hexadecimal characters.`,
        error,
      );
    }
    throw error;
  }
}

/**
 * Validates a position object
 * @param data - The position data to validate
 * @returns The validated position
 * @throws ValidationError if the position is invalid
 */
export function validatePosition(data: unknown): Position {
  try {
    return positionSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        `Invalid position data: ${formatZodError(error)}`,
        error,
      );
    }
    throw error;
  }
}

/**
 * Validates a snapshot object
 * @param data - The snapshot data to validate
 * @returns The validated snapshot
 * @throws ValidationError if the snapshot is invalid
 */
export function validateSnapshot(data: unknown): Snapshot {
  try {
    return snapshotSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        `Invalid snapshot data: ${formatZodError(error)}`,
        error,
      );
    }
    throw error;
  }
}

/**
 * Validates a wallet event object
 * @param data - The wallet event data to validate
 * @returns The validated wallet event
 * @throws ValidationError if the event is invalid
 */
export function validateWalletEvent(data: unknown): WalletEvent {
  try {
    return walletEventSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        `Invalid wallet event data: ${formatZodError(error)}`,
        error,
      );
    }
    throw error;
  }
}
