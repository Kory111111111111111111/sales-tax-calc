// Google Sheets integration for loading device data
// Based on the Python implementation that loads from Google Sheets

export interface DeviceData {
  msrp: number;
  prepaid?: number;
  displayName?: string;
}

export interface RawDeviceRow {
  [key: string]: string | number;
}

// Google Sheets CSV export URL
// Original sheet: https://docs.google.com/spreadsheets/d/1oN_d2juKl41aYapyN7c3HskEdVswgusn/edit?gid=1807771359#gid=1807771359
// Converted to CSV export format with the specific gid (sheet tab)
const GOOGLE_SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/1oN_d2juKl41aYapyN7c3HskEdVswgusn/export?format=csv&gid=1807771359`;

// Cache for device data
let deviceCache: Record<string, DeviceData> | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Process data in chunks to avoid blocking the main thread
 * Ultra-optimized for smooth animations and UI responsiveness
 */
function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R | null,
  chunkSize: number = 15 // Smaller chunks for ultra-smooth performance
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let index = 0;
    
    function processChunk() {
      const startTime = performance.now();
      const chunk = items.slice(index, index + chunkSize);
      
      // Process chunk with stricter time budget (max 4ms to maintain 120fps)
      let processed = 0;
      for (const item of chunk) {
        const result = processor(item);
        if (result !== null) {
          results.push(result);
        }
        
        processed++;
        // Break early if we're taking too long
        if (performance.now() - startTime > 4) {
          index += processed;
          break;
        }
      }
      
      if (processed === chunk.length) {
        index += chunkSize;
      }
      
      if (index < items.length) {
        // Use even shorter timeout for ultra-responsiveness
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(processChunk, { timeout: 16 });
        } else {
          // Use 4ms timeout for ~240fps scheduling
          setTimeout(processChunk, 4);
        }
      } else {
        resolve(results);
      }
    }
    
    // Start with immediate scheduling for fastest response
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processChunk, { timeout: 16 });
    } else {
      processChunk();
    }
  });
}

/**
 * Parse CSV line with proper handling of quoted fields containing commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      // Handle quotes
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote ("")
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Comma outside quotes - end of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Parse CSV text into structured data
 * Special handling for sheets where data starts after header rows
 */
function parseCSV(csvText: string): RawDeviceRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  console.log(`📋 Total CSV lines: ${lines.length}`);
  
  // Find the actual data header row (look for a row that has "Phone" or device-like content)
  let headerRowIndex = -1;
  let dataStartRow = 5; // Based on user info, data starts at row 5 (index 4)
  
  // Try to find the header row by looking for device-related terms
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('phone') || line.includes('device') || line.includes('sap')) {
      headerRowIndex = i;
      console.log(`📍 Found header row at line ${i + 1}: ${lines[i].substring(0, 100)}`);
      break;
    }
  }
  
  // If we found a header row, use it. Otherwise, use row 4 (index 3) as fallback
  if (headerRowIndex === -1) {
    headerRowIndex = 3; // Row 4 (0-indexed)
    console.log(`📍 Using fallback header row at line ${headerRowIndex + 1}`);
  }
  
  // Data starts on the row after the header
  dataStartRow = headerRowIndex + 1;
  
  console.log(`📍 Header row: ${headerRowIndex + 1}, Data starts: ${dataStartRow + 1}`);
  console.log(`📄 Header line: ${lines[headerRowIndex]?.substring(0, 200)}`);
  
  const headers = parseCSVLine(lines[headerRowIndex] || '').map(h => h.replace(/"/g, ''));
  console.log(`📊 Parsed headers (${headers.length}):`, headers.slice(0, 10));
  
  const rows: RawDeviceRow[] = [];
  
  for (let i = dataStartRow; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''));
    if (values.length >= headers.length && values.some(v => v.trim())) {
      const row: RawDeviceRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  console.log(`📋 Parsed ${rows.length} data rows`);
  console.log(`📄 Sample data row:`, rows[0]);
  
  return rows;
}

/**
 * Auto-detect column names for device data
 * Updated to handle the specific sheet structure: Column B = phones, Column E = prices
 */
function detectColumns(headers: string[]): {
  phoneCol: string | null;
  msrpCol: string | null;
  prepaidCol: string | null;
} {
  console.log(`🔍 Column detection for ${headers.length} headers:`, headers);
  
  let phoneCol: string | null = null;
  let msrpCol: string | null = null;
  let prepaidCol: string | null = null;

  // Based on user feedback: Column B (index 1) = phones, Column E (index 4) = prices
  if (headers.length > 1) {
    phoneCol = headers[1]; // Column B (0-indexed as 1)
    console.log(`📱 Using Column B for phones: "${phoneCol}"`);
  }

  if (headers.length > 4) {
    msrpCol = headers[4]; // Column E (0-indexed as 4)
    console.log(`💰 Using Column E for prices: "${msrpCol}"`);
  }

  // Try to find prepaid column (look for Column I or any prepaid-related column)
  if (headers.length > 8) {
    prepaidCol = headers[8]; // Column I (0-indexed as 8)
    console.log(`💳 Using Column I for prepaid: "${prepaidCol}"`);
  }

  // Fallback: search by column name if position-based detection fails
  if (!phoneCol || !msrpCol) {
    console.log('🔄 Position-based detection failed, trying name-based detection...');
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const headerLower = header.toLowerCase().trim();
      
      // Look for phone column
      if (!phoneCol && (headerLower.includes('phone') || headerLower.includes('device') || headerLower.includes('equipment'))) {
        phoneCol = header;
        console.log(`📱 Found phone column by name: "${header}" at index ${i}`);
      }
      
      // Look for MSRP/price column
      if (!msrpCol && (headerLower.includes('purchase') || headerLower.includes('payment') || headerLower.includes('price') || headerLower.includes('msrp'))) {
        msrpCol = header;
        console.log(`💰 Found price column by name: "${header}" at index ${i}`);
      }
      
      // Look for prepaid column
      if (!prepaidCol && (headerLower.includes('prepaid') || headerLower.includes('suggested'))) {
        prepaidCol = header;
        console.log(`💳 Found prepaid column by name: "${header}" at index ${i}`);
      }
    }
  }

  return { phoneCol, msrpCol, prepaidCol };
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
 * Process raw CSV data into device data structure (optimized)
 */
async function processDeviceData(rawData: RawDeviceRow[]): Promise<Record<string, DeviceData>> {
  if (rawData.length === 0) return {};
  
  const headers = Object.keys(rawData[0]);
  const { phoneCol, msrpCol, prepaidCol } = detectColumns(headers);
  
  console.log('🔍 Column detection results:');
  console.log('  📱 Phone column:', phoneCol);
  console.log('  💰 MSRP column:', msrpCol);
  console.log('  💳 Prepaid column:', prepaidCol);
  console.log('  📊 Available headers:', headers);
  
  if (!phoneCol || !msrpCol) {
    console.error('❌ Could not detect required columns for device data');
    console.error('  📱 Phone column found:', !!phoneCol);
    console.error('  💰 MSRP column found:', !!msrpCol);
    return {};
  }
  
  console.log(`🔄 Processing ${rawData.length} rows of device data in chunks...`);
  
  // Process data in chunks to avoid blocking the main thread
  const deviceEntries = await processInChunks(rawData, (row: RawDeviceRow) => {
    try {
      const phoneName = String(row[phoneCol] || '').trim();
      const msrpValue = row[msrpCol];
      
      if (!phoneName || phoneName.toLowerCase() === 'nan' || phoneName.length < 2) {
        return null;
      }
      
      const msrp = parsePrice(msrpValue);
      if (msrp <= 0) {
        return null;
      }
      
      // Skip devices with suspicious prices
      if (msrp <= 2) {
        console.log(`🚨 Skipping suspicious price: ${phoneName} - $${msrp}`);
        return null;
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
      
      return [phoneName, deviceData] as [string, DeviceData];
      
    } catch {
      return null;
    }
  }, 75); // Larger chunks for better performance
  
  const devices = Object.fromEntries(deviceEntries);
  const processedCount = Object.keys(devices).length;
  const skippedCount = rawData.length - processedCount;
  
  console.log(`✅ Processing complete: ${processedCount} devices processed, ${skippedCount} skipped`);
  return devices;
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
  // Remove common suffixes and trim long names
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

/**
 * Fetch device data from Google Sheets
 */
export async function fetchDevicesFromGoogleSheets(): Promise<Record<string, DeviceData>> {
  // Check cache first
  const now = Date.now();
  if (deviceCache && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📦 Using cached device data');
    return deviceCache;
  }
  
  try {
    console.log('🔄 Fetching device data from Google Sheets...');
    console.log('📍 URL:', GOOGLE_SHEETS_CSV_URL);
    
    const response = await fetch(GOOGLE_SHEETS_CSV_URL, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
      },
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('📄 CSV length:', csvText.length);
    console.log('📄 First 500 characters of CSV:', csvText.substring(0, 500));
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Empty CSV response');
    }
    
    const rawData = parseCSV(csvText);
    console.log('🔍 Parsed rows:', rawData.length);
    console.log('🔍 Sample row:', rawData[0]);
    
    const devices = await processDeviceData(rawData);
    console.log('✅ Processed devices:', Object.keys(devices).length);
    console.log('📱 Sample devices:', Object.keys(devices).slice(0, 5));
    
    // Update cache
    deviceCache = devices;
    lastFetchTime = now;
    
    console.log(`🎉 Successfully loaded ${Object.keys(devices).length} devices from Google Sheets`);
    return devices;
    
  } catch (error) {
    console.error('Error fetching device data from Google Sheets:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        errorMessage = 'Google Sheets file not found or not publicly accessible';
      } else if (error.message.includes('403')) {
        errorMessage = 'Google Sheets access denied - check sharing permissions';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - check internet connection';
      } else {
        errorMessage = error.message;
      }
    }
    
    console.warn(`Google Sheets error: ${errorMessage}. Using fallback device data.`);
    
    // Return cache if available, otherwise empty object
    return deviceCache || {};
  }
}

/**
 * Get cached device data without fetching
 */
export function getCachedDevices(): Record<string, DeviceData> | null {
  return deviceCache;
}

/**
 * Clear the device cache
 */
export function clearDeviceCache(): void {
  deviceCache = null;
  lastFetchTime = 0;
}