"use client";

import { useState, useEffect, useCallback } from 'react';
import { LocalStorageCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';
import { logError } from '@/lib/logger';
import { CalculationHistoryItem } from '@/types/features';
import { toast } from 'sonner';

export function useCalculationHistory() {
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const savedHistory = LocalStorageCache.get<CalculationHistoryItem[]>(CACHE_KEYS.CALCULATION_HISTORY) || [];
        setHistory(savedHistory);
      } catch (error) {
        logError('Failed to load calculation history:', error);
        toast.error('Failed to load calculation history');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading && history.length > 0) {
      LocalStorageCache.set(CACHE_KEYS.CALCULATION_HISTORY, history, CACHE_DURATION.CALCULATION_HISTORY);
    }
  }, [history, isLoading]);

  const addCalculation = useCallback((calculation: Omit<CalculationHistoryItem, 'id' | 'timestamp'>) => {
    const newCalculation: CalculationHistoryItem = {
      ...calculation,
      id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Add to beginning and limit to 50 items
      const updated = [newCalculation, ...prev].slice(0, 50);
      return updated;
    });

    toast.success('Calculation saved to history');
  }, []);

  const removeCalculation = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    toast.success('Calculation removed from history');
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    LocalStorageCache.remove(CACHE_KEYS.CALCULATION_HISTORY);
    toast.success('Calculation history cleared');
  }, []);

  const exportHistory = useCallback(() => {
    if (history.length === 0) {
      toast.error('No calculations to export');
      return;
    }

    try {
      const dataStr = JSON.stringify(history, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `tax-calculations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Calculation history exported');
    } catch (error) {
      logError('Failed to export history:', error);
      toast.error('Failed to export calculation history');
    }
  }, [history]);

  return {
    history,
    isLoading,
    addCalculation,
    removeCalculation,
    clearHistory,
    exportHistory,
  };
}