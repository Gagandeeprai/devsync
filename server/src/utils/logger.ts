import winston from 'winston';

export type LogCategory = 'AUTH' | 'PROJECT' | 'TASK' | 'GITHUB' | 'SYSTEM' | 'ERROR';

const isProduction = process.env.NODE_ENV === 'production';

// ANSI escape codes for terminal styling
const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[90m',
  bold: '\x1b[1m',
  // Colors
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

const CATEGORY_COLORS: Record<LogCategory, string> = {
  AUTH: ANSI.cyan,
  PROJECT: ANSI.blue,
  TASK: ANSI.magenta,
  GITHUB: ANSI.yellow,
  SYSTEM: ANSI.green,
  ERROR: ANSI.red,
};

// Formats timestamp as [HH:mm:ss]
const getFormattedTime = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `[${h}:${m}:${s}]`;
};

// Sanitize objects to ensure sensitive keys are never logged
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'encryptedaccesstoken',
  'cookie',
]);

const sanitize = (val: any): any => {
  if (!val || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitize);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitize(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
};

// Development custom formatter matching [HH:mm:ss] [CATEGORY] message
const devFormat = winston.format.printf(({ level, message, category, stack, ...meta }) => {
  const cat: LogCategory = (category as LogCategory) || (level === 'error' ? 'ERROR' : 'SYSTEM');
  const color = CATEGORY_COLORS[cat] || ANSI.green;
  const timeStr = `${ANSI.dim}${getFormattedTime()}${ANSI.reset}`;
  const catStr = `${color}${ANSI.bold}[${cat}]${ANSI.reset}`;

  let out = `${timeStr} ${catStr} ${message}`;

  if (stack && level === 'error') {
    out += `\n${ANSI.red}${stack}${ANSI.reset}`;
  }

  return out;
});

// Production JSON formatter
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

/**
 * Clean, reusable structured activity logging utility for DevSync
 */
export const logger = {
  auth: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'AUTH', ...(meta ? sanitize(meta) : {}) });
  },

  project: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'PROJECT', ...(meta ? sanitize(meta) : {}) });
  },

  task: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'TASK', ...(meta ? sanitize(meta) : {}) });
  },

  github: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'GITHUB', ...(meta ? sanitize(meta) : {}) });
  },

  system: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'SYSTEM', ...(meta ? sanitize(meta) : {}) });
  },

  info: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, { category: 'SYSTEM', ...(meta ? sanitize(meta) : {}) });
  },

  warn: (message: string, meta?: Record<string, any>) => {
    winstonLogger.warn(message, { category: 'SYSTEM', ...(meta ? sanitize(meta) : {}) });
  },

  error: (message: string, err?: any) => {
    if (err instanceof Error) {
      winstonLogger.error(`${message}: ${err.message}`, { category: 'ERROR', stack: err.stack });
    } else if (err) {
      winstonLogger.error(`${message}: ${String(err)}`, { category: 'ERROR' });
    } else {
      winstonLogger.error(message, { category: 'ERROR' });
    }
  },
};

export default logger;

