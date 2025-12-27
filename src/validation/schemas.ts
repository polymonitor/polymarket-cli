/**
 * Zod validation schemas for runtime type checking
 */

import { z } from "zod";
import type {
  EventType,
  Position,
  Snapshot,
  WalletEvent,
} from "@/types/core.js";

/**
 * Validates Ethereum wallet addresses
 * Must be 0x followed by 40 hexadecimal characters
 */
export const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
  error:
    "Invalid wallet address format. Expected: 0x followed by 40 hexadecimal characters. Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
});

/**
 * Validates market outcome values
 */
export const marketOutcomeSchema = z.enum([
  "yes",
  "no",
  "invalid",
  "unresolved",
]);

/**
 * Validates event types
 */
export const eventTypeSchema = z.enum([
  "POSITION_OPENED",
  "POSITION_UPDATED",
  "POSITION_CLOSED",
  "MARKET_RESOLVED",
]) satisfies z.ZodType<EventType>;

/**
 * Validates a single position
 */
export const positionSchema = z.object({
  marketId: z.string().min(1, { error: "Market ID cannot be empty" }),
  marketTitle: z.string().min(1, { error: "Market title cannot be empty" }),
  yesShares: z
    .number()
    .nonnegative({ error: "Yes shares must be non-negative" }),
  noShares: z.number().nonnegative({ error: "No shares must be non-negative" }),
  yesAvgPrice: z
    .number()
    .min(0, { error: "Yes average price must be between 0 and 1" })
    .max(1, { error: "Yes average price must be between 0 and 1" })
    .nullable(),
  noAvgPrice: z
    .number()
    .min(0, { error: "No average price must be between 0 and 1" })
    .max(1, { error: "No average price must be between 0 and 1" })
    .nullable(),
  resolvedOutcome: marketOutcomeSchema,
}) satisfies z.ZodType<Position>;

/**
 * Validates a complete snapshot
 */
export const snapshotSchema = z.object({
  wallet: walletAddressSchema,
  timestamp: z.iso.datetime({
    error:
      "Timestamp must be in ISO 8601 format. Example: 2024-01-15T10:30:00.000Z",
  }),
  positions: z.array(positionSchema),
}) satisfies z.ZodType<Snapshot>;

/**
 * Validates a wallet event
 */
export const walletEventSchema = z.object({
  eventId: z.uuid({ error: "Event ID must be a valid UUID" }),
  wallet: walletAddressSchema,
  eventType: eventTypeSchema,
  marketId: z.string().min(1, { error: "Market ID cannot be empty" }),
  marketTitle: z.string().min(1, { error: "Market title cannot be empty" }),
  snapshotId: z
    .number()
    .int()
    .positive({ error: "Snapshot ID must be a positive integer" }),

  // Before state
  prevYesShares: z.number().nonnegative().nullable(),
  prevNoShares: z.number().nonnegative().nullable(),
  prevYesAvgPrice: z.number().min(0).max(1).nullable(),
  prevNoAvgPrice: z.number().min(0).max(1).nullable(),

  // After state
  currYesShares: z.number().nonnegative().nullable(),
  currNoShares: z.number().nonnegative().nullable(),
  currYesAvgPrice: z.number().min(0).max(1).nullable(),
  currNoAvgPrice: z.number().min(0).max(1).nullable(),

  // Resolution state and PnL
  resolvedOutcome: marketOutcomeSchema,
  pnl: z.number().optional(),
}) satisfies z.ZodType<WalletEvent>;
