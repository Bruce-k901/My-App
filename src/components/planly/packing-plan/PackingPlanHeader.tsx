'use client';

import { RefreshCw, Printer, ArrowLeftRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { format, addDays, subDays } from 'date-fns';

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
              onClick={() => onDateChange(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
              className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 px-2"
              title="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#14B8A6]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
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
