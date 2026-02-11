'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Calendar, Settings } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UpcomingService {
  id: string;
  asset_name: string;
  service_type: string;
  due_date: string;
  days_until: number;
}

export default function UpcomingServiceWidget({ companyId, siteId }: WidgetProps) {
  const [services, setServices] = useState<UpcomingService[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.assetly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchUpcomingServices() {
      try {
        const today = new Date();
        const fourteenDaysLater = new Date(today);
        fourteenDaysLater.setDate(today.getDate() + 14);

        const todayStr = today.toISOString().split('T')[0];
        const futureStr = fourteenDaysLater.toISOString().split('T')[0];

        // Fetch upcoming ppm_schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('ppm_schedules')
          .select('id, asset_id, next_due_date, task_type, description')
          .gte('next_due_date', todayStr)
          .lte('next_due_date', futureStr);

        if (schedulesError) {
          if (schedulesError.code === '42P01') {
            console.debug('ppm_schedules table not available');
            setLoading(false);
            return;
          }
          throw schedulesError;
        }

        if (!schedules || schedules.length === 0) {
          setServices([]);
          setLoading(false);
          return;
        }

        // Get asset IDs and fetch assets with site filtering
        const assetIds = [...new Set(schedules.map((s: any) => s.asset_id).filter(Boolean))];

        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, site_id, sites!inner(company_id)')
          .in('id', assetIds);

        if (assetsError) throw assetsError;

        // Filter by company and optionally by site
        const filteredAssets = (assets || []).filter((a: any) => {
          if (a.sites?.company_id !== companyId) return false;
          if (siteId && siteId !== 'all' && a.site_id !== siteId) return false;
          return true;
        });

        const assetMap = new Map(filteredAssets.map((a: any) => [a.id, a]));

        const formattedServices: UpcomingService[] = schedules
          .filter((service: any) => assetMap.has(service.asset_id))
          .map((service: any) => {
            const asset = assetMap.get(service.asset_id);
            const dueDate = new Date(service.next_due_date);
            const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return {
              id: service.id,
              asset_name: asset?.name || 'Unknown Asset',
              service_type: service.task_type || service.description || 'Service',
              due_date: service.next_due_date,
              days_until: daysUntil,
            };
          })
          .sort((a: UpcomingService, b: UpcomingService) => a.days_until - b.days_until)
          .slice(0, 5);

        setServices(formattedServices);
      } catch (err) {
        console.error('Error fetching upcoming services:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingServices();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const getDueDateColor = (days: number) => {
    if (days <= 3) return 'text-red-600 dark:text-red-400';
    if (days <= 7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-[rgb(var(--text-tertiary))] dark:text-white/40';
  };

  const formatDueDate = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <WidgetCard
      title="Upcoming Service"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Settings className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">
          Next 14 days
        </span>
      }
      viewAllHref="/dashboard/assets/maintenance"
    >
      {services.length === 0 ? (
        <WidgetEmptyState
          icon={<Settings className="w-8 h-8" />}
          message="No services scheduled"
          actionLabel="View maintenance"
          actionHref="/dashboard/assets/maintenance"
        />
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/dashboard/assets/maintenance/${service.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {service.asset_name}
                </p>
                <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 truncate">
                  {service.service_type}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <Calendar className={cn('w-3 h-3', getDueDateColor(service.days_until))} />
                <span className={cn('text-xs font-medium', getDueDateColor(service.days_until))}>
                  {formatDueDate(service.days_until)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
