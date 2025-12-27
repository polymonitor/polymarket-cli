import { dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "@/config.js";
import * as schema from "./schema.js";

// Ensure database directory exists
const dbPath = config.database.path;
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Initialize better-sqlite3
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create Drizzle database instance
export const db = drizzle(sqlite, { schema });

// Run migrations
migrate(db, { migrationsFolder: "./migrations" });
