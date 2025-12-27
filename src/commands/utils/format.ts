/**
 * Formatting utilities for CLI output
 */

import Table from "cli-table3";
import type { WalletEvent } from "@/types/core";

/**
 * Formats a wallet address for display (shortened)
 *
 * @param address - Full wallet address
 * @returns Shortened address (e.g., "0x742d35Cc...0bEb")
 */
export function formatWalletAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 10)}...${address.slice(-4)}`;
}

/**
 * Formats a number with proper decimal places
 *
 * Handles edge cases:
 * - NaN (Not a Number)
 * - Infinity and -Infinity
 * - Very large numbers (> 1 trillion)
 * - Very small numbers (< 0.0001)
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  // Handle NaN
  if (isNaN(value)) {
    return "N/A";
  }

  // Handle Infinity
  if (!isFinite(value)) {
    return value > 0 ? "∞" : "-∞";
  }

  // Handle very large numbers (>1 trillion)
  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  }

  // Handle very large numbers (>1 billion)
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  // Handle large numbers (>1 million)
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  // Normal formatting
  return value.toFixed(decimals);
}

/**
 * Formats a price value as USD
 *
 * @param price - Price value (0-1 range)
 * @returns Formatted price (e.g., "$0.52")
 */
export function formatPrice(price: number | null): string {
  if (price === null) {
    return "N/A";
  }
  return `$${formatNumber(price, 2)}`;
}

/**
 * Formats a share count
 *
 * @param shares - Number of shares
 * @returns Formatted shares (e.g., "150")
 */
export function formatShares(shares: number | null): string {
  if (shares === null || shares === 0) {
    return "0";
  }
  return formatNumber(shares, 0);
}

/**
 * Creates a human-readable summary of an event
 *
 * @param event - Wallet event
 * @returns Summary string (e.g., "100→200 YES shares")
 */
export function formatEventSummary(event: WalletEvent): string {
  const {
    eventType,
    prevYesShares,
    prevNoShares,
    currYesShares,
    currNoShares,
  } = event;

  switch (eventType) {
    case "POSITION_OPENED": {
      const yesShares = currYesShares ?? 0;
      const noShares = currNoShares ?? 0;

      if (yesShares > 0 && noShares > 0) {
        return `${formatShares(yesShares)} YES, ${formatShares(noShares)} NO shares`;
      } else if (yesShares > 0) {
        return `${formatShares(yesShares)} YES shares`;
      } else {
        return `${formatShares(noShares)} NO shares`;
      }
    }

    case "POSITION_UPDATED": {
      const prevYes = prevYesShares ?? 0;
      const currYes = currYesShares ?? 0;
      const prevNo = prevNoShares ?? 0;
      const currNo = currNoShares ?? 0;

      const parts: string[] = [];

      if (prevYes !== currYes) {
        parts.push(`${formatShares(prevYes)}→${formatShares(currYes)} YES`);
      }

      if (prevNo !== currNo) {
        parts.push(`${formatShares(prevNo)}→${formatShares(currNo)} NO`);
      }

      return parts.join(", ") + " shares";
    }

    case "POSITION_CLOSED": {
      const yesShares = prevYesShares ?? 0;
      const noShares = prevNoShares ?? 0;

      if (yesShares > 0 && noShares > 0) {
        return `${formatShares(yesShares)} YES, ${formatShares(noShares)} NO shares`;
      } else if (yesShares > 0) {
        return `${formatShares(yesShares)} YES shares`;
      } else {
        return `${formatShares(noShares)} NO shares`;
      }
    }

    case "MARKET_RESOLVED": {
      const outcome = event.resolvedOutcome.toUpperCase();
      const pnl = event.pnl ?? 0;
      const pnlStr =
        pnl >= 0
          ? `+$${formatNumber(pnl)}`
          : `-$${formatNumber(Math.abs(pnl))}`;
      return `Resolved: ${outcome} (${pnlStr})`;
    }

    default:
      return "Unknown event";
  }
}

/**
 * Gets an icon/bullet for an event type
 *
 * @param eventType - Type of event
 * @returns Icon string
 */
export function getEventIcon(eventType: WalletEvent["eventType"]): string {
  switch (eventType) {
    case "POSITION_OPENED":
      return "▸";
    case "POSITION_UPDATED":
      return "▴";
    case "POSITION_CLOSED":
      return "▪";
    case "MARKET_RESOLVED":
      return "◆";
    default:
      return "•";
  }
}

/**
 * Creates a detailed table view of an event for verbose mode
 *
 * @param event - Wallet event
 * @returns Formatted table as string
 */
export function createEventTable(event: WalletEvent): string {
  const table = new Table({
    head: ["Field", "Value"],
    colWidths: [25, 55],
  });

  // Basic info
  table.push(
    ["Event ID", event.eventId],
    ["Event Type", event.eventType],
    ["Market ID", event.marketId],
    ["Market Title", event.marketTitle],
    ["Snapshot ID", event.snapshotId.toString()],
  );

  // Position data
  if (event.prevYesShares !== null || event.currYesShares !== null) {
    table.push(
      ["Previous YES Shares", formatShares(event.prevYesShares)],
      ["Current YES Shares", formatShares(event.currYesShares)],
      ["Previous YES Price", formatPrice(event.prevYesAvgPrice)],
      ["Current YES Price", formatPrice(event.currYesAvgPrice)],
    );
  }

  if (event.prevNoShares !== null || event.currNoShares !== null) {
    table.push(
      ["Previous NO Shares", formatShares(event.prevNoShares)],
      ["Current NO Shares", formatShares(event.currNoShares)],
      ["Previous NO Price", formatPrice(event.prevNoAvgPrice)],
      ["Current NO Price", formatPrice(event.currNoAvgPrice)],
    );
  }

  // Resolution data
  if (event.resolvedOutcome !== "unresolved") {
    table.push(["Resolved Outcome", event.resolvedOutcome.toUpperCase()]);
  }

  if (event.pnl !== undefined) {
    const pnlStr =
      event.pnl >= 0
        ? `+$${formatNumber(event.pnl)}`
        : `-$${formatNumber(Math.abs(event.pnl))}`;
    table.push(["PnL", pnlStr]);
  }

  return table.toString();
}

/**
 * Truncates a market title if it's too long and sanitizes special characters
 *
 * Handles edge cases:
 * - Very long titles
 * - Special characters (newlines, tabs, etc.)
 * - Empty or whitespace-only titles
 * - Emoji and unicode characters
 *
 * @param title - Market title
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated and sanitized title
 */
export function truncateTitle(title: string, maxLength: number = 50): string {
  // Handle empty or whitespace-only titles
  if (!title || title.trim().length === 0) {
    return "(Empty title)";
  }

  // Replace newlines, tabs, and other control characters with spaces
  let sanitized = title.replace(/[\n\r\t\v\f]/g, " ");

  // Replace multiple consecutive spaces with a single space
  sanitized = sanitized.replace(/\s+/g, " ");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Check if still empty after sanitization
  if (sanitized.length === 0) {
    return "(Empty title)";
  }

  // Truncate if necessary
  if (sanitized.length <= maxLength) {
    return sanitized;
  }

  // Truncate and add ellipsis
  return sanitized.slice(0, maxLength - 3) + "...";
}

/**
 * Formats an ISO 8601 timestamp to a readable format
 *
 * Handles edge cases:
 * - Invalid date strings
 * - Empty or null values
 * - Invalid Date objects
 *
 * @param isoString - ISO 8601 timestamp
 * @returns Formatted timestamp (e.g., "2024-12-27 10:30:00")
 */
export function formatTimestamp(isoString: string): string {
  // Handle empty or null values
  if (!isoString || isoString.trim().length === 0) {
    return "N/A";
  }

  const date = new Date(isoString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats file size in bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted size (e.g., "1.2 KB", "3.4 MB", "1.2 GB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

/**
 * Formats a number with thousand separators
 *
 * @param num - Number to format
 * @returns Formatted number (e.g., "1,247")
 */
export function formatNumberWithCommas(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Calculates and formats an average
 *
 * @param total - Total value
 * @param count - Count of items
 * @returns Formatted average (e.g., "3.1 avg")
 */
export function formatAverage(total: number, count: number): string {
  if (count === 0) {
    return "0 avg";
  }
  return `${(total / count).toFixed(1)} avg`;
}

/**
 * Formats the "Change" column for the events table
 *
 * @param event - Wallet event
 * @returns Change summary (e.g., "+150 YES shares", "100→200 YES shares")
 */
export function formatEventChange(event: WalletEvent): string {
  const {
    eventType,
    prevYesShares,
    prevNoShares,
    prevYesAvgPrice,
    prevNoAvgPrice,
    currYesShares,
    currNoShares,
    currYesAvgPrice,
    currNoAvgPrice,
    resolvedOutcome,
    pnl,
  } = event;

  switch (eventType) {
    case "POSITION_OPENED": {
      const yesShares = currYesShares ?? 0;
      const noShares = currNoShares ?? 0;

      if (yesShares > 0 && noShares > 0) {
        return `+${formatShares(yesShares)} YES, +${formatShares(noShares)} NO shares`;
      } else if (yesShares > 0) {
        return `+${formatShares(yesShares)} YES shares`;
      } else {
        return `+${formatShares(noShares)} NO shares`;
      }
    }

    case "POSITION_UPDATED": {
      const prevYes = prevYesShares ?? 0;
      const currYes = currYesShares ?? 0;
      const prevNo = prevNoShares ?? 0;
      const currNo = currNoShares ?? 0;
      const prevYesPrice = prevYesAvgPrice;
      const currYesPrice = currYesAvgPrice;
      const prevNoPrice = prevNoAvgPrice;
      const currNoPrice = currNoAvgPrice;

      const parts: string[] = [];

      // Check if shares changed
      const sharesChanged = prevYes !== currYes || prevNo !== currNo;
      // Check if only price changed
      const onlyPriceChanged =
        !sharesChanged &&
        (prevYesPrice !== currYesPrice || prevNoPrice !== currNoPrice);

      if (onlyPriceChanged) {
        // Only price changed
        if (prevYesPrice !== currYesPrice && currYesPrice !== null) {
          return `${formatPrice(prevYesPrice)}→${formatPrice(currYesPrice)} YES avg price`;
        } else if (prevNoPrice !== currNoPrice && currNoPrice !== null) {
          return `${formatPrice(prevNoPrice)}→${formatPrice(currNoPrice)} NO avg price`;
        }
      }

      // Shares changed (with or without price change)
      if (prevYes !== currYes) {
        if (prevYesPrice !== currYesPrice && currYesPrice !== null) {
          parts.push(
            `${formatShares(prevYes)}→${formatShares(currYes)} YES, ${formatPrice(prevYesPrice)}→${formatPrice(currYesPrice)}`,
          );
        } else {
          parts.push(
            `${formatShares(prevYes)}→${formatShares(currYes)} YES shares`,
          );
        }
      }

      if (prevNo !== currNo) {
        if (prevNoPrice !== currNoPrice && currNoPrice !== null) {
          parts.push(
            `${formatShares(prevNo)}→${formatShares(currNo)} NO, ${formatPrice(prevNoPrice)}→${formatPrice(currNoPrice)}`,
          );
        } else {
          parts.push(
            `${formatShares(prevNo)}→${formatShares(currNo)} NO shares`,
          );
        }
      }

      return parts.join(", ");
    }

    case "POSITION_CLOSED": {
      const yesShares = prevYesShares ?? 0;
      const noShares = prevNoShares ?? 0;

      if (yesShares > 0 && noShares > 0) {
        return `-${formatShares(yesShares)} YES, -${formatShares(noShares)} NO shares`;
      } else if (yesShares > 0) {
        return `-${formatShares(yesShares)} YES shares`;
      } else {
        return `-${formatShares(noShares)} NO shares`;
      }
    }

    case "MARKET_RESOLVED": {
      const outcome = resolvedOutcome.toUpperCase();
      const pnlValue = pnl ?? 0;
      const pnlStr =
        pnlValue >= 0
          ? `+$${formatNumber(pnlValue, 2)}`
          : `-$${formatNumber(Math.abs(pnlValue), 2)}`;
      return `${outcome} won, ${pnlStr}`;
    }

    default:
      return "Unknown";
  }
}
