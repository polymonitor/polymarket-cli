/**
 * Test helper utilities
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

/**
 * Creates an in-memory SQLite database for testing
 *
 * @returns Configured database instance
 */
export function createTestDatabase() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  // Run migrations
  const migrationsFolder = path.join(process.cwd(), "migrations");
  migrate(db, { migrationsFolder });

  return db;
}

/**
 * Cleans up a test database
 *
 * @param db - Database to clean up
 */
export function cleanupTestDatabase(db: ReturnType<typeof createTestDatabase>) {
  // The SQLite connection will be closed when the database object is garbage collected
  // For in-memory databases, this is sufficient
}
