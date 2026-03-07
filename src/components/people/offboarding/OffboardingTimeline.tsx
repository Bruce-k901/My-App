'use client';

import type { OffboardingTimeline } from '@/types/offboarding';

interface OffboardingTimelineViewProps {
  timeline: OffboardingTimeline;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) <= new Date();
}

interface TimelineNode {
  date: string;
  label: string;
  description: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
}

export function OffboardingTimelineView({ timeline }: OffboardingTimelineViewProps) {
  const nodes: TimelineNode[] = [
    {
      date: timeline.termination_initiated,
      label: 'Process initiated',
      description: 'Offboarding process started',
      color: 'blue',
    },
    {
      date: timeline.last_working_day,
      label: 'Last working day',
      description: 'Employee\u2019s final day of work',
      color: 'amber',
    },
    {
      date: timeline.notice_end,
      label: 'Notice period ends',
      description: 'Employment formally ends',
      color: 'amber',
    },
    {
      date: timeline.final_pay_date,
      label: 'Final pay date',
      description: 'Estimated final pay processing',
      color: 'green',
    },
    {
      date: timeline.p45_due_by,
      label: 'P45 due',
      description: 'Must be issued without unreasonable delay',
      color: 'red',
    },
    {
      date: timeline.tribunal_window_end,
      label: 'Tribunal claim window',
      description: '3 months less 1 day from termination (ERA 2025 extends to 6 months)',
      color: 'red',
    },
    {
      date: timeline.document_retention_until,
      label: 'Record retention expires',
      description: '6 years — eligible for GDPR-compliant deletion',
      color: 'neutral',
    },
  ];

  const colorClasses: Record<string, { dot: string; text: string; line: string }> = {
    green: { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', line: 'bg-green-500/30' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', line: 'bg-amber-500/30' },
    red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', line: 'bg-red-500/30' },
    blue: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', line: 'bg-blue-500/30' },
    neutral: { dot: 'bg-neutral-500', text: 'text-neutral-500 dark:text-neutral-400', line: 'bg-neutral-500/30' },
  };

  return (
    <div className="relative">
      {nodes.map((node, i) => {
        const past = isPast(node.date);
        const colors = colorClasses[node.color];

        return (
          <div key={i} className="flex gap-3 relative">
            {/* Vertical line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                  past ? 'bg-neutral-300 dark:bg-neutral-600' : colors.dot
                }`}
              />
              {i < nodes.length - 1 && (
                <div className={`w-px flex-1 min-h-[2rem] ${past ? 'bg-neutral-300 dark:bg-neutral-700' : colors.line}`} />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className={`text-xs font-medium ${past ? 'text-neutral-500' : colors.text}`}>
                  {formatDate(node.date)}
                </p>
                {past && (
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-600 bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    Past
                  </span>
                )}
              </div>
              <p className={`text-sm font-medium ${past ? 'text-neutral-500' : 'text-neutral-800 dark:text-neutral-200'}`}>
                {node.label}
              </p>
              <p className="text-xs text-neutral-500">{node.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
