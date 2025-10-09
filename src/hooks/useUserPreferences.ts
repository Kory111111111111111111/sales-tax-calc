"use client";

import { useState, useEffect, useCallback } from 'react';
import { LocalStorageCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';
import { logError } from '@/lib/logger';
import { UserPreferences } from '@/types/features';

const defaultPreferences: UserPreferences = {
  preferredState: 'Maine',
  theme: 'system',
  defaultView: 'calculator',
  autoSaveCalculations: true,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const savedPreferences = LocalStorageCache.get<UserPreferences>(CACHE_KEYS.USER_PREFERENCES);
        if (savedPreferences) {
          setPreferences({ ...defaultPreferences, ...savedPreferences });
        }
      } catch (error) {
        logError('Failed to load user preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      LocalStorageCache.set(CACHE_KEYS.USER_PREFERENCES, preferences, CACHE_DURATION.USER_PREFERENCES);
    }
  }, [preferences, isLoading]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    LocalStorageCache.remove(CACHE_KEYS.USER_PREFERENCES);
  }, []);

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferences,
    resetPreferences,
  };
}