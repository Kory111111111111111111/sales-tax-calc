import { useState } from "react";
import Head from "next/head";
import { Calculator, MapPin, Search, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AuroraText } from "@/components/ui/aurora-text";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { EnhancedDeviceSearch } from "@/components/enhanced-device-search";
import { 
  LazyCustomStarsBackgroundWithSuspense
} from "@/components/lazy-components";
import { PopularDevicesSection } from "@/components/popular-devices-section";
import { getDeviceData, type Device } from "@/lib/device-data";
import { 
  getAllStates, 
  getTaxRate, 
  calculateSalesTax, 
  formatCurrency, 
  formatPercentage 
} from "@/lib/tax-data";

export default function Home() {
  const { preferences, updatePreference } = useUserPreferences();
  
  const [selectedState, setSelectedState] = useState<string>(preferences.preferredState || "Maine");
  const [amount, setAmount] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [useDevicePrice, setUseDevicePrice] = useState<boolean>(false);
  const [usePrepaidPrice, setUsePrepaidPrice] = useState<boolean>(false);
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(true);

  // Update state selection and save to preferences
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    updatePreference('preferredState', newState);
  };

  const states = getAllStates();
  const taxRate = getTaxRate(selectedState);

  // Calculate current amount (either manual input or device price)
  const getCurrentAmount = (): number => {
    if (useDevicePrice && selectedDevice) {
      const deviceData = getDeviceData(selectedDevice);
      if (deviceData) {
        return usePrepaidPrice && deviceData.prepaid ? deviceData.prepaid : deviceData.msrp;
      }
    }
    return parseFloat(amount) || 0;
  };

  const currentAmount = getCurrentAmount();
  const taxCalculation = calculateSalesTax(currentAmount, taxRate);

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device.name);
    setUseDevicePrice(true);
    setUsePrepaidPrice(false);
    setAmount(device.data.msrp.toString());
  };

  const handleManualAmountChange = (value: string) => {
    setAmount(value);
    setUseDevicePrice(false);
    setSelectedDevice("");
    setUsePrepaidPrice(false);
  };

  const handlePrepaidToggle = () => {
    if (selectedDevice && useDevicePrice) {
      const deviceData = getDeviceData(selectedDevice);
      if (deviceData) {
        const newUsePrepaid = !usePrepaidPrice;
        setUsePrepaidPrice(newUsePrepaid);
        const newPrice = newUsePrepaid && deviceData.prepaid ? deviceData.prepaid : deviceData.msrp;
        setAmount(newPrice.toString());
      }
    }
  };

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
      className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800"
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
      <div className="container mx-auto px-4 py-4 relative z-10 min-h-screen overflow-y-auto">
        {/* Warning Banner */}
        {showWarningBanner && (
          <div className="mb-4 bg-red-600 text-white px-4 py-3 rounded-lg border-2 border-red-700 shadow-lg relative">
            <button
              onClick={() => setShowWarningBanner(false)}
              className="absolute top-2 right-2 p-1 hover:bg-red-700 rounded transition-colors"
              aria-label="Close warning banner"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-center font-semibold text-sm sm:text-base leading-tight pr-8">
              ⚠️ STOP. BEFORE USING THIS TOOL VERIFY YOU ARE WORKING WITH A USCELLULAR CUSTOMER AND NOT A T-MOBILE CUSTOMER. ANY INCORRECT INFORMATION GIVEN IF YOU DO NOT FOLLOW THESE INSTRUCTIONS WILL BE YOUR SOLE RESPONSIBILITY TO FIX.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-center items-start mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <h1 className="text-3xl font-bold">
                <AuroraText 
                  colors={[
                    "oklch(0.45 0.08 224)", 
                    "oklch(0.55 0.12 220)", 
                    "oklch(0.65 0.15 216)", 
                    "oklch(0.50 0.10 228)", 
                    "oklch(0.60 0.13 212)"
                  ]}
                  speed={1.2}
                  className="text-3xl font-bold"
                >
                  Sales Tax Calculator
                </AuroraText>
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* Popular Devices */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <PopularDevicesSection 
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
            />
          </div>

          {/* Main Calculator */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="shadow-lg animate-scale-in">
              <CardHeader className="bg-card dark:bg-card border-b border-border pb-3">
                <h2 className="text-lg font-semibold leading-none">Tax Calculator</h2>
                <CardDescription className="text-sm">
                  Enter an amount or select a device to calculate sales tax
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {/* State Selection and Amount Input - Same Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="state-select" className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3" />
                      Select State
                    </Label>
                    <Select value={selectedState} onValueChange={handleStateChange}>
                      <SelectTrigger id="state-select" className="h-9 w-full">
                        <SelectValue placeholder="Choose a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state} ({formatPercentage(getTaxRate(state))})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="amount-input" className="text-sm">Amount</Label>
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount-input"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => handleManualAmountChange(e.target.value)}
                        className="pl-8 h-9 w-full"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {useDevicePrice && selectedDevice && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Price from: {getDeviceData(selectedDevice)?.displayName || selectedDevice}</span>
                        {getDeviceData(selectedDevice)?.prepaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrepaidToggle}
                            className="h-5 text-xs px-2"
                          >
                            {usePrepaidPrice ? "Switch to MSRP" : "Use Prepaid Price"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Search */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm">
                    <Search className="h-3 w-3" />
                    Search All Devices
                  </Label>
                  <EnhancedDeviceSearch
                    value={selectedDevice}
                    onSelect={(deviceName) => {
                      const deviceData = getDeviceData(deviceName);
                      if (deviceData) {
                        handleDeviceSelect({ name: deviceName, data: deviceData });
                      }
                    }}
                    placeholder="Search from all available devices..."
                  />
                </div>

                <Separator />

                {/* Results */}
                {currentAmount > 0 && (
                  <div className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 p-4 rounded-xl border transition-opacity duration-150 ease-out transform-gpu">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      Tax Calculation
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-120 ease-out hover:shadow-sm transform-gpu">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Original Amount</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(currentAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-120 ease-out hover:shadow-sm transform-gpu">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Sales Tax ({formatPercentage(taxRate)})
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(taxCalculation.taxAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-md transition-all duration-120 ease-out hover:shadow-md transform-gpu">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(taxCalculation.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg transition-opacity duration-150 ease-out">
                      <p className="text-xs text-muted-foreground">
                        Tax rate for <span className="font-medium">{selectedState}</span>: {formatPercentage(taxRate)}
                        {taxRate === 0 && " (No state sales tax)"}
                      </p>
                    </div>
                  </div>
                )}

                {currentAmount === 0 && (
                  <div className="text-center p-8 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl transition-opacity duration-150 ease-out transform-gpu">
                    <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <h3 className="text-base font-medium mb-1">Ready to Calculate</h3>
                    <p className="text-sm">Enter an amount or select a device to calculate sales tax</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LazyCustomStarsBackgroundWithSuspense>
    </>
  );
}
