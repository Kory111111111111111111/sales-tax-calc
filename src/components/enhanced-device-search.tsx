"use client"

import { useState, useMemo } from "react"
import { Check, ChevronsUpDown, Filter, X } from "lucide-react"
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
    addToSearchHistory
  } = useSearchHistory()

  const allDevices = getAllDevices()
  const searchResults = searchQuery ? searchDevices(searchQuery, 80) : allDevices.slice(0, 20)
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
    return devicesToFilter.slice(0, selectedBrand || searchQuery ? 100 : 20);
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

  const handleSelect = (deviceName: string) => {
    onSelect(deviceName);
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery, deviceName);
    }
    setOpen(false);
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
        className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[300px] sm:max-w-[400px] lg:max-w-[450px] p-0 z-[100] max-h-[70vh] sm:max-h-[75vh] lg:max-h-[80vh]" 
        align="start"
        side="bottom"
        avoidCollisions={false}
        sideOffset={4}
      >
        <Command>
          <CommandInput 
            placeholder="Search devices..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          
          {/* Brand Filter */}
          {availableBrands.length > 0 && (
            <div className="px-2 py-1.5 border-b">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Filter className="h-3 w-3" />
                <span className="text-xs font-medium">Filter by Brand</span>
                {selectedBrand && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBrand("")}
                    className="h-4 w-4 p-0"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableBrands.slice(0, 5).map(({ brand, count }) => (
                  <Badge
                    key={brand}
                    variant={selectedBrand === brand ? "default" : "outline"}
                    className="cursor-pointer text-xs px-1.5 py-0.5 h-5"
                    onClick={() => setSelectedBrand(selectedBrand === brand ? "" : brand)}
                  >
                    {brand} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup 
            heading={selectedBrand ? `${selectedBrand} Devices` : "All Devices"} 
            className="max-h-[min(35vh,180px)] sm:max-h-[min(40vh,200px)] lg:max-h-[min(45vh,220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
          >
            {filteredDevices.map((deviceName) => {
              const deviceData = getDeviceData(deviceName)
              if (!deviceData) return null;
              
              return (
                <CommandItem
                  key={deviceName}
                  value={deviceName}
                  onSelect={() => handleSelect(deviceName)}
                  className="cursor-pointer py-1.5 px-2"
                >
                  <Check
                    className={cn(
                      "mr-1.5 h-3 w-3",
                      value === deviceName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full min-w-0 gap-0.5 sm:gap-0">
                    <div className="flex flex-col min-w-0 flex-1 sm:mr-3">
                      <span className="font-medium truncate text-xs">
                        {deviceName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {extractBrand(deviceName)}
                      </span>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <span className="text-xs font-medium">
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