'use client'

import type { CalendarEventType } from '@/types/calendar'
import { EVENT_TYPE_LABELS, EVENT_TYPE_MODULE } from '@/types/calendar'
import { MODULE_HEX } from '@/config/module-colors'

const EVENT_TYPES: CalendarEventType[] = ['compliance', 'delivery', 'task', 'message', 'leave']

interface FilterBarProps {
  activeFilters: CalendarEventType[]
  onToggleFilter: (type: CalendarEventType) => void
}

export function FilterBar({ activeFilters, onToggleFilter }: FilterBarProps) {
  return (
    <div className="flex gap-1.5 items-center pb-3 whitespace-nowrap">
      {EVENT_TYPES.map(type => {
        const isActive = activeFilters.includes(type)
        const module = EVENT_TYPE_MODULE[type]
        const midHex = MODULE_HEX[module].mid

        return (
          <button
            key={type}
            onClick={() => onToggleFilter(type)}
            className={`
              flex items-center gap-1.5 py-1 px-2.5 rounded-full
              text-[0.7rem] font-medium cursor-pointer
              border-[1.5px] transition-all duration-150
              ${isActive
                ? 'bg-white dark:bg-white/10 shadow-sm border-current'
                : 'bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10'
              }
            `}
            style={isActive ? { color: midHex, borderColor: midHex } : undefined}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: midHex }}
            />
            {EVENT_TYPE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
