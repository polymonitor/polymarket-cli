/**
 * Polymarket API client for fetching wallet positions and market data
 */

import { Snapshot } from "@/types/core.js";
import { snapshotSchema } from "@/validation/schemas.js";
import {
  createUserFriendlyError,
  NetworkError,
  ValidationError,
} from "./errors.js";
import { withRetry } from "./retry.js";
import { transformToSnapshot, validateWalletAddress } from "./transformer.js";
import { PolymarketMarket, PolymarketPosition } from "./types.js";
import { logger } from "@/utils/logger.js";

/**
 * Configuration for PolymarketAPI client
 */
export interface PolymarketAPIConfig {
  dataApiUrl: string;
  gammaApiUrl: string;
  userAgent?: string;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: PolymarketAPIConfig = {
  dataApiUrl: "https://data-api.polymarket.com",
  gammaApiUrl: "https://gamma-api.polymarket.com",
  userAgent: "polymarket-cli/1.0.0",
};

/**
 * Client for interacting with Polymarket API
 */
export class PolymarketAPI {
  private readonly config: PolymarketAPIConfig;

  constructor(config: Partial<PolymarketAPIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetches wallet positions and returns as Snapshot
   * @param address Wallet address (0x-prefixed, 40 hex chars)
   * @returns Snapshot of all positions
   * @throws PolymarketAPIError on failures
   */
  async getWalletPositions(address: string): Promise<Snapshot> {
    // Validate wallet address format
    if (!validateWalletAddress(address)) {
      throw new ValidationError(
        `Invalid wallet address format: ${address}. Must be 0x-prefixed, 40 hex characters.`,
      );
    }

    logger.info(`Fetching positions for wallet: ${address}`);

    // Fetch positions with retry logic
    const apiPositions = await withRetry(() => this.fetchPositions(address));

    logger.info(`Fetched ${apiPositions.length} positions from API`);

    // Transform to our Snapshot format
    const snapshot = transformToSnapshot(address, apiPositions);

    // Validate with Zod schema
    try {
      snapshotSchema.parse(snapshot);
    } catch (error) {
      throw new ValidationError(
        "API response validation failed: snapshot does not match expected schema",
        error as Error,
      );
    }

    logger.info(
      `Transformed to snapshot with ${snapshot.positions.length} unique markets`,
    );

    return snapshot;
  }

  /**
   * Fetches market details by condition ID
   * @param conditionId Market condition ID
   * @returns Market metadata
   */
  async getMarketDetails(conditionId: string): Promise<PolymarketMarket> {
    logger.info(`Fetching market details for condition: ${conditionId}`);

    const url = new URL("/markets", this.config.gammaApiUrl);
    url.searchParams.set("condition_ids", conditionId);
    url.searchParams.set("limit", "1");
    url.searchParams.set("offset", "0");

    const markets = await withRetry(() =>
      this.fetchJSON<PolymarketMarket[]>(url.toString()),
    );

    if (!markets || markets.length === 0) {
      throw new ValidationError(
        `Market not found for condition ID: ${conditionId}`,
      );
    }

    return markets[0];
  }

  /**
   * Internal method to fetch positions from Data API
   */
  private async fetchPositions(address: string): Promise<PolymarketPosition[]> {
    const url = new URL("/positions", this.config.dataApiUrl);
    url.searchParams.set("user", address);
    url.searchParams.set("limit", "500"); // Max allowed by API

    return this.fetchJSON<PolymarketPosition[]>(url.toString());
  }

  /**
   * Generic HTTP GET request with error handling
   */
  private async fetchJSON<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.config.userAgent || DEFAULT_CONFIG.userAgent!,
        },
      });

      // Handle non-2xx responses
      if (!response.ok) {
        throw createUserFriendlyError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // If it's already one of our custom errors, re-throw it
      if (error instanceof Error && error.constructor.name.includes("Error")) {
        throw error;
      }

      // Otherwise, wrap as NetworkError
      throw new NetworkError(
        "Failed to fetch from Polymarket API: network error",
        error as Error,
      );
    }
  }
}
