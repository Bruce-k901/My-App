'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Factory, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ProductionTask {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  bake_group?: string;
}

interface ProductionSummary {
  total: number;
  completed: number;
  tasks: ProductionTask[];
}

export default function TodaysProductionWidget({ companyId, siteId }: WidgetProps) {
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.planly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchProduction() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch from API endpoint
        const params = new URLSearchParams({
          date: today,
          companyId,
        });
        if (siteId && siteId !== 'all') {
          params.set('siteId', siteId);
        }

        const response = await fetch(`/api/planly/production-plan?${params.toString()}`);

        if (!response.ok) {
          // API might not exist yet
          console.debug('Production plan API not available');
          setSummary({ total: 0, completed: 0, tasks: [] });
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.tasks) {
          const tasks: ProductionTask[] = data.tasks.slice(0, 5).map((task: any) => ({
            id: task.id,
            product_name: task.product_name || task.name || 'Unknown Product',
            quantity: task.quantity || 0,
            unit: task.unit || 'units',
            status: task.status || 'pending',
            bake_group: task.bake_group,
          }));

          setSummary({
            total: data.total || tasks.length,
            completed: data.completed || tasks.filter((t) => t.status === 'completed').length,
            tasks,
          });
        } else {
          setSummary({ total: 0, completed: 0, tasks: [] });
        }
      } catch (err) {
        console.error('Error fetching production:', err);
        setSummary({ total: 0, completed: 0, tasks: [] });
      } finally {
        setLoading(false);
      }
    }

    fetchProduction();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  if (!summary || summary.total === 0) {
    return (
      <WidgetCard
        title="Today's Production"
        icon={
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <Factory className={cn('w-4 h-4', colors.text)} />
          </div>
        }
      >
        <WidgetEmptyState
          icon={<Factory className="w-8 h-8" />}
          message="No production scheduled for today"
          actionLabel="View production plan"
          actionHref="/dashboard/planly/production"
        />
      </WidgetCard>
    );
  }

  const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <WidgetCard
      title="Today's Production"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Factory className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">
          {summary.completed}/{summary.total}
        </span>
      }
      viewAllHref="/dashboard/planly/production"
    >
      <div className="space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40">
              {summary.completed} completed
            </span>
            <span className={cn('font-medium', colors.text)}>{completionRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-1">
          {summary.tasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/planly/production?task=${task.id}`}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {task.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm truncate flex-1',
                  task.status === 'completed'
                    ? 'text-[rgb(var(--text-tertiary))] dark:text-white/40 line-through'
                    : 'text-[rgb(var(--text-primary))] dark:text-white'
                )}
              >
                {task.product_name}
              </span>
              <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 flex-shrink-0">
                {task.quantity} {task.unit}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
