'use client';

import { format, addWeeks, subWeeks, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';

interface WeekSelectorProps {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
}

export function WeekSelector({ weekStart, onWeekChange }: WeekSelectorProps) {
  const weekEnd = addDays(weekStart, 6);

  const handlePrevWeek = () => {
    onWeekChange(subWeeks(weekStart, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(weekStart, 1));
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handlePrevWeek}
        className="h-10 w-10 p-0 bg-gray-50 dark:bg-white/[0.03] border-theme hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      >
        <ChevronLeft className="h-4 w-4 text-theme-secondary" />
      </Button>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg min-w-[200px] justify-center">
        <Calendar className="h-4 w-4 text-[#14B8A6]" />
        <span className="text-theme-primary font-medium">
          {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
        </span>
      </div>

      <Button
        variant="outline"
        onClick={handleNextWeek}
        className="h-10 w-10 p-0 bg-gray-50 dark:bg-white/[0.03] border-theme hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      >
        <ChevronRight className="h-4 w-4 text-theme-secondary" />
      </Button>
    </div>
  );
}
