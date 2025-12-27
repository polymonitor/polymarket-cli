import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wallet: text("wallet").notNull(),
  snapshotData: text("snapshot_data", { mode: "json" }).notNull(),
  timestamp: text("timestamp").notNull(),
  prevSnapshotId: integer("prev_snapshot_id").references(
    (): any => snapshots.id,
  ),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  wallet: text("wallet").notNull(),
  eventType: text("event_type").notNull(),
  marketId: text("market_id").notNull(),
  marketTitle: text("market_title").notNull(),
  snapshotId: integer("snapshot_id")
    .notNull()
    .references(() => snapshots.id),
  prevYesShares: real("prev_yes_shares"),
  prevNoShares: real("prev_no_shares"),
  prevYesAvgPrice: real("prev_yes_avg_price"),
  prevNoAvgPrice: real("prev_no_avg_price"),
  currYesShares: real("curr_yes_shares"),
  currNoShares: real("curr_no_shares"),
  currYesAvgPrice: real("curr_yes_avg_price"),
  currNoAvgPrice: real("curr_no_avg_price"),
  resolvedOutcome: text("resolved_outcome"),
  pnl: real("pnl"),
});
