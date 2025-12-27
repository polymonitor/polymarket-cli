import "dotenv/config";

export const config = {
  database: {
    path: process.env.DB_PATH || "./data/polymonitor.db",
  },
  polymarket: {
    dataApiUrl:
      process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com",
    gammaApiUrl:
      process.env.POLYMARKET_GAMMA_API_URL ||
      "https://gamma-api.polymarket.com",
  },
};
