import { lazy, Suspense } from 'react';

// Lazy load components that are not immediately visible
export const LazyCalculationHistory = lazy(() => import('@/components/calculation-history').then(module => ({ default: module.CalculationHistory })));
export const LazyEnhancedDeviceSearch = lazy(() => import('@/components/enhanced-device-search').then(module => ({ default: module.EnhancedDeviceSearch })));

// Wrapper components with suspense and fallbacks
export function LazyCalculationHistoryWithSuspense(props: React.ComponentProps<typeof LazyCalculationHistory>) {
  return (
    <Suspense fallback={<div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />}>
      <LazyCalculationHistory {...props} />
    </Suspense>
  );
}

export function LazyEnhancedDeviceSearchWithSuspense(props: React.ComponentProps<typeof LazyEnhancedDeviceSearch>) {
  return (
    <Suspense fallback={<div className="h-9 w-full bg-gray-200 animate-pulse rounded" />}>
      <LazyEnhancedDeviceSearch {...props} />
    </Suspense>
  );
}