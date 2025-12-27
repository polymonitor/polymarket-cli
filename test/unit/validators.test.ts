/**
 * Tests for validation functions
 */

import { describe, it } from "node:test";
import type { Position, Snapshot, WalletEvent } from "@/types/core";
import assert from "node:assert";
import {
  validateWalletAddress,
  validatePosition,
  validateSnapshot,
  validateWalletEvent,
  ValidationError,
} from "@/validation/validators";

describe("validateWalletAddress", () => {
  it("should accept valid wallet addresses", () => {
    const validAddresses = [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      "0x0000000000000000000000000000000000000000",
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      "0xabcdef1234567890abcdef1234567890abcdef12",
    ];

    validAddresses.forEach((address) => {
      const result = validateWalletAddress(address);
      assert.strictEqual(result, address);
    });
  });

  it("should reject addresses without 0x prefix", () => {
    assert.throws(
      () => validateWalletAddress("742d35Cc6634C0532925a3b844Bc9e7595f0bEbC"),
      {
        name: "ValidationError",
        message: /Invalid wallet address/,
      },
    );
  });

  it("should reject addresses with incorrect length", () => {
    assert.throws(() => validateWalletAddress("0x742d35Cc"), {
      name: "ValidationError",
      message: /Invalid wallet address/,
    });
  });

  it("should reject addresses with non-hex characters", () => {
    assert.throws(
      () => validateWalletAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg1"),
      {
        name: "ValidationError",
        message: /Invalid wallet address/,
      },
    );
  });

  it("should provide clear error messages", () => {
    try {
      validateWalletAddress("0x123");
      assert.fail("Should have thrown ValidationError");
    } catch (error) {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /Invalid wallet address/);
      assert.match(error.message, /0x followed by 40 hexadecimal characters/);
      // Updated message format no longer includes "Example:"
    }
  });
});

describe("validatePosition", () => {
  const validPosition: Position = {
    marketId: "market123",
    marketTitle: "Will it rain tomorrow?",
    yesShares: 10.5,
    noShares: 5.25,
    yesAvgPrice: 0.65,
    noAvgPrice: 0.45,
    resolvedOutcome: "unresolved",
  };

  it("should accept valid positions", () => {
    const result = validatePosition(validPosition);
    assert.deepStrictEqual(result, validPosition);
  });

  it("should accept positions with null prices", () => {
    const position: Position = {
      ...validPosition,
      yesAvgPrice: null,
      noAvgPrice: null,
    };
    const result = validatePosition(position);
    assert.deepStrictEqual(result, position);
  });

  it("should accept positions with resolved outcome", () => {
    const position: Position = {
      ...validPosition,
      resolvedOutcome: "yes",
    };
    const result = validatePosition(position);
    assert.deepStrictEqual(result, position);
  });

  it("should reject negative shares", () => {
    assert.throws(() => validatePosition({ ...validPosition, yesShares: -1 }), {
      name: "ValidationError",
      message: /non-negative/,
    });
  });

  it("should reject invalid price ranges", () => {
    assert.throws(
      () => validatePosition({ ...validPosition, yesAvgPrice: 1.5 }),
      {
        name: "ValidationError",
        message: /between 0 and 1/,
      },
    );

    assert.throws(
      () => validatePosition({ ...validPosition, noAvgPrice: -0.1 }),
      {
        name: "ValidationError",
        message: /between 0 and 1/,
      },
    );
  });

  it("should reject empty market ID", () => {
    assert.throws(() => validatePosition({ ...validPosition, marketId: "" }), {
      name: "ValidationError",
      message: /Market ID cannot be empty/,
    });
  });

  it("should reject empty market title", () => {
    assert.throws(
      () => validatePosition({ ...validPosition, marketTitle: "" }),
      {
        name: "ValidationError",
        message: /Market title cannot be empty/,
      },
    );
  });
});

describe("validateSnapshot", () => {
  const validSnapshot: Snapshot = {
    wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
    timestamp: "2024-01-15T10:30:00.000Z",
    positions: [
      {
        marketId: "market123",
        marketTitle: "Will it rain tomorrow?",
        yesShares: 10.5,
        noShares: 5.25,
        yesAvgPrice: 0.65,
        noAvgPrice: 0.45,
        resolvedOutcome: "unresolved",
      },
    ],
  };

  it("should accept valid snapshots", () => {
    const result = validateSnapshot(validSnapshot);
    assert.deepStrictEqual(result, validSnapshot);
  });

  it("should accept snapshots with empty positions array", () => {
    const snapshot: Snapshot = {
      ...validSnapshot,
      positions: [],
    };
    const result = validateSnapshot(snapshot);
    assert.deepStrictEqual(result, snapshot);
  });

  it("should reject invalid wallet addresses", () => {
    assert.throws(
      () => validateSnapshot({ ...validSnapshot, wallet: "invalid" }),
      {
        name: "ValidationError",
        message: /Invalid snapshot data/,
      },
    );
  });

  it("should reject invalid timestamp format", () => {
    assert.throws(
      () => validateSnapshot({ ...validSnapshot, timestamp: "2024-01-15" }),
      {
        name: "ValidationError",
        message: /ISO 8601/,
      },
    );
  });

  it("should reject invalid positions", () => {
    const invalidSnapshot = {
      ...validSnapshot,
      positions: [
        {
          ...validSnapshot.positions[0],
          yesShares: -1,
        },
      ],
    };

    assert.throws(() => validateSnapshot(invalidSnapshot), {
      name: "ValidationError",
      message: /non-negative/,
    });
  });
});

describe("validateWalletEvent", () => {
  const validEvent: WalletEvent = {
    eventId: "550e8400-e29b-41d4-a716-446655440000",
    wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
    eventType: "POSITION_UPDATED",
    marketId: "market123",
    marketTitle: "Will it rain tomorrow?",
    snapshotId: 1,
    timestamp: "2024-12-27T10:30:00.000Z",
    prevYesShares: 5.0,
    prevNoShares: 2.5,
    prevYesAvgPrice: 0.6,
    prevNoAvgPrice: 0.4,
    currYesShares: 10.5,
    currNoShares: 5.25,
    currYesAvgPrice: 0.65,
    currNoAvgPrice: 0.45,
    resolvedOutcome: "unresolved",
  };

  it("should accept valid wallet events", () => {
    const result = validateWalletEvent(validEvent);
    assert.deepStrictEqual(result, validEvent);
  });

  it("should accept POSITION_OPENED events with null prev values", () => {
    const event: WalletEvent = {
      ...validEvent,
      eventType: "POSITION_OPENED",
      prevYesShares: null,
      prevNoShares: null,
      prevYesAvgPrice: null,
      prevNoAvgPrice: null,
    };
    const result = validateWalletEvent(event);
    assert.deepStrictEqual(result, event);
  });

  it("should accept POSITION_CLOSED events with null curr values", () => {
    const event: WalletEvent = {
      ...validEvent,
      eventType: "POSITION_CLOSED",
      currYesShares: null,
      currNoShares: null,
      currYesAvgPrice: null,
      currNoAvgPrice: null,
    };
    const result = validateWalletEvent(event);
    assert.deepStrictEqual(result, event);
  });

  it("should accept MARKET_RESOLVED events with outcome and pnl", () => {
    const event: WalletEvent = {
      ...validEvent,
      eventType: "MARKET_RESOLVED",
      resolvedOutcome: "yes",
      pnl: 5.25,
    };
    const result = validateWalletEvent(event);
    assert.deepStrictEqual(result, event);
  });

  it("should accept all resolved outcome values", () => {
    const outcomes: Array<"yes" | "no" | "invalid" | "unresolved"> = [
      "yes",
      "no",
      "invalid",
      "unresolved",
    ];
    outcomes.forEach((outcome) => {
      const event: WalletEvent = {
        ...validEvent,
        resolvedOutcome: outcome,
      };
      const result = validateWalletEvent(event);
      assert.strictEqual(result.resolvedOutcome, outcome);
    });
  });

  it("should reject invalid event types", () => {
    assert.throws(
      () =>
        validateWalletEvent({
          ...validEvent,
          eventType: "INVALID_TYPE" as any,
        }),
      {
        name: "ValidationError",
      },
    );
  });

  it("should reject invalid UUID format", () => {
    assert.throws(
      () => validateWalletEvent({ ...validEvent, eventId: "not-a-uuid" }),
      {
        name: "ValidationError",
        message: /UUID/,
      },
    );
  });

  it("should reject invalid wallet address", () => {
    assert.throws(
      () => validateWalletEvent({ ...validEvent, wallet: "invalid" }),
      {
        name: "ValidationError",
      },
    );
  });

  it("should reject non-positive snapshot ID", () => {
    assert.throws(() => validateWalletEvent({ ...validEvent, snapshotId: 0 }), {
      name: "ValidationError",
      message: /positive integer/,
    });
  });

  it("should reject negative shares", () => {
    assert.throws(
      () => validateWalletEvent({ ...validEvent, currYesShares: -1 }),
      {
        name: "ValidationError",
      },
    );
  });

  it("should reject invalid price ranges", () => {
    assert.throws(
      () => validateWalletEvent({ ...validEvent, currYesAvgPrice: 1.5 }),
      {
        name: "ValidationError",
      },
    );
  });
});
