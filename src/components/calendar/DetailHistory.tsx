'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import { MODULE_HEX } from '@/config/module-colors'
import type { ModuleKey } from '@/config/module-colors'

interface HistoryItem {
  id: string
  module: ModuleKey
  description: string
  timestamp: string
  actor: string
  sortDate: string
}

export function DetailHistory() {
  const { companyId, siteId } = useAppContext()

  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  // Completed checklist tasks (last 7 days)
  const checksQuery = useQuery({
    queryKey: ['calendar-history-checks', companyId, siteId, sevenDaysAgo],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('checklist_tasks')
        .select('id, custom_name, completed_at, completed_by, profiles:profiles!completed_by(full_name)')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('completed_at', `${sevenDaysAgo}T00:00:00`)
        .order('completed_at', { ascending: false })
        .limit(10)

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

  // Ticket activity — recent comments and status changes (last 7 days)
  const ticketsQuery = useQuery({
    queryKey: ['calendar-history-tickets', companyId, siteId, sevenDaysAgo],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('support_tickets')
        .select('id, title, module, status, updated_at, last_comment_at, last_status_change_at')
        .eq('company_id', companyId)
        .gte('updated_at', `${sevenDaysAgo}T00:00:00`)
        .order('updated_at', { ascending: false })
        .limit(10)

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

  // Confirmed deliveries (last 7 days)
  const deliveriesQuery = useQuery({
    queryKey: ['calendar-history-deliveries', companyId, siteId, sevenDaysAgo],
    queryFn: async () => {
      if (!companyId) return []
      let query = supabase
        .from('deliveries')
        .select('id, confirmed_at, status, supplier:suppliers(name), confirmed_by_profile:profiles!confirmed_by(full_name)')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .gte('confirmed_at', `${sevenDaysAgo}T00:00:00`)
        .order('confirmed_at', { ascending: false })
        .limit(10)

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

  const history = useMemo(() => {
    const items: HistoryItem[] = []

    if (checksQuery.data) {
      for (const c of checksQuery.data) {
        const profile = c.profiles as any
        items.push({
          id: `check-${c.id}`,
          module: 'checkly',
          description: `${c.custom_name || 'Checklist task'} completed`,
          timestamp: c.completed_at
            ? format(new Date(c.completed_at), "EEEE d MMM · HH:mm")
            : '',
          actor: profile?.full_name || 'Staff',
          sortDate: c.completed_at || '',
        })
      }
    }

    if (deliveriesQuery.data) {
      for (const d of deliveriesQuery.data) {
        const supplier = d.supplier as any
        const confirmedBy = d.confirmed_by_profile as any
        items.push({
          id: `delivery-${d.id}`,
          module: 'stockly',
          description: `${supplier?.name || 'Delivery'} confirmed`,
          timestamp: d.confirmed_at
            ? format(new Date(d.confirmed_at), "EEEE d MMM · HH:mm")
            : '',
          actor: confirmedBy?.full_name || 'Staff',
          sortDate: d.confirmed_at || '',
        })
      }
    }

    // Ticket activity
    if (ticketsQuery.data) {
      for (const t of ticketsQuery.data) {
        // Use the module field from the ticket; fall back to 'teamly' for 'general'
        const mod = (t.module && t.module !== 'general' ? t.module : 'teamly') as ModuleKey
        const statusLabel = t.status === 'resolved' ? 'resolved' : t.status === 'closed' ? 'closed' : 'updated'
        items.push({
          id: `ticket-${t.id}`,
          module: mod,
          description: `Ticket "${t.title}" ${statusLabel}`,
          timestamp: t.updated_at
            ? format(new Date(t.updated_at), "EEEE d MMM · HH:mm")
            : '',
          actor: 'Support',
          sortDate: t.updated_at || '',
        })
      }
    }

    // Sort by date desc and take top 8
    items.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    return items.slice(0, 8)
  }, [checksQuery.data, deliveriesQuery.data, ticketsQuery.data])

  const isLoading = checksQuery.isLoading || deliveriesQuery.isLoading || ticketsQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full mt-[5px] bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-48 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
              <div className="h-2.5 w-32 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-[0.73rem] text-gray-400 dark:text-gray-500">
        No recent activity
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {history.map(item => (
        <div key={item.id} className="flex gap-3 items-start">
          <div
            className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
            style={{ backgroundColor: MODULE_HEX[item.module].mid }}
          />
          <div>
            <div className="text-[0.73rem] font-medium text-gray-900 dark:text-gray-100">
              {item.description}
            </div>
            <div className="text-[0.65rem] text-gray-400 dark:text-gray-500">
              {item.timestamp} · {item.actor}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
