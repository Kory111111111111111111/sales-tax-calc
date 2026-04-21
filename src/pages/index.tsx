import { useState, useMemo, useCallback } from "react";
import Head from "next/head";
import { Calculator, X, Check, ChevronsUpDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuroraText } from "@/components/ui/aurora-text";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  LazyCustomStarsBackgroundWithSuspense
} from "@/components/lazy-components";
import {
  getAllStates,
  getTaxRate,
  calculateSalesTax,
  formatCurrency,
  formatPercentage
} from "@/lib/tax-data";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STAR_LAYERS = [
  { count: 3000, size: 0.5, speedMultiplier: 0.5 },
  { count: 2000, size: 1, speedMultiplier: 1 },
  { count: 1200, size: 1.5, speedMultiplier: 1.5 },
  { count: 800, size: 2, speedMultiplier: 2 },
  { count: 400, size: 2.5, speedMultiplier: 2.5 },
  { count: 200, size: 3, speedMultiplier: 3 },
  { count: 100, size: 4, speedMultiplier: 4 },
];

export default function Home() {
  const { preferences, updatePreference } = useUserPreferences();

  const [selectedState, setSelectedState] = useState<string>(preferences.preferredState || "Maine");
  const [openStateCombobox, setOpenStateCombobox] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(true);

  // Memoize expensive calculations
  const stateOptions = useMemo(() => (
    getAllStates().map((state) => ({
      name: state,
      formattedRate: formatPercentage(getTaxRate(state))
    }))
  ), []);
  const taxRate = useMemo(() => getTaxRate(selectedState), [selectedState]);
  const selectedStateOption = useMemo(() => (
    stateOptions.find((option) => option.name === selectedState)
  ), [stateOptions, selectedState]);

  // Update state selection and save to preferences
  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
    updatePreference('preferredState', newState);
    setOpenStateCombobox(false);
  }, [updatePreference]);

  const currentAmount = useMemo((): number => parseFloat(amount) || 0, [amount]);

  const taxCalculation = useMemo(() => calculateSalesTax(currentAmount, taxRate), [currentAmount, taxRate]);

  const handleManualAmountChange = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const handleCloseBanner = useCallback(() => {
    setShowWarningBanner(false);
  }, []);

  return (
    <>
      <Head>
        <title>Sales Tax Calculator - Calculate US State Sales Tax</title>
        <meta name="description" content="Free sales tax calculator for US states. Enter any amount manually and calculate state sales tax with an instant breakdown." />
        <meta name="keywords" content="sales tax calculator, US tax calculator, state sales tax, manual tax calculator, tax calculation tool" />
        <meta name="author" content="Sales Tax Calculator" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <LazyCustomStarsBackgroundWithSuspense
        className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col"
        starColor="rgba(147, 197, 253, 0.6)"
        speed={60}
        factor={0.03}
        starLayers={STAR_LAYERS}
      >
        <div className="container mx-auto px-4 py-6 relative z-10 flex-grow">
          {/* Warning Banner */}
          {showWarningBanner && (
            <div className="mb-6 bg-[#4a0030]/85 border border-[#e20074]/60 text-white px-4 py-3 rounded-lg shadow-lg shadow-[#e20074]/20 relative backdrop-blur-md animate-fade-in text-left" style={{ verticalAlign: 'top' }}>
              <button
                onClick={handleCloseBanner}
                className="absolute top-2 right-2 p-1 hover:bg-[#e20074]/35 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e20074]/50"
                aria-label="Close warning banner"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <span className="text-xl">⚠️</span>
                <p className="text-center text-sm font-bold leading-relaxed">
                  <span className="font-bold block mb-1">Updated Notice</span>
                  This calculator has been simplified into a general-purpose sales tax tool. Enter any amount manually to get a fast state sales tax estimate.
                </p>
              </div>
            </div>
          )}

          {/* Main Header */}
          <div className="text-center mb-8">
            <AuroraText className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight tracking-tight">
              Sales Tax Calculator
            </AuroraText>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Calculate US state sales tax instantly. Enter an amount to get a fast, state-based tax breakdown.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl animate-scale-in card-interactive border border-white/10 bg-slate-900/50 backdrop-blur-xl">
              <CardHeader className="border-b border-white/5 pb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2 justify-center text-center">
                  <Calculator className="h-6 w-6 text-primary" />
                  Calculate Tax
                </h2>
                <CardDescription className="text-slate-400 text-base text-center">
                  Select your state and enter an amount to see the breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                  {/* State Selection and Amount Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-300">
                        State
                      </Label>
                      <Popover open={openStateCombobox} onOpenChange={setOpenStateCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openStateCombobox}
                            className="w-full justify-between bg-slate-950/50 border-white/10 text-slate-200 hover:bg-slate-800 hover:text-white h-11"
                          >
                            {selectedStateOption
                              ? `${selectedStateOption.name} (${selectedStateOption.formattedRate})`
                              : selectedState
                                ? `${selectedState} (${formatPercentage(taxRate)})`
                                : "Select state..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 bg-slate-900 border border-white/10 shadow-xl transform-gpu">
                          <Command className="bg-transparent text-slate-100">
                            <CommandInput placeholder="Search state..." className="h-11 placeholder:text-slate-500" />
                            <CommandList className="max-h-[min(45vh,320px)] sm:max-h-[min(50vh,360px)] lg:max-h-[min(55vh,400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                              <CommandEmpty>No state found.</CommandEmpty>
                              <CommandGroup>
                                {stateOptions.map(({ name: state, formattedRate }) => (
                                  <CommandItem
                                    key={state}
                                    value={state}
                                    onSelect={(currentValue) => {
                                      handleStateChange(currentValue)
                                    }}
                                    className="text-slate-200 aria-selected:bg-slate-800 aria-selected:text-white"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedState === state ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {state}
                                    <span className="ml-auto text-slate-500 text-xs">
                                      {formattedRate}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="amount-input" className="text-sm font-medium text-slate-300">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="amount-input"
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => handleManualAmountChange(e.target.value)}
                          className="pl-9 h-11 bg-slate-950/50 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:ring-primary/50"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-4">
                    {currentAmount > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-slate-950/30 rounded-xl border border-white/5">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Original Amount</p>
                          <p className="text-xl font-semibold text-slate-200">{formatCurrency(currentAmount)}</p>
                        </div>
                        <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                          <p className="text-xs text-orange-400/80 uppercase tracking-wider font-medium mb-1">Sales Tax</p>
                          <p className="text-xl font-semibold text-orange-400">
                            {formatCurrency(taxCalculation.taxAmount)}
                          </p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                          <p className="text-xs text-primary/80 uppercase tracking-wider font-medium mb-1">Total Amount</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(taxCalculation.totalAmount)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Calculator className="h-10 w-10 mx-auto mb-4 opacity-20" />
                        <p className="text-base">Enter an amount to see the tax calculation</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Footer */}
        <footer className="w-full py-6 mt-auto border-t border-white/5 bg-slate-950/30 backdrop-blur-sm relative z-10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-slate-600">
              Tax rates are estimates and may vary. Always verify with official sources.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Powered by{" "}
              <a
                href="https://wavfinaudio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-300 underline transition-colors"
              >
                WAVFin Audio
              </a>
            </p>
          </div>
        </footer>
      </LazyCustomStarsBackgroundWithSuspense>
    </>
  );
}

