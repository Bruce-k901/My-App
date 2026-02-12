'use client';

import { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Printer, Settings } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { format, addDays, subDays, isValid, parseISO } from 'date-fns';
import { PrintSettings } from './DeliveryNoteSheet';

interface DeliveryNotesHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPrint: () => void;
  onShowSettings: () => void;
  printSettings: PrintSettings;
  noteCount: number;
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

// Small button style class
const smallBtnClass = 'h-9 px-3 text-sm';

export function DeliveryNotesHeader({
  selectedDate,
  onDateChange,
  onPrint,
  onShowSettings,
  printSettings,
  noteCount,
  isLoading,
}: DeliveryNotesHeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleCalendarClick = () => {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.focus();
  };

  const paperSizeLabel = printSettings.paperSize === 'A4'
    ? 'A4 (4 per page)'
    : printSettings.paperSize === 'A5'
      ? 'A5 (2 per page)'
      : 'Custom';

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-theme-primary">Delivery Notes</h1>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Day Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            onClick={() => onDateChange(safeNavigateDate(selectedDate, -1))}
            className={`${smallBtnClass} border-theme text-theme-secondary hover:bg-theme-hover px-2`}
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Calendar button and date display */}
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={handleCalendarClick}
              className={`${smallBtnClass} border-theme text-theme-secondary hover:bg-theme-hover px-2 rounded-r-none border-r-0`}
              title="Open calendar"
            >
              <Calendar className="h-4 w-4 text-[#14B8A6]" />
            </Button>

            {/* Date display */}
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
                className="flex items-center gap-2 px-3 py-1.5 border border-theme rounded-r-md bg-theme-surface cursor-pointer hover:bg-theme-hover h-9"
              >
                <span className="text-sm font-medium text-theme-primary whitespace-nowrap">
                  {safeFormatDate(selectedDate, 'EEE, dd/MM/yyyy')}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => onDateChange(safeNavigateDate(selectedDate, 1))}
            className={`${smallBtnClass} border-theme text-theme-secondary hover:bg-theme-hover px-2`}
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={() => onDateChange(format(new Date(), 'yyyy-MM-dd'))}
            className={`${smallBtnClass} border-theme text-theme-secondary hover:bg-theme-hover ml-1`}
            title="Today"
          >
            Today
          </Button>
        </div>

        {/* Note count */}
        <span className="text-sm text-theme-tertiary mx-2">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </span>

        {/* Paper size indicator */}
        <div className="text-sm text-theme-tertiary px-2 py-1 bg-gray-100 dark:bg-white/5 rounded">
          {paperSizeLabel}
        </div>

        {/* Settings button */}
        <Button
          variant="outline"
          onClick={onShowSettings}
          className={`${smallBtnClass} border-theme text-theme-secondary hover:bg-theme-hover`}
          title="Print settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Print button */}
        <Button
          onClick={onPrint}
          disabled={isLoading || noteCount === 0}
          className={`${smallBtnClass} bg-[#14B8A6] hover:bg-[#0D9488] text-white`}
          title="Print delivery notes"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  );
}
