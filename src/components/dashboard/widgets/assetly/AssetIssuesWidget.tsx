'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { AlertCircle, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AssetIssue {
  id: string;
  asset_name: string;
  callout_type: string;
  reported_at: string;
  priority: string;
  status: string;
}

export default function AssetIssuesWidget({ companyId, siteId }: WidgetProps) {
  const [issues, setIssues] = useState<AssetIssue[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.assetly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchIssues() {
      try {
        let query = supabase
          .from('callouts')
          .select(`
            id,
            callout_type,
            created_at,
            priority,
            status,
            asset:assets(id, name)
          `)
          .eq('company_id', companyId)
          .in('status', ['open', 'reopened'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('callouts table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedIssues: AssetIssue[] = (data || []).map((issue: any) => ({
          id: issue.id,
          asset_name: issue.asset?.name || 'Unknown Asset',
          callout_type: issue.callout_type || 'reactive',
          reported_at: issue.created_at,
          priority: issue.priority || 'medium',
          status: issue.status,
        }));

        setIssues(formattedIssues);

        // Get open count
        let countQuery = supabase
          .from('callouts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['open', 'reopened']);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setOpenCount(count || 0);
      } catch (err) {
        console.error('Error fetching asset issues:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('callouts-widget')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'callouts',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchIssues();
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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <WidgetCard
      title="Asset Issues"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <AlertCircle className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        openCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full">
            {openCount} open
          </span>
        )
      }
      viewAllHref="/dashboard/assets/callout-logs"
    >
      {issues.length === 0 ? (
        <WidgetEmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          message="No open asset issues"
          actionLabel="Report issue"
          actionHref="/dashboard/assets/callout-logs/new"
        />
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/dashboard/assets/callout-logs/${issue.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {issue.asset_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
                  <span>{issue.callout_type}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(issue.reported_at)}</span>
                </div>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0',
                  getPriorityColor(issue.priority)
                )}
              >
                {issue.priority}
              </span>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
