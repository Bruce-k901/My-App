'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { AlertOctagon, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Incident {
  id: string;
  title: string;
  incident_type: string;
  status: string;
  severity: string;
  created_at: string;
}

export default function RecentIncidentsWidget({ companyId, siteId }: WidgetProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.checkly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchIncidents() {
      try {
        let query = supabase
          .from('incidents')
          .select('id, title, incident_type, status, severity, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) throw error;

        setIncidents(data || []);

        // Get open count
        let countQuery = supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['open', 'investigating']);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setOpenCount(count || 0);
      } catch (err) {
        console.error('Error fetching incidents:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('incidents-widget')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-theme-muted text-theme-secondary';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'resolved':
      case 'closed':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <WidgetCard
      title="Recent Incidents"
      icon={
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/10">
          <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
      }
      badge={
        openCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
            {openCount} open
          </span>
        )
      }
      viewAllHref="/dashboard/incidents"
    >
      {incidents.length === 0 ? (
        <WidgetEmptyState
          icon={<AlertOctagon className="w-8 h-8" />}
          message="No incidents reported"
          actionLabel="Report incident"
          actionHref="/dashboard/incidents"
        />
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/dashboard/incidents?openIncident=${incident.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusDot(incident.status))} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {incident.title || incident.incident_type}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                    <Clock className="w-3 h-3" />
                    {formatDate(incident.created_at)}
                  </div>
                </div>
              </div>
              {incident.severity && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2',
                    getSeverityColor(incident.severity)
                  )}
                >
                  {incident.severity}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
