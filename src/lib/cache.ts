// Local storage utilities for caching and persistence

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn?: number; // milliseconds
}

export class LocalStorageCache {
  private static isClient = typeof window !== 'undefined';

  static set<T>(key: string, data: T, expiresIn?: number): void {
    if (!this.isClient) return;
    
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  static get<T>(key: string): T | null {
    if (!this.isClient) return null;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const cached: CacheItem<T> = JSON.parse(item);
      
      // Check if expired
      if (cached.expiresIn && Date.now() - cached.timestamp > cached.expiresIn) {
        this.remove(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  static remove(key: string): void {
    if (!this.isClient) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  static clear(): void {
    if (!this.isClient) return;
    
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  static exists(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Specific cache keys
export const CACHE_KEYS = {
  DEVICE_DATA: 'sales-tax-calc:device-data',
  SEARCH_HISTORY: 'sales-tax-calc:search-history',
  CALCULATION_HISTORY: 'sales-tax-calc:calculation-history',
  USER_PREFERENCES: 'sales-tax-calc:user-preferences',
} as const;

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  DEVICE_DATA: 1000 * 60 * 60 * 24, // 24 hours
  SEARCH_HISTORY: 1000 * 60 * 60 * 24 * 7, // 7 days
  CALCULATION_HISTORY: 1000 * 60 * 60 * 24 * 30, // 30 days
  USER_PREFERENCES: 1000 * 60 * 60 * 24 * 365, // 1 year
} as const;