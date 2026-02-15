'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface WhosOnTodayWidgetProps {
  siteId: string;
  companyId: string;
}

interface ClockedInStaff {
  id: string;
  name: string;
  clockInTime: string;
}

function formatClockIn(timestamp: string): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * WhosOnTodayWidget - Shows currently clocked-in staff
 */
export default function WhosOnTodayWidget({ siteId, companyId }: WhosOnTodayWidgetProps) {
  const [staff, setStaff] = useState<ClockedInStaff[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchClockedIn() {
      try {
        // Query staff_attendance for currently clocked-in staff
        let query = supabase
          .from('staff_attendance')
          .select('id, profile_id, clock_in_time, profiles:profile_id(full_name)')
          .eq('company_id', companyId)
          .eq('shift_status', 'on_shift')
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: true });

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: records, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            // Table doesn't exist — handle gracefully
            setLoading(false);
            return;
          }
          console.error('Error fetching clocked-in staff:', error);
          setLoading(false);
          return;
        }

        const all = records || [];
        setTotalCount(all.length);

        const formatted: ClockedInStaff[] = all.slice(0, 3).map((r: any) => ({
          id: r.id,
          name: r.profiles?.full_name || 'Unknown',
          clockInTime: formatClockIn(r.clock_in_time),
        }));

        setStaff(formatted);
      } catch (err) {
        console.error('Error fetching clocked-in staff:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClockedIn();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-black/5 dark:bg-white/5 rounded w-12" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No staff clocked in</div>
        </div>
      </WidgetCard>
    );
  }

  const remaining = totalCount - 3;

  return (
    <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[22px] font-bold text-blue-400">{totalCount}</span>
        <span className="text-[11px] text-[rgb(var(--text-disabled))]">clocked in</span>
      </div>
      <div>
        {staff.map((person) => (
          <MiniItem
            key={person.id}
            text={person.name}
            sub={`In: ${person.clockInTime}`}
            status="good"
            href="/dashboard/people/schedule"
          />
        ))}
        {remaining > 0 && (
          <div className="text-[10.5px] text-[rgb(var(--text-disabled))] mt-0.5">+ {remaining} more</div>
        )}
      </div>
    </WidgetCard>
  );
}
