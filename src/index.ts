#!/usr/bin/env tsx

import { Command } from "commander";

const program = new Command();

program
  .name("polymarket-cli")
  .description("CLI tool for monitoring Polymarket wallets")
  .version("1.0.0");

// Commands will be added here

program.parse();
