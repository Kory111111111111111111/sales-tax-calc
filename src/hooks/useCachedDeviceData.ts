"use client";

import { useEffect, useState, useCallback } from 'react';
import { LocalStorageCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';
import { getLoadingStatus, initializeDeviceData, getPopularDevices } from '@/lib/device-data';
import { type Device } from '@/lib/device-data';

export function useCachedDeviceData() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadDevices = useCallback(async (useCache = true) => {
    try {
      setIsLoading(true);
      setError('');

      // Try to load from cache first
      if (useCache) {
        const cachedData = LocalStorageCache.get<{
          devices: Device[];
          timestamp: number;
        }>(CACHE_KEYS.DEVICE_DATA);

        if (cachedData) {
          setDevices(cachedData.devices);
          setLastUpdated(cachedData.timestamp);
          setIsLoading(false);
          
          // Load fresh data in background if cache is old (non-blocking)
          const age = Date.now() - cachedData.timestamp;
          if (age > CACHE_DURATION.DEVICE_DATA / 2) {
            // Use requestIdleCallback for background refresh
            if (typeof requestIdleCallback !== 'undefined') {
              requestIdleCallback(() => loadDevices(false), { timeout: 5000 });
            } else {
              setTimeout(() => loadDevices(false), 2000);
            }
          }
          return;
        }
      }

      // Load fresh data with deferred execution
      await new Promise(resolve => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(resolve, { timeout: 100 });
        } else {
          setTimeout(resolve, 16);
        }
      });
      
      await initializeDeviceData();
      const status = getLoadingStatus();
      const popularDevices = getPopularDevices(50);
      
      if (status.deviceCount === 0) {
        setError('No devices loaded from Google Sheets');
      } else {
        const deviceData = {
          devices: popularDevices,
          timestamp: Date.now(),
        };
        
        // Cache the data
        LocalStorageCache.set(CACHE_KEYS.DEVICE_DATA, deviceData, CACHE_DURATION.DEVICE_DATA);
        
        setDevices(popularDevices);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      console.error('Failed to load device data:', err);
      setError('Failed to load device data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const refreshDevices = () => loadDevices(false);

  const clearCache = () => {
    LocalStorageCache.remove(CACHE_KEYS.DEVICE_DATA);
    setDevices([]);
    setLastUpdated(null);
  };

  return {
    devices,
    isLoading,
    error,
    lastUpdated,
    refreshDevices,
    clearCache,
    loadDevices,
  };
}