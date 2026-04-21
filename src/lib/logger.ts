import debug from 'debug';

export const logger = {
  cache: debug('sales-tax:cache'),
  error: debug('sales-tax:error'),
  warn: debug('sales-tax:warn'),
  info: debug('sales-tax:info'),
};

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  debug.enable('sales-tax:error,sales-tax:warn');
} else if (typeof window !== 'undefined') {
  debug.enable('sales-tax:*');
}

export const logError = (message: string, error?: unknown) => {
  logger.error(message, error);
};

export const logWarn = (message: string, data?: unknown) => {
  logger.warn(message, data);
};

export const logInfo = (message: string, data?: unknown) => {
  logger.info(message, data);
};

export const logDebug = (module: keyof typeof logger, message: string, data?: unknown) => {
  logger[module](message, data);
};