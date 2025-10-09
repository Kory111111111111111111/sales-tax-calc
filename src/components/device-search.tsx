"use client"

import { useState } from "react"
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
import { searchDevices, getDeviceData } from "@/lib/device-data"
import { formatCurrency } from "@/lib/tax-data"
import { logWarn, logInfo } from "@/lib/logger"

interface DeviceSearchProps {
  value?: string
  onSelect: (deviceName: string) => void
  placeholder?: string
}

export function DeviceSearch({ value, onSelect, placeholder = "Search devices..." }: DeviceSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const devices = searchDevices(searchQuery, 12)
  const selectedDevice = value ? getDeviceData(value) : null

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
        className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[350px] sm:max-w-[450px] lg:max-w-[500px] p-0 z-[100]" 
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
          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup className="max-h-[min(36vh,144px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            {devices.map((deviceName) => {
              const deviceData = getDeviceData(deviceName)
              if (!deviceData) {
                logWarn(`No device data found for: ${deviceName}`);
                return null;
              }
              
              // Debug: Log devices with suspicious prices
              if (deviceData.msrp <= 2) {
                logWarn(`Suspicious price for ${deviceName}: $${deviceData.msrp}`);
                logInfo(`Raw device data:`, deviceData);
              }
              
              return (
                <CommandItem
                  key={deviceName}
                  value={deviceName}
                  onSelect={() => {
                    onSelect(deviceName)
                    setOpen(false)
                  }}
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
                      <span className="font-medium truncate text-xs sm:text-sm">
                        {deviceName}
                      </span>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">
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