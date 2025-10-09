// Network status and error handling utilities

interface NetworkConnection {
  type?: string;
  effectiveType?: string;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

interface ExtendedNavigator extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkStatus {
  if (typeof navigator === 'undefined') {
    return { isOnline: true }; // Server-side default
  }

  const extendedNavigator = navigator as ExtendedNavigator;
  const connection = extendedNavigator.connection || extendedNavigator.mozConnection || extendedNavigator.webkitConnection;

  return {
    isOnline: navigator.onLine,
    connectionType: connection?.type,
    effectiveType: connection?.effectiveType,
  };
}

/**
 * Check if we can reach a remote endpoint
 */
export async function checkConnectivity(url: string = 'https://www.google.com/favicon.ico'): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Network status change listener
 */
export function onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op on server
  }

  const handleStatusChange = () => {
    callback(getNetworkStatus());
  };

  window.addEventListener('online', handleStatusChange);
  window.addEventListener('offline', handleStatusChange);

  // Also listen for connection changes if available
  const extendedNavigator = navigator as ExtendedNavigator;
  const connection = extendedNavigator.connection;
  if (connection) {
    connection.addEventListener?.('change', handleStatusChange);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleStatusChange);
    window.removeEventListener('offline', handleStatusChange);
    if (connection) {
      connection.removeEventListener?.('change', handleStatusChange);
    }
  };
}