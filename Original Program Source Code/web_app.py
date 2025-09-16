from flask import Flask, render_template, request, jsonify
from flask_compress import Compress
import json
import os
import sys
import pandas as pd
from werkzeug.utils import secure_filename
import requests
import time
from datetime import datetime, timedelta
from pathlib import Path
from tax_data import STATE_TAX_RATES, get_tax_rate, calculate_sales_tax
import csv
import io
from collections import defaultdict, OrderedDict
import threading
from functools import lru_cache
import hashlib

# Helper function to get Documents folder path
def get_documents_folder():
    """Get the user's Documents folder path"""
    return str(Path.home() / "Documents" / "SalesTaxCalc")

# Ensure the Documents/SalesTaxCalc folder exists
def ensure_documents_folder():
    """Create the Documents/SalesTaxCalc folder if it doesn't exist"""
    docs_folder = get_documents_folder()
    os.makedirs(docs_folder, exist_ok=True)
    return docs_folder

# Migrate existing files from current directory to Documents folder
def migrate_existing_files():
    """Move existing data files from current directory to Documents folder"""
    docs_folder = get_documents_folder()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    files_to_migrate = [
        "devices.json",
        "latest_prices_cache.csv", 
        "last_update.json"
    ]
    
    migrated_files = []
    
    for filename in files_to_migrate:
        old_path = os.path.join(current_dir, filename)
        new_path = os.path.join(docs_folder, filename)
        
        # Only migrate if file exists in current directory and doesn't exist in Documents
        if os.path.exists(old_path) and not os.path.exists(new_path):
            try:
                import shutil
                shutil.move(old_path, new_path)
                migrated_files.append(filename)
                print(f"Migrated {filename} to Documents folder")
            except Exception as e:
                print(f"Error migrating {filename}: {e}")
    
    if migrated_files:
        print(f"Successfully migrated {len(migrated_files)} files to {docs_folder}")
    
    return migrated_files

# Get the base path for the application
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    base_path = sys._MEIPASS
else:
    # Running as script
    base_path = os.path.dirname(os.path.abspath(__file__))

# Initialize Flask with correct paths
app = Flask(__name__, 
           template_folder=os.path.join(base_path, 'templates'),
           static_folder=os.path.join(base_path, 'static'))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize compression
compress = Compress()
compress.init_app(app)
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'application/json',
    'application/javascript', 'text/javascript'
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500

# Set upload folder to Documents/SalesTaxCalc/uploads
docs_folder = get_documents_folder()
app.config['UPLOAD_FOLDER'] = os.path.join(docs_folder, 'uploads')

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Optimized Device Cache with Indexing
class OptimizedDeviceCache:
    def __init__(self, max_cache_size=1000):
        self.devices = {}
        self.device_index = defaultdict(list)  # Brand -> [device_names]
        self.price_index = defaultdict(list)   # Price_range -> [device_names]
        self.search_cache = OrderedDict()      # LRU cache for search results
        self.max_cache_size = max_cache_size
        self.last_modified = None
        self.cache_lock = threading.RLock()
        
    def _build_indexes(self):
        """Build search indexes for faster lookups"""
        self.device_index.clear()
        self.price_index.clear()
        
        for device_name, device_data in self.devices.items():
            # Extract brand from device name
            brand = device_name.split()[0].lower() if device_name else ''
            self.device_index[brand].append(device_name)
            
            # Index by price range
            price = device_data.get('msrp', 0) if isinstance(device_data, dict) else device_data
            if price:
                price_range = f"{int(price // 100) * 100}-{int(price // 100) * 100 + 99}"
                self.price_index[price_range].append(device_name)
    
    def load_devices(self, devices_data):
        """Load devices and build indexes"""
        with self.cache_lock:
            self.devices = devices_data.copy()
            self._build_indexes()
            self.search_cache.clear()
            self.last_modified = datetime.now()
    
    def get_device(self, device_name):
        """O(1) device lookup"""
        return self.devices.get(device_name)
    
    def search_devices(self, query, limit=50):
        """Optimized device search with caching"""
        if not query:
            return list(self.devices.keys())[:limit]
        
        # Check cache first
        cache_key = f"{query.lower()}:{limit}"
        with self.cache_lock:
            if cache_key in self.search_cache:
                # Move to end (most recently used)
                self.search_cache.move_to_end(cache_key)
                return self.search_cache[cache_key]
        
        # Perform search
        query_lower = query.lower()
        results = []
        
        # Exact matches first
        for device_name in self.devices.keys():
            if query_lower in device_name.lower():
                results.append(device_name)
                if len(results) >= limit:
                    break
        
        # Cache the result
        with self.cache_lock:
            if len(self.search_cache) >= self.max_cache_size:
                # Remove oldest entry
                self.search_cache.popitem(last=False)
            self.search_cache[cache_key] = results
        
        return results
    
    def get_devices_by_brand(self, brand):
        """Get devices by brand using index"""
        return self.device_index.get(brand.lower(), [])
    
    def get_devices_by_price_range(self, min_price, max_price):
        """Get devices by price range using index"""
        results = []
        for device_name, device_data in self.devices.items():
            price = device_data.get('msrp', 0) if isinstance(device_data, dict) else device_data
            if min_price <= price <= max_price:
                results.append(device_name)
        return results
    
    def clear_cache(self):
        """Clear search cache"""
        with self.cache_lock:
            self.search_cache.clear()

# Streaming CSV Processor
class StreamingCSVProcessor:
    @staticmethod
    def process_csv_stream(file_path, chunk_size=1024):
        """Process CSV file in streaming fashion to reduce memory usage"""
        devices = {}
        processed_count = 0
        skipped_count = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                # Read first chunk to detect columns
                first_chunk = file.read(chunk_size)
                file.seek(0)
                
                # Use csv.Sniffer to detect delimiter
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(first_chunk[:1024]).delimiter
                
                reader = csv.DictReader(file, delimiter=delimiter)
                
                # Auto-detect columns
                fieldnames = reader.fieldnames or []
                phone_col = StreamingCSVProcessor._detect_phone_column(fieldnames)
                msrp_col = StreamingCSVProcessor._detect_msrp_column(fieldnames)
                prepaid_col = StreamingCSVProcessor._detect_prepaid_column(fieldnames)
                
                if not phone_col or not msrp_col:
                    return {
                        'success': False,
                        'error': 'Could not detect phone name or MSRP columns',
                        'detected_columns': fieldnames
                    }
                
                # Process rows in chunks
                for row in reader:
                    try:
                        phone_name = str(row.get(phone_col, '')).strip()
                        msrp_str = str(row.get(msrp_col, '')).strip()
                        
                        if not phone_name or not msrp_str:
                            skipped_count += 1
                            continue
                        
                        # Parse MSRP
                        msrp = StreamingCSVProcessor._parse_price(msrp_str)
                        if msrp <= 0:
                            skipped_count += 1
                            continue
                        
                        # Create device data
                        device_data = {'msrp': msrp}
                        
                        # Add prepaid price if available
                        if prepaid_col and row.get(prepaid_col):
                            prepaid_price = StreamingCSVProcessor._parse_price(str(row.get(prepaid_col, '')).strip())
                            if prepaid_price > 0:
                                device_data['prepaid'] = prepaid_price
                        
                        devices[phone_name] = device_data
                        processed_count += 1
                        
                    except Exception as e:
                        skipped_count += 1
                        continue
                
                return {
                    'success': True,
                    'devices': devices,
                    'processed_count': processed_count,
                    'skipped_count': skipped_count,
                    'phone_column': phone_col,
                    'msrp_column': msrp_col,
                    'prepaid_column': prepaid_col
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing CSV: {str(e)}'
            }
    
    @staticmethod
    def _detect_phone_column(fieldnames):
        """Auto-detect phone name column"""
        phone_patterns = ['phone', 'device', 'model', 'name', 'product']
        for field in fieldnames:
            field_lower = str(field).lower().strip()
            if any(pattern in field_lower for pattern in phone_patterns):
                return field
        # Fallback to column B (index 1) if available
        return fieldnames[1] if len(fieldnames) > 1 else None
    
    @staticmethod
    def _detect_msrp_column(fieldnames):
        """Auto-detect MSRP column"""
        msrp_patterns = ['msrp', 'price', 'cost', 'amount', 'value']
        for field in fieldnames:
            field_lower = str(field).lower().strip()
            if any(pattern in field_lower for pattern in msrp_patterns):
                return field
        # Fallback to column E (index 4) if available
        return fieldnames[4] if len(fieldnames) > 4 else None
    
    @staticmethod
    def _detect_prepaid_column(fieldnames):
        """Auto-detect prepaid column"""
        prepaid_patterns = ['prepaid', 'prepay', 'suggested']
        for field in fieldnames:
            field_lower = str(field).lower().strip()
            if any(pattern in field_lower for pattern in prepaid_patterns):
                return field
        # Fallback to column I (index 8) if available
        return fieldnames[8] if len(fieldnames) > 8 else None
    
    @staticmethod
    def _parse_price(price_str):
        """Parse price string to float"""
        try:
            # Remove currency symbols and whitespace
            cleaned = price_str.replace('$', '').replace(',', '').strip()
            return float(cleaned)
        except (ValueError, AttributeError):
            return 0.0

class WebSalesTaxCalculator:
    def __init__(self):
        # Initialize optimized cache
        self.device_cache = OptimizedDeviceCache(max_cache_size=2000)
        self.devices = {}  # Keep for backward compatibility
        
        # Ensure Documents folder exists and get the path
        self.docs_folder = ensure_documents_folder()
        
        # Migrate existing files from current directory to Documents folder
        migrate_existing_files()
        
        # Set file paths to Documents folder
        self.devices_file = os.path.join(self.docs_folder, "devices.json")
        
        # Google Sheets configuration
        self.google_sheets_url = "https://docs.google.com/spreadsheets/d/1oN_d2juKl41aYapyN7c3HskEdVswgusn/export?format=csv&usp=sharing"
        self.cache_file = os.path.join(self.docs_folder, "latest_prices_cache.csv")
        self.last_update_file = os.path.join(self.docs_folder, "last_update.json")
        
        # Flag to track if Google Sheets has been loaded
        self.google_sheets_loaded = False
        self.google_sheets_loading = False
        
        # Request deduplication
        self.active_requests = {}
        self.request_lock = threading.Lock()
        
        self.load_devices()
        # Automatically check for updates from Google Sheets on startup
        self.auto_refresh_on_startup()
    
    def auto_refresh_on_startup(self):
        """Automatically check for updates from Google Sheets on startup"""
        try:
            print("Checking for Google Sheets updates on startup...")
            # This will check for updates and download if needed, or use cache if recent
            result = self.check_and_update_from_google_sheets()
            if result:
                self.google_sheets_loaded = True
                print("Startup data refresh completed successfully")
            else:
                # Fallback to cache if Google Sheets check fails
                print("Google Sheets check failed, falling back to cache...")
                self.load_from_cache_if_available()
        except Exception as e:
            print(f"Error during startup refresh: {e}")
            # Fallback to cache if there's an error
            print("Falling back to cache due to error...")
            self.load_from_cache_if_available()
    
    def load_from_cache_if_available(self):
        """Load devices from cache file if available, without checking for updates"""
        try:
            if os.path.exists(self.cache_file):
                print("Loading devices from cache...")
                result = self.process_price_sheet(self.cache_file)
                if result['success']:
                    self.google_sheets_loaded = True
                    print(f"Loaded {result.get('devices_added', 0)} devices from cache")
                else:
                    print("Failed to load from cache, will need to download from Google Sheets")
            else:
                print("No cache file found, will need to download from Google Sheets")
        except Exception as e:
            print(f"Error loading from cache: {e}")
    
    def lazy_load_google_sheets(self):
        """Lazy load Google Sheets data in the background"""
        if self.google_sheets_loading or self.google_sheets_loaded:
            return {"status": "already_loaded_or_loading"}
        
        self.google_sheets_loading = True
        try:
            result = self.check_and_update_from_google_sheets()
            if result:
                self.google_sheets_loaded = True
                return {"status": "success", "message": "Google Sheets data loaded successfully"}
            else:
                return {"status": "error", "message": "Failed to load Google Sheets data"}
        except Exception as e:
            return {"status": "error", "message": f"Error loading Google Sheets: {str(e)}"}
        finally:
            self.google_sheets_loading = False

    def get_loading_status(self):
        """Get the current loading status"""
        return {
            "google_sheets_loaded": self.google_sheets_loaded,
            "google_sheets_loading": self.google_sheets_loading,
            "devices_count": len(self.devices),
            "cache_exists": os.path.exists(self.cache_file)
        }

    def load_devices(self):
        """Load device data from JSON file with caching"""
        if os.path.exists(self.devices_file):
            try:
                with open(self.devices_file, 'r') as f:
                    devices_data = json.load(f)
                    self.devices = devices_data  # Backward compatibility
                    self.device_cache.load_devices(devices_data)
            except (json.JSONDecodeError, FileNotFoundError):
                self.devices = {}
                self.device_cache.load_devices({})
        else:
            self.devices = {}
            self.device_cache.load_devices({})
    
    def get_device_list(self):
        """Get list of available devices"""
        return list(self.device_cache.devices.keys())
    
    def get_device_price(self, device_name):
        """Get MSRP price for a specific device"""
        device_data = self.device_cache.get_device(device_name)
        if not device_data:
            return 0.0
        if isinstance(device_data, dict):
            return device_data.get('msrp', 0.0)
        else:
            # Backward compatibility for old format
            return device_data
    
    def get_device_prepaid_price(self, device_name):
        """Get prepaid price for a specific device"""
        device_data = self.device_cache.get_device(device_name)
        if not device_data:
            return None
        if isinstance(device_data, dict):
            return device_data.get('prepaid', None)
        else:
            # Old format doesn't have prepaid prices
            return None
    
    def get_device_data(self, device_name):
        """Get complete device data (MSRP and prepaid if available)"""
        device_data = self.device_cache.get_device(device_name)
        if not device_data:
            return {}
        if isinstance(device_data, dict):
            return device_data
        else:
            # Backward compatibility for old format
            return {'msrp': device_data} if device_data else {}
    
    def search_devices(self, query, limit=50):
        """Search devices using optimized cache"""
        return self.device_cache.search_devices(query, limit)
    
    def save_devices(self):
        """Save device data to JSON file and update cache"""
        try:
            # Save to file
            with open(self.devices_file, 'w') as f:
                json.dump(self.devices, f, indent=2)
            
            # Update cache
            self.device_cache.load_devices(self.devices)
            return True
        except Exception as e:
            print(f"Error saving devices: {e}")
            return False
    
    def get_popular_devices(self, limit=4):
        """Get a list of popular devices for the homepage display"""
        # Define preferred devices to show as popular (in order of preference)
        # Use exact names from Google Sheets, not devices.json
        preferred_devices = [
            "Apple iPhone 17 - Lavender 256GB",  # Exact name from Google Sheets
            "Samsung Galaxy S25 Silver Shadow 128GB", 
            "moto g play - 2024",
            "Samsung Galaxy A16 5G"
        ]
        
        popular_devices = []
        
        # First, try to get preferred devices that exist in our database (use device_cache for live data)
        for device in preferred_devices:
            if self.device_cache.get_device(device) and len(popular_devices) < limit:
                popular_devices.append({
                    'name': device,
                    'price': self.get_device_price(device),
                    'display_name': self._get_display_name(device)
                })
        
        # If we don't have enough preferred devices, fill with other available devices
        if len(popular_devices) < limit:
            remaining_devices = [d for d in self.device_cache.devices.keys() if d not in [p['name'] for p in popular_devices]]
            # Sort by name for consistency
            remaining_devices.sort()
            
            for device in remaining_devices[:limit - len(popular_devices)]:
                popular_devices.append({
                    'name': device,
                    'price': self.get_device_price(device),
                    'display_name': self._get_display_name(device)
                })
        
        return popular_devices
    
    def _get_display_name(self, device_name):
        """Convert device name to a shorter display name for the UI"""
        # Create shorter, more readable names for display
        display_names = {
            "Apple iPhone 17 - Lavender 256GB": "iPhone 17",
            "Samsung Galaxy S25 Silver Shadow 128GB": "Galaxy S25",
            "moto g play - 2024": "Moto G Play",
            "Samsung Galaxy A16 5G": "Samsung Galaxy A16",
            "Apple iPhone 15 Black 128GB": "iPhone 15 128GB",
            "Samsung Galaxy S24 128GB": "Samsung Galaxy S24 128GB",
            "Google Pixel 8": "Google Pixel 8",
            "OnePlus 12": "OnePlus 12"
        }
        
        return display_names.get(device_name, device_name)
    
    def check_and_update_from_google_sheets(self):
        """Check for updates from Google Sheets and download if newer"""
        try:
            print("Checking for price sheet updates from Google Sheets...")
            
            # Get current file info from Google Sheets
            response = requests.head(self.google_sheets_url, timeout=10, allow_redirects=True)
            if response.status_code != 200:
                print(f"Failed to check Google Sheets: HTTP {response.status_code}")
                return False
            
            # Get content length and last modified (if available)
            remote_size = response.headers.get('content-length')
            remote_modified = response.headers.get('last-modified')
            
            # Load last update info
            last_update_info = self.load_last_update_info()
            
            # Check if we need to update
            should_update = False
            
            if not os.path.exists(self.cache_file):
                should_update = True
                print("No cached file found, downloading...")
            elif remote_size and last_update_info.get('size') != remote_size:
                should_update = True
                print(f"File size changed: {last_update_info.get('size')} -> {remote_size}")
            elif not last_update_info.get('last_check'):
                should_update = True
                print("No previous check recorded, downloading...")
            else:
                # Check if it's been more than 1 hour since last check
                last_check = datetime.fromisoformat(last_update_info['last_check'])
                if (datetime.now() - last_check).total_seconds() > 3600:  # 1 hour
                    should_update = True
                    print("Checking for updates (1 hour elapsed)...")
            
            if should_update:
                return self.download_and_process_google_sheets()
            else:
                print("Using cached price sheet (no updates needed)")
                return True
                
        except Exception as e:
            print(f"Error checking Google Sheets updates: {e}")
            return False
    
    def load_last_update_info(self):
        """Load information about the last update"""
        try:
            if os.path.exists(self.last_update_file):
                with open(self.last_update_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading last update info: {e}")
        return {}
    
    def save_last_update_info(self, info):
        """Save information about the last update"""
        try:
            with open(self.last_update_file, 'w') as f:
                json.dump(info, f, indent=2)
        except Exception as e:
            print(f"Error saving last update info: {e}")
    
    def validate_device_counts(self):
        """Validate device counts across all data sources for debugging"""
        try:
            # Count devices in memory
            memory_count = len(self.devices)
            
            # Count devices in devices.json file
            file_count = 0
            if os.path.exists(self.devices_file):
                with open(self.devices_file, 'r') as f:
                    file_devices = json.load(f)
                    file_count = len(file_devices)
            
            # Get count from last_update.json
            last_update_info = self.load_last_update_info()
            reported_count = last_update_info.get('devices_count', 0)
            
            # Check cache file if it exists
            cache_count = 0
            if os.path.exists(self.cache_file):
                try:
                    import pandas as pd
                    df = pd.read_csv(self.cache_file)
                    cache_count = len(df)
                except Exception as e:
                    print(f"Error reading cache file: {e}")
            
            validation_result = {
                'memory_count': memory_count,
                'file_count': file_count,
                'reported_count': reported_count,
                'cache_count': cache_count,
                'consistent': memory_count == file_count == reported_count,
                'timestamp': datetime.now().isoformat()
            }
            
            if not validation_result['consistent']:
                print(f"Device count discrepancy detected:")
                print(f"  Memory: {memory_count}")
                print(f"  File: {file_count}")
                print(f"  Reported: {reported_count}")
                print(f"  Cache: {cache_count}")
            
            return validation_result
            
        except Exception as e:
            print(f"Error validating device counts: {e}")
            return {'error': str(e)}
    
    def download_and_process_google_sheets(self):
        """Download CSV from Google Sheets and process it"""
        try:
            print("Downloading price sheet from Google Sheets...")
            
            # Download the CSV file
            response = requests.get(self.google_sheets_url, timeout=30, allow_redirects=True)
            if response.status_code != 200:
                print(f"Failed to download: HTTP {response.status_code}")
                return False
            
            # Save to cache file
            with open(self.cache_file, 'wb') as f:
                f.write(response.content)
            
            # Process the downloaded file
            result = self.process_price_sheet(self.cache_file)
            
            if result['success']:
                # Save update info with actual device count from loaded devices
                actual_device_count = len(self.devices)
                update_info = {
                    'last_check': datetime.now().isoformat(),
                    'last_update': datetime.now().isoformat(),
                    'size': str(len(response.content)),
                    'devices_count': actual_device_count,  # Use actual count from self.devices
                    'devices_processed': result.get('processed_count', 0),
                    'devices_skipped': result.get('skipped_count', 0)
                }
                self.save_last_update_info(update_info)
                
                print(f"Successfully updated {actual_device_count} devices from Google Sheets (processed: {result.get('processed_count', 0)}, skipped: {result.get('skipped_count', 0)})")
                return True
            else:
                print(f"Failed to process downloaded file: {result.get('error', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"Error downloading from Google Sheets: {e}")
            return False
    
    def process_price_sheet(self, file_path):
        """Process uploaded price sheet using streaming for better memory efficiency"""
        try:
            # Use streaming processor for CSV files
            if file_path.endswith('.csv'):
                result = StreamingCSVProcessor.process_csv_stream(file_path)
                if result['success']:
                    # Update devices with new data
                    new_devices = result['devices']
                    self.devices.update(new_devices)
                    self.save_devices()
                    
                    return {
                        'success': True,
                        'message': f'Successfully processed {result["processed_count"]} devices from price sheet. Skipped {result["skipped_count"]} invalid entries.',
                        'devices_added': len(new_devices),
                        'phone_column': result['phone_column'],
                        'msrp_column': result['msrp_column'],
                        'prepaid_column': result.get('prepaid_column')
                    }
                else:
                    # Fallback to pandas processing if streaming fails
                    print(f"Streaming processor failed: {result.get('message', 'Unknown error')}, falling back to pandas processing")
                    df = pd.read_csv(file_path)
            
            # For Excel files, use pandas processing
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("Unsupported file format")
            
            # Clean up the dataframe - remove completely empty columns
            df = df.dropna(axis=1, how='all')
            
            # Look for specific columns first - prioritize exact matches
            phone_col = None
            msrp_col = None
            prepaid_col = None
            
            # First, try to use Column B (index 1) for phone names, Column E (index 4) for MSRP, and Column I (index 8) for Suggested Prepaid
            columns_list = list(df.columns)
            
            # Try Column B (index 1) for phone names
            if len(columns_list) > 1:
                phone_col = columns_list[1]  # Column B (0-indexed, so index 1)
            
            # Try Column E (index 4) for MSRP
            if len(columns_list) > 4:
                msrp_col = columns_list[4]  # Column E (0-indexed, so index 4)
                
            # Try Column I (index 8) for Suggested Prepaid
            if len(columns_list) > 8:
                prepaid_col = columns_list[8]  # Column I (0-indexed, so index 8)
            
            # If we don't have enough columns, fall back to name-based detection
            if not phone_col or not msrp_col or not prepaid_col:
                # First priority: Look for exact column names you specified
                for col in df.columns:
                    col_str = str(col).strip()
                    col_lower = col_str.lower()
                    
                    # Look for "Phone" column (exact match priority)
                    if (col_str == 'Phone' or col_lower == 'phone') and not phone_col:
                        phone_col = col
                        
                for col in df.columns:
                    col_str = str(col).strip()
                    col_lower = col_str.lower()
                    
                    # Look for "RIC Purchase Payment" column (exact match priority)
                    if ('ric purchase payment' in col_lower or col_str == 'RIC Purchase Payment') and not msrp_col:
                        msrp_col = col
                        
                    # Look for "Suggested Prepaid" column (exact match priority)
                    if ('suggested prepaid' in col_lower or 'prepaid' in col_lower) and not prepaid_col:
                        prepaid_col = col
                
                # Second priority: Broader keyword search only if exact matches not found
                if not phone_col:
                    phone_name_keywords = ['phone', 'device', 'product', 'model', 'equipment', 'item', 'name']
                    exclude_keywords = ['sap', 'code', 'id', 'number', 'sku', '#']
                    
                    for col in df.columns:
                        col_lower = str(col).lower().strip()
                        
                        # For phone column, exclude SAP/code columns
                        has_phone_keyword = any(keyword in col_lower for keyword in phone_name_keywords)
                        has_exclude_keyword = any(keyword in col_lower for keyword in exclude_keywords)
                        
                        if has_phone_keyword and not has_exclude_keyword:
                            phone_col = col
                            break
                
                if not msrp_col:
                    price_keywords = ['msrp', 'price', 'cost', 'payment', 'amount', 'value', 'retail']
                    for col in df.columns:
                        col_lower = str(col).lower().strip()
                        if any(keyword in col_lower for keyword in price_keywords):
                            msrp_col = col
                            break
            
            # If we still haven't found columns, try analyzing the data content
            if not phone_col or not msrp_col:
                for col in df.columns:
                    if str(col).startswith('Unnamed'):
                        continue
                    
                    # Sample first few non-null values to determine content type
                    sample_values = df[col].dropna().head(10)
                    
                    if len(sample_values) == 0:
                        continue
                    
                    # Check if this column contains text (potential device names)
                    if not phone_col:
                        text_count = sum(1 for val in sample_values if isinstance(val, str) and len(str(val).strip()) > 3)
                        if text_count >= len(sample_values) * 0.7:  # 70% text values
                            phone_col = col
                    
                    # Check if this column contains numeric values (potential prices)
                    if not msrp_col:
                        numeric_count = 0
                        for val in sample_values:
                            try:
                                # Try to convert to float, handling currency symbols
                                if isinstance(val, str):
                                    clean_val = val.replace('$', '').replace(',', '').strip()
                                else:
                                    clean_val = val
                                
                                float_val = float(clean_val)
                                if float_val > 0:
                                    numeric_count += 1
                            except (ValueError, TypeError):
                                continue
                        
                        if numeric_count >= len(sample_values) * 0.7:  # 70% numeric values
                            msrp_col = col
            
            # If still no phone column found, look for columns with actual phone names (text data)
            if not phone_col:
                exclude_keywords = ['sap', 'code', 'id', 'number', 'sku', '#']
                for col in df.columns:
                    col_lower = str(col).lower()
                    # Skip columns that are clearly codes/IDs
                    if any(keyword in col_lower for keyword in exclude_keywords):
                        continue
                    
                    # Check if this column contains text data that looks like phone names
                    sample_values = df[col].dropna().head(10)
                    text_count = 0
                    for val in sample_values:
                        val_str = str(val).strip()
                        # Look for text that's longer than typical codes and contains letters
                        if (len(val_str) > 5 and 
                            any(c.isalpha() for c in val_str) and 
                            not val_str.isdigit() and
                            not val_str.replace('.', '').replace('-', '').isdigit()):
                            text_count += 1
                    
                    if text_count >= len(sample_values) * 0.7:  # 70% look like phone names
                        phone_col = col
                        break
            
            # If still no columns found, try to use non-unnamed, non-code columns
            if not phone_col or not msrp_col:
                exclude_keywords = ['sap', 'code', 'id', 'number', 'sku', '#']
                non_unnamed_cols = [col for col in df.columns 
                                  if not str(col).startswith('Unnamed') and 
                                  not any(keyword in str(col).lower() for keyword in exclude_keywords)]
                
                if len(non_unnamed_cols) >= 1:
                    if not phone_col:
                        phone_col = non_unnamed_cols[0]
                    if not msrp_col and len(non_unnamed_cols) >= 2:
                        msrp_col = non_unnamed_cols[1]
                    
                    # Look for numeric data in unnamed columns
                    if not msrp_col:
                        for col in df.columns:
                            if str(col).startswith('Unnamed'):
                                sample_values = df[col].dropna().head(5)
                                numeric_count = 0
                                for val in sample_values:
                                    try:
                                        if isinstance(val, str):
                                            clean_val = val.replace('$', '').replace(',', '').strip()
                                        else:
                                            clean_val = val
                                        float_val = float(clean_val)
                                        if float_val > 0:
                                            numeric_count += 1
                                    except:
                                        continue
                                if numeric_count >= len(sample_values) * 0.6:
                                    msrp_col = col
                                    break
            
            if not phone_col or not msrp_col:
                available_cols = list(df.columns)
                detected_info = f"Phone column: '{phone_col}', Price column: '{msrp_col}'"
                
                # Show sample data from detected columns for debugging
                debug_info = ""
                if phone_col:
                    sample_phones = df[phone_col].dropna().head(3).tolist()
                    debug_info += f" Sample phone data: {sample_phones}."
                if msrp_col:
                    sample_prices = df[msrp_col].dropna().head(3).tolist()
                    debug_info += f" Sample price data: {sample_prices}."
                
                return {
                    'success': False,
                    'error': f'Could not find required columns. {detected_info}.{debug_info} Available columns: {available_cols}. Looking specifically for "Phone" and "RIC Purchase Payment" columns.'
                }
            
            # Extract data and update devices
            new_devices = {}
            processed_count = 0
            skipped_count = 0
            
            for index, row in df.iterrows():
                try:
                    phone_name = str(row[phone_col]).strip()
                    msrp_value = row[msrp_col]
                    
                    # Skip empty or invalid device names
                    if pd.isna(phone_name) or phone_name.lower() in ['nan', '', 'null', 'none'] or len(phone_name) < 2:
                        skipped_count += 1
                        continue
                    
                    # Convert MSRP to float
                    if pd.isna(msrp_value):
                        skipped_count += 1
                        continue
                    
                    # Handle string values that might have currency symbols
                    if isinstance(msrp_value, str):
                        msrp_value = msrp_value.replace('$', '').replace(',', '').strip()
                        if not msrp_value:
                            skipped_count += 1
                            continue
                    
                    msrp_float = float(msrp_value)
                    
                    if msrp_float > 0:  # Only add devices with positive MSRP
                        # Initialize device data with MSRP
                        device_data = {'msrp': msrp_float}
                        
                        # Try to get prepaid price if column exists
                        if prepaid_col and prepaid_col in row:
                            prepaid_value = row[prepaid_col]
                            if not pd.isna(prepaid_value):
                                try:
                                    # Handle string values that might have currency symbols
                                    if isinstance(prepaid_value, str):
                                        prepaid_value = prepaid_value.replace('$', '').replace(',', '').strip()
                                        if prepaid_value:  # Only process if not empty
                                            prepaid_float = float(prepaid_value)
                                            if prepaid_float > 0:
                                                device_data['prepaid'] = prepaid_float
                                    else:
                                        prepaid_float = float(prepaid_value)
                                        if prepaid_float > 0:
                                            device_data['prepaid'] = prepaid_float
                                except (ValueError, TypeError):
                                    pass  # Skip prepaid if invalid, but keep MSRP
                        
                        new_devices[phone_name] = device_data
                        processed_count += 1
                    else:
                        skipped_count += 1
                        
                except (ValueError, TypeError):
                    skipped_count += 1
                    continue
            
            if new_devices:
                # Update the devices dictionary
                devices_before_update = len(self.devices)
                self.devices.update(new_devices)
                devices_after_update = len(self.devices)
                self.save_devices()
                
                # Calculate actual devices added (accounting for duplicates/overwrites)
                actual_devices_added = devices_after_update - devices_before_update
                
                return {
                    'success': True,
                    'message': f'Successfully processed {processed_count} devices from price sheet. Skipped {skipped_count} invalid entries. Total devices: {devices_after_update}',
                    'devices_added': len(new_devices),  # New devices from CSV
                    'actual_devices_added': actual_devices_added,  # Net change in device count
                    'total_devices': devices_after_update,  # Total devices after update
                    'phone_column': phone_col,
                    'msrp_column': msrp_col,
                    'processed_count': processed_count,
                    'skipped_count': skipped_count
                }
            else:
                return {
                    'success': False,
                    'error': f'No valid device data found in the file. Checked columns: "{phone_col}" for devices and "{msrp_col}" for prices. Skipped {skipped_count} invalid entries.'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing file: {str(e)}'
            }

# Initialize calculator
calculator = WebSalesTaxCalculator()

@app.route('/')
def index():
    """Main page"""
    states = list(STATE_TAX_RATES.keys())
    devices = calculator.get_device_list()
    return render_template('index.html', states=states, devices=devices)

@app.route('/calculate', methods=['POST'])
def calculate():
    """Calculate sales tax via API"""
    try:
        data = request.get_json()
        
        state = data.get('state', 'California')
        amount = float(data.get('amount', 0))
        
        # Get tax rate and calculate
        tax_rate = get_tax_rate(state)
        sales_tax_amount, total = calculate_sales_tax(amount, tax_rate)
        
        return jsonify({
            'success': True,
            'tax_rate': tax_rate / 100,  # Convert to decimal for display
            'tax_rate_percent': f"{tax_rate:.2f}%",
            'msrp': f"${amount:,.2f}",
            'sales_tax': f"${sales_tax_amount:,.2f}",
            'total': f"${total:,.2f}",
            'raw_values': {
                'tax_rate': tax_rate / 100,
                'msrp': amount,
                'sales_tax': sales_tax_amount,
                'total': total
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/get_devices')
def get_devices():
    """Get list of all available devices with caching"""
    # Check for active request deduplication
    request_key = 'get_devices'
    with calculator.request_lock:
        if request_key in calculator.active_requests:
            # Wait for active request to complete
            calculator.active_requests[request_key].wait()
        else:
            # Mark this request as active
            calculator.active_requests[request_key] = threading.Event()
    
    try:
        devices = calculator.get_device_list()
        response = jsonify({
            'success': True,
            'devices': devices
        })
        # Add cache headers
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response
    finally:
        # Mark request as complete
        with calculator.request_lock:
            if request_key in calculator.active_requests:
                calculator.active_requests[request_key].set()
                del calculator.active_requests[request_key]

@app.route('/get_device_price/<device_name>')
def get_device_price(device_name):
    """Get price for a specific device"""
    price = calculator.get_device_price(device_name)
    return jsonify({
        'success': True,
        'price': price
    })

@app.route('/get_device_data/<device_name>')
def get_device_data(device_name):
    """Get complete device data including MSRP and prepaid prices with caching"""
    # Check for active request deduplication
    request_key = f'get_device_data_{device_name}'
    with calculator.request_lock:
        if request_key in calculator.active_requests:
            # Wait for active request to complete
            calculator.active_requests[request_key].wait()
        else:
            # Mark this request as active
            calculator.active_requests[request_key] = threading.Event()
    
    try:
        device_data = calculator.get_device_data(device_name)
        response = jsonify({
            'success': True,
            'data': device_data
        })
        # Add cache headers
        response.headers['Cache-Control'] = 'public, max-age=600'  # 10 minutes
        response.headers['ETag'] = hashlib.md5(str(device_data).encode()).hexdigest()[:16]
        return response
    finally:
        # Mark request as complete
        with calculator.request_lock:
            if request_key in calculator.active_requests:
                calculator.active_requests[request_key].set()
                del calculator.active_requests[request_key]

@app.route('/get_popular_devices')
def get_popular_devices():
    """Get popular devices for the homepage display"""
    try:
        popular_devices = calculator.get_popular_devices()
        return jsonify({
            'success': True,
            'devices': popular_devices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload_price_sheet', methods=['POST'])
def upload_price_sheet():
    """Handle price sheet file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'.csv', '.xlsx', '.xls'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Please upload CSV or Excel files only.'
            }), 400
        
        # Save file securely
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Process the file
        result = calculator.process_price_sheet(file_path)
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except:
            pass
        
        # If successful, return updated device list
        if result['success']:
            result['devices'] = calculator.get_device_list()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Upload failed: {str(e)}'
        }), 500

@app.route('/preview_file_columns', methods=['POST'])
def preview_file_columns():
    """Preview file columns and sample data for manual column selection"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'.csv', '.xlsx', '.xls'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Please upload CSV or Excel files only.'
            }), 400
        
        # Save file securely
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Read file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            
            # Clean up the dataframe
            df = df.dropna(axis=1, how='all')
            
            # Get column information
            columns_info = []
            for col in df.columns:
                sample_values = df[col].dropna().head(3).tolist()
                columns_info.append({
                    'name': str(col),
                    'sample_values': [str(val) for val in sample_values]
                })
            
            return jsonify({
                'success': True,
                'columns': columns_info,
                'total_rows': len(df),
                'filename': file.filename
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error reading file: {str(e)}'
            })
        finally:
            # Clean up uploaded file
            try:
                os.remove(file_path)
            except:
                pass
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Preview failed: {str(e)}'
        }), 500

@app.route('/refresh_google_sheets', methods=['POST'])
def refresh_google_sheets():
    """Manually refresh price data from Google Sheets"""
    try:
        result = calculator.download_and_process_google_sheets()
        
        if result:
            # Get updated device list and actual count
            devices = calculator.get_device_list()
            actual_device_count = len(calculator.devices)
            last_update_info = calculator.load_last_update_info()
            
            return jsonify({
                'success': True,
                'message': f'Successfully updated {actual_device_count} devices from Google Sheets',
                'devices': devices,
                'last_update': last_update_info.get('last_update'),
                'devices_count': actual_device_count  # Use actual count from loaded devices
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update from Google Sheets. Check console for details.'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Refresh failed: {str(e)}'
        }), 500

@app.route('/lazy_load_google_sheets', methods=['POST'])
def lazy_load_google_sheets():
    """Lazy load Google Sheets data in the background"""
    try:
        result = calculator.lazy_load_google_sheets()
        
        if result["status"] == "success":
            # Get updated device list
            devices = calculator.get_device_list()
            last_update_info = calculator.load_last_update_info()
            
            return jsonify({
                'success': True,
                'message': result["message"],
                'devices': devices,
                'last_update': last_update_info.get('last_update'),
                'devices_count': last_update_info.get('devices_count', 0)
            })
        elif result["status"] == "already_loaded_or_loading":
            return jsonify({
                'success': True,
                'message': 'Google Sheets data is already loaded or currently loading',
                'devices': calculator.get_device_list(),
                'devices_count': len(calculator.devices)
            })
        else:
            return jsonify({
                'success': False,
                'error': result["message"]
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lazy load failed: {str(e)}'
        }), 500

@app.route('/loading_status')
def loading_status():
    """Get the current loading status"""
    try:
        status = calculator.get_loading_status()
        # Ensure we report the actual device count from memory
        status['devices_count'] = len(calculator.devices)
        return jsonify({
            'success': True,
            **status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check failed: {str(e)}'
        }), 500

@app.route('/google_sheets_status')
def google_sheets_status():
    """Get status of Google Sheets integration"""
    try:
        last_update_info = calculator.load_last_update_info()
        cache_exists = os.path.exists(calculator.cache_file)
        
        return jsonify({
            'success': True,
            'google_sheets_url': calculator.google_sheets_url,
            'cache_file_exists': cache_exists,
            'last_check': last_update_info.get('last_check'),
            'last_update': last_update_info.get('last_update'),
            'devices_count': last_update_info.get('devices_count', 0),
            'file_size': last_update_info.get('size')
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check failed: {str(e)}'
        }), 500

@app.route('/validate_device_counts')
def validate_device_counts():
    """Validate device counts across all data sources for debugging"""
    try:
        validation_result = calculator.validate_device_counts()
        return jsonify({
            'success': True,
            'validation': validation_result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 500

if __name__ == '__main__':
    import webview
    import threading
    import time
    import signal
    import sys
    import os
    
    # Function to start Flask server
    def start_flask():
        app.run(debug=False, host='localhost', port=5000, use_reloader=False, threaded=True)
    
    # Function to handle application shutdown
    def shutdown_handler(signum, frame):
        print("Shutting down application...")
        os._exit(0)
    
    # Register signal handlers for proper shutdown
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    # Start Flask server in a separate thread
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()
    
    # Wait a moment for Flask to start
    time.sleep(2)
    
    webview.create_window(
        'Sales Tax Calculator',
        'http://localhost:5000',
        width=1000,
        height=850,
        resizable=False
    )
    
    try:
        webview.start(debug=False)
    except KeyboardInterrupt:
        pass
    finally:
        # Ensure clean exit
        os._exit(0)