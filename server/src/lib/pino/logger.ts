import pino, {
  type LoggerOptions,
  type Logger as PinoLogger,
  type TransportSingleOptions,
} from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogPayload {
  [key: string]: unknown;
}

export interface LoggerConfig {
  readonly level?: LogLevel;
  readonly name?: string;
  readonly pretty?: boolean;
}

type FrozenLoggerConfig = Readonly<
  Required<Pick<LoggerConfig, "name" | "pretty">> & Pick<LoggerConfig, "level">
>;

const VALID_LOG_LEVELS: ReadonlySet<string> = new Set([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

const RESERVED_FIELDS: ReadonlySet<string> = new Set([
  "event",
  "msg",
  "service",
  "context",
  "level",
  "time",
  "err",
]);

function parseLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (value && VALID_LOG_LEVELS.has(value)) {
    return value as LogLevel;
  }
  return fallback;
}

function getDefaultLogLevel(): LogLevel {
  const isDev = process.env.NODE_ENV !== "production";
  const fallback: LogLevel = isDev ? "debug" : "info";
  return parseLogLevel(process.env.LOG_LEVEL, fallback);
}

function sanitizePayload(payload: LogPayload | undefined): LogPayload | undefined {
  if (!payload) return undefined;
  const sanitized: LogPayload = {};
  for (const key of Object.keys(payload)) {
    if (RESERVED_FIELDS.has(key)) {
      sanitized[`_${key}`] = payload[key];
    } else {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
}

function freezeConfig(config: LoggerConfig): FrozenLoggerConfig {
  return Object.freeze({
    level: config.level,
    name: config.name ?? "assistx-server",
    pretty: config.pretty ?? false,
  });
}

export class Logger {
  private readonly pinoInstance: PinoLogger;
  private readonly frozenConfig: FrozenLoggerConfig;
  private readonly childLoggers: Set<Logger>;

  private constructor(pinoInstance: PinoLogger, config: FrozenLoggerConfig) {
    this.pinoInstance = pinoInstance;
    this.frozenConfig = config;
    this.childLoggers = new Set();
  }

  static create(context: string, config: LoggerConfig = {}): Logger {
    const frozen = freezeConfig(config);
    return new Logger(Logger.createPinoInstance(context, frozen), frozen);
  }

  private static createPinoInstance(context: string, config: FrozenLoggerConfig): PinoLogger {
    const level = config.level ?? getDefaultLogLevel();

    const options: LoggerOptions = {
      level,
      name: config.name,
      base: {
        service: config.name,
        context,
      },
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    };

    if (config.pretty) {
      const transport: TransportSingleOptions = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      };
      return pino({ ...options, transport });
    }
    return pino(options);
  }

  private formatLog(event: string, message: string, payload?: LogPayload): object {
    return {
      event,
      msg: message,
      ...sanitizePayload(payload),
    };
  }

  private formatErrorLog(
    error: Error,
    event: string,
    message: string,
    payload?: LogPayload,
  ): object {
    const sanitized = sanitizePayload(payload);
    return {
      err: error,
      event,
      msg: message,
      ...sanitized,
    };
  }

  trace(event: string, message: string, payload?: LogPayload): void {
    this.pinoInstance.trace(this.formatLog(event, message, payload));
  }

  debug(event: string, message: string, payload?: LogPayload): void {
    this.pinoInstance.debug(this.formatLog(event, message, payload));
  }

  info(event: string, message: string, payload?: LogPayload): void {
    this.pinoInstance.info(this.formatLog(event, message, payload));
  }

  warn(event: string, message: string, payload?: LogPayload): void {
    this.pinoInstance.warn(this.formatLog(event, message, payload));
  }

  error(event: string, message: string, payload?: LogPayload): void;
  error(error: Error, event: string, message: string, payload?: LogPayload): void;
  error(
    eventOrError: string | Error,
    messageOrEvent: string,
    payloadOrMessage?: string | LogPayload,
    maybePayload?: LogPayload,
  ): void {
    if (eventOrError instanceof Error) {
      this.pinoInstance.error(
        this.formatErrorLog(eventOrError, messageOrEvent, payloadOrMessage as string, maybePayload),
      );
    } else {
      this.pinoInstance.error(
        this.formatLog(eventOrError, messageOrEvent, payloadOrMessage as LogPayload | undefined),
      );
    }
  }

  fatal(event: string, message: string, payload?: LogPayload): void;
  fatal(error: Error, event: string, message: string, payload?: LogPayload): void;
  fatal(
    eventOrError: string | Error,
    messageOrEvent: string,
    payloadOrMessage?: string | LogPayload,
    maybePayload?: LogPayload,
  ): void {
    if (eventOrError instanceof Error) {
      this.pinoInstance.fatal(
        this.formatErrorLog(eventOrError, messageOrEvent, payloadOrMessage as string, maybePayload),
      );
    } else {
      this.pinoInstance.fatal(
        this.formatLog(eventOrError, messageOrEvent, payloadOrMessage as LogPayload | undefined),
      );
    }
  }

  child(context: string): Logger {
    const childPino = this.pinoInstance.child({ context });
    const childLogger = new Logger(childPino, this.frozenConfig);
    this.childLoggers.add(childLogger);
    return childLogger;
  }

  setLevel(level: LogLevel): void {
    this.pinoInstance.level = level;
    for (const child of this.childLoggers) {
      child.setLevel(level);
    }
  }

  getLevel(): LogLevel {
    return this.pinoInstance.level as LogLevel;
  }
}

const isDev = process.env.NODE_ENV !== "production";

export const logger = Logger.create("app", {
  level: getDefaultLogLevel(),
  pretty: isDev,
});

export default Logger;
