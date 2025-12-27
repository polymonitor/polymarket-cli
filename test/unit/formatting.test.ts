/**
 * Tests for formatting utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  formatWalletAddress,
  formatNumber,
  formatPrice,
  formatShares,
  formatTimestamp,
  formatFileSize,
  formatNumberWithCommas,
  formatAverage,
  truncateTitle,
  formatEventSummary,
  formatEventChange,
  getEventIcon,
} from "@/commands/utils/format";
import type { WalletEvent } from "@/types/core";

describe("formatWalletAddress", () => {
  it("should shorten long addresses", () => {
    const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
    const result = formatWalletAddress(address);
    assert.strictEqual(result, "0x742d35Cc...bEbC");
  });

  it("should not shorten short addresses", () => {
    const address = "0x123456";
    const result = formatWalletAddress(address);
    assert.strictEqual(result, "0x123456");
  });
});

describe("formatNumber", () => {
  it("should format numbers with default 2 decimals", () => {
    assert.strictEqual(formatNumber(123.456), "123.46");
    assert.strictEqual(formatNumber(0.1), "0.10");
  });

  it("should format numbers with custom decimals", () => {
    assert.strictEqual(formatNumber(123.456, 0), "123");
    assert.strictEqual(formatNumber(123.456, 3), "123.456");
  });

  it("should handle zero", () => {
    assert.strictEqual(formatNumber(0), "0.00");
    assert.strictEqual(formatNumber(0, 0), "0");
  });

  it("should handle very large numbers", () => {
    // Large numbers are now formatted with M suffix
    assert.strictEqual(formatNumber(1234567.89), "1.2M");
  });
});

describe("formatPrice", () => {
  it("should format prices with $ symbol", () => {
    assert.strictEqual(formatPrice(0.52), "$0.52");
    assert.strictEqual(formatPrice(0.1), "$0.10");
  });

  it("should handle null values", () => {
    assert.strictEqual(formatPrice(null), "N/A");
  });

  it("should format edge case prices", () => {
    assert.strictEqual(formatPrice(0), "$0.00");
    assert.strictEqual(formatPrice(1), "$1.00");
  });
});

describe("formatShares", () => {
  it("should format shares as integers", () => {
    assert.strictEqual(formatShares(100), "100");
    assert.strictEqual(formatShares(150.75), "151");
  });

  it("should handle null and zero", () => {
    assert.strictEqual(formatShares(null), "0");
    assert.strictEqual(formatShares(0), "0");
  });
});

describe("formatTimestamp", () => {
  it("should format ISO timestamps correctly", () => {
    const iso = "2024-01-15T10:30:45.000Z";
    const result = formatTimestamp(iso);
    // The result depends on the local timezone, so we just check the format
    assert.match(result, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("formatFileSize", () => {
  it("should format bytes", () => {
    assert.strictEqual(formatFileSize(500), "500 B");
    assert.strictEqual(formatFileSize(0), "0 B");
  });

  it("should format kilobytes", () => {
    assert.strictEqual(formatFileSize(1024), "1.0 KB");
    assert.strictEqual(formatFileSize(2048), "2.0 KB");
    assert.strictEqual(formatFileSize(1536), "1.5 KB");
  });

  it("should format megabytes", () => {
    assert.strictEqual(formatFileSize(1024 * 1024), "1.0 MB");
    assert.strictEqual(formatFileSize(1024 * 1024 * 2.5), "2.5 MB");
  });

  it("should format gigabytes", () => {
    assert.strictEqual(formatFileSize(1024 * 1024 * 1024), "1.0 GB");
    assert.strictEqual(formatFileSize(1024 * 1024 * 1024 * 3.2), "3.2 GB");
  });
});

describe("formatNumberWithCommas", () => {
  it("should add thousand separators", () => {
    assert.strictEqual(formatNumberWithCommas(1000), "1,000");
    assert.strictEqual(formatNumberWithCommas(1000000), "1,000,000");
  });

  it("should handle numbers without thousands", () => {
    assert.strictEqual(formatNumberWithCommas(100), "100");
    assert.strictEqual(formatNumberWithCommas(0), "0");
  });
});

describe("formatAverage", () => {
  it("should calculate and format averages", () => {
    assert.strictEqual(formatAverage(100, 10), "10.0 avg");
    assert.strictEqual(formatAverage(250, 100), "2.5 avg");
  });

  it("should handle zero count", () => {
    assert.strictEqual(formatAverage(100, 0), "0 avg");
  });

  it("should handle zero total", () => {
    assert.strictEqual(formatAverage(0, 10), "0.0 avg");
  });
});

describe("truncateTitle", () => {
  it("should truncate long titles", () => {
    const longTitle =
      "Will Bitcoin reach $100k in 2024 and stay above it for at least 30 days?";
    const result = truncateTitle(longTitle, 50);
    assert.strictEqual(result.length, 50);
    assert.match(result, /\.\.\.$/);
  });

  it("should not truncate short titles", () => {
    const shortTitle = "Will Bitcoin reach $100k?";
    const result = truncateTitle(shortTitle, 50);
    assert.strictEqual(result, shortTitle);
  });

  it("should respect custom max length", () => {
    const title = "This is a very long title";
    const result = truncateTitle(title, 10);
    assert.strictEqual(result.length, 10);
    assert.strictEqual(result, "This is...");
  });
});

describe("getEventIcon", () => {
  it("should return correct icons for event types", () => {
    assert.strictEqual(getEventIcon("POSITION_OPENED"), "▸");
    assert.strictEqual(getEventIcon("POSITION_UPDATED"), "▴");
    assert.strictEqual(getEventIcon("POSITION_CLOSED"), "▪");
    assert.strictEqual(getEventIcon("MARKET_RESOLVED"), "◆");
  });
});

describe("formatEventSummary", () => {
  it("should format POSITION_OPENED with YES shares", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_OPENED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 1,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: null,
      prevNoShares: null,
      prevYesAvgPrice: null,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 0,
      currYesAvgPrice: 0.5,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "100 YES shares");
  });

  it("should format POSITION_OPENED with both YES and NO shares", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_OPENED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 1,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: null,
      prevNoShares: null,
      prevYesAvgPrice: null,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 50,
      currYesAvgPrice: 0.5,
      currNoAvgPrice: 0.3,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "100 YES, 50 NO shares");
  });

  it("should format POSITION_UPDATED with share changes", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_UPDATED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 2,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: 200,
      currNoShares: 0,
      currYesAvgPrice: 0.6,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "100→200 YES shares");
  });

  it("should format POSITION_CLOSED", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_CLOSED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 3,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: null,
      currNoShares: null,
      currYesAvgPrice: null,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "100 YES shares");
  });

  it("should format MARKET_RESOLVED with positive PnL", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "MARKET_RESOLVED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 4,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 0,
      currYesAvgPrice: 0.5,
      currNoAvgPrice: null,
      resolvedOutcome: "yes",
      pnl: 50,
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "Resolved: YES (+$50.00)");
  });

  it("should format MARKET_RESOLVED with negative PnL", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "MARKET_RESOLVED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 4,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 0,
      prevNoShares: 100,
      prevYesAvgPrice: null,
      prevNoAvgPrice: 0.5,
      currYesShares: 0,
      currNoShares: 100,
      currYesAvgPrice: null,
      currNoAvgPrice: 0.5,
      resolvedOutcome: "yes",
      pnl: -50,
    };

    const result = formatEventSummary(event);
    assert.strictEqual(result, "Resolved: YES (-$50.00)");
  });
});

describe("formatEventChange", () => {
  it("should format POSITION_OPENED with + prefix", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_OPENED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 1,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: null,
      prevNoShares: null,
      prevYesAvgPrice: null,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 0,
      currYesAvgPrice: 0.5,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventChange(event);
    assert.strictEqual(result, "+100 YES shares");
  });

  it("should format POSITION_CLOSED with - prefix", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_CLOSED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 3,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: null,
      currNoShares: null,
      currYesAvgPrice: null,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventChange(event);
    assert.strictEqual(result, "-100 YES shares");
  });

  it("should format POSITION_UPDATED with price change only", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "POSITION_UPDATED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 2,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 0,
      currYesAvgPrice: 0.6,
      currNoAvgPrice: null,
      resolvedOutcome: "unresolved",
    };

    const result = formatEventChange(event);
    assert.strictEqual(result, "$0.50→$0.60 YES avg price");
  });

  it("should format MARKET_RESOLVED outcome", () => {
    const event: WalletEvent = {
      eventId: "evt-1",
      wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
      eventType: "MARKET_RESOLVED",
      marketId: "market-1",
      marketTitle: "Test Market",
      snapshotId: 4,
      timestamp: "2024-01-01T00:00:00.000Z",
      prevYesShares: 100,
      prevNoShares: 0,
      prevYesAvgPrice: 0.5,
      prevNoAvgPrice: null,
      currYesShares: 100,
      currNoShares: 0,
      currYesAvgPrice: 0.5,
      currNoAvgPrice: null,
      resolvedOutcome: "yes",
      pnl: 50,
    };

    const result = formatEventChange(event);
    assert.strictEqual(result, "YES won, +$50.00");
  });
});
