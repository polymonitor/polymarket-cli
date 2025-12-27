/**
 * Tests for Polymarket API client
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { transformToSnapshot, validateWalletAddress } from "@/api/transformer";
import type { PolymarketPosition } from "@/api/types";
import { withRetry, DEFAULT_RETRY_CONFIG } from "@/api/retry";
import {
  NetworkError,
  ServerError,
  ClientError,
  RateLimitError,
  ValidationError,
  createUserFriendlyError,
} from "@/api/errors";
import { PolymarketAPI } from "@/api/polymarket-client";

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
      assert.strictEqual(result, true);
    });
  });

  it("should reject addresses without 0x prefix", () => {
    const result = validateWalletAddress(
      "742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
    );
    assert.strictEqual(result, false);
  });

  it("should reject addresses with incorrect length", () => {
    const result = validateWalletAddress("0x742d35Cc");
    assert.strictEqual(result, false);
  });

  it("should reject addresses with non-hex characters", () => {
    const result = validateWalletAddress(
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg1",
    );
    assert.strictEqual(result, false);
  });
});

describe("transformToSnapshot", () => {
  it("should transform API positions to snapshot format", () => {
    const wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
    const apiPositions: PolymarketPosition[] = [
      {
        proxyWallet: "0x123",
        asset: "asset1",
        conditionId: "market1",
        size: 10.5,
        avgPrice: 0.65,
        initialValue: 100,
        currentValue: 110,
        cashPnl: 10,
        percentPnl: 10,
        totalBought: 10.5,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.7,
        redeemable: false,
        mergeable: false,
        title: "Will it rain tomorrow?",
        slug: "will-it-rain",
        icon: "icon.png",
        eventSlug: "weather",
        outcome: "YES",
        outcomeIndex: 0,
        oppositeOutcome: "NO",
        oppositeAsset: "asset2",
        endDate: "2024-12-31",
        negativeRisk: false,
      },
    ];

    const snapshot = transformToSnapshot(wallet, apiPositions);

    assert.strictEqual(snapshot.wallet, wallet);
    assert.ok(snapshot.timestamp);
    assert.strictEqual(snapshot.positions.length, 1);

    const position = snapshot.positions[0];
    assert.strictEqual(position.marketId, "market1");
    assert.strictEqual(position.marketTitle, "Will it rain tomorrow?");
    assert.strictEqual(position.yesShares, 10.5);
    assert.strictEqual(position.noShares, 0);
    assert.strictEqual(position.yesAvgPrice, 0.65);
    assert.strictEqual(position.noAvgPrice, null);
    assert.strictEqual(position.resolvedOutcome, "unresolved");
  });

  it("should combine YES and NO positions for the same market", () => {
    const wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
    const apiPositions: PolymarketPosition[] = [
      {
        proxyWallet: "0x123",
        asset: "asset1",
        conditionId: "market1",
        size: 10.5,
        avgPrice: 0.65,
        initialValue: 100,
        currentValue: 110,
        cashPnl: 10,
        percentPnl: 10,
        totalBought: 10.5,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.7,
        redeemable: false,
        mergeable: false,
        title: "Will it rain tomorrow?",
        slug: "will-it-rain",
        icon: "icon.png",
        eventSlug: "weather",
        outcome: "YES",
        outcomeIndex: 0,
        oppositeOutcome: "NO",
        oppositeAsset: "asset2",
        endDate: "2024-12-31",
        negativeRisk: false,
      },
      {
        proxyWallet: "0x123",
        asset: "asset2",
        conditionId: "market1",
        size: 5.25,
        avgPrice: 0.45,
        initialValue: 50,
        currentValue: 52,
        cashPnl: 2,
        percentPnl: 4,
        totalBought: 5.25,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.48,
        redeemable: false,
        mergeable: false,
        title: "Will it rain tomorrow?",
        slug: "will-it-rain",
        icon: "icon.png",
        eventSlug: "weather",
        outcome: "NO",
        outcomeIndex: 1,
        oppositeOutcome: "YES",
        oppositeAsset: "asset1",
        endDate: "2024-12-31",
        negativeRisk: false,
      },
    ];

    const snapshot = transformToSnapshot(wallet, apiPositions);

    assert.strictEqual(snapshot.positions.length, 1);

    const position = snapshot.positions[0];
    assert.strictEqual(position.marketId, "market1");
    assert.strictEqual(position.yesShares, 10.5);
    assert.strictEqual(position.noShares, 5.25);
    assert.strictEqual(position.yesAvgPrice, 0.65);
    assert.strictEqual(position.noAvgPrice, 0.45);
  });

  it("should handle empty positions array", () => {
    const wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
    const snapshot = transformToSnapshot(wallet, []);

    assert.strictEqual(snapshot.wallet, wallet);
    assert.strictEqual(snapshot.positions.length, 0);
  });

  it("should handle multiple markets", () => {
    const wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
    const apiPositions: PolymarketPosition[] = [
      {
        proxyWallet: "0x123",
        asset: "asset1",
        conditionId: "market1",
        size: 10.5,
        avgPrice: 0.65,
        initialValue: 100,
        currentValue: 110,
        cashPnl: 10,
        percentPnl: 10,
        totalBought: 10.5,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.7,
        redeemable: false,
        mergeable: false,
        title: "Market 1",
        slug: "market-1",
        icon: "icon.png",
        eventSlug: "event1",
        outcome: "YES",
        outcomeIndex: 0,
        oppositeOutcome: "NO",
        oppositeAsset: "asset2",
        endDate: "2024-12-31",
        negativeRisk: false,
      },
      {
        proxyWallet: "0x123",
        asset: "asset3",
        conditionId: "market2",
        size: 20,
        avgPrice: 0.5,
        initialValue: 100,
        currentValue: 105,
        cashPnl: 5,
        percentPnl: 5,
        totalBought: 20,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.52,
        redeemable: false,
        mergeable: false,
        title: "Market 2",
        slug: "market-2",
        icon: "icon.png",
        eventSlug: "event2",
        outcome: "NO",
        outcomeIndex: 1,
        oppositeOutcome: "YES",
        oppositeAsset: "asset4",
        endDate: "2024-12-31",
        negativeRisk: false,
      },
    ];

    const snapshot = transformToSnapshot(wallet, apiPositions);

    assert.strictEqual(snapshot.positions.length, 2);
    assert.strictEqual(snapshot.positions[0].marketId, "market1");
    assert.strictEqual(snapshot.positions[1].marketId, "market2");
  });
});

describe("Error classes", () => {
  it("should create NetworkError correctly", () => {
    const error = new NetworkError("Network timeout");
    assert.ok(error instanceof NetworkError);
    assert.ok(error instanceof Error);
    assert.strictEqual(error.name, "NetworkError");
    assert.strictEqual(error.message, "Network timeout");
    assert.strictEqual(error.statusCode, undefined);
  });

  it("should create ClientError correctly", () => {
    const error = new ClientError("Bad request", 400);
    assert.ok(error instanceof ClientError);
    assert.strictEqual(error.name, "ClientError");
    assert.strictEqual(error.statusCode, 400);
  });

  it("should create ServerError correctly", () => {
    const error = new ServerError("Internal server error", 500);
    assert.ok(error instanceof ServerError);
    assert.strictEqual(error.name, "ServerError");
    assert.strictEqual(error.statusCode, 500);
  });

  it("should create RateLimitError correctly", () => {
    const error = new RateLimitError();
    assert.ok(error instanceof RateLimitError);
    assert.strictEqual(error.name, "RateLimitError");
    assert.strictEqual(error.statusCode, 429);
  });

  it("should create ValidationError correctly", () => {
    const error = new ValidationError("Invalid data");
    assert.ok(error instanceof ValidationError);
    assert.strictEqual(error.name, "ValidationError");
  });
});

describe("createUserFriendlyError", () => {
  it("should create ClientError for 400 status", () => {
    const error = createUserFriendlyError(400, "Default message");
    assert.ok(error instanceof ClientError);
    assert.match(error.message, /Invalid wallet address/);
  });

  it("should create ClientError for 404 status", () => {
    const error = createUserFriendlyError(404, "Default message");
    assert.ok(error instanceof ClientError);
    assert.match(error.message, /not found/);
  });

  it("should create RateLimitError for 429 status", () => {
    const error = createUserFriendlyError(429, "Default message");
    assert.ok(error instanceof RateLimitError);
    assert.match(error.message, /rate limit/);
  });

  it("should create ServerError for 500 status", () => {
    const error = createUserFriendlyError(500, "Default message");
    assert.ok(error instanceof ServerError);
    assert.match(error.message, /temporarily unavailable/);
  });

  it("should create ServerError for 502 status", () => {
    const error = createUserFriendlyError(502, "Default message");
    assert.ok(error instanceof ServerError);
  });

  it("should create ServerError for 503 status", () => {
    const error = createUserFriendlyError(503, "Default message");
    assert.ok(error instanceof ServerError);
  });
});

describe("withRetry", () => {
  it("should succeed on first try", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return "success";
    };

    const result = await withRetry(fn);
    assert.strictEqual(result, "success");
    assert.strictEqual(attempts, 1);
  });

  it("should retry on NetworkError and eventually succeed", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new NetworkError("Network timeout");
      }
      return "success";
    };

    const result = await withRetry(fn);
    assert.strictEqual(result, "success");
    assert.strictEqual(attempts, 3);
  });

  it("should retry on ServerError and eventually succeed", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new ServerError("Server error", 500);
      }
      return "success";
    };

    const result = await withRetry(fn);
    assert.strictEqual(result, "success");
    assert.strictEqual(attempts, 2);
  });

  it("should retry on RateLimitError and eventually succeed", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new RateLimitError();
      }
      return "success";
    };

    const result = await withRetry(fn);
    assert.strictEqual(result, "success");
    assert.strictEqual(attempts, 2);
  });

  it("should NOT retry on ClientError", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new ClientError("Bad request", 400);
    };

    await assert.rejects(() => withRetry(fn), ClientError);
    assert.strictEqual(attempts, 1);
  });

  it("should throw after max retries exhausted", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new NetworkError("Network timeout");
    };

    const config = { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 };
    await assert.rejects(() => withRetry(fn, config), NetworkError);
    assert.strictEqual(attempts, 3); // Initial attempt + 2 retries
  });
});

describe("PolymarketAPI", () => {
  it("should create client with default config", () => {
    const client = new PolymarketAPI();
    assert.ok(client);
  });

  it("should create client with custom config", () => {
    const client = new PolymarketAPI({
      dataApiUrl: "https://custom.api.com",
      gammaApiUrl: "https://custom.gamma.com",
    });
    assert.ok(client);
  });

  it("should reject invalid wallet address", async () => {
    const client = new PolymarketAPI();
    await assert.rejects(
      () => client.getWalletPositions("invalid-address"),
      ValidationError,
    );
  });

  it("should reject wallet address without 0x prefix", async () => {
    const client = new PolymarketAPI();
    await assert.rejects(
      () =>
        client.getWalletPositions("742d35Cc6634C0532925a3b844Bc9e7595f0bEbC"),
      ValidationError,
    );
  });
});
