'use client'

import { useMemo } from 'react'
import { Users, ClipboardText, Truck } from '@phosphor-icons/react'
import { MODULE_HEX } from '@/config/module-colors'
import type { CalendarEvent } from '@/types/calendar'

interface OverviewCardProps {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  items: { label: string; time: string; dotColor: string }[]
  onClick?: () => void
}

function OverviewCard({ icon, label, color, bgColor, items, onClick }: OverviewCardProps) {
  return (
    <div
      className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3.5 cursor-pointer transition-all duration-150 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-sm hover:-translate-y-px"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </div>
        <span
          className="text-[0.68rem] font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {items.length === 0 && (
          <div className="text-[0.65rem] text-gray-400 dark:text-gray-500">
            Nothing scheduled
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[0.72rem] text-gray-600 dark:text-gray-300">
            <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: item.dotColor }} />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="text-[0.65rem] text-gray-400 dark:text-gray-500">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function statusDotColor(status?: string): string {
  switch (status) {
    case 'confirmed':
    case 'complete':
      return '#10B981'
    case 'pending':
      return '#F59E0B'
    case 'overdue':
      return '#EF4444'
    default:
      return '#6B7280'
  }
}

interface DetailOverviewProps {
  todayEvents: CalendarEvent[]
}

export function DetailOverview({ todayEvents }: DetailOverviewProps) {
  const teamlyMid = MODULE_HEX.teamly.mid
  const checklyMid = MODULE_HEX.checkly.mid
  const stocklyMid = MODULE_HEX.stockly.mid

  const shifts = useMemo(() => {
    const items: { label: string; time: string; dotColor: string }[] = []
    for (const e of todayEvents.filter(ev => ev.type === 'shift')) {
      if (e.children && e.children.length > 0) {
        // Show individual staff members
        for (const child of e.children) {
          items.push({
            label: child.title,
            time: child.time || e.startTime || 'All day',
            dotColor: statusDotColor(child.status || e.status),
          })
        }
      } else {
        // Open shifts or no children
        items.push({
          label: e.title,
          time: e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : 'All day',
          dotColor: statusDotColor(e.status),
        })
      }
    }
    return items
  }, [todayEvents])

  const checks = useMemo(() =>
    todayEvents
      .filter(e => e.type === 'compliance')
      .map(e => ({
        label: e.title,
        time: e.startTime || 'Due',
        dotColor: statusDotColor(e.status),
      })),
    [todayEvents]
  )

  const deliveries = useMemo(() =>
    todayEvents
      .filter(e => e.type === 'delivery')
      .map(e => ({
        label: e.title,
        time: e.startTime || 'TBC',
        dotColor: statusDotColor(e.status),
      })),
    [todayEvents]
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <OverviewCard
        icon={<Users size={13} style={{ color: teamlyMid }} />}
        label="Shifts today"
        color={teamlyMid}
        bgColor={`${teamlyMid}14`}
        items={shifts}
      />
      <OverviewCard
        icon={<ClipboardText size={13} style={{ color: checklyMid }} />}
        label="Compliance"
        color={checklyMid}
        bgColor={`${checklyMid}14`}
        items={checks}
      />
      <OverviewCard
        icon={<Truck size={13} style={{ color: stocklyMid }} />}
        label="Deliveries"
        color={stocklyMid}
        bgColor={`${stocklyMid}14`}
        items={deliveries}
      />
    </div>
  )
}
