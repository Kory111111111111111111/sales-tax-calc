import { lazy, Suspense, type ReactNode } from 'react';

// Lazy load heavy components that are not immediately visible
export const LazyCalculationHistory = lazy(() => import('@/components/calculation-history').then(module => ({ default: module.CalculationHistory })));
export const LazyCustomStarsBackground = lazy(() => import('@/components/custom-stars-background').then(module => ({ default: module.CustomStarsBackground })));

// Wrapper components with suspense and fallbacks
export function LazyCalculationHistoryWithSuspense(props: React.ComponentProps<typeof LazyCalculationHistory>) {
  return (
    <Suspense fallback={<div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />}>
      <LazyCalculationHistory {...props} />
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