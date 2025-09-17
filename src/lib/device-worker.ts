// Web Worker for processing device data
import type { DeviceData, RawDeviceRow } from '../lib/google-sheets';

// This would be the content of a web worker file
// For now, we'll implement the logic here and potentially move to a worker later

/**
 * Worker message types
 */
export interface ProcessDeviceDataMessage {
  type: 'PROCESS_DEVICE_DATA';
  data: {
    rawData: RawDeviceRow[];
    phoneCol: string;
    msrpCol: string;
    prepaidCol?: string;
  };
}

export interface ProcessDeviceDataResponse {
  type: 'PROCESS_DEVICE_DATA_COMPLETE';
  data: Record<string, DeviceData>;
  error?: string;
}

/**
 * Check if Web Workers are supported
 */
export function isWebWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Process device data using Web Worker if available, otherwise fallback to main thread
 */
export async function processDeviceDataWithWorker(
  rawData: RawDeviceRow[],
  phoneCol: string,
  msrpCol: string,
  prepaidCol?: string
): Promise<Record<string, DeviceData>> {
  
  if (!isWebWorkerSupported() || rawData.length < 100) {
    // Fallback to main thread for small datasets or when workers not supported
    return processDeviceDataMainThread(rawData, phoneCol, msrpCol, prepaidCol);
  }

  // For larger datasets, we would use a Web Worker here
  // For now, falling back to optimized main thread processing
  return processDeviceDataMainThread(rawData, phoneCol, msrpCol, prepaidCol);
}

/**
 * Optimized main thread processing with chunking
 */
function processDeviceDataMainThread(
  rawData: RawDeviceRow[],
  phoneCol: string,
  msrpCol: string,
  prepaidCol?: string
): Promise<Record<string, DeviceData>> {
  return new Promise((resolve) => {
    const devices: Record<string, DeviceData> = {};
    let index = 0;
    const chunkSize = 50;

    function processChunk() {
      const endIndex = Math.min(index + chunkSize, rawData.length);
      
      for (let i = index; i < endIndex; i++) {
        const row = rawData[i];
        
        try {
          const phoneName = String(row[phoneCol] || '').trim();
          const msrpValue = row[msrpCol];
          
          if (!phoneName || phoneName.toLowerCase() === 'nan' || phoneName.length < 2) {
            continue;
          }
          
          const msrp = parsePrice(msrpValue);
          if (msrp <= 0 || msrp <= 2) { // Skip invalid and suspicious prices
            continue;
          }
          
          const deviceData: DeviceData = { msrp };
          
          // Add prepaid price if available
          if (prepaidCol && row[prepaidCol]) {
            const prepaid = parsePrice(row[prepaidCol]);
            if (prepaid > 0) {
              deviceData.prepaid = prepaid;
            }
          }
          
          // Generate display name
          deviceData.displayName = generateDisplayName(phoneName);
          
          devices[phoneName] = deviceData;
          
        } catch {
          continue;
        }
      }
      
      index = endIndex;
      
      if (index < rawData.length) {
        // Continue with next chunk
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(processChunk, { timeout: 50 });
        } else {
          setTimeout(processChunk, 0);
        }
      } else {
        resolve(devices);
      }
    }
    
    processChunk();
  });
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr: string | number): number {
  if (typeof priceStr === 'number') return priceStr;
  
  try {
    const cleaned = String(priceStr).replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

/**
 * Generate a shorter display name for the UI
 */
function generateDisplayName(deviceName: string): string {
  const displayNames: Record<string, string> = {
    "Apple iPhone 17 - Lavender 256GB": "iPhone 17",
    "Samsung Galaxy S25 Silver Shadow 128GB": "Galaxy S25",
    "moto g play - 2024": "Moto G Play",
    "Samsung Galaxy A16 5G": "Samsung Galaxy A16",
    "Apple iPhone 15 Black 128GB": "iPhone 15 128GB",
    "Samsung Galaxy S24 128GB": "Samsung Galaxy S24 128GB",
    "Google Pixel 8": "Google Pixel 8",
    "OnePlus 12": "OnePlus 12"
  };
  
  // Return predefined display name if available
  if (displayNames[deviceName]) {
    return displayNames[deviceName];
  }
  
  // Generate a shorter name automatically
  let displayName = deviceName
    .replace(/\s+\d+GB$/i, '') // Remove storage size at end
    .replace(/\s+-\s+\w+\s+\d+GB$/i, '') // Remove "- Color XGB" pattern
    .trim();
  
  // If still too long, take first few words
  const words = displayName.split(' ');
  if (words.length > 3) {
    displayName = words.slice(0, 3).join(' ');
  }
  
  return displayName || deviceName;
}