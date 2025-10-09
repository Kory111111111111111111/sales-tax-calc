"use client";

import { useState, useEffect, useCallback } from 'react';
import { LocalStorageCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';
import { logError } from '@/lib/logger';
import { SearchHistoryItem } from '@/types/features';

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const savedHistory = LocalStorageCache.get<SearchHistoryItem[]>(CACHE_KEYS.SEARCH_HISTORY) || [];
        setSearchHistory(savedHistory);
      } catch (error) {
        logError('Failed to load search history:', error);
      }
    };

    loadHistory();
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      LocalStorageCache.set(CACHE_KEYS.SEARCH_HISTORY, searchHistory, CACHE_DURATION.SEARCH_HISTORY);
    }
  }, [searchHistory]);

  const addToSearchHistory = useCallback((query: string, deviceName: string) => {
    if (!query.trim() || !deviceName.trim()) return;

    setSearchHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => 
        !(item.query.toLowerCase() === query.toLowerCase() && item.deviceName === deviceName)
      );
      
      // Add new item at the beginning and limit to 20 items
      const newItem: SearchHistoryItem = {
        query: query.trim(),
        deviceName,
        timestamp: Date.now(),
      };
      
      return [newItem, ...filtered].slice(0, 20);
    });
  }, []);

  const removeFromSearchHistory = useCallback((index: number) => {
    setSearchHistory(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    LocalStorageCache.remove(CACHE_KEYS.SEARCH_HISTORY);
  }, []);

  const getRecentSearches = useCallback((limit = 5) => {
    return searchHistory.slice(0, limit);
  }, [searchHistory]);

  const getSuggestions = useCallback((query: string, limit = 5) => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return searchHistory
      .filter(item => 
        item.query.toLowerCase().includes(lowerQuery) || 
        item.deviceName.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }, [searchHistory]);

  return {
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getRecentSearches,
    getSuggestions,
  };
}