import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`;
  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${base} ${JSON.stringify(entry.data)}`;
  }
  return base;
}

function createLogFn(level: LogLevel) {
  return (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    const formatted = formatLog(entry);

    switch (level) {
      case 'error':
        // Using structured logging output instead of console.log
        process.stderr.write(formatted + '\n');
        break;
      case 'warn':
        process.stderr.write(formatted + '\n');
        break;
      default:
        process.stdout.write(formatted + '\n');
        break;
    }
  };
}

/**
 * Structured logger — used instead of console.log per CLAUDE.md rules.
 */
export const logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),
};

/**
 * Request/response logging middleware.
 * Logs method, path, status, and duration for every request.
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  // Skip logging in test environment to keep test output clean
  if (config.NODE_ENV === 'test') {
    await next();
    return;
  }

  logger.info(`--> ${method} ${path}`);

  await next();

  const duration = Math.round(performance.now() - start);
  const status = c.res.status;

  const logFn = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
  logFn(`<-- ${method} ${path} ${status}`, { duration: `${duration}ms` });
};
