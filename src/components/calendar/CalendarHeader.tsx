'use client'

import { format } from 'date-fns'
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import type { CalendarViewMode } from '@/types/calendar'

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: CalendarViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (mode: CalendarViewMode) => void
  onAddEvent: () => void
}

const VIEW_MODES: CalendarViewMode[] = ['day', 'week', 'month']
const VIEW_LABELS: Record<CalendarViewMode, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

function getTitle(date: Date, viewMode: CalendarViewMode): string {
  switch (viewMode) {
    case 'day':
      return format(date, 'EEEE d MMMM')
    case 'week':
      return format(date, 'MMM yyyy')
    case 'month':
      return format(date, 'MMMM yyyy')
  }
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onAddEvent,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
      {/* Title */}
      <h1 className="text-base lg:text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {getTitle(currentDate, viewMode)}
      </h1>

      {/* Nav */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          className="w-[30px] h-[30px] rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 transition-all"
        >
          <CaretLeft size={14} />
        </button>
        <button
          onClick={onToday}
          className="py-1 px-3 rounded-[7px] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-[0.72rem] font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 transition-all"
        >
          Today
        </button>
        <button
          onClick={onNext}
          className="w-[30px] h-[30px] rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 transition-all"
        >
          <CaretRight size={14} />
        </button>
      </div>

      <div className="flex-1" />

      {/* View toggle */}
      <div className="hidden sm:flex bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-lg p-0.5 gap-0.5">
        {VIEW_MODES.map(mode => (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`
              py-1 px-2.5 rounded-[5px] text-[0.7rem] font-medium
              cursor-pointer transition-all
              ${mode === viewMode
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }
            `}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Add event */}
      <button
        onClick={onAddEvent}
        className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900 text-[0.72rem] font-semibold cursor-pointer hover:bg-gray-700 dark:hover:bg-white transition-colors"
      >
        <Plus size={12} />
        <span className="hidden sm:inline">Add event</span>
      </button>
    </div>
  )
}
