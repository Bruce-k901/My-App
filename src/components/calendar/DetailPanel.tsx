'use client'

import type { CalendarEvent, DetailTab } from '@/types/calendar'
import { DetailOverview } from './DetailOverview'
import { DetailEventView } from './DetailEventView'
import { DetailHistory } from './DetailHistory'
import { SquaresFour, Info, ChatCircle, ClockCounterClockwise, ArrowsOutSimple, ArrowsInSimple } from '@phosphor-icons/react'

interface DetailPanelProps {
  activeTab: DetailTab
  selectedEvent: CalendarEvent | null
  isExpanded: boolean
  todayEvents: CalendarEvent[]
  onSetTab: (tab: DetailTab) => void
  onToggleExpand: () => void
  onOpenMessages: () => void
}

const TABS: { id: DetailTab; label: string; icon: typeof SquaresFour }[] = [
  { id: 'overview', label: 'Overview', icon: SquaresFour },
  { id: 'detail', label: 'Detail', icon: Info },
  { id: 'messages', label: 'Messages', icon: ChatCircle },
  { id: 'history', label: 'History', icon: ClockCounterClockwise },
]

export function DetailPanel({
  activeTab,
  selectedEvent,
  isExpanded,
  todayEvents,
  onSetTab,
  onToggleExpand,
  onOpenMessages,
}: DetailPanelProps) {
  return (
    <div
      className="border-t border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#101214] flex flex-col transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        minHeight: isExpanded ? '280px' : '200px',
        maxHeight: isExpanded ? '50vh' : '200px',
      }}
    >
      {/* Tab bar */}
      <div className="flex items-center px-4 lg:px-6 border-b border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === 'messages' ? onOpenMessages() : onSetTab(tab.id)}
              className={`
                flex items-center gap-1.5 py-2.5 px-2.5 lg:px-3.5 whitespace-nowrap
                text-[0.73rem] font-medium cursor-pointer
                border-b-2 -mb-px transition-all
                ${isActive
                  ? 'text-brand-cta border-brand-cta font-semibold'
                  : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}

        <div className="flex-1" />

        <button
          onClick={onToggleExpand}
          className="w-7 h-7 border border-gray-200 dark:border-white/10 rounded-[7px] bg-white dark:bg-white/[0.04] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.08] cursor-pointer transition-all"
        >
          {isExpanded ? <ArrowsInSimple size={12} /> : <ArrowsOutSimple size={12} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
        {activeTab === 'overview' && <DetailOverview todayEvents={todayEvents} />}
        {activeTab === 'detail' && selectedEvent && (
          <DetailEventView event={selectedEvent} onOpenMessages={onOpenMessages} />
        )}
        {activeTab === 'detail' && !selectedEvent && (
          <div className="text-[0.73rem] text-gray-400 dark:text-gray-500">
            Click an event to see details
          </div>
        )}
        {activeTab === 'history' && <DetailHistory />}
      </div>
    </div>
  )
}
