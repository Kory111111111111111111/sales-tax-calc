import { useState, useEffect } from "react";
import { Calculator, Smartphone, MapPin, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeviceSearch } from "@/components/device-search";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Sales Tax Calculator
              </h1>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <Badge variant="outline" className="text-sm">50 US States</Badge>
              <Badge variant="outline" className="text-sm">Real-time Calculation</Badge>
              <Badge variant="outline" className="text-sm">Device Catalog</Badge>
              {isLoadingDevices && (
                <Badge variant="secondary" className="text-sm">Loading Devices...</Badge>
              )}
              {deviceLoadError && (
                <Badge variant="destructive" className="text-sm">Google Sheets Error</Badge>
              )}
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Popular Devices */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    <CardTitle>Popular Devices</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshDevices}
                    disabled={isLoadingDevices}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  Quick select from popular mobile devices
                  {isLoadingDevices && " (Loading...)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {popularDevices.map((device) => (
                  <div
                    key={device.name}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                      selectedDevice === device.name
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md"
                        : "border-border hover:border-blue-300"
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {device.data.displayName || device.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs font-bold">
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
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Use the search above to find more devices
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Calculator */}
          <div className="xl:col-span-2 order-1 xl:order-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-card dark:bg-card border-b border-border">
                <CardTitle className="text-xl">Tax Calculator</CardTitle>
                <CardDescription>
                  Enter an amount or select a device to calculate sales tax
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* State Selection */}
                <div className="space-y-2">
                  <Label htmlFor="state-select" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Select State
                  </Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state-select">
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
                <div className="space-y-2">
                  <Label htmlFor="amount-input">Amount</Label>
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
                      className="pl-8"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {useDevicePrice && selectedDevice && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Price from: {getDeviceData(selectedDevice)?.displayName || selectedDevice}</span>
                      {getDeviceData(selectedDevice)?.prepaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrepaidToggle}
                          className="h-6 text-xs"
                        >
                          {usePrepaidPrice ? "Switch to MSRP" : "Use Prepaid Price"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Device Search */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
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
                  <div className="space-y-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 p-6 rounded-xl border">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      Tax Calculation
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Original Amount</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(currentAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Sales Tax ({formatPercentage(taxRate)})
                        </p>
                        <p className="text-3xl font-bold text-orange-600">
                          {formatCurrency(taxCalculation.taxAmount)}
                        </p>
                      </div>
                      
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-md">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Amount</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(taxCalculation.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Tax rate for <span className="font-medium">{selectedState}</span>: {formatPercentage(taxRate)}
                        {taxRate === 0 && " (No state sales tax)"}
                      </p>
                    </div>
                  </div>
                )}

                {currentAmount === 0 && (
                  <div className="text-center p-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <Calculator className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium mb-2">Ready to Calculate</h3>
                    <p className="text-sm">Enter an amount or select a device to calculate sales tax</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Sales tax rates are state-level only and do not include local taxes. 
              Rates are current as of 2024 and may be subject to change.
            </p>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
              <span>🏛️ Official State Rates</span>
              <span>📱 Latest Device Prices</span>
              <span>⚡ Instant Calculations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
