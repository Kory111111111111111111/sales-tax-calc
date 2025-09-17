# Sales Tax Calculator - AI Coding Instructions

## Project Overview
A Next.js 15 sales tax calculator app that calculates US state sales tax for manually entered amounts or device catalog prices. Deployed as a static site to GitHub Pages. This webapp is used for an internal application for the users company, but is open source for anyone to use. All components use shadcn/ui with a New York style theme and default colors. 

## Architecture & Key Components

### Core Libraries & Framework
- **Next.js 15** with static export (`output: 'export'`) for GitHub Pages deployment
- **React 19** with TypeScript and strict mode enabled
- **Shadcn/ui** components (New York style) with Radix UI primitives
- **TailwindCSS 4** with CSS variables and neutral base color
- **Lucide React** icons throughout the UI

### Data Sources & Flow
1. **Tax Data**: Static rates in `src/lib/tax-data.ts` (STATE_TAX_RATES object)
2. **Device Data**: Dynamic loading from Google Sheets CSV via `src/lib/google-sheets.ts`
3. **Caching**: Client-side localStorage via `src/lib/cache.ts` with expiration times
4. **User Preferences**: Persisted state preferences (preferred state, theme) via `useUserPreferences` hook

### Critical Architecture Patterns

#### Device Data Loading
Device data follows a complex loading pattern in `src/lib/device-data.ts`:
- First attempts to load from localStorage cache (`getCachedDevices()`)
- Falls back to fetching from Google Sheets CSV URL
- Uses chunked processing (`processInChunks`) to avoid main thread blocking
- Supports both MSRP and prepaid pricing from specific CSV columns (B=phones, E=prices, I=prepaid)

#### Performance Optimizations
- **Lazy loading**: Heavy components wrapped with Suspense in `src/components/lazy-components.tsx`
- **Code splitting**: Next.js webpack config optimizes for static deployment
- **Caching layers**: Device data, search history, user preferences all cached locally
- **Search optimization**: Device search uses fuzzy matching with result limits

#### Component Structure
- **Pages Router**: Single page app at `src/pages/index.tsx`
- **UI Components**: Shadcn/ui components in `src/components/ui/`
- **Feature Components**: Device search, calculation history, popular devices
- **Custom Hooks**: Centralized state management for preferences, search, calculations

## Development Workflow

### Essential Commands
```bash
npm run dev          # Development server
npm run build        # Production build + static export to ./out
npm run lint         # ESLint check
npm run deploy       # Build + prepare for GitHub Pages
```

### GitHub Pages Deployment
- **Automatic**: Push to `master` branch triggers `.github/workflows/deploy.yml`
- **Static Export**: Next.js configured for static generation (`trailingSlash: true`, `images.unoptimized: true`)
- **Output Directory**: `./out` for GitHub Pages compatibility

## Project-Specific Conventions

### State Management Pattern
Use custom hooks for stateful logic:
- `useUserPreferences()` for app settings
- `useCalculationHistory()` for calculation tracking  
- `useCachedDeviceData()` for device data management
- All hooks include loading states and error handling

### Component Patterns
- **Lazy Components**: Wrap heavy components with Suspense fallbacks
- **Shadcn/ui**: Use consistent component styling with `cn()` utility from `src/lib/utils.ts`
- **Search Components**: Enhanced device search uses `cmdk` for command palette UX
- **Background Effects**: Stars background component for visual polish

### Error Handling & Fallbacks
- Google Sheets loading has multiple fallback layers (cache → retry → empty state)
- Device search gracefully handles empty results and loading states  
- Tax calculations handle edge cases (negative amounts, invalid states)

### File Organization
- `src/lib/`: Core business logic and utilities
- `src/hooks/`: Reusable state management hooks  
- `src/components/`: UI components (feature and ui subdirectories)
- `src/types/`: TypeScript type definitions

## Integration Points

### External Dependencies
- **Google Sheets**: CSV export URL for device catalog data
- **LocalStorage**: Client-side persistence for caching and preferences
- **GitHub Pages**: Static deployment target with specific Next.js config requirements



## Debugging & Troubleshooting

### Common Issues
- **Device loading failures**: Check Google Sheets URL accessibility and CSV format
- **Build failures**: Verify static export compatibility (no server-side features)
- **Cache inconsistencies**: Use browser dev tools to inspect localStorage entries

### Development Tips
- Use React DevTools for component state inspection
- Monitor network tab for Google Sheets CSV loading performance
- Check console for device processing logs and cache hit/miss information