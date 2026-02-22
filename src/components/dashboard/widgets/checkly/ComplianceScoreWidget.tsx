'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { ShieldCheck, TrendingUp, TrendingDown, Minus } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ComplianceData {
  score: number | null;
  previousScore: number | null;
  trend: 'up' | 'down' | 'stable' | null;
}

export default function ComplianceScoreWidget({ companyId, siteId }: WidgetProps) {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.checkly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchComplianceScore() {
      try {
        // Fetch latest compliance score
        let query = supabase
          .from('site_compliance_score')
          .select('score, score_date')
          .eq('tenant_id', companyId)
          .order('score_date', { ascending: false })
          .limit(2);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: scores, error } = await query;

        if (error) {
          // Silently handle - table might not exist
          console.debug('Compliance score not available:', error.message);
          setData({ score: null, previousScore: null, trend: null });
          return;
        }

        if (scores && scores.length > 0) {
          const currentScore = scores[0]?.score ?? null;
          const previousScore = scores[1]?.score ?? null;

          let trend: 'up' | 'down' | 'stable' | null = null;
          if (currentScore !== null && previousScore !== null) {
            if (currentScore > previousScore) trend = 'up';
            else if (currentScore < previousScore) trend = 'down';
            else trend = 'stable';
          }

          setData({ score: currentScore, previousScore, trend });
        } else {
          setData({ score: null, previousScore: null, trend: null });
        }
      } catch (err) {
        console.error('Error fetching compliance score:', err);
        setData({ score: null, previousScore: null, trend: null });
      } finally {
        setLoading(false);
      }
    }

    fetchComplianceScore();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  if (!data || data.score === null) {
    return (
      <WidgetCard
        title="Compliance Score"
        icon={
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <ShieldCheck className={cn('w-4 h-4', colors.text)} />
          </div>
        }
      >
        <WidgetEmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          message="No compliance data available yet"
          actionLabel="Complete a checklist"
          actionHref="/dashboard/todays_tasks"
        />
      </WidgetCard>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-500/20';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-500/20';
    return 'bg-red-100 dark:bg-red-500/20';
  };

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : data.trend === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-theme-tertiary';

  return (
    <WidgetCard
      title="Compliance Score"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <ShieldCheck className={cn('w-4 h-4', colors.text)} />
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center py-2">
        <div
          className={cn('text-4xl font-bold', getScoreColor(data.score))}
        >
          {data.score}%
        </div>
        {data.trend && (
          <div className={cn('flex items-center gap-1 text-sm mt-1', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>
              {data.trend === 'up' ? 'Improving' : data.trend === 'down' ? 'Declining' : 'Stable'}
            </span>
          </div>
        )}
        <div className="w-full mt-3 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getScoreBgColor(data.score))}
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>
    </WidgetCard>
  );
}
