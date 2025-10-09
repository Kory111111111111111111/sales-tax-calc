// Device data types
export interface DeviceData {
  msrp: number;
  prepaid?: number;
  displayName?: string;
}

export interface Device {
  name: string;
  data: DeviceData;
}

// Import Google Sheets integration
import { fetchDevicesFromGoogleSheets, getCachedDevices } from './google-sheets';
import { logger, logError, logWarn, logInfo } from './logger';
import { getNetworkStatus, retryWithBackoff } from './network';

// Local state for devices
let currentDevices: Record<string, DeviceData> = {};
let isLoading = false;
let hasLoaded = false;
let lastError: string | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;

// No fallback data - force Google Sheets loading only

/**
 * Initialize device data (load from Google Sheets)
 */
export async function initializeDeviceData(): Promise<Record<string, DeviceData>> {
  if (isLoading) {
    // If already loading, wait for it to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return currentDevices;
  }

  if (hasLoaded && Object.keys(currentDevices).length > 0) {
    return currentDevices;
  }

  isLoading = true;
  lastError = null;

  try {
    // Check network status first
    const networkStatus = getNetworkStatus();
    logInfo(`Network status: ${networkStatus.isOnline ? 'online' : 'offline'}`);

    if (!networkStatus.isOnline) {
      logWarn('Device offline, attempting to use cached data');
      const cached = getCachedDevices();
      if (cached && Object.keys(cached).length > 0) {
        currentDevices = cached;
        hasLoaded = true;
        lastError = 'Using cached data - you appear to be offline';
        isLoading = false;
        return currentDevices;
      } else {
        throw new Error('No internet connection and no cached data available');
      }
    }

    // Try to get cached data first
    const cached = getCachedDevices();
    if (cached && Object.keys(cached).length > 0 && retryCount === 0) {
      currentDevices = cached;
      hasLoaded = true;
      isLoading = false;
      return currentDevices;
    }

    // Fetch from Google Sheets with retry logic
    const devices = await retryWithBackoff(
      async () => {
        const result = await fetchDevicesFromGoogleSheets();
        if (Object.keys(result).length === 0) {
          throw new Error('No devices loaded from Google Sheets');
        }
        return result;
      },
      MAX_RETRIES,
      1000
    );

    if (Object.keys(devices).length > 0) {
      currentDevices = devices;
      retryCount = 0; // Reset retry count on success
      logger.deviceData(`✅ Successfully loaded ${Object.keys(devices).length} devices from Google Sheets`);
    } else {
      throw new Error('Failed to load any devices from Google Sheets');
    }

    hasLoaded = true;
    return currentDevices;

  } catch (error) {
    retryCount++;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    lastError = errorMessage;

    logError('❌ Critical error initializing device data:', error);

    // Try to use cached data as fallback
    const cached = getCachedDevices();
    if (cached && Object.keys(cached).length > 0) {
      logWarn('Using cached device data as fallback');
      currentDevices = cached;
      hasLoaded = true;
      lastError = `${errorMessage}. Using cached data.`;
    } else {
      // No fallback available
      currentDevices = {};
      hasLoaded = true;
      lastError = `${errorMessage}. No cached data available.`;
    }

    return currentDevices;

  } finally {
    isLoading = false;
  }
}

/**
 * Refresh device data from Google Sheets
 */
export async function refreshDeviceData(): Promise<Record<string, DeviceData>> {
  hasLoaded = false;
  return await initializeDeviceData();
}

/**
 * Get device price data
 * 
 * @param deviceName - Name of the device
 * @returns Device data or null if not found
 */
export function getDeviceData(deviceName: string): DeviceData | null {
  return currentDevices[deviceName] || null;
}

/**
 * Get device MSRP price
 * 
 * @param deviceName - Name of the device
 * @returns MSRP price or 0 if not found
 */
export function getDevicePrice(deviceName: string): number {
  const deviceData = getDeviceData(deviceName);
  return deviceData?.msrp || 0;
}

/**
 * Get device prepaid price
 * 
 * @param deviceName - Name of the device
 * @returns Prepaid price or null if not available
 */
export function getDevicePrepaidPrice(deviceName: string): number | null {
  const deviceData = getDeviceData(deviceName);
  return deviceData?.prepaid || null;
}

/**
 * Get list of all device names
 * 
 * @returns Array of device names
 */
export function getAllDevices(): string[] {
  return Object.keys(currentDevices);
}

/**
 * Search devices by query
 * 
 * @param query - Search query
 * @param limit - Maximum number of results
 * @returns Array of matching device names
 */
export function searchDevices(query: string, limit: number = 50): string[] {
  if (!query) {
    return getAllDevices().slice(0, limit);
  }
  
  const queryLower = query.toLowerCase();
  const devices = getAllDevices();
  
  const results = devices
    .filter(device => device.toLowerCase().includes(queryLower))
    .slice(0, limit);
  
  // Debug: Log search results and their prices
  if (queryLower.includes('iphone')) {
    logger.deviceData(`🔍 iPhone search for "${query}" found ${results.length} results:`);
    results.slice(0, 5).forEach((deviceName, index) => {
      const deviceData = getDeviceData(deviceName);
      logger.deviceData(`  ${index + 1}. ${deviceName}: $${deviceData?.msrp || 'N/A'}`);
    });
  }
  
  return results;
}

/**
 * Get popular devices for display
 * 
 * @param limit - Number of devices to return
 * @returns Array of popular devices with display data
 */
export function getPopularDevices(limit: number = 4): Device[] {
  // Debug: Let's see what iPhone devices are actually available
  const allDevices = getAllDevices();
  const iPhones = allDevices.filter(device => device.toLowerCase().includes('iphone'));
  logger.deviceData(`🔍 Found ${iPhones.length} iPhones in data:`, iPhones.slice(0, 10));
  
  // Log prices for the first few iPhones
  iPhones.slice(0, 5).forEach(iphone => {
    const data = getDeviceData(iphone);
    logger.deviceData(`📱 ${iphone}: $${data?.msrp || 'N/A'}`);
  });

  const preferredDevices = [
    "Apple iPhone 17 - Lavender 256GB",
    "Samsung Galaxy S25 Silver Shadow 128GB", 
    "moto g play - 2024",
    "Samsung Galaxy A16 5G"
  ];
  
  const popularDevices: Device[] = [];
  
  // First, try to get preferred devices
  for (const deviceName of preferredDevices) {
    if (popularDevices.length >= limit) break;
    
    const deviceData = getDeviceData(deviceName);
    if (deviceData) {
      logger.deviceData(`✅ Found preferred device: ${deviceName} - $${deviceData.msrp}`);
      popularDevices.push({
        name: deviceName,
        data: deviceData
      });
    } else {
      logger.deviceData(`❌ Preferred device not found: ${deviceName}`);
    }
  }
  
  // If we need more devices, add others
  if (popularDevices.length < limit) {
    const remainingDevices = getAllDevices()
      .filter(device => !preferredDevices.includes(device))
      .slice(0, limit - popularDevices.length);
    
    for (const deviceName of remainingDevices) {
      const deviceData = getDeviceData(deviceName);
      if (deviceData) {
        popularDevices.push({
          name: deviceName,
          data: deviceData
        });
      }
    }
  }
  
  return popularDevices;
}

/**
 * Get loading status
 */
export function getLoadingStatus(): { isLoading: boolean; hasLoaded: boolean; deviceCount: number; lastError: string | null; retryCount: number } {
  return {
    isLoading,
    hasLoaded,
    deviceCount: Object.keys(currentDevices).length,
    lastError,
    retryCount
  };
}

/**
 * Get the last error message
 */
export function getLastError(): string | null {
  return lastError;
}

/**
 * Clear error state and retry loading
 */
export async function retryLoading(): Promise<Record<string, DeviceData>> {
  hasLoaded = false;
  lastError = null;
  return await initializeDeviceData();
}