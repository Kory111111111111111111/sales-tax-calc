import { logWarn } from './logger'

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn?: number;
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
      logWarn('Failed to save to localStorage:', error);
    }
  }

  static get<T>(key: string): T | null {
    if (!this.isClient) return null;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const cached: CacheItem<T> = JSON.parse(item);
      
      if (cached.expiresIn && Date.now() - cached.timestamp > cached.expiresIn) {
        this.remove(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      logWarn('Failed to read from localStorage:', error);
      return null;
    }
  }

  static remove(key: string): void {
    if (!this.isClient) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logWarn('Failed to remove from localStorage:', error);
    }
  }

  static clear(): void {
    if (!this.isClient) return;
    
    try {
      localStorage.clear();
    } catch (error) {
      logWarn('Failed to clear localStorage:', error);
    }
  }

  static exists(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const CACHE_KEYS = {
  USER_PREFERENCES: 'sales-tax-calc:user-preferences',
} as const;

export const CACHE_DURATION = {
  USER_PREFERENCES: 1000 * 60 * 60 * 24 * 365,
} as const;