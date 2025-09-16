import { useState, useEffect } from "react";
import { Calculator, Smartphone, MapPin, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuroraText } from "@/components/ui/aurora-text";
import { DeviceSearch } from "@/components/device-search";
import { CustomStarsBackground } from "@/components/custom-stars-background";
import { 
  getAllStates, 
  getTaxRate, 
  calculateSalesTax, 
  formatCurrency, 
  formatPercentage 
} from "@/lib/tax-data";
import { 
  getPopularDevices, 
  getDeviceData, 
  initializeDeviceData,
  refreshDeviceData,
  getLoadingStatus,
  type Device 
} from "@/lib/device-data";

export default function Home() {
  const [selectedState, setSelectedState] = useState<string>("Maine");
  const [amount, setAmount] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [useDevicePrice, setUseDevicePrice] = useState<boolean>(false);
  const [usePrepaidPrice, setUsePrepaidPrice] = useState<boolean>(false);
  const [popularDevices, setPopularDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [deviceLoadError, setDeviceLoadError] = useState<string>("");

  const states = getAllStates();
  const taxRate = getTaxRate(selectedState);

  // Load device data on component mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setIsLoadingDevices(true);
        setDeviceLoadError("");
        
        console.log('🔄 Starting device data initialization...');
        await initializeDeviceData();
        
        const status = getLoadingStatus();
        console.log(`📊 Final status: ${status.deviceCount} devices loaded`);
        
        setPopularDevices(getPopularDevices(4));
        
        if (status.deviceCount === 0) {
          setDeviceLoadError("No devices loaded from Google Sheets");
        }
        
      } catch (error) {
        console.error('❌ Error loading device data:', error);
        setDeviceLoadError("Failed to load device data");
        // Still try to load popular devices with whatever we have
        setPopularDevices(getPopularDevices(4));
      } finally {
        setIsLoadingDevices(false);
      }
    };

    loadDevices();
  }, []);

  // Refresh device data function
  const handleRefreshDevices = async () => {
    try {
      setIsLoadingDevices(true);
      setDeviceLoadError("");
      
      await refreshDeviceData();
      setPopularDevices(getPopularDevices(4));
      
      const status = getLoadingStatus();
      console.log(`Refreshed ${status.deviceCount} devices`);
      
    } catch (error) {
      console.error('Error refreshing device data:', error);
      setDeviceLoadError("Failed to refresh device data");
    } finally {
      setIsLoadingDevices(false);
    }
  };

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
    <CustomStarsBackground 
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
      <div className="container mx-auto px-4 py-4 relative z-10">
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
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">50 US States</Badge>
              <Badge variant="outline" className="text-xs">Real-time Calculation</Badge>
              <Badge variant="outline" className="text-xs">Device Catalog</Badge>
              {isLoadingDevices && (
                <Badge variant="secondary" className="text-xs">Loading Devices...</Badge>
              )}
              {deviceLoadError && (
                <Badge variant="destructive" className="text-xs">Google Sheets Error</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* Popular Devices */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-base">Popular Devices</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshDevices}
                    disabled={isLoadingDevices}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Quick select from popular mobile devices
                  {isLoadingDevices && " (Loading...)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {popularDevices.map((device) => (
                  <div
                    key={device.name}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                      selectedDevice === device.name
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md"
                        : "border-border hover:border-blue-300"
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-xs leading-tight">
                        {device.data.displayName || device.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs font-bold px-1 py-0">
                        {formatCurrency(device.data.msrp)}
                      </Badge>
                    </div>
                    {device.data.prepaid && (
                      <p className="text-xs text-muted-foreground">
                        Prepaid: {formatCurrency(device.data.prepaid)}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Calculator */}
          <div className="xl:col-span-2 order-1 xl:order-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-card dark:bg-card border-b border-border pb-3">
                <CardTitle className="text-lg">Tax Calculator</CardTitle>
                <CardDescription className="text-sm">
                  Enter an amount or select a device to calculate sales tax
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {/* State Selection */}
                <div className="space-y-1">
                  <Label htmlFor="state-select" className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3 w-3" />
                    Select State
                  </Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state-select" className="h-9">
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

                {/* Amount Input */}
                <div className="space-y-1">
                  <Label htmlFor="amount-input" className="text-sm">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amount-input"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => handleManualAmountChange(e.target.value)}
                      className="pl-8 h-9"
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

                {/* Device Search */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm">
                    <Search className="h-3 w-3" />
                    Search All Devices
                  </Label>
                  <DeviceSearch
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
                  <div className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 p-4 rounded-xl border">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      Tax Calculation
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Original Amount</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(currentAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Sales Tax ({formatPercentage(taxRate)})
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(taxCalculation.taxAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(taxCalculation.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Tax rate for <span className="font-medium">{selectedState}</span>: {formatPercentage(taxRate)}
                        {taxRate === 0 && " (No state sales tax)"}
                      </p>
                    </div>
                  </div>
                )}

                {currentAmount === 0 && (
                  <div className="text-center p-8 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl">
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
    </CustomStarsBackground>
  );
}
