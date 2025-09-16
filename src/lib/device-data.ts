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

// Local state for devices
let currentDevices: Record<string, DeviceData> = {};
let isLoading = false;
let hasLoaded = false;

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
  
  if (hasLoaded) {
    return currentDevices;
  }
  
  isLoading = true;
  
  try {
    // Try to get cached data first
    const cached = getCachedDevices();
    if (cached && Object.keys(cached).length > 0) {
      currentDevices = cached;
      hasLoaded = true;
      isLoading = false;
      return currentDevices;
    }
    
    // Fetch from Google Sheets
    const devices = await fetchDevicesFromGoogleSheets();
    
    if (Object.keys(devices).length > 0) {
      currentDevices = devices;
      console.log(`✅ Successfully loaded ${Object.keys(devices).length} devices from Google Sheets`);
    } else {
      console.error('❌ Failed to load any devices from Google Sheets');
      currentDevices = {};
    }
    
    hasLoaded = true;
    return currentDevices;
    
  } catch (error) {
    console.error('❌ Critical error initializing device data:', error);
    // No fallback - return empty to force Google Sheets debugging
    currentDevices = {};
    hasLoaded = true;
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
  
  return devices
    .filter(device => device.toLowerCase().includes(queryLower))
    .slice(0, limit);
}

/**
 * Get popular devices for display
 * 
 * @param limit - Number of devices to return
 * @returns Array of popular devices with display data
 */
export function getPopularDevices(limit: number = 4): Device[] {
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
      popularDevices.push({
        name: deviceName,
        data: deviceData
      });
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
export function getLoadingStatus(): { isLoading: boolean; hasLoaded: boolean; deviceCount: number } {
  return {
    isLoading,
    hasLoaded,
    deviceCount: Object.keys(currentDevices).length
  };
}