import { useState, useMemo, useCallback } from "react";
import Head from "next/head";
import { Calculator, X, Check, ChevronsUpDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuroraText } from "@/components/ui/aurora-text";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { EnhancedDeviceSearch } from "@/components/enhanced-device-search";
import {
  LazyCustomStarsBackgroundWithSuspense
} from "@/components/lazy-components";
import { PopularDevicesSection } from "@/components/popular-devices-section";
import { getDeviceData, type Device, type DeviceData } from "@/lib/device-data";
import {
  getAllStates,
  getTaxRate,
  calculateSalesTax,
  formatCurrency,
  formatPercentage
} from "@/lib/tax-data";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Home() {
  const { preferences, updatePreference } = useUserPreferences();

  const [selectedState, setSelectedState] = useState<string>(preferences.preferredState || "Maine");
  const [openStateCombobox, setOpenStateCombobox] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [useDevicePrice, setUseDevicePrice] = useState<boolean>(false);
  const [usePrepaidPrice, setUsePrepaidPrice] = useState<boolean>(false);
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(true);

  // Memoize expensive calculations
  const states = useMemo(() => getAllStates(), []);
  const taxRate = useMemo(() => getTaxRate(selectedState), [selectedState]);

  // Update state selection and save to preferences
  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
    updatePreference('preferredState', newState);
    setOpenStateCombobox(false);
  }, [updatePreference]);

  // Calculate current amount (either manual input or device price)
  const getCurrentAmount = useCallback((): number => {
    if (useDevicePrice && selectedDevice) {
      const deviceData = getDeviceData(selectedDevice);
      if (deviceData) {
        return usePrepaidPrice && deviceData.prepaid ? deviceData.prepaid : deviceData.msrp;
      }
    }
    return parseFloat(amount) || 0;
  }, [useDevicePrice, selectedDevice, usePrepaidPrice, amount]);

  // Memoize current amount and tax calculation
  const currentAmount = useMemo(() => getCurrentAmount(), [getCurrentAmount]);
  const taxCalculation = useMemo(() => calculateSalesTax(currentAmount, taxRate), [currentAmount, taxRate]);

  const handleDeviceSelect = useCallback((deviceOrName: Device | string) => {
    let deviceName: string;
    let deviceData: DeviceData | null;

    // Handle both Device object and string input
    if (typeof deviceOrName === 'string') {
      deviceName = deviceOrName;
      deviceData = getDeviceData(deviceName);
    } else {
      deviceName = deviceOrName.name;
      deviceData = deviceOrName.data;
    }

    if (deviceData && deviceData.msrp) {
      setSelectedDevice(deviceName);
      setUseDevicePrice(true);
      setUsePrepaidPrice(false);
      setAmount(deviceData.msrp.toString());
    }
  }, []);

  const handleManualAmountChange = useCallback((value: string) => {
    setAmount(value);
    setUseDevicePrice(false);
    setSelectedDevice("");
    setUsePrepaidPrice(false);
  }, []);

  // Function for future prepaid pricing toggle feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePrepaidToggle = useCallback(() => {
    if (selectedDevice && useDevicePrice) {
      const deviceData = getDeviceData(selectedDevice);
      if (deviceData) {
        const newUsePrepaid = !usePrepaidPrice;
        setUsePrepaidPrice(newUsePrepaid);
        const newPrice = newUsePrepaid && deviceData.prepaid ? deviceData.prepaid : deviceData.msrp;
        setAmount(newPrice.toString());
      }
    }
  }, [selectedDevice, useDevicePrice, usePrepaidPrice]);

  const handleCloseBanner = useCallback(() => {
    setShowWarningBanner(false);
  }, []);

  return (
    <>
      <Head>
        <title>Sales Tax Calculator - Calculate US State Sales Tax</title>
        <meta name="description" content="Free sales tax calculator for US states. Calculate sales tax on mobile devices and manual amounts. Supports all 50 states with accurate tax rates." />
        <meta name="keywords" content="sales tax calculator, US tax calculator, state sales tax, mobile device tax, tax calculation tool" />
        <meta name="author" content="Sales Tax Calculator" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <LazyCustomStarsBackgroundWithSuspense
        className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col"
        starColor="rgba(147, 197, 253, 0.6)"
        speed={60}
        factor={0.03}
        starLayers={[
          { count: 3000, size: 0.5, speedMultiplier: 0.5 },
          { count: 2000, size: 1, speedMultiplier: 1 },
          { count: 1200, size: 1.5, speedMultiplier: 1.5 },
          { count: 800, size: 2, speedMultiplier: 2 },
          { count: 400, size: 2.5, speedMultiplier: 2.5 },
          { count: 200, size: 3, speedMultiplier: 3 },
          { count: 100, size: 4, speedMultiplier: 4 },
        ]}
      >
        <div className="container mx-auto px-4 py-6 relative z-10 flex-grow">
          {/* Warning Banner */}
          {showWarningBanner && (
            <div className="mb-6 bg-red-950/80 border border-red-500/50 text-white px-4 py-3 rounded-lg shadow-lg relative backdrop-blur-md animate-fade-in text-left" style={{ verticalAlign: 'top' }}>
              <button
                onClick={handleCloseBanner}
                className="absolute top-2 right-2 p-1 hover:bg-red-500/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                aria-label="Close warning banner"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3 pr-8">
                <span className="text-xl">⚠️</span>
                <p className="text-sm font-medium leading-relaxed">
                  <span className="font-bold block mb-1">Important Notice</span>
                  Before using this tool, verify you are working with a UScellular customer. Information provided here may not apply to other carriers.
                </p>
              </div>
            </div>
          )}

          {/* Main Header */}
          <div className="text-center mb-8">
            <AuroraText className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight tracking-tight">
              Sales Tax Calculator
            </AuroraText>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Calculate US state sales tax instantly. Enter an amount or select a device to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            {/* Popular Devices - Takes up 4 columns on large screens */}
            <div className="lg:col-span-4 order-2 lg:order-1">
              <PopularDevicesSection
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
              />
            </div>

            {/* Main Calculator - Takes up 8 columns on large screens */}
            <div className="lg:col-span-8 order-1 lg:order-2">
              <Card className="shadow-2xl animate-scale-in card-interactive border border-white/10 bg-slate-900/50 backdrop-blur-xl h-full">
                <CardHeader className="border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    Calculate Tax
                  </h2>
                  <CardDescription className="text-slate-400 text-base">
                    Select your state and enter an amount to see the breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  {/* State Selection and Amount Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-300">
                        State
                      </Label>
                      <Popover open={openStateCombobox} onOpenChange={setOpenStateCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openStateCombobox}
                            className="w-full justify-between bg-slate-950/50 border-white/10 text-slate-200 hover:bg-slate-800 hover:text-white h-11"
                          >
                            {selectedState
                              ? `${selectedState} (${formatPercentage(getTaxRate(selectedState))})`
                              : "Select state..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 bg-slate-900 border-white/10">
                          <Command className="bg-transparent">
                            <CommandInput placeholder="Search state..." className="h-11" />
                            <CommandList>
                              <CommandEmpty>No state found.</CommandEmpty>
                              <CommandGroup>
                                {states.map((state) => (
                                  <CommandItem
                                    key={state}
                                    value={state}
                                    onSelect={(currentValue) => {
                                      handleStateChange(currentValue === selectedState ? "" : currentValue)
                                      setOpenStateCombobox(false)
                                    }}
                                    className="text-slate-200 aria-selected:bg-slate-800 aria-selected:text-white"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedState === state ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {state}
                                    <span className="ml-auto text-slate-500 text-xs">
                                      {formatPercentage(getTaxRate(state))}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="amount-input" className="text-sm font-medium text-slate-300">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="amount-input"
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => handleManualAmountChange(e.target.value)}
                          className="pl-9 h-11 bg-slate-950/50 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:ring-primary/50"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Device Search */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-300">
                      Or Select a Device
                    </Label>
                    <EnhancedDeviceSearch
                      value={selectedDevice}
                      onSelect={handleDeviceSelect}
                      placeholder="Search for a device..."
                    />
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Results */}
                  <div className="space-y-4">
                    {currentAmount > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-slate-950/30 rounded-xl border border-white/5">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Original Amount</p>
                          <p className="text-xl font-semibold text-slate-200">{formatCurrency(currentAmount)}</p>
                        </div>
                        <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                          <p className="text-xs text-orange-400/80 uppercase tracking-wider font-medium mb-1">Sales Tax</p>
                          <p className="text-xl font-semibold text-orange-400">
                            {formatCurrency(taxCalculation.taxAmount)}
                          </p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                          <p className="text-xs text-primary/80 uppercase tracking-wider font-medium mb-1">Total Amount</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(taxCalculation.totalAmount)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Calculator className="h-10 w-10 mx-auto mb-4 opacity-20" />
                        <p className="text-base">Enter an amount or select a device to see tax calculation</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-6 mt-auto border-t border-white/5 bg-slate-950/30 backdrop-blur-sm relative z-10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-slate-600">
              Tax rates are estimates and may vary. Always verify with official sources.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Powered by{" "}
              <a
                href="https://wavfinaudio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-300 underline transition-colors"
              >
                WAVFin Audio
              </a>
            </p>
          </div>
        </footer>
      </LazyCustomStarsBackgroundWithSuspense>
    </>
  );
}

