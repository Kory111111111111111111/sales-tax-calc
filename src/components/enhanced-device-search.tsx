"use client"

import { useState, useMemo, useRef, useEffect, memo, useCallback } from "react"
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
import { flushSync } from "react-dom"
import { searchDevices, getDeviceData, getAllDevices, initializeDeviceData, getLoadingStatus, retryLoading } from "@/lib/device-data"
import type { DeviceData } from "@/lib/device-data"
import { formatCurrency } from "@/lib/tax-data"
import { useSearchHistory } from "@/hooks/useSearchHistory"
import { ErrorState } from "@/components/error-state"

const SEARCH_DEBOUNCE_MS = 40
const DEFAULT_VISIBLE_DEVICES = 20
const MAX_SEARCH_RESULTS = 100

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

export const EnhancedDeviceSearch = memo(function EnhancedDeviceSearch({ value, onSelect, placeholder = "Search devices..." }: EnhancedDeviceSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deviceNames, setDeviceNames] = useState<string[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const { 
    addToSearchHistory
  } = useSearchHistory()

  // Initialize device data on mount
  useEffect(() => {
    let isMounted = true
    const initData = async () => {
      try {
        setError(null);
        await initializeDeviceData();
        if (!isMounted) return;
        setDeviceNames(getAllDevices());
        const status = getLoadingStatus();
        if (status.lastError) {
          setError(status.lastError);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load device data');
      }
    };

    initData();
    return () => {
      isMounted = false;
    }
  }, []);

  // Debounce search query for better performance
  useEffect(() => {
    if (searchQuery === debouncedQuery) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, SEARCH_DEBOUNCE_MS)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, debouncedQuery]);

  const selectedDevice = value ? getDeviceData(value) : null

  const searchResults = useMemo(() => {
    if (!debouncedQuery) {
      return []
    }
    return searchDevices(debouncedQuery, 80, deviceNames)
  }, [debouncedQuery, deviceNames])

  // Filter devices by debounced search query for better performance
  const filteredDevices = useMemo(() => {
    if (!open) {
      return []
    }

    if (debouncedQuery) {
      return searchResults.slice(0, MAX_SEARCH_RESULTS)
    }

    return deviceNames.slice(0, DEFAULT_VISIBLE_DEVICES)
  }, [deviceNames, searchResults, debouncedQuery, open])

  const deviceEntries = useMemo(() => {
    if (!filteredDevices.length) return []

    return filteredDevices.reduce<Array<{ name: string; data: DeviceData }>>((acc, deviceName) => {
      const deviceData = getDeviceData(deviceName)
      if (deviceData) {
        acc.push({ name: deviceName, data: deviceData })
      }
      return acc
    }, [])
  }, [filteredDevices])

  const handleSelect = useCallback((deviceName: string) => {
    onSelect(deviceName)
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery, deviceName)
    }
    flushSync(() => setOpen(false))
  }, [onSelect, addToSearchHistory, searchQuery])

  const handleRetry = useCallback(async () => {
    try {
      setError(null)
      await retryLoading()
      setDeviceNames(getAllDevices())
      const status = getLoadingStatus()
      if (status.lastError) {
        setError(status.lastError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry loading device data')
    }
  }, [])

  // Show error state if device data failed to load
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={value ? `Selected device: ${value}` : "Search and select device"}
          className="w-full justify-between button-enhanced h-8 text-sm"
        >
          {value ? (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full gap-1 sm:gap-0">
              <span className="font-medium truncate flex-1 sm:mr-4 text-left text-sm">
                {value}
              </span>
              {selectedDevice && (
                <span className="text-muted-foreground text-xs flex-shrink-0 text-left sm:text-right">
                  {formatCurrency(selectedDevice.msrp)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[280px] sm:max-w-[360px] lg:max-w-[400px] p-0 z-[100] max-h-[55vh] sm:max-h-[60vh] lg:max-h-[65vh] transform-gpu overflow-y-auto bg-slate-900 border border-white/10 shadow-xl" 
        align="start"
        side="bottom"
        avoidCollisions={true}
        sideOffset={4}
        collisionPadding={8}
      >
        <Command className="bg-transparent text-slate-100">
          <CommandInput 
            placeholder="Search devices..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="placeholder:text-slate-500"
          />
          
          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup 
            heading="All Devices" 
            className="max-h-[min(45vh,320px)] sm:max-h-[min(50vh,360px)] lg:max-h-[min(55vh,400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent transform-gpu"
          >
            {deviceEntries.map(({ name: deviceName, data: deviceData }) => (
                <CommandItem
                  key={deviceName}
                  value={deviceName}
                  onSelect={() => handleSelect(deviceName)}
                  className="cursor-pointer py-1 px-2 smooth-hover smooth-press"
                >
                  <Check
                    className={cn(
                      "mr-1 h-3 w-3",
                      value === deviceName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full min-w-0 gap-0.5 sm:gap-0">
                    <div className="flex flex-col min-w-0 flex-1 sm:mr-3">
                      <span className="font-medium truncate text-xs">
                        {deviceName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {extractBrand(deviceName)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:items-end flex-shrink-0">
                      <span className="text-xs font-medium">
                        {formatCurrency(deviceData.msrp)}
                      </span>
                      {deviceData.prepaid && (
                        <span className="text-[10px] text-muted-foreground">
                          Prepaid: {formatCurrency(deviceData.prepaid)}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
});