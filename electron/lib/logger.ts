import { createConsola, LogLevels } from "consola";
import { IS_DEV } from "@/shared/constants";

/**
 * Logger instance for the application.
 *
 * This logger uses consola to provide logging capabilities with different log levels.
 * In development mode, it logs debug and above levels, while in production it logs
 * info and above levels only. All logs are tagged with "assistx" for easy identification.
 *
 * @example
 * ```typescript
 * logger.info('This is an info message');
 * logger.debug('This is a debug message (only in dev mode)');
 * logger.error('This is an error message');
 * ```
 */
const logger = createConsola({
  level: IS_DEV ? LogLevels.debug : LogLevels.info,
  defaults: {
    tag: "assistx",
  },
});

export default logger;
