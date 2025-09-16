# Sales tax rates for all 50 US states (as of 2024)
# These are state-level sales tax rates and do not include local taxes

STATE_TAX_RATES = {
    "Alabama": 4.00,
    "Alaska": 0.00,  # No state sales tax
    "Arizona": 5.60,
    "Arkansas": 6.50,
    "California": 7.25,
    "Colorado": 2.90,
    "Connecticut": 6.35,
    "Delaware": 0.00,  # No state sales tax
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
    "Montana": 0.00,  # No state sales tax
    "Nebraska": 5.50,
    "Nevada": 6.85,
    "New Hampshire": 0.00,  # No state sales tax
    "New Jersey": 6.63,
    "New Mexico": 5.13,
    "New York": 4.00,
    "North Carolina": 4.75,
    "North Dakota": 5.00,
    "Ohio": 5.75,
    "Oklahoma": 4.50,
    "Oregon": 0.00,  # No state sales tax
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
}

def get_tax_rate(state_name):
    """
    Get the sales tax rate for a given state.
    
    Args:
        state_name (str): Name of the state
        
    Returns:
        float: Tax rate as a percentage (e.g., 6.25 for 6.25%)
    """
    return STATE_TAX_RATES.get(state_name, 0.00)

def calculate_sales_tax(amount, tax_rate):
    """
    Calculate sales tax for a given amount and tax rate.
    
    Args:
        amount (float): Purchase amount
        tax_rate (float): Tax rate as a percentage
        
    Returns:
        tuple: (tax_amount, total_amount)
    """
    if amount < 0:
        return 0.00, 0.00
    
    tax_amount = amount * (tax_rate / 100)
    total_amount = amount + tax_amount
    
    return round(tax_amount, 2), round(total_amount, 2)

def get_all_states():
    """
    Get a list of all states.
    
    Returns:
        list: Sorted list of state names
    """
    return sorted(STATE_TAX_RATES.keys())