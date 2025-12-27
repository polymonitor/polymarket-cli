/**
 * Mock API responses for testing
 */

/**
 * Mock Polymarket API position response
 */
export interface MockAPIPosition {
  market: {
    id: string;
    question: string;
    outcome?: string;
  };
  side: "YES" | "NO";
  size: string;
  avgPrice: string;
}

/**
 * Create a mock API position with optional overrides
 */
export function createMockAPIPosition(
  overrides: Partial<MockAPIPosition> = {},
): MockAPIPosition {
  return {
    market: {
      id: "market-1",
      question: "Will Bitcoin reach $100k in 2024?",
    },
    side: "YES",
    size: "100",
    avgPrice: "0.5",
    ...overrides,
  };
}

/**
 * Mock API response with single YES position
 */
export const mockAPIResponseSingleYes: MockAPIPosition[] = [
  {
    market: {
      id: "market-1",
      question: "Will Bitcoin reach $100k in 2024?",
    },
    side: "YES",
    size: "100",
    avgPrice: "0.5",
  },
];

/**
 * Mock API response with YES and NO positions
 */
export const mockAPIResponseMultiple: MockAPIPosition[] = [
  {
    market: {
      id: "market-1",
      question: "Will Bitcoin reach $100k in 2024?",
    },
    side: "YES",
    size: "100",
    avgPrice: "0.5",
  },
  {
    market: {
      id: "market-1",
      question: "Will Bitcoin reach $100k in 2024?",
    },
    side: "NO",
    size: "50",
    avgPrice: "0.3",
  },
  {
    market: {
      id: "market-2",
      question: "Will Ethereum surpass Bitcoin in 2024?",
    },
    side: "NO",
    size: "200",
    avgPrice: "0.7",
  },
];

/**
 * Mock API response with resolved market
 */
export const mockAPIResponseResolved: MockAPIPosition[] = [
  {
    market: {
      id: "market-1",
      question: "Will Bitcoin reach $100k in 2024?",
      outcome: "yes",
    },
    side: "YES",
    size: "100",
    avgPrice: "0.5",
  },
];

/**
 * Empty API response (no positions)
 */
export const mockAPIResponseEmpty: MockAPIPosition[] = [];
