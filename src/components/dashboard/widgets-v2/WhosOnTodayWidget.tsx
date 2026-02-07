'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface WhosOnTodayWidgetProps {
  siteId: string;
  companyId: string;
}

interface StaffOnShift {
  id: string;
  name: string;
  shiftTime: string;
  role?: string;
}

/**
 * WhosOnTodayWidget - Shows staff scheduled for today
 */
export default function WhosOnTodayWidget({ siteId, companyId }: WhosOnTodayWidgetProps) {
  const [staff, setStaff] = useState<StaffOnShift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchTodaysStaff() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Try schedule_shifts table first
        let query = supabase
          .from('schedule_shifts')
          .select(`
            id,
            start_time,
            end_time,
            profile:profiles(id, full_name, first_name, last_name)
          `)
          .eq('company_id', companyId)
          .eq('date', today)
          .order('start_time', { ascending: true });

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('schedule_shifts table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formatted: StaffOnShift[] = (data || []).slice(0, 3).map((shift: any) => {
          const profile = shift.profile || {};
          const name = profile.full_name ||
            (profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : 'Unknown');

          const startTime = shift.start_time ? shift.start_time.slice(0, 5) : '';
          const endTime = shift.end_time ? shift.end_time.slice(0, 5) : '';

          return {
            id: shift.id,
            name,
            shiftTime: startTime && endTime ? `${startTime} – ${endTime}` : 'All day',
          };
        });

        setStaff(formatted);
        setTotalCount(data?.length || 0);
      } catch (err) {
        console.error('Error fetching today\'s staff:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTodaysStaff();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-white/5 rounded w-12" />
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="text-center py-4">
          <div className="text-white/40 text-xs">No staff scheduled for today</div>
        </div>
      </WidgetCard>
    );
  }

  const remaining = totalCount - 3;

  return (
    <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[22px] font-bold text-blue-400">{totalCount}</span>
        <span className="text-[11px] text-white/40">staff on shift</span>
      </div>
      <div>
        {staff.map((person) => (
          <MiniItem
            key={person.id}
            text={person.name}
            sub={person.shiftTime}
            status="neutral"
          />
        ))}
        {remaining > 0 && (
          <div className="text-[10.5px] text-white/40 mt-0.5">+ {remaining} more</div>
        )}
      </div>
    </WidgetCard>
  );
}
