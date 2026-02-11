'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { GraduationCap, AlertTriangle, Calendar } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ExpiringTraining {
  id: string;
  staff_name: string;
  training_name: string;
  expires_at: string;
  days_until_expiry: number;
}

export default function TrainingExpiriesWidget({ companyId, siteId }: WidgetProps) {
  const [trainings, setTrainings] = useState<ExpiringTraining[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.teamly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchExpiringTraining() {
      try {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        let query = supabase
          .from('training_records')
          .select(`
            id,
            expiry_date,
            course:training_courses!training_records_course_id_fkey(name),
            profile:profiles!training_records_profile_id_fkey(id, full_name)
          `)
          .eq('company_id', companyId)
          .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
          .gte('expiry_date', today.toISOString().split('T')[0])
          .order('expiry_date', { ascending: true })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('profile.site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('training_records table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedTrainings: ExpiringTraining[] = (data || []).map((record: any) => {
          const profile = record.profile || {};
          const staffName = profile.full_name || 'Unknown';

          const expiresAt = new Date(record.expiry_date);
          const daysUntil = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: record.id,
            staff_name: staffName,
            training_name: record.course?.name || 'Unknown Training',
            expires_at: record.expiry_date,
            days_until_expiry: daysUntil,
          };
        });

        setTrainings(formattedTrainings);
        setTotalCount(formattedTrainings.length);
      } catch (err) {
        console.error('Error fetching training expiries:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExpiringTraining();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const getExpiryColor = (days: number) => {
    if (days <= 7) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20';
    if (days <= 14) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/20';
    return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20';
  };

  return (
    <WidgetCard
      title="Training Expiries"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <GraduationCap className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/people/training"
    >
      {trainings.length === 0 ? (
        <WidgetEmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          message="No training expiring soon"
        />
      ) : (
        <div className="space-y-2">
          {trainings.map((training) => (
            <Link
              key={training.id}
              href="/dashboard/people/training"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {training.staff_name}
                </p>
                <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 truncate">
                  {training.training_name}
                </p>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0',
                  getExpiryColor(training.days_until_expiry)
                )}
              >
                {training.days_until_expiry <= 0
                  ? 'Expired'
                  : training.days_until_expiry === 1
                  ? '1 day'
                  : `${training.days_until_expiry} days`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
