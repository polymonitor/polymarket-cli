/**
 * Type definitions for Polymarket API responses
 * These represent the raw API response structures
 */

/**
 * Raw position object from Polymarket Data API
 * Endpoint: GET https://data-api.polymarket.com/positions
 */
export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string; // "YES" or "NO"
  outcomeIndex: number; // 0 or 1
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  negativeRisk: boolean;
}

/**
 * Raw market object from Polymarket Gamma API
 * Endpoint: GET https://gamma-api.polymarket.com/markets
 */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  volumeNum: number;
  liquidityNum: number;
  lastTradePrice?: number;
  outcomes: string[];
  outcomePrices?: string[];
  endDate?: string;
  description?: string;
  resolutionSource?: string;
}
