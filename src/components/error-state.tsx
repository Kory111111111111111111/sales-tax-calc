import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  isOffline?: boolean;
  showNetworkStatus?: boolean;
}

export function ErrorState({ error, onRetry, isOffline = false, showNetworkStatus = true }: ErrorStateProps) {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-4 w-4" />
          {isOffline ? 'Offline Mode' : 'Loading Error'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          <div className="space-y-2">
            <p>{error}</p>

            {showNetworkStatus && (
              <div className="flex items-center gap-2 text-sm">
                {isOffline ? (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>You&apos;re currently offline</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Network connection detected</span>
                  </>
                )}
              </div>
            )}

            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </div>
        </CardDescription>
      </CardContent>
    </Card>
  );
}