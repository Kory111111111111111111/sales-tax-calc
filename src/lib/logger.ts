import debug from 'debug';

// Create debug instances for different modules
export const logger = {
  googleSheets: debug('sales-tax:google-sheets'),
  deviceData: debug('sales-tax:device-data'),
  cache: debug('sales-tax:cache'),
  error: debug('sales-tax:error'),
  warn: debug('sales-tax:warn'),
  info: debug('sales-tax:info'),
};

// Enable error and warn logs by default in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  debug.enable('sales-tax:error,sales-tax:warn');
} else if (typeof window !== 'undefined') {
  // In development, enable all logs
  debug.enable('sales-tax:*');
}

// Helper functions for consistent logging
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