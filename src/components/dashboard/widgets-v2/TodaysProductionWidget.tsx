'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, ProgressBar, MiniItem } from '../WidgetCard';

interface TodaysProductionWidgetProps {
  siteId: string;
  companyId: string;
}

interface ProductionTask {
  id: string;
  name: string;
  status: string;
  quantity: number;
}

/**
 * TodaysProductionWidget - Shows production progress for today
 */
export default function TodaysProductionWidget({ siteId, companyId }: TodaysProductionWidgetProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // planly_production_tasks table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
        <div className="animate-pulse space-y-2">
          <div className="h-2 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/2" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No production scheduled for today</div>
        </div>
      </WidgetCard>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '✓ Done';
      case 'in_progress': return 'In progress';
      default: return 'Queued';
    }
  };

  const getStatusType = (status: string): 'good' | 'warning' | 'neutral' => {
    switch (status) {
      case 'completed': return 'good';
      case 'in_progress': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
      <ProgressBar done={doneCount} total={totalCount} color="bg-orange-400" />
      <div className="mt-2">
        {tasks.map((task) => (
          <MiniItem
            key={task.id}
            text={`${task.name} (x${task.quantity})`}
            sub={getStatusLabel(task.status)}
            status={getStatusType(task.status)}
            href="/dashboard/planly/production-plan"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
