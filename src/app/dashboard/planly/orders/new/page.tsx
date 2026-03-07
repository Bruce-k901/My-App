'use client';

import { useState, useEffect } from 'react';
import { startOfWeek, addWeeks, addDays } from 'date-fns';
import { Loader2, Save } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/context/AppContext';
import { CustomerSelector } from '@/components/planly/orders/CustomerSelector';
import { WeekSelector } from '@/components/planly/quick-entry/WeekSelector';
import { QuickEntryGrid } from '@/components/planly/quick-entry/QuickEntryGrid';
import { QuickActions } from '@/components/planly/quick-entry/QuickActions';
import { WeekSummaryPanel } from '@/components/planly/quick-entry/WeekSummaryPanel';
import { useQuickEntryGrid } from '@/hooks/planly/useQuickEntryGrid';
import { useBatchCreateOrders } from '@/hooks/planly/useBatchCreateOrders';
import { toast } from 'sonner';

function getDefaultWeekStart(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // If Thursday-Sunday, default to next week; otherwise current week
  if (dayOfWeek >= 4 || dayOfWeek === 0) {
    return startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
  }
  return startOfWeek(today, { weekStartsOn: 1 });
}

export default function NewOrderPage() {
  const { siteId } = useAppContext();
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  // Set initial week on client side to avoid hydration mismatch
  useEffect(() => {
    setWeekStart(getDefaultWeekStart());
  }, []);

  const {
    customerId,
    customerName,
    products,
    cells,
    prices,
    shipStates,
    isDirty,
    isLoading: isLoadingProducts,
    setCustomer,
    updateCell,
    copyLastWeek,
    copyDownColumn,
    copyAcrossRow,
    clearAll,
    markSaved,
    getWeekDates,
    calculateRowTotal,
    calculateDayTotal,
    calculateGrandTotal,
  } = useQuickEntryGrid(siteId, weekStart);

  const { saveWeek, isLoading: isSaving } = useBatchCreateOrders();

  const weekDates = weekStart ? getWeekDates() : [];

  const handleSave = async () => {
    if (!customerId || !siteId || !weekStart) return;

    const result = await saveWeek({
      customerId,
      siteId,
      weekStart,
      cells,
      prices,
      shipStates,
      products,
    });

    if (result) {
      markSaved();
      toast.success(`Saved ${result.created + result.updated} orders for the week`);
    }
  };

  const handleCustomerChange = (id: string, name: string) => {
    setCustomer(id, name);
  };

  if (!siteId) {
    return (
      <div className="container mx-auto py-6 text-center text-theme-tertiary">
        Please select a site
      </div>
    );
  }

  if (!weekStart) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-module-fg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-64 relative z-[100]">
            <CustomerSelector
              siteId={siteId}
              value={customerId}
              onChange={handleCustomerChange}
            />
          </div>
          <WeekSelector
            weekStart={weekStart}
            onWeekChange={setWeekStart}
          />
          <QuickActions
            onCopyLastWeek={copyLastWeek}
            onCopyDownColumn={copyDownColumn}
            onCopyAcrossRow={copyAcrossRow}
            onClearAll={clearAll}
            disabled={!customerId || products.length === 0}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving || !customerId}
          size="sm"
          className="bg-module-fg hover:bg-module-fg/90 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Week
            </>
          )}
        </Button>
      </div>

      {/* Grid */}
      {!customerId ? (
        <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] p-8 text-center">
          <p className="text-theme-tertiary">
            Select a customer to start entering orders
          </p>
        </div>
      ) : isLoadingProducts ? (
        <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-module-fg" />
          <span className="ml-2 text-sm text-theme-tertiary">Loading products...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-theme-tertiary">
            No products available. Please add products first.
          </p>
        </div>
      ) : (
        <>
          <QuickEntryGrid
            products={products}
            weekDates={weekDates}
            cells={cells}
            prices={prices}
            onCellUpdate={updateCell}
            calculateRowTotal={calculateRowTotal}
          />
          {/* Summary */}
          <WeekSummaryPanel
            weekDates={weekDates}
            cells={cells}
            prices={prices}
            calculateDayTotal={calculateDayTotal}
            calculateGrandTotal={calculateGrandTotal}
            isDirty={isDirty}
          />
        </>
      )}
    </div>
  );
}
