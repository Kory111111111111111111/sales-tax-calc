"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const { 
    addToSearchHistory
  } = useSearchHistory()
  
  // Debounce search query for better performance
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 50) // 50ms debounce for instant visual feedback
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const allDevices = getAllDevices()
  const searchResults = debouncedQuery ? searchDevices(debouncedQuery, 80) : allDevices.slice(0, 20)
  const selectedDevice = value ? getDeviceData(value) : null

  // Filter devices by debounced search query for better performance
  const filteredDevices = useMemo(() => {
    const devicesToShow = debouncedQuery ? searchResults : allDevices.slice(0, 20);
    return devicesToShow.slice(0, debouncedQuery ? 100 : 20);
  }, [allDevices, searchResults, debouncedQuery]);

  const handleSelect = (deviceName: string) => {
    // Immediate state update for instant feedback
    onSelect(deviceName);
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery, deviceName);
    }
    // Use flushSync for immediate React updates
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between transition-none transform-gpu will-change-transform touch-action-manipulation select-none active:scale-98 active:transition-none hover:transition-all hover:duration-75"
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
        className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[300px] sm:max-w-[400px] lg:max-w-[450px] p-0 z-[100] max-h-[80vh] sm:max-h-[85vh] lg:max-h-[90vh] transform-gpu" 
        align="start"
        side="bottom"
        avoidCollisions={false}
        sideOffset={2}
      >
        <Command>
          <CommandInput 
            placeholder="Search devices..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          
          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup 
            heading="All Devices" 
            className="max-h-[min(55vh,400px)] sm:max-h-[min(60vh,450px)] lg:max-h-[min(65vh,500px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 transform-gpu"
          >
            {filteredDevices.map((deviceName) => {
              const deviceData = getDeviceData(deviceName)
              if (!deviceData) return null;
              
              return (
                <CommandItem
                  key={deviceName}
                  value={deviceName}
                  onSelect={() => handleSelect(deviceName)}
                  className="cursor-pointer py-1.5 px-2 transition-none transform-gpu will-change-transform touch-action-manipulation select-none active:bg-accent/80 active:transition-none hover:bg-accent/60 hover:transition-all hover:duration-50"
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