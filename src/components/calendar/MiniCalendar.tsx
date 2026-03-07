'use client'

import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  datesWithEvents: Set<string>
}

const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MiniCalendar({ selectedDate, onSelectDate, datesWithEvents }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="px-4 pt-5 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.82rem] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setViewMonth(prev => subMonths(prev, 1))}
            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
          >
            <CaretLeft size={12} />
          </button>
          <button
            onClick={() => setViewMonth(prev => addMonths(prev, 1))}
            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
          >
            <CaretRight size={12} />
          </button>
        </div>
      </div>

      {/* Day of week labels */}
      <div className="grid grid-cols-7 gap-px">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="text-[0.58rem] font-semibold text-gray-400 dark:text-gray-500 text-center pb-1.5 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map(day => {
          const inMonth = isSameMonth(day, viewMonth)
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate) && !today
          const hasEvent = datesWithEvents.has(format(day, 'yyyy-MM-dd'))

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`
                relative aspect-square flex items-center justify-center
                text-[0.72rem] rounded-full cursor-pointer transition-all
                ${!inMonth ? 'text-gray-400 dark:text-gray-600 opacity-50' : ''}
                ${inMonth && !today && !selected ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10' : ''}
                ${today ? 'bg-checkly-mid text-white font-semibold' : ''}
                ${selected ? 'bg-checkly-mid/[0.12] dark:bg-checkly/[0.12] text-checkly-mid dark:text-checkly font-semibold' : ''}
              `}
            >
              {format(day, 'd')}
              {hasEvent && !today && (
                <span className="absolute bottom-px left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-checkly-mid dark:bg-checkly" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
