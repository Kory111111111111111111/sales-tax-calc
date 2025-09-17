"use client"

import { useState } from "react"
import { History, Download, Trash2, Calendar, Calculator, MapPin, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCurrency, formatPercentage } from "@/lib/tax-data"
import { useCalculationHistory } from "@/hooks/useCalculationHistory"
import { CalculationHistoryItem } from "@/types/features"

interface CalculationHistoryProps {
  onSelectCalculation?: (calculation: CalculationHistoryItem) => void
}

function CalculationCard({ 
  calculation, 
  onSelect, 
  onRemove 
}: { 
  calculation: CalculationHistoryItem
  onSelect?: (calculation: CalculationHistoryItem) => void
  onRemove?: (id: string) => void
}) {
  const date = new Date(calculation.timestamp);
  const isDevice = !!calculation.device;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(calculation)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            {isDevice ? (
              <Smartphone className="h-4 w-4 text-blue-600" />
            ) : (
              <Calculator className="h-4 w-4 text-green-600" />
            )}
            <span className="font-medium text-sm">
              {isDevice ? calculation.device!.name : 'Manual Amount'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(calculation.id);
            }}
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{calculation.state} ({formatPercentage(calculation.taxRate)})</span>
            <Calendar className="h-3 w-3 ml-2" />
            <span>{date.toLocaleDateString()}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <p className="text-muted-foreground">Original</p>
              <p className="font-medium">{formatCurrency(calculation.originalAmount)}</p>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-950 rounded">
              <p className="text-muted-foreground">Tax</p>
              <p className="font-medium text-orange-600">{formatCurrency(calculation.taxAmount)}</p>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium text-blue-600">{formatCurrency(calculation.totalAmount)}</p>
            </div>
          </div>

          {isDevice && calculation.device!.isPrepaid && (
            <Badge variant="secondary" className="text-xs">Prepaid Price</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CalculationHistory({ onSelectCalculation }: CalculationHistoryProps) {
  const [open, setOpen] = useState(false);
  const { history, isLoading, removeCalculation, clearHistory, exportHistory } = useCalculationHistory();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <History className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          History ({history.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Calculation History
          </DialogTitle>
          <DialogDescription>
            Your recent tax calculations. Click on any calculation to reuse it.
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No calculations yet</h3>
            <p className="text-sm">Your calculation history will appear here</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {history.length} calculation{history.length !== 1 ? 's' : ''} saved
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportHistory}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
              {history.map((calculation) => (
                <CalculationCard
                  key={calculation.id}
                  calculation={calculation}
                  onSelect={(calc) => {
                    onSelectCalculation?.(calc);
                    setOpen(false);
                  }}
                  onRemove={removeCalculation}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}