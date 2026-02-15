'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';

interface AssetIssuesWidgetProps {
  siteId: string;
  companyId: string;
}

interface AssetIssue {
  id: string;
  assetName: string;
  issue: string;
  reportedDate: string;
  isUrgent: boolean;
}

/**
 * AssetIssuesWidget - Shows open asset issues/callouts
 */
export default function AssetIssuesWidget({ siteId, companyId }: AssetIssuesWidgetProps) {
  const [issues, setIssues] = useState<AssetIssue[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          .in('status', ['open', 'reopened', 'investigating'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const now = new Date();
        const formatted: AssetIssue[] = (data || []).map((issue: any) => {
          const createdDate = new Date(issue.created_at);
          const diffMs = now.getTime() - createdDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          let reportedLabel: string;
          if (diffDays === 0) {
            reportedLabel = 'Reported today';
          } else if (diffDays === 1) {
            reportedLabel = 'Reported yesterday';
          } else {
            reportedLabel = `${diffDays}d ago`;
          }

          return {
            id: issue.id,
            assetName: issue.asset?.name || 'Unknown Asset',
            issue: issue.callout_type || 'Issue reported',
            reportedDate: reportedLabel,
            isUrgent: issue.priority === 'urgent' || issue.priority === 'high',
          };
        });

        setIssues(formatted);

        // Get total count
        let countQuery = supabase
          .from('callouts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['open', 'reopened', 'investigating']);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching asset issues:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Asset Issues" module="assetly" viewAllHref="/dashboard/assets/callout-logs">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Asset Issues" module="assetly" viewAllHref="/dashboard/assets/callout-logs">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-module-fg" />
          </div>
          <span className="text-module-fg text-xs">No open asset issues</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Asset Issues" module="assetly" viewAllHref="/dashboard/assets/callout-logs">
      <CountBadge count={totalCount} label="open issues" status="warning" />
      <div className="mt-2">
        {issues.slice(0, maxItems).map((issue) => (
          <MiniItem
            key={issue.id}
            text={`${issue.assetName} — ${issue.issue}`}
            sub={issue.reportedDate}
            status={issue.isUrgent ? 'urgent' : 'warning'}
            href="/dashboard/assets/callout-logs"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
