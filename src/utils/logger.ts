import chalk from "chalk";

type LogLevel = "info" | "warn" | "error" | "debug";

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

// Get minimum log level from environment (default: silent for CLI)
// Set LOG_LEVEL=debug or LOG_LEVEL=info for verbose logging
const MIN_LOG_LEVEL = process.env.LOG_LEVEL || "silent";

const LOG_LEVELS: Record<LogLevel | "silent", number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 999, // Suppress all logs by default
};

const shouldLog = (level: LogLevel): boolean => {
  const minLevel = LOG_LEVELS[MIN_LOG_LEVEL as LogLevel] ?? LOG_LEVELS.error;
  return LOG_LEVELS[level] >= minLevel;
};

const log = (level: LogLevel, message: string): void => {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase();

  let coloredLevel: string;
  switch (level) {
    case "info":
      coloredLevel = chalk.cyan(levelUpper);
      break;
    case "warn":
      coloredLevel = chalk.yellow(levelUpper);
      break;
    case "error":
      coloredLevel = chalk.red(levelUpper);
      break;
    case "debug":
      coloredLevel = chalk.gray(levelUpper);
      break;
  }

  console.log(`[${timestamp}] [${coloredLevel}] ${message}`);
};

export const logger = {
  info: (message: string) => log("info", message),
  warn: (message: string) => log("warn", message),
  error: (message: string) => log("error", message),
  debug: (message: string) => log("debug", message),
};
