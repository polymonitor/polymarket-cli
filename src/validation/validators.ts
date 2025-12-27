/**
 * Validation utility functions
 * These functions provide type-safe validation with clear error messages
 */

import { ZodError } from "zod";
import type { Position, Snapshot, WalletEvent } from "@/types/core.js";
import {
  positionSchema,
  snapshotSchema,
  walletAddressSchema,
  walletEventSchema,
} from "@/validation/schemas.js";

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
 * Validates a wallet address
 * @param address - The wallet address to validate
 * @returns The validated wallet address
 * @throws ValidationError if the address is invalid
 */
export function validateWalletAddress(address: string): string {
  try {
    return walletAddressSchema.parse(address);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        `Invalid wallet address '${address}'. ${formatZodError(error)}`,
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
