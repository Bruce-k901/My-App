'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, ArrowDown, Trash2, ChevronDown } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onCopyLastWeek: () => void;
  onCopyDownColumn: (dayIndex: number) => void;
  onCopyAcrossRow: (productId: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onCopyLastWeek,
  onCopyDownColumn,
  onCopyAcrossRow,
  onClearAll,
  disabled,
}: QuickActionsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleFillDay = (dayIndex: number) => {
    onCopyDownColumn(dayIndex);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={onCopyLastWeek}
        disabled={disabled}
        className="bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      >
        <Copy className="h-4 w-4 mr-2" />
        Copy Last Week
      </Button>

      <div ref={dropdownRef} className="relative">
        <Button
          variant="outline"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className={cn(
            'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]',
            isDropdownOpen && 'ring-2 ring-[#14B8A6]/50'
          )}
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Fill Column
          <ChevronDown className={cn(
            'h-4 w-4 ml-2 transition-transform',
            isDropdownOpen && 'rotate-180'
          )} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute z-[150] mt-1 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl overflow-hidden">
            {dayNames.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => handleFillDay(index)}
                className="w-full px-4 py-2 text-left text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
              >
                Fill {day} column
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        onClick={onClearAll}
        disabled={disabled}
        className="bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear All
      </Button>
    </div>
  );
}
