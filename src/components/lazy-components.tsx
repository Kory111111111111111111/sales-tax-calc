import { lazy, Suspense, type ReactNode } from 'react';

// Lazy load heavy components that are not immediately visible
export const LazyCalculationHistory = lazy(() => import('@/components/calculation-history').then(module => ({ default: module.CalculationHistory })));
export const LazyEnhancedDeviceSearch = lazy(() => import('@/components/enhanced-device-search').then(module => ({ default: module.EnhancedDeviceSearch })));
export const LazyCustomStarsBackground = lazy(() => import('@/components/custom-stars-background').then(module => ({ default: module.CustomStarsBackground })));

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
    <Suspense fallback={
      <div className="animate-pulse border rounded-lg p-3 bg-muted/20">
        <div className="h-9 bg-muted/40 rounded"></div>
      </div>
    }>
      <LazyEnhancedDeviceSearch {...props} />
    </Suspense>
  );
}

export function LazyCustomStarsBackgroundWithSuspense({ children, ...props }: { children: ReactNode } & Record<string, unknown>) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {children}
      </div>
    }>
      <LazyCustomStarsBackground {...props}>
        {children}
      </LazyCustomStarsBackground>
    </Suspense>
  );
}