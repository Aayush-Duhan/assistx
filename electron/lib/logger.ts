import { logger as serverLogger } from "@server/lib/pino/logger";

/**
 * Logger instance for the Electron main process.
 *
 * Backed by the same pino logger as the in-process server (see
 * `server/src/lib/pino/logger.ts`), so main-process and server logs share
 * one format and one level knob (`LOG_LEVEL` env var).
 */
const logger = serverLogger.child("electron");

export default logger;
