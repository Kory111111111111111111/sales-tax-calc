import { useState, useEffect } from "react";
import { Calculator, Smartphone, MapPin, Search, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuroraText } from "@/components/ui/aurora-text";
import { EnhancedDeviceSearch } from "@/components/enhanced-device-search";
import { CustomStarsBackground } from "@/components/custom-stars-background";
import { DeviceSkeletonList } from "@/components/device-skeleton";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { toast } from "sonner";
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
  const { preferences, updatePreference } = useUserPreferences();
  
  const [selectedState, setSelectedState] = useState<string>(preferences.preferredState || "Maine");
  const [amount, setAmount] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [useDevicePrice, setUseDevicePrice] = useState<boolean>(false);
  const [usePrepaidPrice, setUsePrepaidPrice] = useState<boolean>(false);
  const [popularDevices, setPopularDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [deviceLoadError, setDeviceLoadError] = useState<string>("");
  const [isRefreshAnimating, setIsRefreshAnimating] = useState<boolean>(false);

  // Update state selection and save to preferences
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    updatePreference('preferredState', newState);
  };

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
          toast.error("Failed to load device data from Google Sheets");
        } else {
          toast.success(`Loaded ${status.deviceCount} devices successfully`);
        }
        
      } catch (error) {
        console.error('❌ Error loading device data:', error);
        setDeviceLoadError("Failed to load device data");
        toast.error("Failed to load device data", {
          description: "Please check your internet connection and try again",
          action: {
            label: "Retry",
            onClick: () => loadDevices(),
          },
        });
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
      // Trigger animation
      setIsRefreshAnimating(true);
      setTimeout(() => setIsRefreshAnimating(false), 2000); // Stop animation after 2 seconds
      
      setIsLoadingDevices(true);
      setDeviceLoadError("");
      
      toast.loading("Refreshing device data...", { id: "refresh-devices" });
      
      await refreshDeviceData();
      setPopularDevices(getPopularDevices(4));
      
      const status = getLoadingStatus();
      console.log(`Refreshed ${status.deviceCount} devices`);
      
      if (status.deviceCount > 0) {
        toast.success(`Successfully refreshed ${status.deviceCount} devices with latest prices`, { 
          id: "refresh-devices" 
        });
      } else {
        toast.error("No devices found after refresh", { id: "refresh-devices" });
        setDeviceLoadError("Failed to refresh device data");
      }
      
    } catch (error) {
      console.error('Error refreshing device data:', error);
      setDeviceLoadError("Failed to refresh device data");
      toast.error("Failed to refresh device data. Please try again.", { 
        id: "refresh-devices" 
      });
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
      <div className="container mx-auto px-4 py-4 relative z-10 min-h-screen overflow-y-auto">
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
                    className="h-6 w-6 p-0 transition-all duration-200 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-950"
                    title="Refresh device prices"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingDevices || isRefreshAnimating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Quick select from popular mobile devices
                  {isLoadingDevices && " (Refreshing prices...)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {isLoadingDevices ? (
                  <DeviceSkeletonList count={4} />
                ) : deviceLoadError ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm mb-3">{deviceLoadError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefreshDevices}
                      disabled={isLoadingDevices}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                      Retry
                    </Button>
                  </div>
                ) : popularDevices.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No devices available</p>
                  </div>
                ) : (
                  popularDevices.map((device) => (
                  <div
                    key={device.name}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] animate-in fade-in-0 slide-in-from-bottom-2 ${
                      selectedDevice === device.name
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md"
                        : "border-border hover:border-blue-300"
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1 sm:gap-0">
                      <h4 className="font-medium text-xs leading-tight flex-1">
                        {device.data.displayName || device.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs font-bold px-2 py-1 self-start sm:self-auto">
                        {formatCurrency(device.data.msrp)}
                      </Badge>
                    </div>
                    {device.data.prepaid && (
                      <p className="text-xs text-muted-foreground">
                        Prepaid: {formatCurrency(device.data.prepaid)}
                      </p>
                    )}
                  </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Calculator */}
          <div className="lg:col-span-2 order-1 lg:order-2">
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

                {/* Amount Input */}
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
                  <div className="space-y-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 p-4 rounded-xl border">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      Tax Calculation
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
