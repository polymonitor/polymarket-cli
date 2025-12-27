/**
 * Polymarket API client for fetching wallet positions and market data
 */

import { Snapshot } from "@/types/core";
import { snapshotSchema } from "@/validation/schemas";
import {
  createUserFriendlyError,
  NetworkError,
  ValidationError,
} from "./errors";
import { withRetry } from "./retry";
import { transformToSnapshot, validateWalletAddress } from "./transformer";
import { PolymarketMarket, PolymarketPosition } from "./types";
import { logger } from "@/utils/logger";
import type { IWalletPositionProvider } from "@/services/snapshot-service";

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
export class PolymarketAPI implements IWalletPositionProvider {
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
        // Try to get error details from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.text();
          if (errorBody && errorBody.length < 200) {
            errorMessage = errorBody;
          }
        } catch {
          // Ignore - use default message
        }

        throw createUserFriendlyError(response.status, errorMessage);
      }

      // Parse JSON response
      let data: unknown;
      try {
        data = await response.json();
      } catch (error) {
        throw new ValidationError(
          "Invalid JSON response from Polymarket API",
          error as Error,
        );
      }

      // Validate response is not empty or null
      if (data === null || data === undefined) {
        throw new ValidationError(
          "Empty response received from Polymarket API",
        );
      }

      return data as T;
    } catch (error) {
      // If it's already one of our custom errors, re-throw it
      if (
        error instanceof Error &&
        (error.name === "NetworkError" ||
          error.name === "ValidationError" ||
          error.name === "ClientError" ||
          error.name === "ServerError" ||
          error.name === "RateLimitError" ||
          error.name === "PolymarketAPIError")
      ) {
        throw error;
      }

      // Check for specific network error types
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("ENOTFOUND")) {
        throw new NetworkError(
          "DNS lookup failed: Cannot resolve Polymarket API hostname",
          error as Error,
        );
      }

      if (errorMessage.includes("ECONNREFUSED")) {
        throw new NetworkError(
          "Connection refused: Cannot connect to Polymarket API",
          error as Error,
        );
      }

      if (
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("timeout")
      ) {
        throw new NetworkError(
          "Connection timeout: Polymarket API did not respond in time",
          error as Error,
        );
      }

      if (errorMessage.includes("ENETUNREACH")) {
        throw new NetworkError(
          "Network unreachable: Cannot reach Polymarket API",
          error as Error,
        );
      }

      // Generic network error
      throw new NetworkError(
        "Failed to connect to Polymarket API",
        error as Error,
      );
    }
  }
}
