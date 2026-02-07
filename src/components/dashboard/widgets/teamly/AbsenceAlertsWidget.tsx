'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { UserMinus, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AbsenceAlert {
  id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function AbsenceAlertsWidget({ companyId, siteId }: WidgetProps) {
  const [absences, setAbsences] = useState<AbsenceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.teamly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchAbsences() {
      try {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
          .from('leave_requests')
          .select(`
            id,
            leave_type,
            start_date,
            end_date,
            status,
            profile:profiles(id, full_name, first_name, last_name)
          `)
          .eq('company_id', companyId)
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
          .order('start_date', { ascending: true })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('profile.site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('leave_requests table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedAbsences: AbsenceAlert[] = (data || []).map((leave: any) => {
          const profile = leave.profile || {};
          const staffName = profile.full_name ||
            (profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : 'Unknown');

          return {
            id: leave.id,
            staff_name: staffName,
            leave_type: leave.leave_type || 'Leave',
            start_date: leave.start_date,
            end_date: leave.end_date,
            status: leave.status,
          };
        });

        setAbsences(formattedAbsences);
      } catch (err) {
        console.error('Error fetching absences:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAbsences();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();

    // Calculate days remaining
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (start === end) {
      return 'Today only';
    }

    if (daysRemaining <= 0) {
      return 'Returns tomorrow';
    }

    if (daysRemaining === 1) {
      return '1 day left';
    }

    return `${daysRemaining} days left`;
  };

  const getLeaveTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('sick') || lowerType.includes('illness')) {
      return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
    }
    if (lowerType.includes('holiday') || lowerType.includes('annual')) {
      return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
    }
    return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400';
  };

  return (
    <WidgetCard
      title="Absence Alerts"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <UserMinus className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        absences.length > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full">
            {absences.length} absent
          </span>
        )
      }
      viewAllHref="/dashboard/people/leave"
    >
      {absences.length === 0 ? (
        <WidgetEmptyState
          icon={<UserMinus className="w-8 h-8" />}
          message="No staff currently absent"
        />
      ) : (
        <div className="space-y-2">
          {absences.map((absence) => (
            <Link
              key={absence.id}
              href="/dashboard/people/leave"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {absence.staff_name}
                </p>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full inline-block mt-1',
                    getLeaveTypeColor(absence.leave_type)
                  )}
                >
                  {absence.leave_type}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 ml-2 flex-shrink-0">
                <Calendar className="w-3 h-3" />
                {formatDateRange(absence.start_date, absence.end_date)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
