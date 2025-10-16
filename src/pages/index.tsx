import { useState, useMemo, useCallback } from "react";
import Head from "next/head";
import { Calculator, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { getDeviceData, type Device, type DeviceData } from "@/lib/device-data";
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

  // Memoize expensive calculations
  const states = useMemo(() => getAllStates(), []);
  const taxRate = useMemo(() => getTaxRate(selectedState), [selectedState]);

  // Update state selection and save to preferences
  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
    updatePreference('preferredState', newState);
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
          <div className="mb-8 bg-red-600 text-white px-4 py-3 rounded-xl border-2 border-red-700 shadow-lg relative">
            <button
              onClick={handleCloseBanner}
              className="absolute top-2 right-2 p-1 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Close warning banner"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-center font-semibold text-sm sm:text-base leading-tight pr-8">
              ⚠️ STOP. BEFORE USING THIS TOOL VERIFY YOU ARE WORKING WITH A USCELLULAR CUSTOMER AND NOT A T-MOBILE CUSTOMER. ANY INCORRECT INFORMATION GIVEN IF YOU DO NOT FOLLOW THESE INSTRUCTIONS WILL BE YOUR SOLE RESPONSIBILITY TO FIX.
            </p>
          </div>
        )}

        {/* Main Header */}
        <div className="text-center mb-12">
          <AuroraText className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Sales Tax Calculator
          </AuroraText>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Calculate US state sales tax for any amount or browse our device catalog for accurate pricing
          </p>
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
            <Card className="shadow-lg animate-scale-in card-interactive border border-border/20 bg-card/80 backdrop-blur-md">
              <CardHeader className="border-b border-border/30 pb-6">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Calculate Sales Tax</h2>
                <CardDescription className="text-base text-muted-foreground">
                  Enter an amount and select a state to calculate the total with sales tax
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* State Selection and Amount Input - Same Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="state-select" className="text-sm font-medium text-foreground">
                      State
                    </Label>
                    <Select value={selectedState} onValueChange={handleStateChange}>
                      <SelectTrigger id="state-select" className="h-12 text-base">
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state} className="text-base">
                            {state} ({formatPercentage(getTaxRate(state))})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="amount-input" className="text-sm font-medium text-foreground">Amount ($)</Label>
                    <Input
                      id="amount-input"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => handleManualAmountChange(e.target.value)}
                      className="h-12 text-base"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Device Search */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Or Select a Device
                  </Label>
                  <EnhancedDeviceSearch
                    value={selectedDevice}
                    onSelect={handleDeviceSelect}
                    placeholder="Search for a device..."
                  />
                </div>



                <Separator className="my-8" />

                {/* Results */}
                <div className="space-y-6">
                  {currentAmount > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div className="p-6 bg-muted/50 rounded-xl border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Original Amount</p>
                        <p className="text-2xl font-semibold text-foreground">{formatCurrency(currentAmount)}</p>
                      </div>
                      <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Sales Tax</p>
                        <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(taxCalculation.taxAmount)}
                        </p>
                      </div>
                      <div className="p-6 bg-primary/10 rounded-xl border border-primary/30 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Total Amount</p>
                        <p className="text-3xl font-bold text-primary">
                          {formatCurrency(taxCalculation.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-base">Enter an amount or select a device to see tax calculation</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LazyCustomStarsBackgroundWithSuspense>
    </>
  );
}
