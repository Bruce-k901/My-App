'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WidgetCard } from '../WidgetCard';
import { AnimatedCounter } from '../AnimatedCounter';
import { supabase } from '@/lib/supabase';

interface ComplianceScoreWidgetProps {
  siteId: string;
  companyId: string;
}

/**
 * ComplianceScoreWidget - Shows compliance score ring with percentage
 */
export default function ComplianceScoreWidget({ siteId, companyId }: ComplianceScoreWidgetProps) {
  const [score, setScore] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchCompliance() {
      try {
        // Get current week's tasks
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        let query = supabase
          .from('checklist_tasks')
          .select('id, status')
          .eq('company_id', companyId)
          .gte('due_date', startOfWeek.toISOString().split('T')[0])
          .lt('due_date', endOfWeek.toISOString().split('T')[0]);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: tasks, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const total = tasks?.length || 0;
        const completed = tasks?.filter((t: any) => t.status === 'completed').length || 0;
        const failed = tasks?.filter((t: any) => t.status !== 'completed').length || 0;

        setTotalCount(total);
        setFailedCount(failed);

        if (total > 0) {
          const calculatedScore = Math.round((completed / total) * 100);
          setScore(calculatedScore);
          // TODO: Calculate actual week-over-week change
          setChange(-2); // Placeholder
        } else {
          setScore(null);
        }
      } catch (err) {
        console.error('Error fetching compliance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompliance();
  }, [companyId, siteId]);

  // Compliance ring component with framer-motion animation
  const ComplianceRing = ({ value }: { value: number }) => {
    const r = 34;
    const circ = 2 * Math.PI * r;
    const offset = circ - (value / 100) * circ;
    // Use checkly module colours: good = checkly light, medium = checkly dark, low = teamly
    const color = value >= 90
      ? 'rgb(var(--module-checkly))'
      : value >= 70
      ? 'rgb(var(--module-stockly))'
      : 'rgb(var(--module-teamly))';

    return (
      <div className="relative w-20 h-20">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="rgb(var(--border))"
            strokeWidth="5"
          />
          <motion.circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>
            <AnimatedCounter value={value} suffix="%" />
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <WidgetCard title="Weekly Compliance" module="checkly" viewAllHref="/dashboard/reports">
        <div className="animate-pulse flex gap-4">
          <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-20" />
            <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-16" />
          </div>
        </div>
      </WidgetCard>
    );
  }

  if (score === null) {
    return (
      <WidgetCard title="Weekly Compliance" module="checkly" viewAllHref="/dashboard/reports">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No compliance data yet</div>
          <a
            href="/dashboard/todays_tasks"
            className="text-teamly text-xs hover:underline mt-1 inline-block"
          >
            Complete a checklist →
          </a>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Weekly Compliance" module="checkly" viewAllHref="/dashboard/reports">
      <div className="flex items-center gap-4">
        <ComplianceRing value={score} />
        <div>
          <div className="text-[10.5px] text-[rgb(var(--text-disabled))] mb-0.5">This week</div>
          <div
            className={`text-[10.5px] ${change >= 0 ? 'text-module-fg' : 'text-checkly-dark dark:text-checkly'}`}
          >
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last week
          </div>
          <div className="text-[10px] text-[rgb(var(--text-disabled))] mt-1.5">
            {failedCount} of {totalCount} checks failed
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
