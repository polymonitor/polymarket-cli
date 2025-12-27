import chalk from "chalk";

type LogLevel = "info" | "warn" | "error" | "debug";

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const log = (level: LogLevel, message: string): void => {
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
