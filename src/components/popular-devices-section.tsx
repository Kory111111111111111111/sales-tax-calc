import { useState, useEffect } from "react";
import { Smartphone, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeviceSkeletonList } from "@/components/device-skeleton";
import { toast } from "sonner";
import { 
  getPopularDevices, 
  initializeDeviceData,
  refreshDeviceData,
  getLoadingStatus,
  type Device 
} from "@/lib/device-data";
import { formatCurrency } from "@/lib/tax-data";

interface PopularDevicesSectionProps {
  selectedDevice: string;
  onDeviceSelect: (device: Device) => void;
}

export function PopularDevicesSection({ selectedDevice, onDeviceSelect }: PopularDevicesSectionProps) {
  const [popularDevices, setPopularDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [deviceLoadError, setDeviceLoadError] = useState<string>("");
  const [isRefreshAnimating, setIsRefreshAnimating] = useState<boolean>(false);

  // Load device data on component mount (deferred)
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setIsLoadingDevices(true);
        setDeviceLoadError("");
        
        console.log('🔄 Starting device data initialization...');
        
        // Use setTimeout to defer this heavy operation
        await new Promise(resolve => setTimeout(resolve, 100));
        await initializeDeviceData();
        
        const status = getLoadingStatus();
        console.log(`📊 Final status: ${status.deviceCount} devices loaded`);
        
        setPopularDevices(getPopularDevices(4));
        
        if (status.deviceCount === 0) {
          setDeviceLoadError("No devices loaded from Google Sheets");
        } else {
          toast.success(`Loaded ${status.deviceCount} devices successfully`);
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

    // Defer the loading to not block the main thread
    const timeoutId = setTimeout(loadDevices, 50);
    return () => clearTimeout(timeoutId);
  }, []);

  // Refresh device data function
  const handleRefreshDevices = async () => {
    try {
      // Trigger animation
      setIsRefreshAnimating(true);
      setTimeout(() => setIsRefreshAnimating(false), 2000);
      
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

  return (
    <Card className="h-fit animate-scale-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600 animate-bounce-subtle" />
            <CardTitle className="text-base">Popular Devices</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshDevices}
            disabled={isLoadingDevices}
            className="h-6 w-6 p-0 transition-all duration-200 ease-out hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-950 transform-gpu"
            title="Refresh device prices"
          >
            <RefreshCw className={`h-3 w-3 transition-transform duration-500 ease-out ${isLoadingDevices || isRefreshAnimating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs animate-fade-in">
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
            className={`p-3 rounded-lg border cursor-pointer transition-none transform-gpu will-change-transform touch-action-manipulation select-none active:scale-98 active:transition-none hover:transition-all hover:duration-75 ${
              selectedDevice === device.name
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-sm"
                : "border-border hover:border-blue-300 hover:shadow-sm"
            }`}
            onClick={() => onDeviceSelect(device)}
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
  );
}