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

interface DeviceSearchProps {
  value?: string
  onSelect: (deviceName: string) => void
  placeholder?: string
}

export function DeviceSearch({ value, onSelect, placeholder = "Search devices..." }: DeviceSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const devices = searchDevices(searchQuery, 20)
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
            <div className="flex justify-between items-center w-full">
              <span className="font-medium truncate flex-1 mr-4">
                {value}
              </span>
              {selectedDevice && (
                <span className="text-muted-foreground text-sm flex-shrink-0">
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
      <PopoverContent className="w-full min-w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search devices..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No device found.</CommandEmpty>
          <CommandGroup className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            {devices.map((deviceName) => {
              const deviceData = getDeviceData(deviceName)
              if (!deviceData) {
                console.log(`❌ No device data found for: ${deviceName}`);
                return null;
              }
              
              // Debug: Log devices with suspicious prices
              if (deviceData.msrp <= 2) {
                console.log(`🚨 Suspicious price for ${deviceName}: $${deviceData.msrp}`);
                console.log(`   Raw device data:`, deviceData);
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
                  <div className="flex justify-between items-center w-full min-w-0">
                    <div className="flex flex-col min-w-0 flex-1 mr-4">
                      <span className="font-medium truncate">
                        {deviceName}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
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