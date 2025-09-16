// Sales tax rates for all 50 US states (as of 2024)
// These are state-level sales tax rates and do not include local taxes

export const STATE_TAX_RATES: Record<string, number> = {
  "Alabama": 4.00,
  "Alaska": 0.00,  // No state sales tax
  "Arizona": 5.60,
  "Arkansas": 6.50,
  "California": 7.25,
  "Colorado": 2.90,
  "Connecticut": 6.35,
  "Delaware": 0.00,  // No state sales tax
  "Florida": 6.00,
  "Georgia": 4.00,
  "Hawaii": 4.17,
  "Idaho": 6.00,
  "Illinois": 6.25,
  "Indiana": 7.00,
  "Iowa": 6.00,
  "Kansas": 6.50,
  "Kentucky": 6.00,
  "Louisiana": 4.45,
  "Maine": 5.50,
  "Maryland": 6.00,
  "Massachusetts": 6.25,
  "Michigan": 6.00,
  "Minnesota": 6.88,
  "Mississippi": 7.00,
  "Missouri": 4.23,
  "Montana": 0.00,  // No state sales tax
  "Nebraska": 5.50,
  "Nevada": 6.85,
  "New Hampshire": 0.00,  // No state sales tax
  "New Jersey": 6.63,
  "New Mexico": 5.13,
  "New York": 4.00,
  "North Carolina": 4.75,
  "North Dakota": 5.00,
  "Ohio": 5.75,
  "Oklahoma": 4.50,
  "Oregon": 0.00,  // No state sales tax
  "Pennsylvania": 6.00,
  "Rhode Island": 7.00,
  "South Carolina": 6.00,
  "South Dakota": 4.20,
  "Tennessee": 7.00,
  "Texas": 6.25,
  "Utah": 6.10,
  "Vermont": 6.00,
  "Virginia": 5.30,
  "Washington": 6.50,
  "West Virginia": 6.00,
  "Wisconsin": 5.00,
  "Wyoming": 4.00
};

/**
 * Get the sales tax rate for a given state.
 * 
 * @param stateName - Name of the state
 * @returns Tax rate as a percentage (e.g., 6.25 for 6.25%)
 */
export function getTaxRate(stateName: string): number {
  return STATE_TAX_RATES[stateName] || 0.00;
}

/**
 * Calculate sales tax for a given amount and tax rate.
 * 
 * @param amount - Purchase amount
 * @param taxRate - Tax rate as a percentage
 * @returns Object with tax amount and total amount
 */
export function calculateSalesTax(amount: number, taxRate: number): {
  taxAmount: number;
  totalAmount: number;
} {
  if (amount < 0) {
    return { taxAmount: 0.00, totalAmount: 0.00 };
  }
  
  const taxAmount = amount * (taxRate / 100);
  const totalAmount = amount + taxAmount;
  
  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
}

/**
 * Get a list of all states.
 * 
 * @returns Sorted list of state names
 */
export function getAllStates(): string[] {
  return Object.keys(STATE_TAX_RATES).sort();
}

/**
 * Format currency amount for display
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format percentage for display
 * 
 * @param percentage - Percentage to format
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(2)}%`;
}