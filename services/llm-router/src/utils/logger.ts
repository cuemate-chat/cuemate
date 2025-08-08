import pino, { stdTimeFunctions } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const createLogger = () =>
  (pino as any)({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        }
      : undefined,
    base: {
      service: 'llm-router',
    },
    timestamp: stdTimeFunctions.isoTime,
    redact: {
      paths: ['apiKey', 'password', 'token', 'messages[*].content'],
      censor: '[REDACTED]',
    },
  });

export const logger = createLogger();
