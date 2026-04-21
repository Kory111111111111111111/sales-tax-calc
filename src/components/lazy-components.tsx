import { lazy, Suspense, type ReactNode } from 'react';

export const LazyCustomStarsBackground = lazy(() => import('@/components/custom-stars-background').then(module => ({ default: module.CustomStarsBackground })));

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