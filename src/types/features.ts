// Types for enhanced features

export interface SearchHistoryItem {
  query: string;
  deviceName: string;
  timestamp: number;
}

export interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  device?: {
    name: string;
    price: number;
    isPrepaid?: boolean;
  };
  manualAmount?: number;
  state: string;
  taxRate: number;
  originalAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface UserPreferences {
  preferredState?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'calculator' | 'devices';
  autoSaveCalculations?: boolean;
}

export interface DeviceFilter {
  brand?: string;
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface DeviceBrand {
  name: string;
  count: number;
  icon?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  retryAction?: () => void;
}