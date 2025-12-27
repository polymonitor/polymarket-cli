import "dotenv/config";

export const config = {
  database: {
    path: process.env.DB_PATH || "./data/polymarket.db",
  },
  polymarket: {
    apiUrl: process.env.POLYMARKET_API_URL || "https://api.polymarket.com",
  },
};
