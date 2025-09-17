"use client"

import { useState, useMemo } from "react"
import { Check, ChevronsUpDown, Filter, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { searchDevices, getDeviceData, getAllDevices } from "@/lib/device-data"
import { formatCurrency } from "@/lib/tax-data"
import { useSearchHistory } from "@/hooks/useSearchHistory"

interface EnhancedDeviceSearchProps {
  value?: string
  onSelect: (deviceName: string) => void
  placeholder?: string
}

// Extract brand from device name
function extractBrand(deviceName: string): string {
  const name = deviceName.toLowerCase();
  if (name.includes('iphone') || name.includes('ipad')) return 'Apple';
  if (name.includes('galaxy') || name.includes('samsung')) return 'Samsung';
  if (name.includes('pixel') || name.includes('google')) return 'Google';
  if (name.includes('oneplus')) return 'OnePlus';
  if (name.includes('motorola') || name.includes('moto')) return 'Motorola';
  if (name.includes('lg')) return 'LG';
  if (name.includes('huawei')) return 'Huawei';
  if (name.includes('xiaomi')) return 'Xiaomi';
  return 'Other';
}

export function EnhancedDeviceSearch({ value, onSelect, placeholder = "Search devices..." }: EnhancedDeviceSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  
  const { 
    addToSearchHistory, 
    getRecentSearches, 
    getSuggestions,
    removeFromSearchHistory 
  } = useSearchHistory()

  const allDevices = getAllDevices()
  const searchResults = searchQuery ? searchDevices(searchQuery, 100) : allDevices.slice(0, 30)
  const selectedDevice = value ? getDeviceData(value) : null

  // Filter devices by brand (use all devices for brand filtering, then apply search if needed)
  const filteredDevices = useMemo(() => {
    let devicesToFilter = searchQuery ? searchResults : allDevices;
    
    if (selectedBrand) {
      devicesToFilter = devicesToFilter.filter(deviceName => extractBrand(deviceName) === selectedBrand);
    }
    
    // If we have a search query, further filter the brand-filtered results
    if (searchQuery && selectedBrand) {
      const query = searchQuery.toLowerCase();
      devicesToFilter = devicesToFilter.filter(deviceName => 
        deviceName.toLowerCase().includes(query)
      );
    }
    
    // Limit results for performance (but show more when filtering)
    return devicesToFilter.slice(0, selectedBrand || searchQuery ? 150 : 30);
  }, [allDevices, searchResults, searchQuery, selectedBrand]);

  // Get available brands from ALL devices, not just search results
  const availableBrands = useMemo(() => {
    const brandCounts = allDevices.reduce((acc, deviceName) => {
      const brand = extractBrand(deviceName);
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [allDevices]);

  // Get recent searches and suggestions
  const recentSearches = getRecentSearches(3);
  const suggestions = getSuggestions(searchQuery, 3);

  const handleSelect = (deviceName: string) => {
    onSelect(deviceName);
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery, deviceName);
    }
    setOpen(false);
  };

  const handleSuggestionSelect = (suggestion: { query: string; deviceName: string }) => {
    setSearchQuery(suggestion.query);
    handleSelect(suggestion.deviceName);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full gap-1 sm:gap-0">
              <span className="font-medium truncate flex-1 sm:mr-4 text-left">
                {value}
              </span>
              {selectedDevice && (
                <span className="text-muted-foreground text-sm flex-shrink-0 text-left sm:text-right">
                  {formatCurrency(selectedDevice.msrp)}
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[400px] sm:max-w-[500px] p-0 z-[100]" 
        align="start"
        side="bottom"
        avoidCollisions={false}
        sideOffset={8}
      >
        <Command>
          <CommandInput 
            placeholder="Search devices..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          
          {/* Brand Filter */}
          {availableBrands.length > 0 && (
            <div className="px-3 py-2 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-3 w-3" />
                <span className="text-xs font-medium">Filter by Brand</span>
                {selectedBrand && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBrand("")}
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableBrands.slice(0, 6).map(({ brand, count }) => (
                  <Badge
                    key={brand}
                    variant={selectedBrand === brand ? "default" : "outline"}
                    className="cursor-pointer text-xs px-2 py-1"
                    onClick={() => setSelectedBrand(selectedBrand === brand ? "" : brand)}
                  >
                    {brand} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches and Suggestions */}
          {!searchQuery && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((item, index) => (
                <CommandItem
                  key={`recent-${index}`}
                  onSelect={() => handleSuggestionSelect(item)}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 opacity-50" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.deviceName}</span>
                    <span className="text-xs text-muted-foreground">&ldquo;{item.query}&rdquo;</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromSearchHistory(index);
                    }}
                    className="ml-auto h-4 w-4 p-0 opacity-50 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchQuery && suggestions.length > 0 && (
            <CommandGroup heading="Suggestions">
              {suggestions.map((item, index) => (
                <CommandItem
                  key={`suggestion-${index}`}
                  onSelect={() => handleSuggestionSelect(item)}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 opacity-50" />
                  <span className="font-medium">{item.deviceName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(recentSearches.length > 0 || suggestions.length > 0) && filteredDevices.length > 0 && (
            <Separator />
          )}

          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup 
            heading={selectedBrand ? `${selectedBrand} Devices` : "All Devices"} 
            className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
          >
            {filteredDevices.map((deviceName) => {
              const deviceData = getDeviceData(deviceName)
              if (!deviceData) return null;
              
              return (
                <CommandItem
                  key={deviceName}
                  value={deviceName}
                  onSelect={() => handleSelect(deviceName)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === deviceName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full min-w-0 gap-1 sm:gap-0">
                    <div className="flex flex-col min-w-0 flex-1 sm:mr-4">
                      <span className="font-medium truncate text-sm sm:text-base">
                        {deviceName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {extractBrand(deviceName)}
                      </span>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <span className="text-sm font-medium">
                        {formatCurrency(deviceData.msrp)}
                      </span>
                      {deviceData.prepaid && (
                        <div className="text-xs text-muted-foreground">
                          Prepaid: {formatCurrency(deviceData.prepaid)}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}