#!/usr/bin/env tsx

import { Command } from "commander";
import { db } from "@/db/client";
import { createRepositories } from "@/db/repositories";
import { PolymarketAPI } from "@/api";
import { SnapshotService } from "@/services";
import { createSnapshotCommand } from "@/commands/snapshot";
import { createEventsCommand } from "@/commands/events";
import { createStatusCommand } from "@/commands/status";
import { config } from "@/config";

// Initialize dependencies
const repositories = createRepositories(db);
const polymarketAPI = new PolymarketAPI({
  dataApiUrl: config.polymarket.dataApiUrl,
  gammaApiUrl: config.polymarket.gammaApiUrl,
});
const snapshotService = new SnapshotService(polymarketAPI, repositories);

// Create CLI program
const program = new Command();

program
  .name("polymarket-cli")
  .description("CLI tool for monitoring Polymarket wallets")
  .version("1.0.0");

// Register commands
program.addCommand(createSnapshotCommand(snapshotService));
program.addCommand(createEventsCommand(repositories.events));
program.addCommand(createStatusCommand(repositories, db));

program.parse();
