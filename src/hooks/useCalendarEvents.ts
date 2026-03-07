'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isBefore, isAfter, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import type { CalendarEvent, CalendarEventChild, CalendarEventType, CalendarViewMode, EventStatus } from '@/types/calendar'

interface UseCalendarEventsProps {
  currentDate: Date
  viewMode: CalendarViewMode
  filters: CalendarEventType[]
}

// ── Status mapping ──────────────────────────────────────────────────
function mapShiftStatus(status: string): EventStatus | null {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'confirmed'
    case 'pending':
    case 'draft':
    case 'scheduled':
      return 'pending'
    case 'no_show':
    case 'cancelled':
      return null // exclude
    default:
      return 'pending'
  }
}

function mapCheckStatus(status: string): EventStatus | null {
  switch (status) {
    case 'completed':
      return 'confirmed'
    case 'pending':
    case 'in_progress':
      return 'pending'
    case 'overdue':
    case 'failed':
      return 'overdue'
    case 'skipped':
      return null
    default:
      return 'pending'
  }
}

function mapDeliveryStatus(status: string): EventStatus | null {
  switch (status) {
    case 'confirmed':
      return 'confirmed'
    case 'pending_review':
    case 'draft':
      return 'pending'
    case 'disputed':
      return 'overdue'
    case 'cancelled':
      return null
    default:
      return 'pending'
  }
}

function mapTaskStatus(status: string): EventStatus | null {
  switch (status) {
    case 'completed':
      return 'confirmed'
    case 'pending':
    case 'in_progress':
      return 'pending'
    case 'overdue':
      return 'overdue'
    default:
      return 'pending'
  }
}

function mapLeaveStatus(status: string): EventStatus | null {
  switch (status) {
    case 'approved':
    case 'taken':
      return 'confirmed'
    case 'pending':
      return 'pending'
    case 'declined':
    case 'cancelled':
      return null
    default:
      return 'pending'
  }
}

export function useCalendarEvents({ currentDate, viewMode, filters }: UseCalendarEventsProps) {
  const { companyId, siteId } = useAppContext()

  // Always compute the week (used by week view + day view uses same data)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Month grid dates (buffered to include partial weeks at start/end)
  const monthStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const monthEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Query range: week for day/week views, month for month view
  const rangeStart = viewMode === 'month' ? monthStart : weekStart
  const rangeEnd = viewMode === 'month' ? monthEnd : weekEnd
  const rangeStartStr = format(rangeStart, 'yyyy-MM-dd')
  const rangeEndStr = format(rangeEnd, 'yyyy-MM-dd')

  // ── All shifts (assigned + open) from rota_shifts ──────────────
  const shiftsQuery = useQuery({
    queryKey: ['calendar-shifts', companyId, siteId, rangeStartStr, rangeEndStr],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('rota_shifts')
        .select('id, shift_date, start_time, end_time, status, role_required, profile_id, profiles:profile_id(full_name), rota_id, rotas!rota_id(site_id)')
        .eq('company_id', companyId)
        .gte('shift_date', rangeStartStr)
        .lte('shift_date', rangeEndStr)
        .not('status', 'in', '("cancelled")')

      if (siteId && siteId !== 'all') {
        query = query.eq('rotas.site_id', siteId)
      }

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return []
        console.error('[calendar] shifts query error:', error)
        return []
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // ── Compliance tasks ────────────────────────────────────────────
  const checksQuery = useQuery({
    queryKey: ['calendar-checks', companyId, siteId, rangeStartStr, rangeEndStr],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('checklist_tasks')
        .select('id, custom_name, due_date, due_time, status, priority, assigned_to_user_id, completed_at, completed_by, assigned_profile:profiles!assigned_to_user_id(full_name), completed_profile:profiles!completed_by(full_name)')
        .eq('company_id', companyId)
        .gte('due_date', rangeStartStr)
        .lte('due_date', rangeEndStr)
        .not('status', 'in', '("skipped")')

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId)
      }

      const { data, error } = await query
      if (error) {
        // Table might not exist yet (42P01)
        if (error.code === '42P01') return []
        throw error
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // ── Deliveries ──────────────────────────────────────────────────
  const deliveriesQuery = useQuery({
    queryKey: ['calendar-deliveries', companyId, siteId, rangeStartStr, rangeEndStr],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('deliveries')
        .select('id, delivery_date, status, supplier:suppliers(id, name)')
        .eq('company_id', companyId)
        .gte('delivery_date', rangeStartStr)
        .lte('delivery_date', rangeEndStr)
        .not('status', 'in', '("cancelled")')

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId)
      }

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return []
        throw error
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // ── Generic tasks ───────────────────────────────────────────────
  const tasksQuery = useQuery({
    queryKey: ['calendar-tasks', companyId, siteId, rangeStartStr, rangeEndStr],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('tasks')
        .select('id, title, due_date, due_time, status, assigned_to, metadata')
        .eq('company_id', companyId)
        .gte('due_date', rangeStartStr)
        .lte('due_date', rangeEndStr)

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId)
      }

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return []
        console.error('[calendar] tasks query error:', error)
        return []
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // ── Leave requests ──────────────────────────────────────────────
  const leaveQuery = useQuery({
    queryKey: ['calendar-leave', companyId, siteId, rangeStartStr, rangeEndStr],
    queryFn: async () => {
      if (!companyId) return []
      // Leave can span multiple days — fetch any that overlap with the week
      let query = supabase
        .from('leave_requests')
        .select('id, start_date, end_date, status, profile_id, profiles:profiles!profile_id(full_name), leave_types:leave_types!leave_type_id(name)')
        .eq('company_id', companyId)
        .lte('start_date', rangeEndStr)
        .gte('end_date', rangeStartStr)
        .not('status', 'in', '("declined","cancelled")')

      // Leave doesn't have site_id — filter would be via profile's site
      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return []
        throw error
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // ── Map to CalendarEvent[] ──────────────────────────────────────
  const events = useMemo(() => {
    const result: CalendarEvent[] = []

    // Group shifts by date, then by time block — includes both assigned + open
    if (shiftsQuery.data) {
      // Separate assigned vs open shifts
      const assigned = shiftsQuery.data.filter(s => s.profile_id)
      const open = shiftsQuery.data.filter(s => !s.profile_id)

      // Assigned shifts — group by date then by time block
      const shiftsByDate: Record<string, any[]> = {}
      for (const s of assigned) {
        const date = s.shift_date as string
        if (!shiftsByDate[date]) shiftsByDate[date] = []
        shiftsByDate[date].push(s)
      }

      for (const [date, shifts] of Object.entries(shiftsByDate)) {
        const byTime: Record<string, any[]> = {}
        for (const s of shifts) {
          const key = `${s.start_time}-${s.end_time}`
          if (!byTime[key]) byTime[key] = []
          byTime[key].push(s)
        }

        for (const [timeKey, group] of Object.entries(byTime)) {
          const first = group[0]
          const status = mapShiftStatus(first.status)
          if (!status) continue

          const staffCount = group.length
          const startTime = first.start_time?.slice(0, 5)
          const endTime = first.end_time?.slice(0, 5)

          const children: CalendarEventChild[] = group
            .map(s => {
              const profile = s.profiles as any
              return {
                id: s.id,
                title: profile?.full_name || 'Unassigned',
                time: `${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)}`,
                status: mapShiftStatus(s.status) || undefined,
                assignedTo: s.role_required || undefined,
              }
            })
            .sort((a, b) => a.title.localeCompare(b.title))

          result.push({
            id: `shift-${date}-${timeKey}`,
            type: 'shift',
            module: 'teamly',
            title: first.role_required || 'Shift',
            subtitle: `${staffCount} staff`,
            date,
            startTime,
            endTime,
            status,
            linkedId: first.id,
            children,
          })
        }
      }

      // Open shifts — show individually
      for (const s of open) {
        const status = mapShiftStatus(s.status)
        if (!status) continue

        result.push({
          id: `open-shift-${s.id}`,
          type: 'shift',
          module: 'teamly',
          title: s.role_required ? `Open: ${s.role_required}` : 'Open shift',
          subtitle: 'Unclaimed',
          date: s.shift_date as string,
          startTime: (s.start_time as string)?.slice(0, 5),
          endTime: (s.end_time as string)?.slice(0, 5),
          status: 'pending',
          linkedId: s.id,
        })
      }
    }

    // Compliance tasks — aggregate into one summary card per day
    if (checksQuery.data) {
      const checksByDate: Record<string, any[]> = {}
      for (const c of checksQuery.data) {
        const status = mapCheckStatus(c.status)
        if (!status) continue
        const date = c.due_date as string
        if (!checksByDate[date]) checksByDate[date] = []
        checksByDate[date].push({ ...c, _mappedStatus: status })
      }

      for (const [date, checks] of Object.entries(checksByDate)) {
        const total = checks.length
        const completed = checks.filter(c => c._mappedStatus === 'confirmed').length
        const overdue = checks.filter(c => c._mappedStatus === 'overdue').length
        const pending = total - completed - overdue

        // Overall status: overdue if any overdue, pending if any pending, otherwise confirmed
        const status: EventStatus = overdue > 0 ? 'overdue' : pending > 0 ? 'pending' : 'confirmed'

        // Find earliest due_time for positioning
        const earliest = checks
          .map(c => c.due_time?.slice(0, 5))
          .filter(Boolean)
          .sort()[0]

        // Build children for drill-down, sorted by time (earliest first)
        const children: CalendarEventChild[] = checks
          .map(c => {
            const assignedProfile = c.assigned_profile as any
            const completedProfile = c.completed_profile as any
            return {
              id: c.id,
              title: c.custom_name || 'Checklist task',
              time: c.due_time?.slice(0, 5),
              status: c._mappedStatus as EventStatus,
              assignedTo: assignedProfile?.full_name || undefined,
              completedBy: completedProfile?.full_name || undefined,
              completedAt: c.completed_at || undefined,
            }
          })
          .sort((a, b) => {
            const timeA = a.time || '99:99'
            const timeB = b.time || '99:99'
            return timeA.localeCompare(timeB)
          })

        result.push({
          id: `checks-${date}`,
          type: 'compliance',
          module: 'checkly',
          title: `${total} checks`,
          subtitle: completed === total
            ? 'All complete'
            : `${completed}/${total} done${overdue > 0 ? ` · ${overdue} overdue` : ''}`,
          date,
          startTime: earliest,
          status,
          children,
        })
      }
    }

    // Deliveries
    if (deliveriesQuery.data) {
      for (const d of deliveriesQuery.data) {
        const status = mapDeliveryStatus(d.status)
        if (!status) continue
        const supplier = d.supplier as any
        result.push({
          id: `delivery-${d.id}`,
          type: 'delivery',
          module: 'stockly',
          title: supplier?.name || 'Delivery',
          date: d.delivery_date,
          status,
          linkedId: d.id,
        })
      }
    }

    // Generic tasks (includes reminders, meetings, calls, notes) — show individually if ≤3 per day, otherwise aggregate
    if (tasksQuery.data) {
      const tasksByDate: Record<string, any[]> = {}
      for (const t of tasksQuery.data) {
        const status = mapTaskStatus(t.status)
        if (!status) continue
        const date = t.due_date as string
        if (!tasksByDate[date]) tasksByDate[date] = []
        tasksByDate[date].push({ ...t, _mappedStatus: status })
      }

      for (const [date, tasks] of Object.entries(tasksByDate)) {
        if (tasks.length <= 3) {
          // Show individually when manageable
          for (const t of tasks) {
            const meta = t.metadata as any
            const taskType = meta?.task_type || 'task'
            const typeLabel = taskType === 'reminder' ? 'Reminder' : taskType === 'meeting' ? 'Meeting' : taskType === 'call' ? 'Call' : taskType === 'note' ? 'Note' : 'Task'
            result.push({
              id: `task-${t.id}`,
              type: 'task',
              module: 'planly',
              title: t.title || typeLabel,
              subtitle: taskType !== 'task' ? typeLabel : undefined,
              date,
              startTime: t.due_time ? t.due_time.slice(0, 5) : undefined,
              status: t._mappedStatus,
              linkedId: t.id,
            })
          }
        } else {
          // Aggregate when there are many
          const total = tasks.length
          const completed = tasks.filter(t => t._mappedStatus === 'confirmed').length
          const overdue = tasks.filter(t => t._mappedStatus === 'overdue').length
          const pending = total - completed - overdue
          const status: EventStatus = overdue > 0 ? 'overdue' : pending > 0 ? 'pending' : 'confirmed'

          const children: CalendarEventChild[] = tasks
            .map(t => {
              const meta = t.metadata as any
              const taskType = meta?.task_type || 'task'
              const typeLabel = taskType === 'reminder' ? 'Reminder' : taskType === 'meeting' ? 'Meeting' : taskType === 'call' ? 'Call' : taskType === 'note' ? 'Note' : 'Task'
              return {
                id: t.id,
                title: t.title || typeLabel,
                time: t.due_time ? t.due_time.slice(0, 5) : undefined,
                status: t._mappedStatus as EventStatus,
              }
            })
            .sort((a, b) => {
              // Overdue first, then pending, then completed
              const statusOrder = (s?: EventStatus) => s === 'overdue' ? 0 : s === 'pending' ? 1 : 2
              return statusOrder(a.status) - statusOrder(b.status)
            })

          result.push({
            id: `tasks-${date}`,
            type: 'task',
            module: 'planly',
            title: `${total} tasks`,
            subtitle: completed === total
              ? 'All complete'
              : `${completed}/${total} done${overdue > 0 ? ` · ${overdue} overdue` : ''}`,
            date,
            status,
            children,
          })
        }
      }
    }

    // Leave requests — expand multi-day into per-day events
    if (leaveQuery.data) {
      for (const l of leaveQuery.data) {
        const status = mapLeaveStatus(l.status)
        if (!status) continue

        const profile = l.profiles as any
        const leaveType = l.leave_types as any
        const name = profile?.full_name || 'Staff'
        const typeName = leaveType?.name || 'Leave'

        const leaveStart = parseISO(l.start_date)
        const leaveEnd = parseISO(l.end_date)

        // For each day of the leave that falls within the query range
        let day = isBefore(leaveStart, rangeStart) ? rangeStart : leaveStart
        const end = isAfter(leaveEnd, rangeEnd) ? rangeEnd : leaveEnd

        while (!isAfter(day, end)) {
          const dateStr = format(day, 'yyyy-MM-dd')
          result.push({
            id: `leave-${l.id}-${dateStr}`,
            type: 'leave',
            module: 'assetly',
            title: `${name} — ${typeName}`,
            date: dateStr,
            allDay: true,
            status,
            assignedTo: name,
            linkedId: l.id,
          })
          day = addDays(day, 1)
        }
      }
    }

    return result
  }, [shiftsQuery.data, checksQuery.data, deliveriesQuery.data, tasksQuery.data, leaveQuery.data, rangeStart, rangeEnd])

  // ── Apply filters ──────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter(e => filters.includes(e.type))
  }, [events, filters])

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredEvents
      .filter(e => e.date === dateStr && e.type !== 'shift') // shifts only show in overview panel
      .sort((a, b) => {
        const timeA = a.startTime || (a.allDay ? '00:00' : '99:99')
        const timeB = b.startTime || (b.allDay ? '00:00' : '99:99')
        return timeA.localeCompare(timeB)
      })
  }

  const todayEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    // Shifts always appear in overview (not in grid), pull from unfiltered events
    const shiftEvents = events.filter(e => e.type === 'shift' && e.date === todayStr)
    const otherEvents = filteredEvents.filter(e => e.type !== 'shift' && e.date === todayStr)
    return [...shiftEvents, ...otherEvents]
      .sort((a, b) => {
        const statusOrder = (s?: string) => s === 'overdue' ? 0 : s === 'pending' ? 1 : 2
        const diff = statusOrder(a.status) - statusOrder(b.status)
        if (diff !== 0) return diff
        const timeA = a.startTime || '99:99'
        const timeB = b.startTime || '99:99'
        return timeA.localeCompare(timeB)
      })
  }, [events, filteredEvents])

  const datesWithEvents = useMemo(() => {
    const dates = new Set<string>()
    filteredEvents.forEach(e => dates.add(e.date))
    return dates
  }, [filteredEvents])

  const isLoading = shiftsQuery.isLoading || checksQuery.isLoading || deliveriesQuery.isLoading || tasksQuery.isLoading || leaveQuery.isLoading

  return {
    events: filteredEvents,
    weekDays,
    monthDays,
    weekStart,
    weekEnd,
    getEventsForDate,
    todayEvents,
    datesWithEvents,
    isLoading,
  }
}
