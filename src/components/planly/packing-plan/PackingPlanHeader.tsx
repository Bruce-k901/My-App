'use client';

import { useRef } from 'react';
import { RefreshCw, Printer, ArrowLeftRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format, addDays, subDays, isValid, parseISO } from 'date-fns';

interface PackingPlanHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  onPrint: () => void;
  transposed: boolean;
  onTranspose: () => void;
  orderCount: number;
  isLoading?: boolean;
}

// Safe date formatting helper
function safeFormatDate(dateString: string, formatStr: string): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    return dateString;
  } catch {
    return dateString;
  }
}

// Safe date navigation
function safeNavigateDate(dateString: string, days: number): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(days > 0 ? addDays(date, days) : subDays(date, Math.abs(days)), 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

export function PackingPlanHeader({
  selectedDate,
  onDateChange,
  onRefresh,
  onPrint,
  transposed,
  onTranspose,
  orderCount,
  isLoading,
}: PackingPlanHeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleCalendarClick = () => {
    // Open the native date picker
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Top row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packing Plan</h1>

        <div className="flex items-center gap-2">
          {/* Day Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(safeNavigateDate(selectedDate, -1))}
              className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 px-2"
              title="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Calendar button and date display */}
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalendarClick}
                className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded-r-none border-r-0"
                title="Open calendar"
              >
                <Calendar className="h-4 w-4 text-[#14B8A6]" />
              </Button>

              {/* Date display with day of week */}
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (newDate && !isNaN(new Date(newDate).getTime())) {
                      onDateChange(newDate);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div
                  onClick={handleCalendarClick}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-r-md bg-white dark:bg-white/[0.03] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {safeFormatDate(selectedDate, 'EEE, dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(safeNavigateDate(selectedDate, 1))}
              className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 px-2"
              title="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(format(new Date(), 'yyyy-MM-dd'))}
              className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 ml-1"
              title="Today"
            >
              Today
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button
          variant={transposed ? 'default' : 'outline'}
          size="sm"
          onClick={onTranspose}
          className={
            transposed
              ? 'bg-[#14B8A6] hover:bg-[#0D9488] text-white'
              : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
          }
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {transposed ? 'Customers as Rows' : 'Products as Rows'}
        </Button>

        <span className="text-sm text-gray-500 dark:text-white/60">
          {orderCount} {orderCount === 1 ? 'order' : 'orders'}
        </span>
      </div>
    </div>
  );
}
