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
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
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
 * Truncates a market title if it's too long
 *
 * @param title - Market title
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated title
 */
export function truncateTitle(title: string, maxLength: number = 50): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength - 3) + "...";
}
