'use client';

import { AlertCircle } from '@/components/ui/icons';

interface WeekSummaryPanelProps {
  weekDates: Date[];
  cells: Record<string, number>;
  prices: Record<string, number>;
  calculateDayTotal: (date: Date) => { quantity: number; value: number };
  calculateGrandTotal: () => { quantity: number; value: number; days: number };
  isDirty: boolean;
}

export function WeekSummaryPanel({
  calculateGrandTotal,
  isDirty,
}: WeekSummaryPanelProps) {
  const grandTotal = calculateGrandTotal();

  return (
    <div className="flex items-center justify-between text-sm px-2">
      <span className="text-theme-tertiary">
        {grandTotal.quantity} items across {grandTotal.days} days
      </span>
      <div className="flex items-center gap-4">
        {isDirty && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Unsaved</span>
          </div>
        )}
        <span className="font-semibold text-theme-primary">
          Total: £{grandTotal.value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
